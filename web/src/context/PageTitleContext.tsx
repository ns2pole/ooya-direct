import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type PageTitleContextValue = {
  title: string;
  setTitle: (title: string) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageTitle(pageTitle: string) {
  const ctx = useContext(PageTitleContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setTitle(pageTitle);
    return () => ctx.setTitle('');
  }, [pageTitle, ctx]);
}

export function usePageTitleValue(): string {
  return useContext(PageTitleContext)?.title ?? '';
}
