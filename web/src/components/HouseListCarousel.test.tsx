import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { House } from '../types';
import { PageTitleProvider, useListProgressValue } from '../context/PageTitleContext';
import { HouseListCarousel } from './HouseListCarousel';
import { EMPTY_HOUSE_PROPERTY_FIELDS } from '../lib/housePropertyFields';

function mockHouse(id: string, title: string): House {
  return {
    id,
    ownerId: 'u1',
    title,
    description: '',
    coverPhotoUrl: null,
    prefecture: '三重県',
    city: '名張市',
    town: 'テスト町',
    ...EMPTY_HOUSE_PROPERTY_FIELDS,
    rent: '6万円',
    areaSize: '3LDK',
    createdAt: null,
    updatedAt: null,
  };
}

function ListProgressReader() {
  const progress = useListProgressValue();
  if (!progress) return <span data-testid="list-progress">none</span>;
  return <span data-testid="list-progress">{`${progress.current}/${progress.total}`}</span>;
}

function renderCarousel(houses: House[]) {
  return render(
    <MemoryRouter>
      <PageTitleProvider>
        <ListProgressReader />
        <HouseListCarousel houses={houses} />
      </PageTitleProvider>
    </MemoryRouter>
  );
}

function swipe(section: HTMLElement, fromX: number, toX: number) {
  fireEvent.touchStart(section, {
    changedTouches: [{ clientX: fromX, clientY: 100 }],
  });
  fireEvent.touchEnd(section, {
    changedTouches: [{ clientX: toX, clientY: 100 }],
  });
}

describe('HouseListCarousel', () => {
  afterEach(() => {
    cleanup();
  });

  it('2件あるとき左スワイプで2件目、右スワイプで1件目に戻る', () => {
    const houses = [mockHouse('h1', 'テスト物件1'), mockHouse('h2', 'テスト物件2')];
    renderCarousel(houses);

    expect(screen.getByText('テスト物件1')).toBeInTheDocument();
    expect(screen.getByTestId('list-progress')).toHaveTextContent('1/2');
    expect(screen.getByText('左右スワイプで他物件が見れます')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '次の物件' })).toBeNull();
    expect(screen.queryByRole('button', { name: '前の物件' })).toBeNull();

    const section = screen.getByLabelText('物件一覧');
    swipe(section, 200, 100);
    expect(screen.getByText('テスト物件2')).toBeInTheDocument();
    expect(screen.getByTestId('list-progress')).toHaveTextContent('2/2');

    swipe(section, 100, 200);
    expect(screen.getByText('テスト物件1')).toBeInTheDocument();
    expect(screen.getByTestId('list-progress')).toHaveTextContent('1/2');
  });

  it('1件のときスワイプヒントを出さない', () => {
    renderCarousel([mockHouse('h1', 'テスト物件1')]);

    expect(screen.getByTestId('list-progress')).toHaveTextContent('1/1');
    expect(screen.queryByText('左右スワイプで他物件が見れます')).toBeNull();
  });

  it('物件条件を一覧用に表示する', () => {
    renderCarousel([mockHouse('h1', 'テスト物件1')]);

    expect(screen.getByText('家賃')).toBeInTheDocument();
    expect(screen.getByText('6万円')).toBeInTheDocument();
    expect(screen.getByText('地域')).toBeInTheDocument();
    expect(screen.getByText('三重県 名張市 テスト町')).toBeInTheDocument();
    expect(screen.getByText('3LDK')).toBeInTheDocument();
    expect(screen.queryByText('間取り')).not.toBeInTheDocument();
    expect(screen.queryByText('階建')).not.toBeInTheDocument();
    expect(screen.queryByText('築年数')).not.toBeInTheDocument();
    expect(screen.queryByText('ジャンル')).not.toBeInTheDocument();
  });

  it('カード全体が詳細ページへのリンク', () => {
    renderCarousel([mockHouse('h1', 'テスト物件1')]);

    expect(screen.getByRole('link', { name: /テスト物件1/ })).toHaveAttribute('href', '/houses/h1');
  });
});
