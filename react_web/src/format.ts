import type { Timestamp } from 'firebase/firestore';

export function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleString('ja-JP');
  } catch {
    return '—';
  }
}

/** 一覧用: 日付のみ（例: 2026/5/11）。時刻は含めない。 */
export function formatDateOnly(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  try {
    return ts.toDate().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
