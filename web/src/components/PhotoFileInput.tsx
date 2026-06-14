import {
  buildPhotoAdditions,
  MAX_HOUSE_PHOTOS,
  type PendingPhotoEntry,
} from '../lib/photoFileSelection';

type Props = {
  existingCount: number;
  pendingCount: number;
  disabled?: boolean;
  onAdditions: (additions: PendingPhotoEntry[]) => void;
  onError: (message: string) => void;
};

export function PhotoFileInput({
  existingCount,
  pendingCount,
  disabled = false,
  onAdditions,
  onError,
}: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;

    const result = buildPhotoAdditions(
      Array.from(files),
      existingCount,
      pendingCount,
      MAX_HOUSE_PHOTOS
    );

    if (!result.ok) {
      onError(result.error);
      return;
    }

    onAdditions(result.additions);
  }

  return (
    <label className="file-picker">
      <span className="btn ghost">写真ファイルを選ぶ</span>
      <input
        type="file"
        accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.gif,.webp"
        multiple
        onChange={handleChange}
        disabled={disabled}
        data-testid="photo-file-input"
      />
    </label>
  );
}
