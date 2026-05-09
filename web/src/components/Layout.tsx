import { Link, Outlet } from 'react-router-dom';
import { isFirebaseConfigured, missingFirebaseEnvKeys } from '../firebase';

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          物件ダイレクト
        </Link>
        <nav className="nav">
          <Link to="/">物件一覧</Link>
          <Link to="/landlord">大家さん</Link>
        </nav>
      </header>

      {!isFirebaseConfigured ? (
        <div className="banner warning" role="status">
          <strong>Firebase の環境変数が足りません。</strong>{' '}
          <code>web/.env.local</code> を開き、Firebase コンソール（プロジェクトの設定 → マイアプリ →
          SDK の設定）の値を埋めてください。空のままなのは次のキーです:{' '}
          <code>{missingFirebaseEnvKeys().join(', ') || '（判定中）'}</code>
          。保存したら <strong>開発サーバー（npm run dev）を一度止めて再起動</strong>してください。
        </div>
      ) : null}

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <small>GitHub Pages + Firebase（デモ構成）</small>
      </footer>
    </div>
  );
}
