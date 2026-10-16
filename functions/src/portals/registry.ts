import { parseJimotyListPage, type ParsedListPage } from "../jimoty/parse";

export type PortalParser = {
  portal: "jimoty";
  parseListPage: (html: string, pageUrl: string) => ParsedListPage;
};

const JIMOTY_PROFILE_URL = /^https:\/\/jmty\.jp\/profiles\/[A-Za-z0-9]+$/;

export function parserForPortal(portal: string): PortalParser {
  if (portal !== "jimoty") {
    throw new Error(`未対応のポータルです（${portal}）。`);
  }
  return { portal: "jimoty", parseListPage: parseJimotyListPage };
}

/** クエリと末尾スラッシュを外し、同じプロフィールを同じ文字列にする。 */
export function normalizeSourceUrl(url: string): string {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

export function assertPortalUrl(portal: string, url: string): void {
  parserForPortal(portal);
  const normalized = normalizeSourceUrl(url);
  if (portal === "jimoty" && !JIMOTY_PROFILE_URL.test(normalized)) {
    throw new Error("ジモティーのプロフィールURLを入力してください。");
  }
}

export function assertUniqueSourceUrl(existingUrls: string[], url: string): void {
  const normalized = normalizeSourceUrl(url);
  if (existingUrls.some((item) => normalizeSourceUrl(item) === normalized)) {
    throw new Error("このURLは登録済みです。");
  }
}
