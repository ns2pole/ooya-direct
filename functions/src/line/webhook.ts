import * as crypto from "crypto";
import type { Request, Response } from "express";
import * as admin from "firebase-admin";
import { normalizeLinkCode, redeemLinkCode } from "./link";
import { replyLineMessage } from "./push";

type LineTextMessage = { type: "text"; text: string };
type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: LineTextMessage;
};

type LineWebhookBody = {
  events?: LineEvent[];
};

function verifyLineSignature(
  rawBody: Buffer,
  signature: string | undefined,
  channelSecret: string
): boolean {
  if (!signature) return false;
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

function replyMessageForRedeem(
  result: Awaited<ReturnType<typeof redeemLinkCode>>
): string {
  if (result.ok) {
    return "LINE 通知の連携が完了しました。問い合わせが届くとこのトークに通知されます。";
  }
  switch (result.reason) {
    case "expired":
      return "連携コードの有効期限が切れています。大家ダイレクトの画面で新しいコードを発行してください。";
    case "already_linked":
      return "この大家アカウントは既に別の LINE と連携済みです。連携を解除してから再度お試しください。";
    default:
      return "連携コードが正しくありません。大家ダイレクトの画面に表示された6桁のコードを送ってください。";
  }
}

async function handleEvent(
  db: admin.firestore.Firestore,
  accessToken: string,
  event: LineEvent
): Promise<void> {
  const replyToken =
    typeof event.replyToken === "string" ? event.replyToken : "";
  const lineUserId =
    typeof event.source?.userId === "string" ? event.source.userId : "";
  if (!replyToken || !lineUserId) return;

  if (event.type === "follow") {
    await replyLineMessage(
      accessToken,
      replyToken,
      "友だち追加ありがとうございます。大家ダイレクトの「大家さん」画面で連携コードを発行し、このトークに6桁のコードを送ってください。"
    );
    return;
  }

  if (event.type !== "message" || event.message?.type !== "text") {
    return;
  }

  const text = event.message.text ?? "";
  const code = normalizeLinkCode(text);
  if (!/^\d{6}$/.test(code)) {
    await replyLineMessage(
      accessToken,
      replyToken,
      "6桁の連携コードを送ってください。コードは大家ダイレクトの「大家さん」画面で発行できます。"
    );
    return;
  }

  const result = await redeemLinkCode(db, code, lineUserId);
  await replyLineMessage(accessToken, replyToken, replyMessageForRedeem(result));
}

export async function handleLineWebhook(
  req: Request,
  res: Response,
  accessToken: string,
  channelSecret: string
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    res.status(400).send("Missing raw body");
    return;
  }

  const signature = req.get("x-line-signature");
  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    res.status(403).send("Invalid signature");
    return;
  }

  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody.toString("utf8")) as LineWebhookBody;
  } catch {
    res.status(400).send("Invalid JSON");
    return;
  }

  const events = Array.isArray(body.events) ? body.events : [];
  const db = admin.firestore();

  await Promise.all(
    events.map((event) => handleEvent(db, accessToken, event))
  );

  res.status(200).send("OK");
}
