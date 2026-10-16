import { Link } from 'react-router-dom';

export type AdminHouseRow = {
  id: string;
  title: string;
  landlordName: string;
  portalLabel: string;
  hidden: boolean;
  fromSync: boolean;
};

type Props = {
  rows: AdminHouseRow[];
  lastSyncLabel: string | null;
  onHide: (row: AdminHouseRow, hidden: boolean) => void;
  onDelete: (row: AdminHouseRow) => void;
};

export function AdminHouseTable({ rows, lastSyncLabel, onHide, onDelete }: Props) {
  return (
    <section className="panel stack">
      <div className="row">
        <Link to="/landlord/houses/new" className="btn primary">
          新規登録
        </Link>
      </div>
      <p className="muted small">{lastSyncLabel ?? 'まだ同期していません。'}</p>
      {rows.length === 0 ? (
        <p className="muted">まだ物件がありません。</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>タイトル</th>
              <th>大家</th>
              <th>ポータル</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const title = row.title.trim() || '（無題）';
              return (
                <tr key={row.id}>
                  <td>
                    {row.hidden ? (
                      title
                    ) : (
                      <Link to={`/houses/${row.id}`}>{title}</Link>
                    )}
                  </td>
                  <td>{row.landlordName}</td>
                  <td>{row.portalLabel}</td>
                  <td>{row.hidden ? '非表示' : '公開'}</td>
                  <td className="row">
                    {row.fromSync ? (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          const next = !row.hidden;
                          const verb = next ? '公開ページから外します' : '公開ページに戻します';
                          if (!window.confirm(`「${title}」を${verb}か？`)) return;
                          onHide(row, next);
                        }}
                      >
                        {row.hidden ? '再表示' : '非表示'}
                      </button>
                    ) : (
                      <>
                        <Link to={`/landlord/houses/${row.id}/edit`} className="btn ghost">
                          編集
                        </Link>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => {
                            if (!window.confirm(`「${title}」を削除しますか？`)) return;
                            onDelete(row);
                          }}
                        >
                          削除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
