import { imageFileHint, isAllowedImageFile } from './imageFile';

export const MAX_HOUSE_PHOTOS = 20;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type PendingPhotoEntry = {
  file: File;
  previewUrl: string;
};

export type PhotoSelectionResult =
  | { ok: true; additions: PendingPhotoEntry[] }
  | { ok: false; error: string };

export function createPhotoPreviewEntry(file: File): PendingPhotoEntry {
  return { file, previewUrl: URL.createObjectURL(file) };
}

export function validatePhotoFile(file: File, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!isAllowedImageFile(file)) {
    return `画像ファイル（${imageFileHint()}）を選んでください。`;
  }
  if (file.size > maxBytes) {
    return '画像は 5MB 以下にしてください。';
  }
  return null;
}

export function releasePhotoPreviewUrl(previewUrl: string): void {
  if (previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl);
  }
}

/** ファイル選択結果を検証し、プレビュー用エントリを同期的に作る */
export function buildPhotoAdditions(
  files: File[],
  existingCount: number,
  pendingCount: number,
  maxPhotos: number,
  maxBytes = MAX_IMAGE_BYTES
): PhotoSelectionResult {
  const additions: PendingPhotoEntry[] = [];

  for (const file of files) {
    const error = validatePhotoFile(file, maxBytes);
    if (error) {
      additions.forEach(({ previewUrl }) => releasePhotoPreviewUrl(previewUrl));
      return { ok: false, error };
    }
    additions.push(createPhotoPreviewEntry(file));
  }

  const nextTotal = existingCount + pendingCount + additions.length;
  if (nextTotal > maxPhotos) {
    additions.forEach(({ previewUrl }) => releasePhotoPreviewUrl(previewUrl));
    return { ok: false, error: `写真は最大 ${maxPhotos} 枚までです。` };
  }

  return { ok: true, additions };
}
