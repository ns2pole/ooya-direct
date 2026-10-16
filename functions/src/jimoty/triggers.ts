import { getFunctions } from "firebase-admin/functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { runJimotySync } from "./sync";

const REGION = "asia-northeast1";
const TASK_NAME = "runJimotySyncTask";

function syncError(err: unknown): HttpsError {
  const message = err instanceof Error ? err.message : "同期に失敗しました。";
  if (message.startsWith("同期中です")) {
    return new HttpsError("failed-precondition", message);
  }
  if (message.startsWith("同期先の大家アカウント")) {
    return new HttpsError("failed-precondition", message);
  }
  return new HttpsError("internal", message);
}

/** 管理画面からその場で同期する。 */
export const syncJimotyNow = onCall(
  { region: REGION, cors: true, invoker: "public", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "ログインが必要です。");
    }
    try {
      return await runJimotySync(request.auth.uid);
    } catch (err) {
      throw syncError(err);
    }
  }
);

/**
 * 23:00 起動。0〜59分後に本同期を1回だけ予約する。
 * 待ち時間のあいだ関数は終了する。
 */
export const enqueueJimotySync = onSchedule(
  {
    schedule: "0 23 * * *",
    timeZone: "Asia/Tokyo",
    region: REGION,
  },
  async () => {
    const delayMinutes = Math.floor(Math.random() * 60);
    const queue = getFunctions().taskQueue(
      `locations/${REGION}/functions/${TASK_NAME}`
    );
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    try {
      await queue.enqueue(
        { source: "schedule" },
        {
          scheduleDelaySeconds: delayMinutes * 60,
          dispatchDeadlineSeconds: 180,
          id: `jimoty-${day}`,
        }
      );
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (code === "functions/task-already-exists" || code === "task-already-exists") {
        return;
      }
      throw err;
    }
  }
);

/** 予約された時刻に未成約物件を取り込む。 */
export const runJimotySyncTask = onTaskDispatched(
  {
    region: REGION,
    timeoutSeconds: 120,
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 60 },
    rateLimits: { maxConcurrentDispatches: 1 },
  },
  async () => {
    await runJimotySync();
  }
);
