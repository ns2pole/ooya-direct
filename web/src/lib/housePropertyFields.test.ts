import { describe, expect, it } from 'vitest';
import type { House } from '../types';
import {
  EMPTY_HOUSE_PROPERTY_FIELDS,
  hrefForReferenceUrl,
  housePropertyDetailRows,
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

  it('参考リンクは地域の後に出し、未設定なら省略する', () => {
    expect(
      housePropertyDetailRows(mockHouse({ referenceUrl: 'https://www.yahoo.co.jp' })).at(-1)
    ).toEqual({
      label: '参考リンク',
      value: 'https://www.yahoo.co.jp',
      href: 'https://www.yahoo.co.jp',
    });
    expect(
      housePropertyDetailRows(mockHouse({ referenceUrl: '' })).map((r) => r.label)
    ).not.toContain('参考リンク');
  });
});

describe('hrefForReferenceUrl', () => {
  it('空は null、スキームなしは https を補う', () => {
    expect(hrefForReferenceUrl('')).toBeNull();
    expect(hrefForReferenceUrl('www.yahoo.co.jp')).toBe('https://www.yahoo.co.jp');
    expect(hrefForReferenceUrl('https://www.yahoo.co.jp')).toBe('https://www.yahoo.co.jp');
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
