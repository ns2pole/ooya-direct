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