/** 物件ジャンル（種別） */
export const HOUSE_GENRE_OPTIONS: string[] = [
  'マンション',
  'アパート',
  '一戸建て',
  'テラスハウス',
  'その他',
];

export function isKnownHouseGenre(value: string): boolean {
  return HOUSE_GENRE_OPTIONS.includes(value.trim());
}
