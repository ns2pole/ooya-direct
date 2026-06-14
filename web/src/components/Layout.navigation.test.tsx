import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HashRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { PageTitleProvider } from '../context/PageTitleContext';

vi.mock('../firebase', () => ({
  isFirebaseConfigured: true,
  missingFirebaseEnvKeys: () => [],
}));

function HomeStub() {
  return <p>一覧ページ</p>;
}

function DetailStub() {
  return <p>物件詳細ページ</p>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomeStub />} />
        <Route path="houses/:houseId" element={<DetailStub />} />
      </Route>
    </Routes>
  );
}

describe('Layout navigation', () => {
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('MemoryRouter: 戻るリンクで一覧に戻れる', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/houses/abc']}>
        <PageTitleProvider>
          <AppRoutes />
        </PageTitleProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('物件詳細ページ')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '← 戻る' }));
    expect(screen.getByText('一覧ページ')).toBeInTheDocument();
    expect(screen.queryByText('物件詳細ページ')).not.toBeInTheDocument();
  });

  it('HashRouter: 戻るリンクで一覧に戻れる', async () => {
    window.location.hash = '#/houses/abc';
    const user = userEvent.setup();

    render(
      <HashRouter>
        <PageTitleProvider>
          <AppRoutes />
        </PageTitleProvider>
      </HashRouter>
    );

    expect(screen.getByText('物件詳細ページ')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '← 戻る' }));
    expect(screen.getByText('一覧ページ')).toBeInTheDocument();
    expect(screen.queryByText('物件詳細ページ')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#/');
  });
});
