/** 広さ（間取り）セレクトの value / 表示ラベル（同じ） */
export const AREA_SIZE_OPTIONS: string[] = [
  '1R',
  '1K',
  '1DK',
  '1LDK',
  '1SLDK',
  '2K',
  '2DK',
  '2LDK',
  '2SLDK',
  '3K',
  '3DK',
  '3LDK',
  '3SLDK',
  '4K',
  '4DK',
  '4LDK',
  '4SLDK',
  '5K',
  '5DK',
  '5LDK',
  '5SLDK',
  '6K以上',
  '6LDK以上',
  'その他',
];

export function isKnownLayoutAreaSize(value: string): boolean {
  return AREA_SIZE_OPTIONS.includes(value.trim());
}
