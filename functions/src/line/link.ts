import * as admin from "firebase-admin";
import * as crypto from "crypto";

export const LINK_CODE_TTL_MS = 10 * 60 * 1000;
const LINK_CODE_LENGTH = 6;

function randomNumericCode(): string {
  let code = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += String(crypto.randomInt(0, 10));
  }
  return code;
}

export function normalizeLinkCode(raw: string): string {
  return raw.trim().replace(/\s/g, "");
}

export async function createLinkCode(
  db: admin.firestore.Firestore,
  ownerId: string
): Promise<string> {
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + LINK_CODE_TTL_MS
  );

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomNumericCode();
    const ref = db.collection("lineLinkCodes").doc(code);
    const snap = await ref.get();
    if (snap.exists) continue;

    await ref.set({ ownerId, expiresAt });
    return code;
  }

  throw new Error("連携コードの発行に失敗しました。しばらくしてから再度お試しください。");
}

export type RedeemResult =
  | { ok: true; ownerId: string }
  | { ok: false; reason: "not_found" | "expired" | "already_linked" };

export async function redeemLinkCode(
  db: admin.firestore.Firestore,
  code: string,
  lineUserId: string
): Promise<RedeemResult> {
  const ref = db.collection("lineLinkCodes").doc(code);
  const snap = await ref.get();
  if (!snap.exists) {
    return { ok: false, reason: "not_found" };
  }

  const data = snap.data() as {
    ownerId?: string;
    expiresAt?: admin.firestore.Timestamp;
  };
  const ownerId = typeof data.ownerId === "string" ? data.ownerId : "";
  const expiresAt = data.expiresAt;
  if (!ownerId || !expiresAt) {
    return { ok: false, reason: "not_found" };
  }
  if (expiresAt.toMillis() < Date.now()) {
    await ref.delete();
    return { ok: false, reason: "expired" };
  }

  const profileRef = db.collection("landlordProfiles").doc(ownerId);
  const profileSnap = await profileRef.get();
  const existingLineUserId = profileSnap.exists
    ? profileSnap.data()?.lineUserId
    : undefined;
  if (
    typeof existingLineUserId === "string" &&
    existingLineUserId &&
    existingLineUserId !== lineUserId
  ) {
    return { ok: false, reason: "already_linked" };
  }

  await db.runTransaction(async (tx) => {
    tx.set(
      profileRef,
      {
        lineUserId,
        linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    tx.delete(ref);
  });

  return { ok: true, ownerId };
}

export async function unlinkLineProfile(
  db: admin.firestore.Firestore,
  ownerId: string
): Promise<void> {
  const profileRef = db.collection("landlordProfiles").doc(ownerId);
  await profileRef.set(
    {
      lineUserId: admin.firestore.FieldValue.delete(),
      linkedAt: admin.firestore.FieldValue.delete(),
    },
    { merge: true }
  );
}
