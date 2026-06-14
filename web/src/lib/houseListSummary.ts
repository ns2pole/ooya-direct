import { isKnownLayoutAreaSize } from '../constants/areaSizeOptions';
import { formatDateOnly } from '../format';
import type { House } from '../types';
import { houseLocationLine } from './mapHouse';

export type HouseListSummary = {
  title: string;
  location: string;
  rent: string | null;
  areaSize: string | null;
  listedDate: string;
};

export function houseListSummaryLines(h: House): HouseListSummary {
  const location = houseLocationLine(h);
  return {
    title: h.title.trim() || '（無題）',
    location,
    rent: h.rent.trim() ? `家賃 ${h.rent.trim()}` : null,
    areaSize: isKnownLayoutAreaSize(h.areaSize) ? h.areaSize : null,
    listedDate: formatDateOnly(h.createdAt),
  };
}

export function clampCarouselIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}
