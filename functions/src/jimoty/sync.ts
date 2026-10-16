import * as admin from "firebase-admin";
import { parseJimotyListPage, type JimotyListing } from "./parse";

const PROFILE_URL = "https://jmty.jp/profiles/62282557f0a7ee2c83f440bf";
const SETTINGS_PATH = "settings/jimoty";
const LOCK_MS = 3 * 60 * 1000;
const MAX_PAGES = 10;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const JIMOTY_DOC_ID = /^jmty-[a-z0-9]+$/;

export type JimotySyncResult = {
  created: number;
  updated: number;
  removed: number;
  unchanged: number;
};

type HouseFields = {
  title: string;
  description: string;
  prefecture: string;
  city: string;
  town: string;
  rent: string;
  managementFee: string;
  genre: string;
  depositKeyMoney: string;
  areaSize: string;
  floorArea: string;
  floors: string;
  buildingAge: string;
  referenceUrl: string;
};

function db() {
  return admin.firestore();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
      "Accept-Language": "ja",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`ジモティーの取得に失敗しました（${response.status}）。`);
  }
  return response.text();
}

export async function fetchOpenListings(): Promise<JimotyListing[]> {
  const open: JimotyListing[] = [];
  const seenIds = new Set<string>();
  const seenPages = new Set<string>();
  let url: string | null = PROFILE_URL;
  let pages = 0;
  let estateCount = 0;

  while (url && pages < MAX_PAGES) {
    const normalized = url.split("#")[0];
    if (seenPages.has(normalized)) break;
    seenPages.add(normalized);
    pages += 1;

    const html = await fetchText(normalized);
    const parsed = parseJimotyListPage(html, normalized);
    estateCount += parsed.estateCount;
    for (const listing of parsed.listings) {
      if (seenIds.has(listing.docId)) continue;
      seenIds.add(listing.docId);
      open.push(listing);
    }
    url = parsed.nextUrl;
  }

  if (estateCount === 0) {
    throw new Error("掲載一覧を読み取れませんでした。同期は中止しました。");
  }
  return open;
}

async function resolveOwnerId(explicitOwnerId?: string): Promise<string> {
  if (explicitOwnerId) return explicitOwnerId;
  const settings = await db().doc(SETTINGS_PATH).get();
  const stored = settings.get("ownerId");
  if (typeof stored === "string" && stored.trim()) return stored.trim();

  const listed = await admin.auth().listUsers(2);
  if (listed.users.length === 1) return listed.users[0].uid;
  throw new Error(
    "同期先の大家アカウントが未設定です。管理画面の「ジモティーから同期」を一度押してください。"
  );
}

function houseFields(listing: JimotyListing): HouseFields {
  return {
    title: listing.title,
    description: listing.description,
    prefecture: listing.prefecture,
    city: listing.city,
    town: listing.town,
    rent: listing.rent,
    managementFee: listing.managementFee,
    genre: listing.genre,
    depositKeyMoney: listing.depositKeyMoney,
    areaSize: listing.areaSize,
    floorArea: listing.floorArea,
    floors: listing.floors,
    buildingAge: listing.buildingAge,
    referenceUrl: listing.referenceUrl,
  };
}

function photoToWrite(
  current: unknown,
  incoming: string | null
): string | undefined {
  if (!incoming) return undefined;
  const existing = typeof current === "string" ? current.trim() : "";
  if (!existing) return incoming;
  if (existing.includes("cdn.jmty.jp") && existing !== incoming) return incoming;
  return undefined;
}

async function deleteHouseTree(
  ref: admin.firestore.DocumentReference
): Promise<void> {
  const [inquiries, photos] = await Promise.all([
    ref.collection("inquiries").listDocuments(),
    ref.collection("photos").listDocuments(),
  ]);
  const docs = [...inquiries, ...photos, ref];
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db().batch();
    for (const docRef of docs.slice(i, i + 400)) batch.delete(docRef);
    await batch.commit();
  }
}

async function applyListings(
  ownerId: string,
  listings: JimotyListing[]
): Promise<JimotySyncResult> {
  const result: JimotySyncResult = {
    created: 0,
    updated: 0,
    removed: 0,
    unchanged: 0,
  };
  const openIds = new Set(listings.map((listing) => listing.docId));
  const houses = db().collection("houses");

  for (const listing of listings) {
    const ref = houses.doc(listing.docId);
    const snap = await ref.get();
    const fields = houseFields(listing);
    if (!snap.exists) {
      const created: Record<string, unknown> = {
        ownerId,
        ...fields,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (listing.photoUrl) created.coverPhotoUrl = listing.photoUrl;
      await ref.set(created);
      result.created += 1;
      continue;
    }

    const data = snap.data() ?? {};
    if (data.ownerId !== ownerId) {
      result.unchanged += 1;
      continue;
    }

    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(fields) as (keyof HouseFields)[]) {
      if (String(data[key] ?? "") !== fields[key]) patch[key] = fields[key];
    }
    const photo = photoToWrite(data.coverPhotoUrl ?? data.photoUrl, listing.photoUrl);
    if (photo) patch.coverPhotoUrl = photo;

    if (Object.keys(patch).length === 0) {
      result.unchanged += 1;
      continue;
    }
    patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await ref.update(patch);
    result.updated += 1;
  }

  const owned = await houses.where("ownerId", "==", ownerId).get();
  for (const docSnap of owned.docs) {
    if (!JIMOTY_DOC_ID.test(docSnap.id)) continue;
    if (openIds.has(docSnap.id)) continue;
    await deleteHouseTree(docSnap.ref);
    result.removed += 1;
  }

  return result;
}

async function acquireLock(): Promise<boolean> {
  const ref = db().doc(SETTINGS_PATH);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const until = snap.get("runningUntil") as
      | admin.firestore.Timestamp
      | undefined;
    if (until && until.toMillis() > Date.now()) return false;
    tx.set(
      ref,
      {
        runningUntil: admin.firestore.Timestamp.fromMillis(Date.now() + LOCK_MS),
      },
      { merge: true }
    );
    return true;
  });
}

async function finishSync(
  ownerId: string,
  result: JimotySyncResult
): Promise<void> {
  await db().doc(SETTINGS_PATH).set(
    {
      ownerId,
      runningUntil: admin.firestore.FieldValue.delete(),
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastCreated: result.created,
      lastUpdated: result.updated,
      lastRemoved: result.removed,
      lastUnchanged: result.unchanged,
    },
    { merge: true }
  );
}

async function releaseLock(): Promise<void> {
  await db()
    .doc(SETTINGS_PATH)
    .set(
      { runningUntil: admin.firestore.FieldValue.delete() },
      { merge: true }
    );
}

/** 未成約だけを upsert し、成約・掲載終了になった取り込み物件だけ削除する。 */
export async function runJimotySync(
  explicitOwnerId?: string
): Promise<JimotySyncResult> {
  const locked = await acquireLock();
  if (!locked) {
    throw new Error("同期中です。少し待ってからもう一度押してください。");
  }

  try {
    const ownerId = await resolveOwnerId(explicitOwnerId);
    const listings = await fetchOpenListings();
    const result = await applyListings(ownerId, listings);
    await finishSync(ownerId, result);
    return result;
  } catch (err) {
    await releaseLock();
    throw err;
  }
}
