const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif']);

/** macOS などで file.type が空になる場合も拡張子で判定 */
export function isAllowedImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext !== undefined && IMAGE_EXT.has(ext);
}

export function imageFileHint(): string {
  return 'JPEG / PNG / GIF / WebP / HEIC';
}

/** フォーム内プレビュー用（Safari でも表示されやすい data URL） */
export function readImagePreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('画像の読み込みに失敗しました。'));
    reader.readAsDataURL(file);
  });
}
