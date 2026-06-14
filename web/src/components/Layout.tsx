import { Link, Outlet } from 'react-router-dom';
import { usePageTitleValue } from '../context/PageTitleContext';
import { isFirebaseConfigured, missingFirebaseEnvKeys } from '../firebase';

export function Layout() {
  const pageTitle = usePageTitleValue();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            物件ダイレクト
          </Link>
          {pageTitle ? <span className="app-header-page">{pageTitle}</span> : null}
        </div>
      </header>

      {!isFirebaseConfigured ? (
        <div className="banner warning" role="status">
          <strong>Firebase の環境変数が足りません。</strong>{' '}
          {import.meta.env.DEV ? (
            <>
              <code>web/.env.local</code> を開き、Firebase コンソール（プロジェクトの設定 → マイアプリ →
              SDK の設定）の値を埋めてください。空のままなのは次のキーです:{' '}
              <code>{missingFirebaseEnvKeys().join(', ') || '（判定中）'}</code>
              。保存したら <strong>開発サーバー（npm run dev）を一度止めて再起動</strong>してください。
            </>
          ) : (
            <>
              GitHub のリポジトリ → <strong>Settings → Secrets and variables → Actions</strong> に、
              README にある <code>VITE_FIREBASE_*</code> の Repository secrets を
              <code>web/.env.local</code> と同じ値で追加し、<strong>Actions の GitHub Pages ワークフローを再実行</strong>
              してください。不足キー:{' '}
              <code>{missingFirebaseEnvKeys().join(', ') || '（判定中）'}</code>。
            </>
          )}
        </div>
      ) : null}

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
