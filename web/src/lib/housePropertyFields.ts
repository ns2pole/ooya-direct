import { isKnownLayoutAreaSize } from '../constants/areaSizeOptions';
import { isKnownHouseGenre } from '../constants/houseGenreOptions';
import type { House } from '../types';
import { houseLocationLine } from './mapHouse';

export type HousePropertyFields = {
  rent: string;
  managementFee: string;
  genre: string;
  depositKeyMoney: string;
  areaSize: string;
  floorArea: string;
  floors: string;
  buildingAge: string;
  referenceUrl: string;
};

export const EMPTY_HOUSE_PROPERTY_FIELDS: HousePropertyFields = {
  rent: '',
  managementFee: '',
  genre: '',
  depositKeyMoney: '',
  areaSize: '',
  floorArea: '',
  floors: '',
  buildingAge: '',
  referenceUrl: '',
};

export const HOUSE_PROPERTY_FIELD_KEYS = [
  'rent',
  'managementFee',
  'genre',
  'depositKeyMoney',
  'areaSize',
  'floorArea',
  'floors',
  'buildingAge',
  'referenceUrl',
] as const satisfies readonly (keyof HousePropertyFields)[];

export type DetailRow = {
  label: string;
  value: string;
  /** 設定時は外部リンクとして描画 */
  href?: string;
};

const DETAIL_SPECS: { key: keyof HousePropertyFields; label: string }[] = [
  { key: 'rent', label: '家賃' },
  { key: 'managementFee', label: '管理費等' },
  { key: 'genre', label: 'ジャンル' },
  { key: 'depositKeyMoney', label: '敷/礼' },
  { key: 'areaSize', label: '間取り' },
  { key: 'floorArea', label: '面積' },
  { key: 'floors', label: '階建' },
  { key: 'buildingAge', label: '築年数' },
];

/** 表示用に http(s) を補完する。空や不正っぽい値はそのまま返す */
export function hrefForReferenceUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;
  if (/^[a-z0-9][a-z0-9-]*\./i.test(value)) return `https://${value}`;
  return value;
}

export function readHousePropertyFields(data: Record<string, unknown>): HousePropertyFields {
  return {
    rent: String(data.rent ?? ''),
    managementFee: String(data.managementFee ?? ''),
    genre: String(data.genre ?? ''),
    depositKeyMoney: String(data.depositKeyMoney ?? ''),
    areaSize: String(data.areaSize ?? ''),
    floorArea: String(data.floorArea ?? ''),
    floors: String(data.floors ?? ''),
    buildingAge: String(data.buildingAge ?? ''),
    referenceUrl: String(data.referenceUrl ?? ''),
  };
}

export function trimHousePropertyFields(fields: HousePropertyFields): HousePropertyFields {
  const trimmed = {} as HousePropertyFields;
  for (const key of HOUSE_PROPERTY_FIELD_KEYS) {
    trimmed[key] = fields[key].trim();
  }
  return trimmed;
}

function rowIfValue(label: string, value: string): DetailRow | null {
  const v = value.trim();
  return v ? { label, value: v } : null;
}

export function housePropertyDetailRows(h: House): DetailRow[] {
  const rows: DetailRow[] = [];
  for (const { key, label } of DETAIL_SPECS) {
    const row = rowIfValue(label, h[key]);
    if (row) rows.push(row);
  }
  const location = houseLocationLine(h);
  if (location) rows.push({ label: '地域', value: location });
  const referenceUrl = h.referenceUrl.trim();
  if (referenceUrl) {
    const href = hrefForReferenceUrl(referenceUrl);
    rows.push({
      label: '参考リンク',
      value: referenceUrl,
      ...(href ? { href } : {}),
    });
  }
  return rows;
}

export function housePropertyListChips(h: House): string[] {
  const chips: string[] = [];
  if (h.rent.trim()) chips.push(`家賃 ${h.rent.trim()}`);
  if (isKnownLayoutAreaSize(h.areaSize)) chips.push(h.areaSize);
  else if (h.areaSize.trim()) chips.push(h.areaSize.trim());
  if (h.floorArea.trim()) chips.push(h.floorArea.trim());
  if (isKnownHouseGenre(h.genre)) chips.push(h.genre);
  else if (h.genre.trim()) chips.push(h.genre.trim());
  return chips;
}

export function housePropertyFieldsToPayload(fields: HousePropertyFields): HousePropertyFields {
  return trimHousePropertyFields(fields);
}
