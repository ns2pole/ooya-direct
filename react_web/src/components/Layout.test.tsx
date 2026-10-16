import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import {
  PageTitleProvider,
  useListProgress,
  usePageHeader,
  usePageHeaderEndAction,
} from '../context/PageTitleContext';
import { ToastProvider } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { houseDetailHeaderCrumbs } from '../lib/pageHeaderCrumbs';
import * as scrollToElement from '../lib/scrollToElement';

vi.mock('../firebase', () => ({
  isFirebaseConfigured: true,
  missingFirebaseEnvKeys: () => [],
  getFns: () => ({}),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
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
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signInWithEmailPassword: vi.fn(),
      signOutUser: vi.fn(),
    });
  });

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

  it('一覧進捗があるときブランドに件数を付け、掲載日をヘッダー右に出す', () => {
    function HomeWithProgress() {
      useListProgress({ current: 2, total: 3, listedDate: '2026/8/4' });
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
    expect(screen.getByText('掲載: 2026/8/4')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '管理' })).not.toBeInTheDocument();
  });

  it('ログイン中は管理列に同期、物件、大家、LINE通知、ログアウトがある', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin' } as ReturnType<typeof useAuth>['user'],
      loading: false,
      signInWithEmailPassword: vi.fn(),
      signOutUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <PageTitleProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<p>一覧本文</p>} />
              </Route>
            </Routes>
          </PageTitleProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    const bar = document.querySelector('.app-header-bar');
    expect(bar?.querySelector('.app-header-bar-left')).toContainElement(screen.getByRole('button', { name: '同期' }));
    expect(bar?.querySelector('.app-header-bar-left')).toContainElement(screen.getByRole('link', { name: '大家ダイレクト' }));
    const nav = screen.getByRole('navigation', { name: '管理' });
    expect(bar?.querySelector('.app-header-bar-right')).toContainElement(nav);
    expect(nav).toContainElement(screen.getByRole('link', { name: '物件' }));
    expect(nav).toContainElement(screen.getByRole('link', { name: '大家' }));
    expect(nav).toContainElement(screen.getByRole('link', { name: 'LINE通知' }));
    expect(nav).toContainElement(screen.getByRole('button', { name: 'ログアウト' }));
    expect(screen.getByRole('link', { name: '物件' })).toHaveAttribute('href', '/landlord/houses');
    expect(screen.getByRole('link', { name: '大家' })).toHaveAttribute('href', '/landlord/landlords');
    expect(screen.getByRole('link', { name: 'LINE通知' })).toHaveAttribute('href', '/landlord/line');
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '同期' }).querySelector('svg')).toBeTruthy();
    expect(screen.getByRole('link', { name: '物件' }).querySelector('svg')).toBeTruthy();
    expect(screen.getByRole('link', { name: '大家' }).querySelector('svg')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'LINE通知' }).querySelector('svg')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ログアウト' }).querySelector('svg')).toBeTruthy();
  });

  it('ログアウトは確認してから実行する', () => {
    const signOutUser = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin' } as ReturnType<typeof useAuth>['user'],
      loading: false,
      signInWithEmailPassword: vi.fn(),
      signOutUser,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter>
        <ToastProvider>
          <PageTitleProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<p>一覧本文</p>} />
              </Route>
            </Routes>
          </PageTitleProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(confirmSpy).toHaveBeenCalledWith('ログアウトしますか？');
    expect(signOutUser).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(signOutUser).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});
