import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { PageTitleProvider, usePageHeader } from '../context/PageTitleContext';
import { houseDetailHeaderCrumbs } from '../lib/pageHeaderCrumbs';

vi.mock('../firebase', () => ({
  isFirebaseConfigured: true,
  missingFirebaseEnvKeys: () => [],
}));

function HouseDetailHeaderStub() {
  usePageHeader(houseDetailHeaderCrumbs({ title: 'テスト物件1' }));
  return <p>物件詳細本文</p>;
}

function HouseListHeaderStub() {
  usePageHeader([{ label: '物件一覧' }]);
  return <p>一覧本文</p>;
}

describe('Layout header breadcrumbs', () => {
  afterEach(() => {
    cleanup();
  });

  it('物件詳細では 物件一覧 が / へのリンク、物件名はリンクにならない', () => {
    render(
      <MemoryRouter initialEntries={['/houses/abc']}>
        <PageTitleProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="houses/:houseId" element={<HouseDetailHeaderStub />} />
            </Route>
          </Routes>
        </PageTitleProvider>
      </MemoryRouter>
    );

    const listLink = screen.getByRole('link', { name: '物件一覧' });
    expect(listLink).toHaveAttribute('href', '/');
    expect(screen.getByRole('navigation', { name: '現在のページ' })).toHaveTextContent(
      '物件一覧 / テスト物件1'
    );
    expect(screen.queryByRole('link', { name: 'テスト物件1' })).toBeNull();
    expect(screen.getByText('物件詳細本文')).toBeInTheDocument();
  });

  it('物件一覧ページでは 物件一覧 はリンクにならない', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <PageTitleProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HouseListHeaderStub />} />
            </Route>
          </Routes>
        </PageTitleProvider>
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: '物件一覧' })).toBeNull();
    expect(screen.getByText('物件一覧')).toBeInTheDocument();
    expect(screen.getByText('一覧本文')).toBeInTheDocument();
  });

  it('ブランド 物件ダイレクト は常に / へのリンク', () => {
    render(
      <MemoryRouter initialEntries={['/houses/abc']}>
        <PageTitleProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="houses/:houseId" element={<HouseDetailHeaderStub />} />
            </Route>
          </Routes>
        </PageTitleProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '物件ダイレクト' })).toHaveAttribute('href', '/');
  });
});
