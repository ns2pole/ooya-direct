import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminHouseTable, type AdminHouseRow } from './AdminHouseTable';

function row(overrides: Partial<AdminHouseRow> & Pick<AdminHouseRow, 'id' | 'title'>): AdminHouseRow {
  return {
    landlordName: 'ミッチー',
    portalLabel: 'ジモティー',
    hidden: false,
    fromSync: true,
    ...overrides,
  };
}

function renderTable(rows: AdminHouseRow[]) {
  return render(
    <MemoryRouter>
      <AdminHouseTable
        rows={rows}
        lastSyncLabel="最終同期: 2026/10/16 16:02"
        onHide={vi.fn()}
        onDelete={vi.fn()}
      />
    </MemoryRouter>
  );
}

describe('AdminHouseTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('大家名とポータルを出し、手動物件は編集と削除、同期物件は非表示だけ', () => {
    renderTable([
      row({ id: 'sync-1', title: '同期物件' }),
      row({
        id: 'manual-1',
        title: '手動物件',
        portalLabel: 'ポータルなし',
        fromSync: false,
      }),
      row({ id: 'hidden-1', title: '隠した物件', hidden: true }),
    ]);

    expect(screen.getByRole('link', { name: '新規登録' })).toHaveAttribute(
      'href',
      '/landlord/houses/new'
    );
    expect(screen.getByText('最終同期: 2026/10/16 16:02')).toBeInTheDocument();

    const synced = screen.getByRole('row', { name: /同期物件/ });
    expect(within(synced).getByText('ミッチー')).toBeInTheDocument();
    expect(within(synced).getByText('ジモティー')).toBeInTheDocument();
    expect(within(synced).queryByRole('link', { name: '編集' })).not.toBeInTheDocument();
    expect(within(synced).getByRole('button', { name: '非表示' })).toBeInTheDocument();

    const manual = screen.getByRole('row', { name: /手動物件/ });
    expect(within(manual).getByText('ポータルなし')).toBeInTheDocument();
    expect(within(manual).getByRole('link', { name: '編集' })).toHaveAttribute(
      'href',
      '/landlord/houses/manual-1/edit'
    );
    expect(within(manual).getByRole('button', { name: '削除' })).toBeInTheDocument();

    const hidden = screen.getByRole('row', { name: /隠した物件/ });
    expect(within(hidden).getByRole('button', { name: '再表示' })).toBeInTheDocument();
    expect(within(hidden).queryByRole('link', { name: '編集' })).not.toBeInTheDocument();
  });
});
