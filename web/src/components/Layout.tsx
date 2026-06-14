import { Fragment } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { usePageHeaderValue } from '../context/PageTitleContext';
import { isFirebaseConfigured, missingFirebaseEnvKeys } from '../firebase';

export function Layout() {
  const crumbs = usePageHeaderValue();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            大家ダイレクト
          </Link>
          {crumbs.length > 0 ? (
            <nav className="app-header-page" aria-label="現在のページ">
              {crumbs.map((crumb, index) => (
                <Fragment key={`${crumb.to ?? ''}-${crumb.label}`}>
                  {index > 0 ? (
                    <span className="app-header-sep" aria-hidden="true">
                      {' '}
                      /{' '}
                    </span>
                  ) : null}
                  {crumb.to ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </Fragment>
              ))}
            </nav>
          ) : null}
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
