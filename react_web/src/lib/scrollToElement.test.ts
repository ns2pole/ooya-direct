import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollToElementId } from './scrollToElement';

describe('scrollToElementId', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('要素があれば scrollIntoView して true を返す', () => {
    const el = document.createElement('div');
    el.id = 'target';
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    expect(scrollToElementId('target')).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('textarea なら focus も呼ぶ', () => {
    const el = document.createElement('textarea');
    el.id = 'inquiry-message';
    el.scrollIntoView = vi.fn();
    el.focus = vi.fn();
    document.body.appendChild(el);

    scrollToElementId('inquiry-message');
    expect(el.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('focusId があれば別要素に focus する', () => {
    const label = document.createElement('span');
    label.id = 'inquiry-message-label';
    label.scrollIntoView = vi.fn();
    const textarea = document.createElement('textarea');
    textarea.id = 'inquiry-message';
    textarea.focus = vi.fn();
    document.body.append(label, textarea);

    scrollToElementId('inquiry-message-label', 'inquiry-message');

    expect(label.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(textarea.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('要素がなければ false', () => {
    expect(scrollToElementId('missing')).toBe(false);
  });
});
