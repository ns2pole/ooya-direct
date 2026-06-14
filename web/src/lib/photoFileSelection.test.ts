import { describe, expect, it, afterEach } from 'vitest';
import {
  buildPhotoAdditions,
  createPhotoPreviewEntry,
  releasePhotoPreviewUrl,
  validatePhotoFile,
} from './photoFileSelection';

function makeFile(name: string, type: string, size = 1024): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

describe('validatePhotoFile', () => {
  it('JPEG を許可する', () => {
    expect(validatePhotoFile(makeFile('room.jpg', 'image/jpeg'))).toBeNull();
  });

  it('拡張子のみの PNG（type 空）を許可する', () => {
    expect(validatePhotoFile(makeFile('room.png', ''))).toBeNull();
  });

  it('HEIC を許可する', () => {
    expect(validatePhotoFile(makeFile('IMG_0001.HEIC', 'image/heic'))).toBeNull();
  });

  it('PDF を拒否する', () => {
    expect(validatePhotoFile(makeFile('doc.pdf', 'application/pdf'))).toMatch(
      /画像ファイル/
    );
  });

  it('5MB 超を拒否する', () => {
    const big = makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
    expect(validatePhotoFile(big)).toMatch(/5MB/);
  });
});

describe('createPhotoPreviewEntry', () => {
  afterEach(() => {
    // blob URL の後始末は各テスト内で行う
  });

  it('blob: プレビュー URL を同期的に返す', () => {
    const file = makeFile('a.jpg', 'image/jpeg');
    const entry = createPhotoPreviewEntry(file);
    expect(entry.file).toBe(file);
    expect(entry.previewUrl.startsWith('blob:')).toBe(true);
    releasePhotoPreviewUrl(entry.previewUrl);
  });
});

describe('buildPhotoAdditions', () => {
  const createdUrls: string[] = [];

  afterEach(() => {
    for (const url of createdUrls) {
      releasePhotoPreviewUrl(url);
    }
    createdUrls.length = 0;
  });

  it('既存1枚 + 追加1枚でプレビュー用エントリを返す', () => {
    const result = buildPhotoAdditions(
      [makeFile('new.jpg', 'image/jpeg')],
      1,
      0,
      20
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.additions).toHaveLength(1);
    expect(result.additions[0].previewUrl.startsWith('blob:')).toBe(true);
    createdUrls.push(result.additions[0].previewUrl);
  });

  it('複数ファイルを一度に追加できる', () => {
    const result = buildPhotoAdditions(
      [
        makeFile('a.jpg', 'image/jpeg'),
        makeFile('b.png', 'image/png'),
      ],
      0,
      0,
      20
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.additions).toHaveLength(2);
    for (const entry of result.additions) {
      createdUrls.push(entry.previewUrl);
    }
  });

  it('登録済み20枚のとき追加を拒否する', () => {
    const result = buildPhotoAdditions([makeFile('x.jpg', 'image/jpeg')], 20, 0, 20);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/最大 20 枚/);
  });

  it('上限超過時はエラーを返し blob を解放する', () => {
    const result = buildPhotoAdditions(
      [makeFile('x.jpg', 'image/jpeg'), makeFile('y.jpg', 'image/jpeg')],
      19,
      0,
      20
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/最大 20 枚/);
  });

  it('不正ファイルが混ざると追加済み blob を解放してエラー', () => {
    const result = buildPhotoAdditions(
      [makeFile('ok.jpg', 'image/jpeg'), makeFile('bad.pdf', 'application/pdf')],
      0,
      0,
      20
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/画像ファイル/);
  });
});
