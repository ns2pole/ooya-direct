import type { HousePhoto } from '../types';
import type { PendingPhotoEntry } from './photoFileSelection';
import { releasePhotoPreviewUrl } from './photoFileSelection';

export type PhotoFormState = {
  existing: HousePhoto[];
  pending: PendingPhotoEntry[];
  removedIds: Set<string>;
};

export type PhotoFormAction =
  | { type: 'ADD_PENDING'; additions: PendingPhotoEntry[] }
  | { type: 'REMOVE_PENDING'; index: number }
  | { type: 'REMOVE_EXISTING'; photoId: string }
  | { type: 'LOAD_EXISTING'; photos: HousePhoto[]; preservePending?: boolean }
  | { type: 'APPLY_SAVED'; photos: HousePhoto[] };

export function createInitialPhotoFormState(existing: HousePhoto[] = []): PhotoFormState {
  return { existing, pending: [], removedIds: new Set() };
}

export function activeExistingPhotos(state: PhotoFormState): HousePhoto[] {
  return state.existing.filter((p) => !state.removedIds.has(p.id));
}

export function pendingPhotoCount(state: PhotoFormState): number {
  return state.pending.length;
}

export function totalPhotoCount(state: PhotoFormState): number {
  return activeExistingPhotos(state).length + state.pending.length;
}

export function photoFormReducer(state: PhotoFormState, action: PhotoFormAction): PhotoFormState {
  switch (action.type) {
    case 'ADD_PENDING':
      return { ...state, pending: [...state.pending, ...action.additions] };

    case 'REMOVE_PENDING': {
      const pending = [...state.pending];
      const [removed] = pending.splice(action.index, 1);
      if (removed) releasePhotoPreviewUrl(removed.previewUrl);
      return { ...state, pending };
    }

    case 'REMOVE_EXISTING': {
      const removedIds = new Set(state.removedIds);
      removedIds.add(action.photoId);
      return { ...state, removedIds };
    }

    case 'LOAD_EXISTING': {
      const preservePending = action.preservePending ?? true;
      if (preservePending) {
        return { ...state, existing: action.photos, removedIds: new Set() };
      }
      state.pending.forEach(({ previewUrl }) => releasePhotoPreviewUrl(previewUrl));
      return { existing: action.photos, pending: [], removedIds: new Set() };
    }

    case 'APPLY_SAVED': {
      state.pending.forEach(({ previewUrl }) => releasePhotoPreviewUrl(previewUrl));
      return { existing: action.photos, pending: [], removedIds: new Set() };
    }
  }
}

/** ref 同期付きで pending を追加 */
export function appendPendingPhotos(
  state: PhotoFormState,
  additions: PendingPhotoEntry[]
): PhotoFormState {
  return photoFormReducer(state, { type: 'ADD_PENDING', additions });
}
