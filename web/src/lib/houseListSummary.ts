import { formatDateOnly } from '../format';
import type { House } from '../types';

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
