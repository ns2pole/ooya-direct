import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { NavLink } from 'react-router-dom';
import { getFns } from '../firebase';
import { useAdminRefresh } from '../context/AdminRefreshContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

type JimotySyncResult = {
  created: number;
  updated: number;
  removed: number;
  unchanged: number;
};

function syncSummary(status: JimotySyncResult): string {
  return `新規 ${status.created}件、更新 ${status.updated}件、変化なし ${status.unchanged}件、成約のため削除 ${status.removed}件`;
}

function SyncIcon() {
  return (
    <svg className="sync-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
      />
    </svg>
  );
}

function HouseIcon() {
  return (
    <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="5.5" fill="#06C755" />
      <path fill="#fff" d="M8.55 6.85h2.45v7.2h4.85v2.3H8.55V6.85z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  );
}

export function AdminSyncButton() {
  const { showToast } = useToast();
  const { bump } = useAdminRefresh();
  const [syncing, setSyncing] = useState(false);

  async function onSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const fn = httpsCallable<Record<string, never>, JimotySyncResult>(getFns(), 'syncJimotyNow');
      const response = await fn({});
      showToast(`同期しました。${syncSummary(response.data)}`, 'success');
      bump();
    } catch (err) {
      const message = err instanceof FirebaseError ? err.message : '同期に失敗しました。';
      showToast(message, 'error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button type="button" className="btn primary sync-btn" onClick={() => void onSync()} disabled={syncing}>
      <SyncIcon />
      {syncing ? '同期中…' : '同期'}
    </button>
  );
}

export function AdminNav() {
  const { signOutUser } = useAuth();

  function onLogout() {
    if (!window.confirm('ログアウトしますか？')) return;
    void signOutUser();
  }

  return (
    <nav className="admin-nav" aria-label="管理">
      <NavLink to="/landlord/houses" className="admin-nav-link">
        <HouseIcon />
        物件
      </NavLink>
      <NavLink to="/landlord/landlords" className="admin-nav-link">
        <PersonIcon />
        大家
      </NavLink>
      <NavLink to="/landlord/line" className="admin-nav-link">
        <LineIcon />
        LINE通知
      </NavLink>
      <button type="button" className="admin-nav-link" onClick={onLogout}>
        <LogoutIcon />
        ログアウト
      </button>
    </nav>
  );
}
