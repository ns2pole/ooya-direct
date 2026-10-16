import * as admin from "firebase-admin";
import { deleteHouseTree } from "../houses/deleteHouseTree";
import { parserForPortal } from "../portals/registry";
import {
  HOUSE_TEXT_FIELDS,
  planSourceSync,
  type HouseTextFields,
  type SyncHouseSnapshot,
  type SyncListing,
} from "../portals/syncPlan";
import { importArticlePhotosIfEmpty } from "./photos";
import { type JimotyListing } from "./parse";

const SETTINGS_PATH = "settings/jimoty";
const LOCK_MS = 3 * 60 * 1000;
const MAX_PAGES = 10;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export type JimotySyncResult = {
  created: number;
  updated: number;
  removed: number;
  unchanged: number;
};

type PortalSourceDoc = {
  id: string;
  ownerId: string;
  landlordId: string;
  portal: string;
  url: string;
};

function db() {
  return admin.firestore();
}

async function fetchResponse(
  url: string,
  accept: string,
  redirect: RequestRedirect
): Promise<Response> {
  return fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: accept,
      "Accept-Language": "ja",
    },
    redirect,
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchResponse(url, "text/html", "follow");
  if (!response.ok) {
    throw new Error(`ジモティーの取得に失敗しました（${response.status}）。`);
  }
  return response.text();
}

export async function fetchOpenListings(
  portal: string,
  startUrl: string
): Promise<JimotyListing[]> {
  const parser = parserForPortal(portal);
  const open: JimotyListing[] = [];
  const seenIds = new Set<string>();
  const seenPages = new Set<string>();
  let url: string | null = startUrl;
  let pages = 0;
  let estateCount = 0;

  while (url && pages < MAX_PAGES) {
    const normalized = url.split("#")[0];
    if (seenPages.has(normalized)) break;
    seenPages.add(normalized);
    pages += 1;

    const html = await fetchText(normalized);
    const parsed = parser.parseListPage(html, normalized);
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

function listingToSync(listing: JimotyListing): SyncListing {
  const fields = {} as HouseTextFields;
  for (const key of HOUSE_TEXT_FIELDS) fields[key] = listing[key];
  return { docId: listing.docId, photoUrl: listing.photoUrl, fields };
}

function snapshotFromDoc(
  id: string,
  data: admin.firestore.DocumentData
): SyncHouseSnapshot {
  const fields = {} as HouseTextFields;
  for (const key of HOUSE_TEXT_FIELDS) fields[key] = String(data[key] ?? "");
  const cover = data.coverPhotoUrl ?? data.photoUrl;
  return {
    id,
    ownerId: String(data.ownerId ?? ""),
    sourceId: String(data.sourceId ?? ""),
    landlordId: String(data.landlordId ?? ""),
    fromSync: data.fromSync === true,
    hidden: data.hidden === true,
    coverPhotoUrl: typeof cover === "string" ? cover : "",
    fields,
  };
}

async function applySource(
  source: PortalSourceDoc,
  listings: JimotyListing[]
): Promise<JimotySyncResult> {
  const houses = db().collection("houses");
  const owned = await houses.where("ownerId", "==", source.ownerId).get();
  const plan = planSourceSync({
    sourceId: source.id,
    ownerId: source.ownerId,
    landlordId: source.landlordId,
    listings: listings.map(listingToSync),
    houses: owned.docs.map((docSnap) => snapshotFromDoc(docSnap.id, docSnap.data())),
  });

  for (const created of plan.create) {
    const payload: Record<string, unknown> = {
      ownerId: created.ownerId,
      landlordId: created.landlordId,
      sourceId: created.sourceId,
      fromSync: created.fromSync,
      hidden: created.hidden,
      ...created.fields,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (created.coverPhotoUrl) payload.coverPhotoUrl = created.coverPhotoUrl;
    await houses.doc(created.id).set(payload);
  }

  for (const update of plan.update) {
    await houses.doc(update.id).update({
      ...update.patch,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  for (const id of plan.removeIds) {
    await deleteHouseTree(houses.doc(id));
  }

  for (const listing of listings) {
    if (!listing.referenceUrl) continue;
    try {
      const saved = await importArticlePhotosIfEmpty(
        houses.doc(listing.docId),
        listing.referenceUrl,
        source.ownerId,
        source.id,
        fetchText,
        (url) => fetchResponse(url, "image/*", "manual")
      );
      if (saved > 0) {
        console.log("jimoty photos imported", listing.docId, saved);
      }
    } catch (err) {
      console.error("jimoty photos failed", listing.docId, err);
    }
  }

  return {
    created: plan.create.length,
    updated: plan.update.length,
    removed: plan.removeIds.length,
    unchanged: plan.unchanged,
  };
}

async function loadSources(ownerId?: string): Promise<PortalSourceDoc[]> {
  const col = db().collection("portalSources");
  const snap = ownerId
    ? await col.where("ownerId", "==", ownerId).get()
    : await col.get();
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ownerId: String(docSnap.get("ownerId") ?? ""),
    landlordId: String(docSnap.get("landlordId") ?? ""),
    portal: String(docSnap.get("portal") ?? ""),
    url: String(docSnap.get("url") ?? ""),
  }));
}

async function acquireLock(): Promise<boolean> {
  const ref = db().doc(SETTINGS_PATH);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const until = snap.get("runningUntil") as admin.firestore.Timestamp | undefined;
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
  ownerId: string | undefined,
  result: JimotySyncResult
): Promise<void> {
  const payload: Record<string, unknown> = {
    runningUntil: admin.firestore.FieldValue.delete(),
    lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastCreated: result.created,
    lastUpdated: result.updated,
    lastRemoved: result.removed,
    lastUnchanged: result.unchanged,
  };
  if (ownerId) payload.ownerId = ownerId;
  await db().doc(SETTINGS_PATH).set(payload, { merge: true });
}

async function releaseLock(): Promise<void> {
  await db()
    .doc(SETTINGS_PATH)
    .set({ runningUntil: admin.firestore.FieldValue.delete() }, { merge: true });
}

/** 登録されたURLの未成約だけを upsert し、成約になった取り込み物件だけ削除する。 */
export async function runJimotySync(explicitOwnerId?: string): Promise<JimotySyncResult> {
  const locked = await acquireLock();
  if (!locked) {
    throw new Error("同期中です。少し待ってからもう一度押してください。");
  }

  try {
    const sources = await loadSources(explicitOwnerId);
    const total: JimotySyncResult = {
      created: 0,
      updated: 0,
      removed: 0,
      unchanged: 0,
    };
    const failures: string[] = [];

    for (const source of sources) {
      try {
        const listings = await fetchOpenListings(source.portal, source.url);
        const result = await applySource(source, listings);
        total.created += result.created;
        total.updated += result.updated;
        total.removed += result.removed;
        total.unchanged += result.unchanged;
      } catch (err) {
        const message = err instanceof Error ? err.message : "同期に失敗しました。";
        failures.push(`${source.url}: ${message}`);
      }
    }

    await finishSync(explicitOwnerId, total);
    if (failures.length > 0) {
      throw new Error(failures.join("\n"));
    }
    return total;
  } catch (err) {
    await releaseLock();
    throw err;
  }
}
