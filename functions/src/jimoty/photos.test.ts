import { describe, expect, it } from "vitest";
import { isJimotyArticleUrl, isJmtyCdnImageUrl, shouldReplaceCover } from "./photos";

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
