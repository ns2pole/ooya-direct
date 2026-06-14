import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { deleteHousePhotoByUrl, getDb, messageForHouseFormSaveError, uploadHousePhoto } from '../firebase';
import type { HousePhoto } from '../types';

export const MAX_HOUSE_PHOTOS = 20;

export type HouseTextFields = {
  title: string;
  description: string;
  prefecture: string;
  city: string;
  town: string;
  rent: string;
  areaSize: string;
};

export type SaveProgressStep = 'upload' | 'photos' | 'house';

export type SaveHousePhotosInput = {
  existing: HousePhoto[];
  removedIds: Set<string>;
  pendingFiles: File[];
};

export type SaveHouseWithPhotosInput = {
  houseId: string;
  ownerId: string;
  textFields: HouseTextFields;
  existing: HousePhoto[];
  removedIds: Set<string>;
  pendingFiles: File[];
  photoChanged: boolean;
  onProgress?: (step: SaveProgressStep, detail?: string) => void;
};

function photosCol(houseId: string) {
  return collection(getDb(), 'houses', houseId, 'photos');
}

function stepError(step: string, err: unknown): Error {
  const detail = messageForHouseFormSaveError(err);
  return new Error(`【${step}】${detail}`);
}

/** 旧 houses.photoUrl / photoUrls から URL 一覧を抽出（移行用） */
export function legacyPhotoUrlsFromHouse(data: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  function add(raw: unknown) {
    if (typeof raw !== 'string') return;
    const url = raw.trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  }

  const rawList = data.photoUrls;
  if (Array.isArray(rawList)) {
    for (const item of rawList) add(item);
  }
  if (urls.length === 0) {
    add(data.photoUrl);
  }
  return urls;
}

export function mapHousePhoto(id: string, data: Record<string, unknown>): HousePhoto {
  const rawOrder = data.order;
  const order = typeof rawOrder === 'number' && Number.isFinite(rawOrder) ? rawOrder : 0;
  const rawLabel = data.label;
  const label =
    rawLabel == null || String(rawLabel).trim() === '' ? null : String(rawLabel).trim();
  return {
    id,
    url: String(data.url ?? ''),
    order,
    label,
    createdAt: (data.createdAt as HousePhoto['createdAt']) ?? null,
  };
}

export async function listHousePhotos(houseId: string): Promise<HousePhoto[]> {
  const q = query(photosCol(houseId), orderBy('order', 'asc'));
  const snap = await getDocs(q);
  const list: HousePhoto[] = [];
  snap.forEach((d) => {
    list.push(mapHousePhoto(d.id, d.data() as Record<string, unknown>));
  });
  return list;
}

function newPhotoDoc(url: string, order: number): DocumentData {
  return {
    url,
    order: Math.floor(order),
    createdAt: serverTimestamp(),
  };
}

export function buildHouseUpdatePayload(
  ownerId: string,
  textFields: HouseTextFields,
  savedPhotos: HousePhoto[]
): Record<string, unknown> {
  return {
    ownerId,
    title: textFields.title.trim(),
    description: textFields.description.trim(),
    prefecture: textFields.prefecture.trim(),
    city: textFields.city.trim(),
    town: textFields.town.trim(),
    rent: textFields.rent.trim(),
    areaSize: textFields.areaSize.trim(),
    photoUrl: deleteField(),
    photoUrls: deleteField(),
    ...(savedPhotos.length > 0
      ? { coverPhotoUrl: savedPhotos[0].url }
      : { coverPhotoUrl: deleteField() }),
    updatedAt: serverTimestamp(),
  };
}

/** 旧形式の画像 URL を photos サブコレクションへ移行 */
export async function migrateLegacyPhotos(
  houseId: string,
  houseData: Record<string, unknown>
): Promise<HousePhoto[]> {
  const current = await listHousePhotos(houseId);
  if (current.length > 0) return current;

  const legacyUrls = legacyPhotoUrlsFromHouse(houseData);
  if (legacyUrls.length === 0) return [];

  for (let i = 0; i < legacyUrls.length; i++) {
    await addDoc(photosCol(houseId), newPhotoDoc(legacyUrls[i], i));
  }

  return listHousePhotos(houseId);
}

