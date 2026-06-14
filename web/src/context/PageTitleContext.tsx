import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PageHeaderCrumb = {
  label: string;
  to?: string;
};

type PageTitleContextValue = {
  crumbs: PageHeaderCrumb[];
  setCrumbs: (crumbs: PageHeaderCrumb[]) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<PageHeaderCrumb[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

export function usePageHeader(crumbs: PageHeaderCrumb[]) {
  const setCrumbs = useContext(PageTitleContext)?.setCrumbs;
  const serialized = JSON.stringify(crumbs);
  useEffect(() => {
    if (!setCrumbs) return;
    setCrumbs(JSON.parse(serialized) as PageHeaderCrumb[]);
    return () => setCrumbs([]);
  }, [serialized, setCrumbs]);
}

export function usePageTitle(pageTitle: string) {
  usePageHeader([{ label: pageTitle }]);
}

export function usePageHeaderValue(): PageHeaderCrumb[] {
  return useContext(PageTitleContext)?.crumbs ?? [];
}
