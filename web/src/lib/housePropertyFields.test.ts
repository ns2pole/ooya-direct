import { describe, expect, it } from 'vitest';
import type { House } from '../types';
import {
  EMPTY_HOUSE_PROPERTY_FIELDS,
  housePropertyDetailRows,
  housePropertyListSummary,
  housePropertyListChips,
  trimHousePropertyFields,
} from './housePropertyFields';

function mockHouse(overrides: Partial<House> = {}): House {
  return {
    id: 'h1',
    ownerId: 'u1',
    title: 'テスト物件1',
    description: '',
    coverPhotoUrl: null,
    prefecture: '三重県',
    city: '名張市',
    town: '桔梗が丘一番町',
    createdAt: null,
    updatedAt: null,
    ...EMPTY_HOUSE_PROPERTY_FIELDS,
    rent: '6万円',
    managementFee: '5000円',
    genre: 'マンション',
    depositKeyMoney: '1ヶ月/1ヶ月',
    areaSize: '5LDK',
    floorArea: '45㎡',
    floors: '3階建 / 2階',
    buildingAge: '築15年',
    ...overrides,
  };
}

describe('housePropertyDetailRows', () => {
  it('画像の項目順で表示行を返す', () => {
    expect(housePropertyDetailRows(mockHouse())).toEqual([
      { label: '家賃', value: '6万円' },
      { label: '管理費等', value: '5000円' },
      { label: 'ジャンル', value: 'マンション' },
      { label: '敷/礼', value: '1ヶ月/1ヶ月' },
      { label: '間取り', value: '5LDK' },
      { label: '面積', value: '45㎡' },
      { label: '階建', value: '3階建 / 2階' },
      { label: '築年数', value: '築15年' },
      { label: '地域', value: '三重県 名張市 桔梗が丘一番町' },
    ]);
  });

  it('空の項目は省略する', () => {
    expect(housePropertyDetailRows(mockHouse({ managementFee: '', genre: '' }))).toEqual([
      { label: '家賃', value: '6万円' },
      { label: '敷/礼', value: '1ヶ月/1ヶ月' },
      { label: '間取り', value: '5LDK' },
      { label: '面積', value: '45㎡' },
      { label: '階建', value: '3階建 / 2階' },
      { label: '築年数', value: '築15年' },
      { label: '地域', value: '三重県 名張市 桔梗が丘一番町' },
    ]);
  });
});

describe('housePropertyListSummary', () => {
  it('一覧用に家賃行とコンパクト行を返す', () => {
    expect(housePropertyListSummary(mockHouse())).toEqual({
      rows: [
        { label: '家賃', value: '6万円' },
        { label: '管理費等', value: '5000円' },
        { label: '敷/礼', value: '1ヶ月/1ヶ月' },
      ],
      compactParts: [
        { label: '間取り', value: '5LDK' },
        { label: '階建', value: '3階建 / 2階' },
        { label: '築年数', value: '築15年' },
      ],
    });
  });

  it('ジャンル・面積・地域は含めない', () => {
    const summary = housePropertyListSummary(mockHouse());
    const labels = [
      ...summary.rows.map((r) => r.label),
      ...summary.compactParts.map((r) => r.label),
    ];
    expect(labels).not.toContain('ジャンル');
    expect(labels).not.toContain('面積');
    expect(labels).not.toContain('地域');
  });
});

describe('housePropertyListChips', () => {
  it('一覧用の短いチップを返す', () => {
    expect(housePropertyListChips(mockHouse())).toEqual([
      '家賃 6万円',
      '5LDK',
      '45㎡',
      'マンション',
    ]);
  });
});

describe('trimHousePropertyFields', () => {
  it('前後空白を除去する', () => {
    expect(trimHousePropertyFields({ ...EMPTY_HOUSE_PROPERTY_FIELDS, rent: ' 6万円 ' }).rent).toBe(
      '6万円'
    );
  });
});
