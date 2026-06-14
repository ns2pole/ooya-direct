import type { Timestamp } from 'firebase/firestore';

/** houses/{houseId}/photos/{photoId} — 物件に紐づく1枚の画像 */
export type HousePhoto = {
  id: string;
  /** Firebase Storage のダウンロード URL */
  url: string;
  /** 表示順（0 始まり・昇順） */
  order: number;
  /** 任意ラベル（例: 外観 / 間取り） */
  label: string | null;
  createdAt: Timestamp | null;
};

export type House = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  /** 一覧サムネ用（photos 先頭の denormalize） */
  coverPhotoUrl: string | null;
  /** 都道府県名 */
  prefecture: string;
  /** 市区町村名（政令都市は区まで含む文字列） */
  city: string;
  /** 町字（大字・丁目など） */
  town: string;
  /** 家賃（表示用テキスト） */
  rent: string;
  /** 間取り（セレクト値、例: 1K / 5DK） */
  areaSize: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type Inquiry = {
  id: string;
  message: string;
  createdAt: Timestamp | null;
};
