import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import {
  PageTitleProvider,
  useListProgress,
  usePageHeader,
  usePageHeaderEndAction,
} from '../context/PageTitleContext';
import { houseDetailHeaderCrumbs } from '../lib/pageHeaderCrumbs';
import * as scrollToElement from '../lib/scrollToElement';

vi.mock('../firebase', () => ({
  isFirebaseConfigured: true,
  missingFirebaseEnvKeys: () => [],
}));

function HouseDetailHeaderStub() {
  usePageHeader(houseDetailHeaderCrumbs({ title: 'テスト物件1' }));
  return <p>物件詳細本文</p>;
}

function HouseDetailInquiryStub() {
  usePageHeader(houseDetailHeaderCrumbs({ title: 'テスト物件1' }));
  usePageHeaderEndAction({ label: '問い合わせ', targetId: 'inquiry-message-label', focusId: 'inquiry-message' });
  return (
    <>
      <p>物件詳細本文</p>
      <label htmlFor="inquiry-message">
        <span id="inquiry-message-label">メッセージ</span>
        <textarea id="inquiry-message" aria-label="メッセージ" />
      </label>
    </>
  );
}

function HouseListHeaderStub() {
  usePageHeader([{ label: '物件一覧' }]);
  return <p>一覧本文</p>;
}

describe('Layout header breadcrumbs', () => {
  afterEach(() => {
    cleanup();
  });

  it('物件詳細ではヘッダー右に物件名を出さない', () => {
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

    expect(screen.queryByRole('link', { name: '物件一覧' })).toBeNull();
    expect(screen.getByRole('button', { name: '← 戻る' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '現在のページ' })).toBeNull();
    expect(screen.getByText('物件詳細本文')).toBeInTheDocument();
  });

  it('物件一覧ページでは戻るボタンを表示しない', () => {
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

    expect(screen.queryByRole('link', { name: '← 戻る' })).toBeNull();
    expect(screen.queryByRole('button', { name: '← 戻る' })).toBeNull();
    expect(screen.queryByRole('link', { name: '物件一覧' })).toBeNull();
    expect(screen.getByText('物件一覧')).toBeInTheDocument();
    expect(screen.getByText('一覧本文')).toBeInTheDocument();
  });

  it('物件詳細で問い合わせボタンを押すとメッセージ欄へスクロールする', () => {
    const scrollSpy = vi.spyOn(scrollToElement, 'scrollToElementId').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/houses/abc']}>
        <PageTitleProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="houses/:houseId" element={<HouseDetailInquiryStub />} />
            </Route>
          </Routes>
        </PageTitleProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '問い合わせ' }));
    expect(scrollSpy).toHaveBeenCalledWith('inquiry-message-label', 'inquiry-message');
  });

  it('ブランド 大家ダイレクト は常に / へのリンク', () => {
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

    expect(screen.getByRole('link', { name: '大家ダイレクト' })).toHaveAttribute('href', '/');
  });

  it('一覧進捗があるときブランドに件数を付ける', () => {
    function HomeWithProgress() {
      useListProgress({ current: 2, total: 3 });
      return <p>一覧本文</p>;
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <PageTitleProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomeWithProgress />} />
            </Route>
          </Routes>
        </PageTitleProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '大家ダイレクト(2/3)' })).toHaveAttribute('href', '/');
  });
});
