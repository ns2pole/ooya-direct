import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PageTitleProvider,
  usePageHeader,
  usePageHeaderValue,
  usePageTitle,
} from './PageTitleContext';

function HeaderReader() {
  const crumbs = usePageHeaderValue();
  return (
    <ul data-testid="crumbs">
      {crumbs.map((crumb) => (
        <li key={crumb.label}>
          {crumb.label}
          {crumb.to ? `:${crumb.to}` : ''}
        </li>
      ))}
    </ul>
  );
}

function PageWithTitle({ title }: { title: string }) {
  usePageTitle(title);
  return null;
}

function PageWithHeader() {
  usePageHeader([
    { label: '物件一覧', to: '/' },
    { label: 'テスト物件1' },
  ]);
  return null;
}

describe('PageTitleContext', () => {
  afterEach(() => {
    cleanup();
  });

  it('usePageTitle で単一タイトルをヘッダーに渡す', () => {
    render(
      <PageTitleProvider>
        <PageWithTitle title="物件一覧" />
        <HeaderReader />
      </PageTitleProvider>
    );

    expect(screen.getByText('物件一覧')).toBeInTheDocument();
  });

  it('usePageHeader でパンくずを渡す', () => {
    render(
      <PageTitleProvider>
        <PageWithHeader />
        <HeaderReader />
      </PageTitleProvider>
    );

    expect(screen.getByText('物件一覧:/')).toBeInTheDocument();
    expect(screen.getByText('テスト物件1')).toBeInTheDocument();
  });

  it('アンマウント時にヘッダーをクリアする', async () => {
    function TogglePage() {
      const [show, setShow] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setShow(false)}>
            非表示
          </button>
          {show ? <PageWithTitle title="物件一覧" /> : null}
        </>
      );
    }

    render(
      <PageTitleProvider>
        <TogglePage />
        <HeaderReader />
      </PageTitleProvider>
    );

    expect(screen.getByTestId('crumbs').children).toHaveLength(1);
    screen.getByRole('button', { name: '非表示' }).click();
    await waitFor(() => {
      expect(screen.getByTestId('crumbs').children).toHaveLength(0);
    });
  });
});
