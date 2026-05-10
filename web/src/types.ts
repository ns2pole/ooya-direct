import type { Timestamp } from 'firebase/firestore';

export type House = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  /** Firebase Storage の代表画像 URL（未設定のときは null） */
  photoUrl: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type Inquiry = {
  id: string;
  message: string;
  displayName: string | null;
  createdAt: Timestamp | null;
};
