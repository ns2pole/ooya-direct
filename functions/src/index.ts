import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

const REGION = "asia-northeast1";
const MAX_MESSAGE = 2000;
const MAX_DISPLAY_NAME = 80;
/** スパム緩和: 物件あたりの問い合わせ上限（この件数に達すると新規投稿不可） */
const MAX_INQUIRIES_PER_HOUSE = 100;

type SubmitInquiryInput = {
  houseId?: unknown;
  message?: unknown;
  displayName?: unknown;
};

export const submitInquiry = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const data = request.data as SubmitInquiryInput;
    const houseId =
      typeof data.houseId === "string" ? data.houseId.trim() : "";
    const message =
      typeof data.message === "string" ? data.message.trim() : "";
    const displayNameRaw =
      typeof data.displayName === "string" ? data.displayName.trim() : "";

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

    let displayName: string | null = null;
    if (displayNameRaw) {
      if (displayNameRaw.length > MAX_DISPLAY_NAME) {
        throw new HttpsError(
          "invalid-argument",
          `表示名は ${MAX_DISPLAY_NAME} 文字以内にしてください。`
        );
      }
      displayName = displayNameRaw;
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
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { inquiryId: docRef.id };
  }
);
