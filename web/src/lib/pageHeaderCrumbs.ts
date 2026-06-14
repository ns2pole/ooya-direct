import type { PageHeaderCrumb } from '../context/PageTitleContext';

type HouseDetailHeaderInput = { title: string } | null | undefined;

export function houseDetailHeaderCrumbs(house: HouseDetailHeaderInput): PageHeaderCrumb[] {
  if (house === undefined) {
    return [{ label: '物件詳細' }];
  }
  if (house === null) {
    return [{ label: '物件が見つかりません' }];
  }
  return [{ label: house.title || '（無題）' }];
}

export function houseFormHeaderCrumbs(isNew: boolean): PageHeaderCrumb[] {
  return [
    { label: 'マイ物件', to: '/landlord' },
    { label: isNew ? '新規登録' : '編集' },
  ];
}