export async function loadHousePhotosForDisplay(
  houseId: string,
  houseData: Record<string, unknown>
): Promise<HousePhoto[]> {
  const photos = await listHousePhotos(houseId);
  if (photos.length > 0) return photos;
  return migrateLegacyPhotos(houseId, houseData);
}

async function applyPhotoChanges(
  houseId: string,
  input: SaveHousePhotosInput,
  onProgress?: (step: SaveProgressStep, detail?: string) => void
): Promise<HousePhoto[]> {
  const { existing, removedIds, pendingFiles } = input;

  for (const photo of existing) {
    if (!removedIds.has(photo.id)) continue;
    try {
      await deleteDoc(doc(getDb(), 'houses', houseId, 'photos', photo.id));
      await deleteHousePhotoByUrl(photo.url).catch(() => undefined);
    } catch (err) {
      throw stepError('写真の削除', err);
    }
  }

  const kept = existing.filter((p) => !removedIds.has(p.id));
  let nextOrder = kept.length > 0 ? Math.max(...kept.map((p) => p.order)) + 1 : 0;

  for (let i = 0; i < pendingFiles.length; i++) {
    const file = pendingFiles[i];
    onProgress?.('upload', `${i + 1}/${pendingFiles.length} 枚目`);
    let url: string;
    try {
      url = await uploadHousePhoto(houseId, file);
    } catch (err) {
      throw stepError('画像のアップロード（Storage）', err);
    }
    try {
      onProgress?.('photos', `${i + 1}/${pendingFiles.length} 枚目`);
      await addDoc(photosCol(houseId), newPhotoDoc(url, nextOrder));
    } catch (err) {
      throw stepError('photos サブコレクションへの保存', err);
    }
    nextOrder += 1;
  }

  return listHousePhotos(houseId);
}

/** 写真の追加・削除と物件ドキュメント更新を一括実行 */
export async function saveHouseWithPhotos(
  input: SaveHouseWithPhotosInput
): Promise<HousePhoto[]> {
  const {
    houseId,
    ownerId,
    textFields,
    existing,
    removedIds,
    pendingFiles,
    photoChanged,
    onProgress,
  } = input;

  let saved: HousePhoto[];
  if (photoChanged) {
    saved = await applyPhotoChanges(
      houseId,
      { existing, removedIds, pendingFiles },
      onProgress
    );
  } else {
    saved = existing.filter((p) => !removedIds.has(p.id));
  }

  onProgress?.('house');
  try {
    await updateDoc(
      doc(getDb(), 'houses', houseId),
      buildHouseUpdatePayload(ownerId, textFields, saved)
    );
  } catch (err) {
    throw stepError('物件情報の保存', err);
  }

  return saved;
}

/** 物件削除時に photos サブコレクションと Storage を片付け */
export async function deleteAllHousePhotos(houseId: string): Promise<void> {
  const photos = await listHousePhotos(houseId);
  await Promise.all(
    photos.map(async (photo) => {
      await deleteDoc(doc(getDb(), 'houses', houseId, 'photos', photo.id));
      await deleteHousePhotoByUrl(photo.url).catch(() => undefined);
    })
  );
}

export function photoUrlsFromList(photos: HousePhoto[]): string[] {
  return photos.map((p) => p.url);
}

export function progressStepLabel(step: SaveProgressStep, detail?: string): string {
  switch (step) {
    case 'upload':
      return detail ? `画像をアップロード中…（${detail}）` : '画像をアップロード中…';
    case 'photos':
      return detail ? `photos へ保存中…（${detail}）` : 'photos へ保存中…';
    case 'house':
      return '物件情報を保存中…';
  }
}
