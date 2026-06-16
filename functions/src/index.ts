import * as admin from "firebase-admin";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { createLinkCode, unlinkLineProfile } from "./line/link";
import { handleLineWebhook } from "./line/webhook";
import { onInquiryCreated } from "./inquiryNotify";

admin.initializeApp();

const REGION = "asia-northeast1";
const MAX_MESSAGE = 2000;
/** スパム緩和: 物件あたりの問い合わせ上限（この件数に達すると新規投稿不可） */
const MAX_INQUIRIES_PER_HOUSE = 100;

const lineChannelAccessToken = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");
const lineChannelSecret = defineSecret("LINE_CHANNEL_SECRET");

type SubmitInquiryInput = {
  houseId?: unknown;
  message?: unknown;
};

export const submitInquiry = onCall(
  { region: REGION, cors: true, invoker: "public" },
  async (request) => {
    const data = request.data as SubmitInquiryInput;
    const houseId =
      typeof data.houseId === "string" ? data.houseId.trim() : "";
    const message =
      typeof data.message === "string" ? data.message.trim() : "";

    if (!houseId) {
      throw new HttpsError("invalid-argument", "houseId が必要です。");
    }
    if (!message) {
      throw new HttpsError("invalid-argument", "メッセージを入力してください。");
    }
    if (message.length > MAX_MESSAGE) {
      throw new HttpsError(
        "invalid-argument",
        `メッセージは ${MAX_MESSAGE} 文字以内にしてください。`
      );
    }

    const db = admin.firestore();
    const houseRef = db.collection("houses").doc(houseId);
    const houseSnap = await houseRef.get();
    if (!houseSnap.exists) {
      throw new HttpsError("not-found", "物件が見つかりません。");
    }

    const inquiriesColl = houseRef.collection("inquiries");
    const countSnap = await inquiriesColl.count().get();
    const inquiryCount = countSnap.data().count;
    if (inquiryCount >= MAX_INQUIRIES_PER_HOUSE) {
      throw new HttpsError(
        "resource-exhausted",
        `この物件への問い合わせは上限（${MAX_INQUIRIES_PER_HOUSE}件）に達しています。`
      );
    }

    const docRef = await inquiriesColl.add({
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { inquiryId: docRef.id };
  }
);

export const startLineLink = onCall(
  { region: REGION, cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }

    const db = admin.firestore();
    const code = await createLinkCode(db, request.auth.uid);
    return { code, expiresInSeconds: 600 };
  }
);

export const unlinkLine = onCall(
  { region: REGION, cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }

    const db = admin.firestore();
    await unlinkLineProfile(db, request.auth.uid);
    return { ok: true };
  }
);

export const lineWebhook = onRequest(
  {
    region: REGION,
    invoker: "public",
    secrets: [lineChannelAccessToken, lineChannelSecret],
  },
  async (req, res) => {
    try {
      await handleLineWebhook(
        req,
        res,
        lineChannelAccessToken.value(),
        lineChannelSecret.value()
      );
    } catch (err) {
      console.error("lineWebhook error:", err);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    }
  }
);

export { onInquiryCreated };
