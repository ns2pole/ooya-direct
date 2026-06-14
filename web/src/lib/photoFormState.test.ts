import { describe, expect, it } from 'vitest';
import type { HousePhoto } from '../types';
import {
  activeExistingPhotos,
  createInitialPhotoFormState,
  pendingPhotoCount,
  photoFormReducer,
  totalPhotoCount,
} from './photoFormState';
import { createPhotoPreviewEntry, releasePhotoPreviewUrl } from './photoFileSelection';

function existingPhoto(id: string): HousePhoto {
  return { id, url: `https://example.com/${id}.jpg`, order: 0, label: null, createdAt: null };
}

function makeFile(name = 'new.jpg'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
}

describe('photoFormReducer', () => {
  it('ADD_PENDING: 登録済み1枚の状態で追加すると pending に入る', () => {
    const state = createInitialPhotoFormState([existingPhoto('p1')]);
    const entry = createPhotoPreviewEntry(makeFile());

    const next = photoFormReducer(state, { type: 'ADD_PENDING', additions: [entry] });

    expect(activeExistingPhotos(next)).toHaveLength(1);
    expect(next.pending).toHaveLength(1);
    expect(pendingPhotoCount(next)).toBe(1);
    expect(totalPhotoCount(next)).toBe(2);

    releasePhotoPreviewUrl(entry.previewUrl);
  });

  it('LOAD_EXISTING: 再読込しても pending は消えない（preservePending: true）', () => {
    const entry = createPhotoPreviewEntry(makeFile());
    const withPending = photoFormReducer(createInitialPhotoFormState([existingPhoto('p1')]), {
      type: 'ADD_PENDING',
      additions: [entry],
    });

    const reloaded = photoFormReducer(withPending, {
      type: 'LOAD_EXISTING',
      photos: [existingPhoto('p1'), existingPhoto('p2')],
      preservePending: true,
    });

    expect(activeExistingPhotos(reloaded)).toHaveLength(2);
    expect(reloaded.pending).toHaveLength(1);
    expect(pendingPhotoCount(reloaded)).toBe(1);

    releasePhotoPreviewUrl(entry.previewUrl);
  });

  it('LOAD_EXISTING: preservePending: false なら pending をクリア', () => {
    const entry = createPhotoPreviewEntry(makeFile());
    const withPending = photoFormReducer(createInitialPhotoFormState([]), {
      type: 'ADD_PENDING',
      additions: [entry],
    });

    const reloaded = photoFormReducer(withPending, {
      type: 'LOAD_EXISTING',
      photos: [existingPhoto('p1')],
      preservePending: false,
    });

    expect(reloaded.pending).toHaveLength(0);
    releasePhotoPreviewUrl(entry.previewUrl);
  });

  it('APPLY_SAVED: 保存後 pending を空にして existing を更新', () => {
    const entry = createPhotoPreviewEntry(makeFile());
    const withPending = photoFormReducer(createInitialPhotoFormState([]), {
      type: 'ADD_PENDING',
      additions: [entry],
    });

    const saved = photoFormReducer(withPending, {
      type: 'APPLY_SAVED',
      photos: [existingPhoto('saved1')],
    });

    expect(saved.pending).toHaveLength(0);
    expect(activeExistingPhotos(saved)).toHaveLength(1);
    expect(activeExistingPhotos(saved)[0].id).toBe('saved1');
  });
});
