import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HashRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { PageTitleProvider } from '../context/PageTitleContext';
import { vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';

vi.mock('../firebase', () => ({
  isFirebaseConfigured: true,
  missingFirebaseEnvKeys: () => [],
}));

describe('debug', () => {
  it('HashRouter の戻る Link href', () => {
    window.location.hash = '#/houses/abc';
    render(
      <HashRouter>
        <PageTitleProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="houses/:houseId" element={<p>detail</p>} />
            </Route>
          </Routes>
        </PageTitleProvider>
      </HashRouter>
    );

    const link = screen.getByRole('link', { name: '← 戻る' });
    expect(link.getAttribute('href')).toBe('#/');
  });
});
