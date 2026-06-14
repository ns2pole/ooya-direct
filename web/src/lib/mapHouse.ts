import { legacyPhotoUrlsFromHouse } from './housePhotos';
import type { House } from '../types';

function resolveCoverPhotoUrl(data: Record<string, unknown>): string | null {
  const cover = data.coverPhotoUrl;
  if (typeof cover === 'string' && cover.trim() !== '') {
    return cover.trim();
  }
  const legacy = legacyPhotoUrlsFromHouse(data);
  return legacy[0] ?? null;
}

/** 一覧・サムネイル用の代表画像 */
export function houseCoverPhoto(h: Pick<House, 'coverPhotoUrl'>): string | null {
  return h.coverPhotoUrl;
}

export function mapHouse(id: string, data: Record<string, unknown>): House {
  return {
    id,
    ownerId: String(data.ownerId ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    coverPhotoUrl: resolveCoverPhotoUrl(data),
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
