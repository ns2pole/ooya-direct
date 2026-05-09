import type { Timestamp } from 'firebase/firestore';

export type House = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type Inquiry = {
  id: string;
  message: string;
  displayName: string | null;
  createdAt: Timestamp | null;
};
