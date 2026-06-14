import { describe, expect, it } from 'vitest';
import { houseDetailHeaderCrumbs, houseFormHeaderCrumbs } from './pageHeaderCrumbs';

describe('houseDetailHeaderCrumbs', () => {
  it('読み込み中は 物件詳細 を返す', () => {
    expect(houseDetailHeaderCrumbs(undefined)).toEqual([{ label: '物件詳細' }]);
  });

  it('物件がない場合は 物件が見つかりません を返す', () => {
    expect(houseDetailHeaderCrumbs(null)).toEqual([{ label: '物件が見つかりません' }]);
  });

  it('読み込み完了後はヘッダーに物件名を出さない', () => {
    expect(houseDetailHeaderCrumbs({ title: 'テスト物件1' })).toEqual([]);
  });

  it('タイトルが空でも読み込み完了後はヘッダーを空にする', () => {
    expect(houseDetailHeaderCrumbs({ title: '' })).toEqual([]);
  });

  it('読み込み完了後のヘッダーにはリンク先がない', () => {
    expect(houseDetailHeaderCrumbs({ title: 'テスト物件1' })).toEqual([]);
  });
});

describe('houseFormHeaderCrumbs', () => {
  it('新規登録は マイ物件 / 新規登録 を返す', () => {
    expect(houseFormHeaderCrumbs(true)).toEqual([
      { label: 'マイ物件', to: '/landlord' },
      { label: '新規登録' },
    ]);
  });

  it('編集は マイ物件 / 編集 を返す', () => {
    expect(houseFormHeaderCrumbs(false)).toEqual([
      { label: 'マイ物件', to: '/landlord' },
      { label: '編集' },
    ]);
  });
});
