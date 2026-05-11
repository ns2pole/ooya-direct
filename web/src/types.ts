import type { Timestamp } from 'firebase/firestore';

export type House = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  /** Firebase Storage の代表画像 URL（未設定のときは null） */
  photoUrl: string | null;
  /** 都道府県名 */
  prefecture: string;
  /** 市区町村名（政令都市は区まで含む文字列） */
  city: string;
  /** 町字（大字・丁目など） */
  town: string;
  /** 家賃（表示用テキスト） */
  rent: string;
  /** 広さ（セレクト値） */
  areaSize: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type Inquiry = {
  id: string;
  message: string;
  displayName: string | null;
  createdAt: Timestamp | null;
};
