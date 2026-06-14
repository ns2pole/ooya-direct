const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

/** macOS などで file.type が空になる場合も拡張子で判定 */
export function isAllowedImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext !== undefined && IMAGE_EXT.has(ext);
}

export function imageFileHint(): string {
  return 'JPEG / PNG / GIF / WebP';
}
