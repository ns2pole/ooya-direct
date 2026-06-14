import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollToTop } from './scrollToTop';

describe('scrollToTop', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('window を先頭へスクロールする', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    scrollToTop();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });
});
