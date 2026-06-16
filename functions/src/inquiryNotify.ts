import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import { pushLineMessage } from "./line/push";

const REGION = "asia-northeast1";
const MESSAGE_PREVIEW_LEN = 200;

const lineChannelAccessToken = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");
const publicSiteBase = defineString("PUBLIC_SITE_BASE");

function truncateMessage(message: string): string {
  if (message.length <= MESSAGE_PREVIEW_LEN) return message;
  return `${message.slice(0, MESSAGE_PREVIEW_LEN)}…`;
}

function buildHouseUrl(siteBase: string, houseId: string): string {
  const base = siteBase.replace(/\/$/, "");
  return `${base}/#/houses/${houseId}`;
}

export const onInquiryCreated = onDocumentCreated(
  {
    document: "houses/{houseId}/inquiries/{inquiryId}",
    region: REGION,
    secrets: [lineChannelAccessToken],
  },
  async (event) => {
    const houseId = event.params.houseId;
    const snap = event.data;
    if (!snap) return;

    const inquiry = snap.data() as { message?: unknown };
    const message =
      typeof inquiry.message === "string" ? inquiry.message.trim() : "";
    if (!message) return;

    const db = admin.firestore();
    const houseSnap = await db.collection("houses").doc(houseId).get();
    if (!houseSnap.exists) return;

    const house = houseSnap.data() as {
      ownerId?: string;
      title?: string;
    };
    const ownerId = typeof house.ownerId === "string" ? house.ownerId : "";
    if (!ownerId) return;

    const profileSnap = await db
      .collection("landlordProfiles")
      .doc(ownerId)
      .get();
    const lineUserId = profileSnap.exists
      ? profileSnap.data()?.lineUserId
      : undefined;
    if (typeof lineUserId !== "string" || !lineUserId) return;

    const siteBase = publicSiteBase.value();
    if (!siteBase) {
      console.warn("PUBLIC_SITE_BASE is not set; skipping LINE notification.");
      return;
    }

    const title =
      typeof house.title === "string" && house.title.trim()
        ? house.title.trim()
        : "（無題）";
    const text = [
      "【大家ダイレクト】新しい問い合わせ",
      `物件: ${title}`,
      truncateMessage(message),
      buildHouseUrl(siteBase, houseId),
    ].join("\n");

    try {
      await pushLineMessage(lineChannelAccessToken.value(), lineUserId, text);
    } catch (err) {
      console.error("Failed to send LINE inquiry notification:", err);
    }
  }
);
