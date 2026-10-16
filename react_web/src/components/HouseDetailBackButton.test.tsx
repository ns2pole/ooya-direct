import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HouseDetailBackButton } from './HouseDetailBackButton';
import * as scrollToTop from '../lib/scrollToTop';

describe('HouseDetailBackButton', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('クリックで同じ物件を開いた一覧へ戻り先頭へスクロールする', async () => {
    const scrollSpy = vi.spyOn(scrollToTop, 'scrollToTop').mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/houses/abc']}>
        <Routes>
          <Route path="/houses/:houseId" element={<HouseDetailBackButton />} />
          <Route path="/" element={<p>一覧</p>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '← 戻る' }));

    expect(screen.getByText('一覧')).toBeInTheDocument();
    expect(scrollSpy).toHaveBeenCalled();
  });
});
