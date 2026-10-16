/** 大家ダイレクト用 LINE 公式アカウントの友だち追加 URL（公開情報） */
export const DEFAULT_LINE_ADD_FRIEND_URL = 'https://lin.ee/uvetvHd';

export function lineAddFriendUrl(): string {
  const fromEnv = import.meta.env.VITE_LINE_ADD_FRIEND_URL?.trim();
  return fromEnv || DEFAULT_LINE_ADD_FRIEND_URL;
}
