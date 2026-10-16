import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { deleteHouseTree } from "../houses/deleteHouseTree";
import {
  houseIdsForLandlord,
  houseIdsForSource,
  sourceIdsForLandlord,
} from "./deletion";
import { assertPortalUrl, assertUniqueSourceUrl, normalizeSourceUrl } from "./registry";

const REGION = "asia-northeast1";

function db() {
  return admin.firestore();
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpsError("invalid-argument", `${label}が必要です。`);
  }
  return value.trim();
}

function asError(err: unknown, fallback: string): HttpsError {
  if (err instanceof HttpsError) return err;
  const message = err instanceof Error ? err.message : fallback;
  return new HttpsError("invalid-argument", message);
}

async function ownedHouses(ownerId: string) {
  const snap = await db().collection("houses").where("ownerId", "==", ownerId).get();
  return snap.docs;
}

/** 大家の下にポータルとURLを1件登録する。 */
export const registerPortalSource = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }
    try {
      const data = request.data as {
        landlordId?: unknown;
        portal?: unknown;
        url?: unknown;
      };
      const landlordId = requiredString(data.landlordId, "大家");
      const portal = requiredString(data.portal, "ポータル");
      const url = requiredString(data.url, "URL");
      assertPortalUrl(portal, url);

      const landlord = await db().collection("landlords").doc(landlordId).get();
      if (!landlord.exists || landlord.get("ownerId") !== request.auth.uid) {
        throw new HttpsError("permission-denied", "大家が見つかりません。");
      }

      const existing = await db()
        .collection("portalSources")
        .where("ownerId", "==", request.auth.uid)
        .get();
      assertUniqueSourceUrl(
        existing.docs.map((docSnap) => String(docSnap.get("url") ?? "")),
        url
      );

      const ref = await db().collection("portalSources").add({
        landlordId,
        ownerId: request.auth.uid,
        portal,
        url: normalizeSourceUrl(url),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { id: ref.id };
    } catch (err) {
      throw asError(err, "URLの登録に失敗しました。");
    }
  }
);

/** そのURLと、そのURLから入った物件だけを消す。 */
export const deletePortalSource = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }
    const sourceId = requiredString(
      (request.data as { sourceId?: unknown }).sourceId,
      "URL"
    );
    const source = await db().collection("portalSources").doc(sourceId).get();
    if (!source.exists || source.get("ownerId") !== request.auth.uid) {
      throw new HttpsError("permission-denied", "URLが見つかりません。");
    }

    const houses = await ownedHouses(request.auth.uid);
    const removeIds = houseIdsForSource(
      houses.map((docSnap) => ({
        id: docSnap.id,
        sourceId: String(docSnap.get("sourceId") ?? ""),
      })),
      sourceId
    );
    for (const id of removeIds) {
      await deleteHouseTree(db().collection("houses").doc(id));
    }
    await source.ref.delete();
    return { removed: removeIds.length };
  }
);

/** 大家と、そのURLと、紐づく物件を全部消す。 */
export const deleteLandlord = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }
    const landlordId = requiredString(
      (request.data as { landlordId?: unknown }).landlordId,
      "大家"
    );
    const landlord = await db().collection("landlords").doc(landlordId).get();
    if (!landlord.exists || landlord.get("ownerId") !== request.auth.uid) {
      throw new HttpsError("permission-denied", "大家が見つかりません。");
    }

    const [houses, sources] = await Promise.all([
      ownedHouses(request.auth.uid),
      db().collection("portalSources").where("ownerId", "==", request.auth.uid).get(),
    ]);
    const removeHouseIds = houseIdsForLandlord(
      houses.map((docSnap) => ({
        id: docSnap.id,
        landlordId: String(docSnap.get("landlordId") ?? ""),
      })),
      landlordId
    );
    const removeSourceIds = sourceIdsForLandlord(
      sources.docs.map((docSnap) => ({
        id: docSnap.id,
        landlordId: String(docSnap.get("landlordId") ?? ""),
      })),
      landlordId
    );

    for (const id of removeHouseIds) {
      await deleteHouseTree(db().collection("houses").doc(id));
    }
    for (const id of removeSourceIds) {
      await db().collection("portalSources").doc(id).delete();
    }
    await landlord.ref.delete();
    return { removedHouses: removeHouseIds.length, removedSources: removeSourceIds.length };
  }
);
