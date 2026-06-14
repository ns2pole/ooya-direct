import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { House } from '../types';
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

describe('HouseListCarousel', () => {
  afterEach(() => {
    cleanup();
  });

  it('2件あるとき › で2件目、‹ で1件目に戻る', () => {
    const houses = [mockHouse('h1', 'テスト物件1'), mockHouse('h2', 'テスト物件2')];

    render(
      <MemoryRouter>
        <HouseListCarousel houses={houses} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'テスト物件1' })).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '次の物件' }));
    expect(screen.getByRole('heading', { name: 'テスト物件2' })).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '前の物件' }));
    expect(screen.getByRole('heading', { name: 'テスト物件1' })).toBeInTheDocument();
  });

  it('1件のとき前後ボタンは disabled', () => {
    render(
      <MemoryRouter>
        <HouseListCarousel houses={[mockHouse('h1', 'テスト物件1')]} />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '前の物件' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '次の物件' })).toBeDisabled();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  it('物件条件をテーブル表示する', () => {
    render(
      <MemoryRouter>
        <HouseListCarousel houses={[mockHouse('h1', 'テスト物件1')]} />
      </MemoryRouter>
    );

    expect(screen.getByText('家賃')).toBeInTheDocument();
    expect(screen.getByText('6万円')).toBeInTheDocument();
    expect(screen.getByText('間取り')).toBeInTheDocument();
    expect(screen.getByText('3LDK')).toBeInTheDocument();
    expect(screen.getByText('地域')).toBeInTheDocument();
  });

  it('カード全体が詳細ページへのリンク', () => {
    render(
      <MemoryRouter>
        <HouseListCarousel houses={[mockHouse('h1', 'テスト物件1')]} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /テスト物件1/ })).toHaveAttribute('href', '/houses/h1');
  });
});
