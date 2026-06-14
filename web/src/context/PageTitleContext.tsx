import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PageHeaderCrumb = {
  label: string;
  to?: string;
};

export type PageHeaderEndAction = {
  label: string;
  targetId: string;
};

type PageTitleContextValue = {
  crumbs: PageHeaderCrumb[];
  setCrumbs: (crumbs: PageHeaderCrumb[]) => void;
  endAction: PageHeaderEndAction | null;
  setEndAction: (action: PageHeaderEndAction | null) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<PageHeaderCrumb[]>([]);
  const [endAction, setEndAction] = useState<PageHeaderEndAction | null>(null);
  const value = useMemo(
    () => ({ crumbs, setCrumbs, endAction, setEndAction }),
    [crumbs, endAction]
  );
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

export function usePageHeaderEndAction(action: PageHeaderEndAction | null) {
  const setEndAction = useContext(PageTitleContext)?.setEndAction;
  const serialized = JSON.stringify(action);
  useEffect(() => {
    if (!setEndAction) return;
    setEndAction(action ? (JSON.parse(serialized) as PageHeaderEndAction) : null);
    return () => setEndAction(null);
  }, [serialized, setEndAction, action]);
}

export function usePageHeaderValue(): PageHeaderCrumb[] {
  return useContext(PageTitleContext)?.crumbs ?? [];
}

export function usePageHeaderEndActionValue(): PageHeaderEndAction | null {
  return useContext(PageTitleContext)?.endAction ?? null;
}
