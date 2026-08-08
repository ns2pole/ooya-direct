import { formatDateOnly } from '../format';
import type { House } from '../types';

/** 一覧で選択中の物件を表すクエリキー（例: /?house=abc） */
export const HOUSE_LIST_QUERY_KEY = 'house';

export type HouseListSummary = {
  title: string;
  listedDate: string;
};

export function houseListSummaryLines(h: House): HouseListSummary {
  return {
    title: h.title.trim() || '（無題）',
    listedDate: formatDateOnly(h.createdAt),
  };
}

export function clampCarouselIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

/** URL の house id から一覧インデックスを解決。無い・不正なら 0 */
export function indexForHouseId(houses: readonly { id: string }[], houseId: string | null): number {
  if (!houseId || houses.length === 0) return 0;
  const index = houses.findIndex((h) => h.id === houseId);
  return index >= 0 ? index : 0;
}

export function homePathForHouse(houseId: string): string {
  const params = new URLSearchParams({ [HOUSE_LIST_QUERY_KEY]: houseId });
  return `/?${params.toString()}`;
}
