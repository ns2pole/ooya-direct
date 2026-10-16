import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LandlordBoard } from './LandlordBoard';
import type { BoardHouse, BoardLandlord, BoardSource } from '../lib/landlordBoard';

const landlords: BoardLandlord[] = [{ id: 'l1', name: 'ミッチー' }];
const sources: BoardSource[] = [
  {
    id: 's1',
    landlordId: 'l1',
    portal: 'jimoty',
    url: 'https://jmty.jp/profiles/abc',
  },
];

function house(overrides: Partial<BoardHouse> & Pick<BoardHouse, 'id' | 'title'>): BoardHouse {
  return {
    landlordId: 'l1',
    sourceId: 's1',
    fromSync: true,
    hidden: false,
    meta: '4DK',
    coverPhotoUrl: null,
    ...overrides,
  };
}

function renderBoard(
  next: {
    landlords?: BoardLandlord[];
    sources?: BoardSource[];
    houses?: BoardHouse[];
  } = {}
) {
  return render(
    <MemoryRouter>
      <LandlordBoard
        landlords={next.landlords ?? landlords}
        sources={next.sources ?? sources}
        houses={next.houses ?? []}
        onAddLandlord={async () => undefined}
        onRenameLandlord={async () => undefined}
        onAddSource={async () => undefined}
        onDeleteSource={async () => undefined}
        onDeleteLandlord={async () => undefined}
        onHideHouse={async () => undefined}
        onDeleteManualHouse={async () => undefined}
      />
    </MemoryRouter>
  );
}

describe('LandlordBoard', () => {
  afterEach(() => {
    cleanup();
  });

  it('大家の下にURLと物件が並び、手動物件はポータルなしに出る', () => {
    renderBoard({
      houses: [
        house({ id: 'sync-1', title: '同期物件' }),
        house({
          id: 'manual-1',
          title: '手動物件',
          sourceId: '',
          fromSync: false,
        }),
      ],
    });

    const group = screen.getByRole('region', { name: 'ミッチー' });
    expect(within(group).getByRole('heading', { name: 'ジモティー' })).toBeInTheDocument();
    expect(within(group).getByText('https://jmty.jp/profiles/abc')).toBeInTheDocument();
    expect(within(group).getByText('同期物件')).toBeInTheDocument();
    expect(within(group).getByRole('heading', { name: 'ポータルなし' })).toBeInTheDocument();
    expect(within(group).getByText('手動物件')).toBeInTheDocument();
  });

  it('同期物件は編集できず非表示にでき、手動物件は編集と削除ができる', () => {
    renderBoard({
      houses: [
        house({ id: 'sync-1', title: '同期物件' }),
        house({
          id: 'manual-1',
          title: '手動物件',
          sourceId: '',
          fromSync: false,
        }),
        house({ id: 'sync-hidden', title: '隠した物件', hidden: true }),
      ],
    });

    const synced = screen.getByRole('listitem', { name: '同期物件' });
    expect(within(synced).queryByRole('link', { name: '編集' })).not.toBeInTheDocument();
    expect(within(synced).getByRole('button', { name: '非表示' })).toBeInTheDocument();

    const manual = screen.getByRole('listitem', { name: '手動物件' });
    expect(within(manual).getByRole('link', { name: '編集' })).toBeInTheDocument();
    expect(within(manual).getByRole('button', { name: '削除' })).toBeInTheDocument();
    expect(within(manual).queryByRole('button', { name: '非表示' })).not.toBeInTheDocument();

    const hidden = screen.getByRole('listitem', { name: '隠した物件' });
    expect(within(hidden).getByRole('button', { name: '再表示' })).toBeInTheDocument();
    expect(within(hidden).queryByRole('link', { name: '編集' })).not.toBeInTheDocument();
  });

  it('大家が0人のとき新規登録へ進めない', () => {
    renderBoard({ landlords: [], sources: [], houses: [] });
    expect(screen.getByRole('button', { name: '新規登録' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: '新規登録' })).not.toBeInTheDocument();
  });
});
