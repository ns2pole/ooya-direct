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
    <button type="button" className="btn primary" onClick={() => void onSync()} disabled={syncing}>
      {syncing ? '同期中…' : '同期'}
    </button>
  );
}

export function AdminNav() {
  const { signOutUser } = useAuth();

  return (
    <nav className="admin-nav" aria-label="管理">
      <NavLink to="/landlord/houses" className="admin-nav-link">
        物件
      </NavLink>
      <NavLink to="/landlord/landlords" className="admin-nav-link">
        大家
      </NavLink>
      <NavLink to="/landlord/line" className="admin-nav-link">
        LINE通知
      </NavLink>
      <button type="button" className="btn ghost" onClick={() => void signOutUser()}>
        ログアウト
      </button>
    </nav>
  );
}
