import { randomUUID } from "crypto";
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { articlePhotoUrls } from "./parse";

const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function shouldReplaceCover(current: string): boolean {
  const existing = current.trim();
  if (!existing) return true;
  return existing.includes("cdn.jmty.jp");
}

function allowedHttpsUrl(url: string, hostname: string, pathOk: (pathname: string) => boolean): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname === hostname &&
    parsed.username === "" &&
    parsed.password === "" &&
    pathOk(parsed.pathname)
  );
}

/** 記事HTMLを取りに行ってよいURL。別ホストへの誘導は捨てる。 */
export function isJimotyArticleUrl(url: string): boolean {
  return allowedHttpsUrl(
    url,
    "jmty.jp",
    (pathname) => /^\/[a-z0-9-]+\/[^/]+\/article-[a-z0-9]+$/i.test(pathname)
  );
}

/** 画像本体を取りに行ってよいURL。cdn.jmty.jp の掲載画像だけ。 */
export function isJmtyCdnImageUrl(url: string): boolean {
  return allowedHttpsUrl(
    url,
    "cdn.jmty.jp",
    (pathname) => pathname.startsWith("/articles/images/") && !pathname.includes("..")
  );
}

function extensionFromUrl(url: string): string | null {
  const fromUrl = /\.(jpe?g|png|webp|gif)(?:$|\?)/i.exec(url)?.[1]?.toLowerCase();
  if (fromUrl === "jpeg") return "jpg";
  if (fromUrl === "jpg" || fromUrl === "png" || fromUrl === "webp" || fromUrl === "gif") {
    return fromUrl;
  }
  return null;
}

function imageTypeFromExt(ext: string): string {
  return `image/${ext === "jpg" ? "jpeg" : ext}`;
}

/**
 * CDN が application/octet-stream を返すことがあるので、
 * image/* 以外でも URL 拡張子から画像とみなす。
 * 実バイトの判定は sniffImageContentType で行う。
 */
export function resolveImageContentType(contentType: string, url: string): string | null {
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  if (normalized.startsWith("image/")) {
    const fromType = EXT_BY_TYPE[normalized];
    if (fromType) return normalized === "image/jpg" ? "image/jpeg" : normalized;
    const fromUrl = extensionFromUrl(url);
    return fromUrl ? imageTypeFromExt(fromUrl) : null;
  }
  // ジモティー CDN が slide_*.jpg を octet-stream で返すケース（中身は別途マジックで確認）
  if (normalized === "application/octet-stream" || normalized === "binary/octet-stream") {
    const fromUrl = extensionFromUrl(url);
    return fromUrl ? imageTypeFromExt(fromUrl) : null;
  }
  return null;
}

/** 先頭バイトから画像種別を判定。不明なら null。 */
export function sniffImageContentType(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function extensionFor(contentType: string): string | null {
  return EXT_BY_TYPE[contentType] ?? null;
}

function downloadUrl(bucketName: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function fetchImage(
  url: string,
  fetchHtml: (url: string) => Promise<Response>
): Promise<{ bytes: Buffer; ext: string; contentType: string } | null> {
  if (!isJmtyCdnImageUrl(url)) return null;
  const response = await fetchHtml(url);
  if (response.status !== 200) return null;
  const finalUrl = response.url || url;
  if (!isJmtyCdnImageUrl(finalUrl)) return null;
  // Content-Type の候補はリダイレクト後 URL の拡張子も見る（ホストは上で検証済み）
  const headerType = response.headers.get("content-type") ?? "";
  const fromHeader = resolveImageContentType(headerType, finalUrl);
  if (!fromHeader) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
  const sniffed = sniffImageContentType(bytes);
  // ヘッダが image/* なら sniff 不一致でもヘッダを優先（従来どおり）。
  // octet-stream 経由のときは実バイトが画像であることを必須にする。
  const headerIsImage = headerType.toLowerCase().trim().startsWith("image/");
  const contentType = headerIsImage ? fromHeader : sniffed;
  if (!contentType) return null;
  if (!headerIsImage && contentType !== fromHeader) {
    // 拡張子とマジックが食い違う改ざんっぽい応答は捨てる
    return null;
  }
  const ext = extensionFor(contentType);
  if (!ext) return null;
  return { bytes, ext, contentType };
}

/**
 * 写真がまだ無い物件だけ、記事ページの画像を Storage と photos に保存する。
 * すでに写真がある物件（手登録を含む）は触らない。
 */
export async function importArticlePhotosIfEmpty(
  houseRef: admin.firestore.DocumentReference,
  articleUrl: string,
  ownerId: string,
  sourceId: string,
  fetchHtml: (url: string) => Promise<string>,
  fetchBinary: (url: string) => Promise<Response>
): Promise<number> {
  const snap = await houseRef.get();
  if (!snap.exists || snap.get("hidden") === true) return 0;
  if (snap.get("ownerId") !== ownerId) return 0;
  const currentSource = String(snap.get("sourceId") ?? "");
  if (currentSource && currentSource !== sourceId) return 0;

  const existing = await houseRef.collection("photos").limit(1).get();
  if (!existing.empty) return 0;
  if (!isJimotyArticleUrl(articleUrl)) return 0;

  const html = await fetchHtml(articleUrl);
  const urls = articlePhotoUrls(html);
  if (urls.length === 0) return 0;

  const bucket = getStorage().bucket();
  const saved: string[] = [];
  for (const url of urls) {
    try {
      const image = await fetchImage(url, fetchBinary);
      if (!image) continue;
      const path = `houses/${houseRef.id}/photos/${randomUUID()}.${image.ext}`;
      const token = randomUUID();
      await bucket.file(path).save(image.bytes, {
        resumable: false,
        metadata: {
          contentType: image.contentType,
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      saved.push(downloadUrl(bucket.name, path, token));
    } catch (err) {
      console.error("jimoty photo skipped", houseRef.id, url, err);
    }
  }
  if (saved.length === 0) return 0;

  const batch = houseRef.firestore.batch();
  saved.forEach((url, order) => {
    batch.set(houseRef.collection("photos").doc(), {
      url,
      order,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  const cover = String(snap.get("coverPhotoUrl") ?? snap.get("photoUrl") ?? "");
  if (shouldReplaceCover(cover)) {
    batch.update(houseRef, {
      coverPhotoUrl: saved[0],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return saved.length;
}
