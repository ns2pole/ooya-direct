import { FirebaseError } from 'firebase/app';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../format';
import { AdminHouseTable, type AdminHouseRow } from '../../components/AdminHouseTable';
import {
  deleteManualHouse,
  portalLabelForHouse,
  setHouseHidden,
  useAdminCatalog,
} from './useAdminCatalog';

function syncLabel(status: NonNullable<ReturnType<typeof useAdminCatalog>['status']>): string {
  const summary = `新規 ${status.created}件、更新 ${status.updated}件、変化なし ${status.unchanged}件、成約のため削除 ${status.removed}件`;
  return `最終同期: ${formatDate(status.lastSyncedAt)}（${summary}）`;
}

export function AdminHousesPage() {
  const { houses, landlords, sources, status, loading, error, setHouses } = useAdminCatalog();
  const { showToast } = useToast();

  const rows: AdminHouseRow[] = houses.map((house) => ({
    id: house.id,
    title: house.title,
    landlordName: landlords.find((item) => item.id === house.landlordId)?.name || '未設定',
    portalLabel: portalLabelForHouse(house, sources),
    hidden: house.hidden,
    fromSync: house.fromSync,
  }));

  async function onHide(row: AdminHouseRow, hidden: boolean) {
    try {
      await setHouseHidden(row.id, hidden);
      setHouses((prev) => prev.map((item) => (item.id === row.id ? { ...item, hidden } : item)));
    } catch (err) {
      showToast(err instanceof FirebaseError ? err.message : '更新に失敗しました。', 'error');
    }
  }

  async function onDelete(row: AdminHouseRow) {
    try {
      await deleteManualHouse(row.id);
      setHouses((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      showToast(err instanceof FirebaseError ? err.message : '削除に失敗しました。', 'error');
    }
  }

  if (loading) {
    return (
      <section className="panel">
        <p>読み込み中…</p>
      </section>
    );
  }

  return (
    <>
      {error ? <p className="text-error">{error}</p> : null}
      <AdminHouseTable
        rows={rows}
        lastSyncLabel={status?.lastSyncedAt ? syncLabel(status) : null}
        onHide={(row, hidden) => void onHide(row, hidden)}
        onDelete={(row) => void onDelete(row)}
      />
    </>
  );
}
