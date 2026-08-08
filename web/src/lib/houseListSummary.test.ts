import { describe, expect, it } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type { House } from '../types';
import { EMPTY_HOUSE_PROPERTY_FIELDS } from './housePropertyFields';
import { homePathForHouse, houseListSummaryLines, indexForHouseId } from './houseListSummary';

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
    ...EMPTY_HOUSE_PROPERTY_FIELDS,
    rent: '6万円',
    areaSize: '5LDK',
    createdAt: { toDate: () => new Date('2026-05-11') } as Timestamp,
    updatedAt: null,
    ...overrides,
  };
}

describe('houseListSummaryLines', () => {
  it('タイトルと掲載日を返す', () => {
    expect(houseListSummaryLines(mockHouse())).toEqual({
      title: 'テスト物件1',
      listedDate: '2026/5/11',
    });
  });

  it('タイトルが空のときは（無題）', () => {
    expect(houseListSummaryLines(mockHouse({ title: '' })).title).toBe('（無題）');
  });

  it('createdAt がないとき listedDate は —', () => {
    expect(houseListSummaryLines(mockHouse({ createdAt: null })).listedDate).toBe('—');
  });
});

describe('indexForHouseId', () => {
  it('id に一致するインデックスを返し、無いときは 0', () => {
    const houses = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(indexForHouseId(houses, 'b')).toBe(1);
    expect(indexForHouseId(houses, null)).toBe(0);
    expect(indexForHouseId(houses, 'missing')).toBe(0);
  });
});

describe('homePathForHouse', () => {
  it('一覧復帰用のクエリ付きパスを返す', () => {
    expect(homePathForHouse('abc')).toBe('/?house=abc');
  });
});
