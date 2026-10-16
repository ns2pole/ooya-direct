import { Link } from 'react-router-dom';

export type AdminLandlordRow = {
  id: string;
  name: string;
  urls: string[];
};

export function AdminLandlordTable({ rows }: { rows: AdminLandlordRow[] }) {
  return (
    <section className="panel stack">
      <div className="row">
        <Link to="/landlord/landlords/new" className="btn primary">
          新規登録
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="muted">まだ大家がいません。</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>名前</th>
              <th>URL</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.urls.length > 0 ? row.urls.join('、') : 'なし'}</td>
                <td>
                  <Link to={`/landlord/landlords/${row.id}`} className="btn ghost">
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
