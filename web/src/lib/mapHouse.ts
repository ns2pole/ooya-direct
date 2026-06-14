import type { House } from '../types';

function parsePhotoUrls(data: Record<string, unknown>): string[] {
  const rawList = data.photoUrls;
  if (Array.isArray(rawList)) {
    const urls = rawList
      .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
      .map((u) => u.trim());
    if (urls.length > 0) return urls;
  }
  const rawSingle = data.photoUrl;
  if (typeof rawSingle === 'string' && rawSingle.trim() !== '') {
    return [rawSingle.trim()];
  }
  return [];
}

/** 一覧・サムネイル用の代表画像 */
export function houseCoverPhoto(h: Pick<House, 'photoUrls'>): string | null {
  return h.photoUrls[0] ?? null;
}

export function mapHouse(id: string, data: Record<string, unknown>): House {
  return {
    id,
    ownerId: String(data.ownerId ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    photoUrls: parsePhotoUrls(data),
    prefecture: String(data.prefecture ?? ''),
    city: String(data.city ?? ''),
    town: String(data.town ?? ''),
    rent: String(data.rent ?? ''),
    areaSize: String(data.areaSize ?? ''),
    createdAt: (data.createdAt as House['createdAt']) ?? null,
    updatedAt: (data.updatedAt as House['updatedAt']) ?? null,
  };
}

export function houseLocationLine(h: Pick<House, 'prefecture' | 'city' | 'town'>): string {
  return [h.prefecture, h.city, h.town].filter((s) => s.trim() !== '').join(' ');
}
