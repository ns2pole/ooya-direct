import { MAX_HOUSE_PHOTOS } from '../lib/housePhotos';
import type { PendingPhotoEntry } from '../lib/photoFileSelection';
import { PhotoFileInput } from './PhotoFileInput';
import type { HousePhoto } from '../types';

type Props = {
  existingPhotos: HousePhoto[];
  pendingPhotos: PendingPhotoEntry[];
  onPendingChange: (pending: PendingPhotoEntry[]) => void;
  onRemoveExisting: (photoId: string) => void;
  onRemovePending: (index: number) => void;
  onSelectionError?: (message: string) => void;
};

export function HouseFormPhotoSection({
  existingPhotos,
  pendingPhotos,
  onPendingChange,
  onRemoveExisting,
  onRemovePending,
  onSelectionError,
}: Props) {
  const activeExisting = existingPhotos;
  const totalCount = activeExisting.length + pendingPhotos.length;
  const pendingCount = pendingPhotos.length;

  function handleAdditions(additions: PendingPhotoEntry[]) {
    onPendingChange([...pendingPhotos, ...additions]);
  }

  return (
    <div className="field">
      <span>写真（任意・各 5MB 以下・最大 {MAX_HOUSE_PHOTOS} 枚）</span>
      <PhotoFileInput
        existingCount={activeExisting.length}
        pendingCount={pendingCount}
        disabled={totalCount >= MAX_HOUSE_PHOTOS}
        onAdditions={handleAdditions}
        onError={(msg) => onSelectionError?.(msg)}
      />
      <p className="muted small" style={{ margin: 0 }}>
        ファイルを選ぶと下にプレビューが増えます（「新規」バッジ付き）。
        <strong> 追加・削除は「保存」ボタンを押すまで確定しません。</strong>
        保存後、詳細ページで ‹ › ボタンで切り替えられます。
        {totalCount > 0
          ? ` 登録済み ${activeExisting.length} 枚` +
            (pendingCount > 0 ? ` + 追加予定 ${pendingCount} 枚` : '')
          : ''}
      </p>
      {pendingCount > 0 ? (
        <p className="text-success small photo-selection-feedback" style={{ margin: '0.5rem 0 0' }}>
          追加予定 {pendingCount} 枚があります。「保存」を押してください。
        </p>
      ) : null}
      {totalCount > 0 ? (
        <ul className="house-form-photos">
          {activeExisting.map((photo) => (
            <li key={photo.id} className="house-form-photo-item">
              <img src={photo.url} alt="" width={140} height={100} />
              <button
                type="button"
                className="house-form-photo-remove"
                onClick={() => onRemoveExisting(photo.id)}
                aria-label="この写真を削除"
              >
                削除
              </button>
            </li>
          ))}
          {pendingPhotos.map(({ previewUrl, file }, i) => (
            <li key={previewUrl} className="house-form-photo-item">
              <img src={previewUrl} alt="" width={140} height={100} />
              <span className="house-form-photo-badge">新規</span>
              <button
                type="button"
                className="house-form-photo-remove"
                onClick={() => onRemovePending(i)}
                aria-label={`${file.name} を削除`}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
