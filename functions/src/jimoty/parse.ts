/** ジモティーの都道府県パス（/mie/...） */
const PREFECTURE_BY_SLUG: Record<string, string> = {
  hokkaido: "北海道",
  aomori: "青森県",
  iwate: "岩手県",
  miyagi: "宮城県",
  akita: "秋田県",
  yamagata: "山形県",
  fukushima: "福島県",
  ibaraki: "茨城県",
  tochigi: "栃木県",
  gunma: "群馬県",
  saitama: "埼玉県",
  chiba: "千葉県",
  tokyo: "東京都",
  kanagawa: "神奈川県",
  niigata: "新潟県",
  toyama: "富山県",
  ishikawa: "石川県",
  fukui: "福井県",
  yamanashi: "山梨県",
  nagano: "長野県",
  gifu: "岐阜県",
  shizuoka: "静岡県",
  aichi: "愛知県",
  mie: "三重県",
  shiga: "滋賀県",
  kyoto: "京都府",
  osaka: "大阪府",
  hyogo: "兵庫県",
  nara: "奈良県",
  wakayama: "和歌山県",
  tottori: "鳥取県",
  shimane: "島根県",
  okayama: "岡山県",
  hiroshima: "広島県",
  yamaguchi: "山口県",
  tokushima: "徳島県",
  kagawa: "香川県",
  ehime: "愛媛県",
  kochi: "高知県",
  fukuoka: "福岡県",
  saga: "佐賀県",
  nagasaki: "長崎県",
  kumamoto: "熊本県",
  oita: "大分県",
  miyazaki: "宮崎県",
  kagoshima: "鹿児島県",
  okinawa: "沖縄県",
};

const AREA_SIZE_OPTIONS = new Set([
  "1R",
  "1K",
  "1DK",
  "1LDK",
  "1SLDK",
  "2K",
  "2DK",
  "2LDK",
  "2SLDK",
  "3K",
  "3DK",
  "3LDK",
  "3SLDK",
  "4K",
  "4DK",
  "4LDK",
  "4SLDK",
  "5K",
  "5DK",
  "5LDK",
  "5SLDK",
]);

export type JimotyListing = {
  /** Firestore のドキュメント ID（jmty-記事ID） */
  docId: string;
  articleId: string;
  title: string;
  description: string;
  photoUrl: string | null;
  prefecture: string;
  city: string;
  town: string;
  rent: string;
  managementFee: string;
  genre: string;
  depositKeyMoney: string;
  areaSize: string;
  floorArea: string;
  floors: string;
  buildingAge: string;
  referenceUrl: string;
};

export type ParsedListPage = {
  listings: JimotyListing[];
  /** 不動産カードの件数（成約含む）。0 ならページ構造の読み取り失敗とみなす */
  estateCount: number;
  nextUrl: string | null;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) =>
      String.fromCodePoint(parseInt(n, 16))
    );
}

