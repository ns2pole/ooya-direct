import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminLandlordTable } from './AdminLandlordTable';
import { LandlordEditor } from './LandlordEditor';

describe('AdminLandlordTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('名前とURLを出し、新規登録と編集がある', () => {
    render(
      <MemoryRouter>
        <AdminLandlordTable
          rows={[
            {
              id: 'l1',
              name: 'ミッチー',
              urls: ['https://jmty.jp/profiles/abc'],
            },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '新規登録' })).toHaveAttribute(
      'href',
      '/landlord/landlords/new'
    );
    const row = screen.getByRole('row', { name: /ミッチー/ });
    expect(row).toHaveTextContent('https://jmty.jp/profiles/abc');
    expect(screen.getByRole('link', { name: '編集' })).toHaveAttribute(
      'href',
      '/landlord/landlords/l1'
    );
  });
});

describe('LandlordEditor', () => {
  afterEach(() => {
    cleanup();
  });

  it('URLを追加できる', async () => {
    const user = userEvent.setup();
    const onAddUrl = vi.fn().mockResolvedValue(undefined);
    render(
      <LandlordEditor
        name="ミッチー"
        sources={[]}
        onSaveName={vi.fn()}
        onAddUrl={onAddUrl}
        onDeleteUrl={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText('https://jmty.jp/profiles/...'), 'https://jmty.jp/profiles/abc');
    await user.click(screen.getByRole('button', { name: '追加' }));
    expect(onAddUrl).toHaveBeenCalledWith('https://jmty.jp/profiles/abc');
  });
});
