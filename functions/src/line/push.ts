const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

type LineTextMessage = { type: "text"; text: string };

async function lineApiPost(
  url: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LINE API failed (${res.status}): ${errText}`);
  }
}

export async function pushLineMessage(
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  const messages: LineTextMessage[] = [{ type: "text", text }];
  await lineApiPost(LINE_PUSH_URL, accessToken, { to, messages });
}

export async function replyLineMessage(
  accessToken: string,
  replyToken: string,
  text: string
): Promise<void> {
  const messages: LineTextMessage[] = [{ type: "text", text }];
  await lineApiPost(LINE_REPLY_URL, accessToken, { replyToken, messages });
}
