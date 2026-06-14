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
] as const satisfies readonly (keyof HousePropertyFields)[];

type DetailRow = { label: string; value: string };

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

const LIST_ROW_KEYS = ['rent', 'managementFee', 'depositKeyMoney'] as const satisfies readonly (keyof HousePropertyFields)[];
const LIST_COMPACT_KEYS = ['areaSize', 'floors', 'buildingAge'] as const satisfies readonly (keyof HousePropertyFields)[];

function labelForKey(key: keyof HousePropertyFields): string {
  return DETAIL_SPECS.find((s) => s.key === key)?.label ?? key;
}

export type HouseListPropertySummary = {
  rows: DetailRow[];
  /** 間取り・階建・築年数（値のみ・空は省略） */
  compactValues: string[];
};

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
  return rows;
}

/** 物件一覧カルーセル用: 地域→家賃等は行、間取り・階建・築年数は1行にまとめる */
export function housePropertyListSummary(h: House): HouseListPropertySummary {
  const rows: DetailRow[] = [];
  const location = houseLocationLine(h);
  if (location) {
    rows.push({ label: '地域', value: location });
  }
  for (const key of LIST_ROW_KEYS) {
    const row = rowIfValue(labelForKey(key), h[key]);
    if (row) rows.push(row);
  }
  const compactValues: string[] = [];
  for (const key of LIST_COMPACT_KEYS) {
    const value = h[key].trim();
    if (value) compactValues.push(value);
  }
  return { rows, compactValues };
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
