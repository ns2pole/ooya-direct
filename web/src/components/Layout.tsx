import { Fragment } from 'react';
import { Link, Outlet, useMatch } from 'react-router-dom';
import {
  useListProgressValue,
  usePageHeaderEndActionValue,
  usePageHeaderValue,
} from '../context/PageTitleContext';
import { scrollToElementId } from '../lib/scrollToElement';
import { isFirebaseConfigured, missingFirebaseEnvKeys } from '../firebase';
import { HouseDetailBackButton } from './HouseDetailBackButton';
import { ScrollToTopOnNavigate } from './ScrollToTopOnNavigate';

function HeaderEnd() {
  const crumbs = usePageHeaderValue();
  const endAction = usePageHeaderEndActionValue();

  if (endAction) {
    return (
      <div className="app-header-end">
        <button
          type="button"
          className="btn primary app-header-inquiry-btn"
          onClick={() => scrollToElementId(endAction.targetId, endAction.focusId)}
        >
          {endAction.label}
        </button>
      </div>
    );
  }

  if (crumbs.length > 0) {
    return (
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
    );
  }

  return <div className="app-header-end" aria-hidden="true" />;
}

export function Layout() {
  const isHouseDetail = Boolean(useMatch('/houses/:houseId'));
  const listProgress = useListProgressValue();
  const brandLabel = listProgress
    ? `大家ダイレクト(${listProgress.current}/${listProgress.total})`
    : '大家ダイレクト';

  return (
    <div className="app-shell">
      <ScrollToTopOnNavigate />
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-start">
            {isHouseDetail ? <HouseDetailBackButton /> : null}
          </div>
          <Link to="/" className="brand app-header-brand">
            {brandLabel}
          </Link>
          <HeaderEnd />
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
