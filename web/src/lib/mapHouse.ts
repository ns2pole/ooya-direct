import type { House } from '../types';

export function mapHouse(id: string, data: Record<string, unknown>): House {
  const rawPhoto = data.photoUrl;
  const photoUrl =
    typeof rawPhoto === 'string' && rawPhoto.trim() !== '' ? rawPhoto.trim() : null;
  return {
    id,
    ownerId: String(data.ownerId ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    photoUrl,
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
