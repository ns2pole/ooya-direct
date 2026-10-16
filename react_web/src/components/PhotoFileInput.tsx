import { useRef } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = input.files;
    if (!files?.length) return;

    const result = buildPhotoAdditions(
      Array.from(files),
      existingCount,
      pendingCount,
      MAX_HOUSE_PHOTOS
    );

    // Safari: 同じファイルを再選択できるよう、処理後に value をクリア
    window.setTimeout(() => {
      input.value = '';
    }, 0);

    if (!result.ok) {
      onError(result.error);
      return;
    }

    onAdditions(result.additions);
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  return (
    <div className="file-picker">
      <button type="button" className="btn ghost" onClick={openPicker} disabled={disabled}>
        写真ファイルを選ぶ
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.gif,.webp"
        multiple
        onChange={handleChange}
        disabled={disabled}
        data-testid="photo-file-input"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
