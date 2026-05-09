import type { Timestamp } from 'firebase/firestore';

export function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleString('ja-JP');
  } catch {
    return '—';
  }
}
