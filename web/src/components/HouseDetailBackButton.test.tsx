import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HouseDetailBackButton } from './HouseDetailBackButton';
import * as scrollToTop from '../lib/scrollToTop';

describe('HouseDetailBackButton', () => {
  it('クリックで一覧へ遷移し先頭へスクロールする', async () => {
    const scrollSpy = vi.spyOn(scrollToTop, 'scrollToTop').mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/houses/abc']}>
        <HouseDetailBackButton />
        <p>遷移先確認用</p>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '← 戻る' }));

    expect(window.location.pathname).toBe('/');
    expect(scrollSpy).toHaveBeenCalled();
  });
});
