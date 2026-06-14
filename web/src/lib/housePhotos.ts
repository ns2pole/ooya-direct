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
import { deleteHousePhotoByUrl, getDb, uploadHousePhoto } from '../firebase';
import type { HousePhoto } from '../types';

export const MAX_HOUSE_PHOTOS = 20;

function photosCol(houseId: string) {
  return collection(getDb(), 'houses', houseId, 'photos');
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

/** 旧形式の画像 URL を photos サブコレクションへ移行し、legacy フィールドを削除 */
export async function migrateLegacyPhotos(
  houseId: string,
  houseData: Record<string, unknown>
): Promise<HousePhoto[]> {
  const current = await listHousePhotos(houseId);
  if (current.length > 0) return current;

  const legacyUrls = legacyPhotoUrlsFromHouse(houseData);
  if (legacyUrls.length === 0) return [];

  for (let i = 0; i < legacyUrls.length; i++) {
    await addDoc(photosCol(houseId), {
      url: legacyUrls[i],
      order: i,
      label: null,
      createdAt: serverTimestamp(),
    });
  }

  await syncHouseCoverPhoto(houseId, legacyUrls[0] ?? null, { removeLegacyFields: true });
  return listHousePhotos(houseId);
}

/** 物件ドキュメントの coverPhotoUrl を先頭写真と同期（legacy フィールドは任意で削除） */
export async function syncHouseCoverPhoto(
  houseId: string,
  coverUrl: string | null,
  options?: { removeLegacyFields?: boolean }
): Promise<void> {
  const payload: DocumentData = {
    updatedAt: serverTimestamp(),
  };
  if (coverUrl) {
    payload.coverPhotoUrl = coverUrl;
  } else {
    payload.coverPhotoUrl = deleteField();
  }
  if (options?.removeLegacyFields) {
    payload.photoUrl = deleteField();
    payload.photoUrls = deleteField();
  }
  await updateDoc(doc(getDb(), 'houses', houseId), payload);
}

export async function loadHousePhotosForDisplay(
  houseId: string,
  houseData: Record<string, unknown>
): Promise<HousePhoto[]> {
  const photos = await listHousePhotos(houseId);
  if (photos.length > 0) return photos;
  return migrateLegacyPhotos(houseId, houseData);
}

export type SaveHousePhotosInput = {
  existing: HousePhoto[];
  removedIds: Set<string>;
  pendingFiles: File[];
};

/** サブコレクションへの追加・削除を反映し、最新一覧を返す */
export async function saveHousePhotos(
  houseId: string,
  input: SaveHousePhotosInput
): Promise<HousePhoto[]> {
  const { existing, removedIds, pendingFiles } = input;

  for (const photo of existing) {
    if (!removedIds.has(photo.id)) continue;
    await deleteDoc(doc(getDb(), 'houses', houseId, 'photos', photo.id));
    await deleteHousePhotoByUrl(photo.url).catch(() => undefined);
  }

  const kept = existing.filter((p) => !removedIds.has(p.id));
  let nextOrder =
    kept.length > 0 ? Math.max(...kept.map((p) => p.order)) + 1 : 0;

  for (const file of pendingFiles) {
    const url = await uploadHousePhoto(houseId, file);
    await addDoc(photosCol(houseId), {
      url,
      order: nextOrder,
      label: null,
      createdAt: serverTimestamp(),
    });
    nextOrder += 1;
  }

  const saved = await listHousePhotos(houseId);
  await syncHouseCoverPhoto(houseId, saved[0]?.url ?? null, { removeLegacyFields: true });
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
