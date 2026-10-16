import { describe, expect, it } from "vitest";
import {
  assertPortalUrl,
  assertUniqueSourceUrl,
  parserForPortal,
} from "./registry";

describe("parserForPortal", () => {
  it("jimoty だけパーサーを返す", () => {
    const parser = parserForPortal("jimoty");
    expect(parser.portal).toBe("jimoty");
    expect(typeof parser.parseListPage).toBe("function");
  });

  it("未対応のポータルは受け付けない", () => {
    expect(() => parserForPortal("kimty")).toThrow(/未対応のポータル/);
  });
});

describe("assertPortalUrl", () => {
  it("ジモティーのプロフィールURLを通す", () => {
    expect(() =>
      assertPortalUrl(
        "jimoty",
        "https://jmty.jp/profiles/62282557f0a7ee2c83f440bf"
      )
    ).not.toThrow();
  });

  it("プロフィール以外のジモティーURLは拒否する", () => {
    expect(() =>
      assertPortalUrl("jimoty", "https://jmty.jp/mie/sale-est/article-abc")
    ).toThrow(/プロフィールURL/);
  });

  it("https 以外は拒否する", () => {
    expect(() =>
      assertPortalUrl("jimoty", "http://jmty.jp/profiles/abc")
    ).toThrow(/プロフィールURL/);
  });
});

describe("assertUniqueSourceUrl", () => {
  it("同じプロフィールURLは二重登録できない", () => {
    expect(() =>
      assertUniqueSourceUrl(
        ["https://jmty.jp/profiles/abc/"],
        "https://jmty.jp/profiles/abc"
      )
    ).toThrow(/登録済み/);
  });

  it("ページ番号が違っても同じプロフィールは登録済みにする", () => {
    expect(() =>
      assertUniqueSourceUrl(
        ["https://jmty.jp/profiles/abc?page=2"],
        "https://jmty.jp/profiles/abc"
      )
    ).toThrow(/登録済み/);
  });

  it("別のプロフィールは登録できる", () => {
    expect(() =>
      assertUniqueSourceUrl(
        ["https://jmty.jp/profiles/other"],
        "https://jmty.jp/profiles/abc"
      )
    ).not.toThrow();
  });
});
