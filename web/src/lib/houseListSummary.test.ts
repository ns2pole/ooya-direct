import { describe, expect, it } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type { House } from '../types';
import { EMPTY_HOUSE_PROPERTY_FIELDS } from './housePropertyFields';
import { houseListSummaryLines } from './houseListSummary';

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
    floorArea: '45㎡',
    genre: 'マンション',
    createdAt: { toDate: () => new Date('2026-05-11') } as Timestamp,
    updatedAt: null,
    ...overrides,
  };
}

describe('houseListSummaryLines', () => {
  it('タイトル・住所・チップ・掲載日を返す', () => {
    expect(houseListSummaryLines(mockHouse())).toEqual({
      title: 'テスト物件1',
      location: '三重県 名張市 桔梗が丘一番町',
      chips: ['家賃 6万円', '5LDK', '45㎡', 'マンション'],
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