function cleanText(htmlFragment: string): string {
  const withBreaks = htmlFragment.replace(/<br\s*\/?>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeHtml(stripped)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function block(body: string, classPrefix: string): string {
  const re = new RegExp(
    `class=['"]${classPrefix}[^'"]*['"][^>]*>([\\s\\S]*?)</(?:p|div)>`,
    "i"
  );
  return re.exec(body)?.[1] ?? "";
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

export function areaSizeFromText(text: string): string {
  const match = text.match(/(\d+)\s*(SLDK|LDK|DK|K|R)/i);
  if (!match) return "";
  const rooms = Number(match[1]);
  const kind = match[2].toUpperCase();
  if (rooms >= 6) {
    return kind === "LDK" || kind === "SLDK" ? "6LDK以上" : "6K以上";
  }
  const label = `${rooms}${kind}`;
  return AREA_SIZE_OPTIONS.has(label) ? label : "";
}

export function splitCityTown(area: string): { city: string; town: string } {
  const parts = area.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { city: "", town: "" };
  if (parts.length === 1) {
    const match = parts[0].match(/^(.+?[市区町村])(.*)$/);
    if (match && match[2]) return { city: match[1], town: match[2] };
    return { city: parts[0], town: "" };
  }
  return { city: parts[0], town: parts.slice(1).join(" ") };
}

function prefectureFromHref(href: string): string {
  const match = href.match(/^\/([a-z]+)\//i);
  if (!match) return "";
  return PREFECTURE_BY_SLUG[match[1].toLowerCase()] ?? "";
}

function listingFromCard(href: string, body: string): JimotyListing | null {
  const idMatch = href.match(/\/article-([a-z0-9]+)/i);
  if (!idMatch) return null;
  if (body.includes("img_sold")) return null;

  const category = cleanText(block(body, "bace"));
  if (category !== "不動産") return null;

  const title = clip(cleanText(block(body, "portal_list_title")), 200);
  if (!title) return null;

  const supplement = block(body, "portal_list_supplement");
  const spans = [...supplement.matchAll(/<span>([\s\S]*?)<\/span>/g)].map(
    (m) => cleanText(m[1])
  );
  const rent = clip(spans.find((s) => s.includes("円")) ?? "", 50);
  const area = spans.find((s) => s && !s.includes("円")) ?? "";
  const { city, town } = splitCityTown(area);
  const description = clip(cleanText(block(body, "portal_list_text")), 8000);
  const images = [...body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map(
    (m) => m[1]
  );
  const photo = images.find((src) => !src.includes("img_sold") && src.startsWith("https://"));
  const source = `${title}\n${description}`;
  const referenceUrl = clip(new URL(href, "https://jmty.jp").toString(), 2048);

  return {
    docId: `jmty-${idMatch[1].toLowerCase()}`,
    articleId: idMatch[1].toLowerCase(),
    title,
    description,
    photoUrl: photo && photo.length < 8192 ? photo : null,
    prefecture: clip(prefectureFromHref(href), 30),
    city: clip(city, 120),
    town: clip(town, 200),
    rent,
    managementFee: "",
    genre: source.includes("一戸建て") ? "一戸建て" : "その他",
    depositKeyMoney: /敷金礼金無/.test(source) ? "なし" : "",
    areaSize: areaSizeFromText(source),
    floorArea: "",
    floors: "",
    buildingAge: "",
    referenceUrl,
  };
}

const MAX_ARTICLE_PHOTOS = 20;

/** 記事ページの掲載画像（lightbox の大きい方）を掲載順で返す。関連記事のサムネは含めない。 */
export function articlePhotoUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/rel=["']lightbox\[article-images\]["']/.test(tag)) continue;
    const href = /href=["'](https:\/\/cdn\.jmty\.jp\/articles\/images\/[^"']+)["']/.exec(tag)?.[1];
    if (!href || seen.has(href)) continue;
    seen.add(href);
    urls.push(href);
    if (urls.length >= MAX_ARTICLE_PHOTOS) break;
  }
  return urls;
}

export function parseJimotyListPage(html: string, pageUrl: string): ParsedListPage {
  const listings: JimotyListing[] = [];
  let estateCount = 0;
  const cardRe =
    /<a class="wrap-block portal_list_link" href="([^"]+)">([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(cardRe)) {
    const href = match[1];
    const body = match[2];
    if (cleanText(block(body, "bace")) !== "不動産") continue;
    estateCount += 1;
    const listing = listingFromCard(href, body);
    if (listing) listings.push(listing);
  }

  const nextMatch =
    html.match(/<a[^>]*rel="next"[^>]*href="([^"]+)"/i) ??
    html.match(/<a[^>]*href="([^"]+)"[^>]*rel="next"/i);
  const nextHref = nextMatch?.[1];
  const nextUrl = nextHref ? new URL(nextHref, pageUrl).toString() : null;

  return { listings, estateCount, nextUrl };
}
