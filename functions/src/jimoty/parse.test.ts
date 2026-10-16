import { describe, expect, it } from "vitest";
import { articlePhotoUrls } from "./parse";

describe("articlePhotoUrls", () => {
  it("記事の lightbox 画像だけを掲載順で返す", () => {
    const html = `
      <div class='p-article-image-block'>
        <a rel="lightbox[article-images]" href="https://cdn.jmty.jp/articles/images/aaa/slide_1.jpg">
          <img class="p-article-image-item" src="https://cdn.jmty.jp/articles/images/aaa/thumb_m_1.jpg" />
        </a>
      </div>
      <a href="https://cdn.jmty.jp/articles/images/bbb/slide_2.jpg" rel="lightbox[article-images]">
        <img src="https://cdn.jmty.jp/articles/images/bbb/thumb_m_2.jpg" />
      </a>
      <img src="https://cdn.jmty.jp/articles/images/related/thumb_m_other.jpg" />
      <a rel="lightbox[article-images]" href="https://cdn.jmty.jp/articles/images/aaa/slide_1.jpg"></a>
    `;

    expect(articlePhotoUrls(html)).toEqual([
      "https://cdn.jmty.jp/articles/images/aaa/slide_1.jpg",
      "https://cdn.jmty.jp/articles/images/bbb/slide_2.jpg",
    ]);
  });
});
