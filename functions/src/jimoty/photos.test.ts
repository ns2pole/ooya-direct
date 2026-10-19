import { describe, expect, it } from "vitest";
import {
  isJimotyArticleUrl,
  isJmtyCdnImageUrl,
  resolveImageContentType,
  shouldReplaceCover,
  sniffImageContentType,
} from "./photos";

describe("shouldReplaceCover", () => {
  it("空とジモティーの直リンクだけ上書きする", () => {
    expect(shouldReplaceCover("")).toBe(true);
    expect(shouldReplaceCover("  ")).toBe(true);
    expect(shouldReplaceCover("https://cdn.jmty.jp/articles/images/a/thumb_m_1.jpg")).toBe(true);
    expect(
      shouldReplaceCover(
        "https://firebasestorage.googleapis.com/v0/b/app/o/houses%2Fh%2Fphotos%2Fa.jpg?alt=media&token=t"
      )
    ).toBe(false);
  });
});

describe("resolveImageContentType", () => {
  it("image/jpeg はそのまま通す", () => {
    expect(
      resolveImageContentType(
        "image/jpeg",
        "https://cdn.jmty.jp/articles/images/a/slide_1.jpg"
      )
    ).toBe("image/jpeg");
  });

  it("ジモティーが返す octet-stream + .jpg も画像として通す", () => {
    expect(
      resolveImageContentType(
        "application/octet-stream",
        "https://cdn.jmty.jp/articles/images/a/slide_1.jpg"
      )
    ).toBe("image/jpeg");
    expect(
      resolveImageContentType(
        "application/octet-stream",
        "https://cdn.jmty.jp/articles/images/a/slide_1.png"
      )
    ).toBe("image/png");
  });

  it("octet-stream でも拡張子が無い URL は捨てる", () => {
    expect(
      resolveImageContentType(
        "application/octet-stream",
        "https://cdn.jmty.jp/articles/images/a/slide_1"
      )
    ).toBeNull();
  });

  it("空の Content-Type は広げない", () => {
    expect(
      resolveImageContentType("", "https://cdn.jmty.jp/articles/images/a/slide_1.jpg")
    ).toBeNull();
  });
});

describe("sniffImageContentType", () => {
  it("JPEG / PNG マジックを判定する", () => {
    expect(sniffImageContentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(
      sniffImageContentType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ).toBe("image/png");
    expect(sniffImageContentType(Buffer.from([0x00, 0x01, 0x02]))).toBeNull();
  });
});

describe("取り込みURLの許可", () => {
  it("ジモティーの記事と掲載画像だけを許可する", () => {
    expect(isJimotyArticleUrl("https://jmty.jp/mie/est-hou/article-18fp28")).toBe(true);
    expect(isJimotyArticleUrl("https://evil.example/mie/est-hou/article-18fp28")).toBe(false);
    expect(isJimotyArticleUrl("https://jmty.jp.evil.example/mie/est-hou/article-18fp28")).toBe(false);
    expect(isJimotyArticleUrl("https://user:pass@jmty.jp/mie/est-hou/article-18fp28")).toBe(false);
    expect(isJimotyArticleUrl("http://jmty.jp/mie/est-hou/article-18fp28")).toBe(false);

    expect(
      isJmtyCdnImageUrl("https://cdn.jmty.jp/articles/images/abc/slide_1.jpg")
    ).toBe(true);
    expect(isJmtyCdnImageUrl("https://cdn.jmty.jp/articles/images/../../secret")).toBe(false);
    expect(isJmtyCdnImageUrl("https://cdn.jmty.jp.evil.example/articles/images/a.jpg")).toBe(false);
    expect(isJmtyCdnImageUrl("https://evil.example/articles/images/a.jpg")).toBe(false);
  });
});
