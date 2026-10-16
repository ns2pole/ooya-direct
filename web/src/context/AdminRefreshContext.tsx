import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AdminRefreshValue = {
  version: number;
  bump: () => void;
};

const AdminRefreshContext = createContext<AdminRefreshValue>({
  version: 0,
  bump: () => undefined,
});

export function AdminRefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const value = useMemo(
    () => ({
      version,
      bump: () => setVersion((current) => current + 1),
    }),
    [version]
  );
  return <AdminRefreshContext.Provider value={value}>{children}</AdminRefreshContext.Provider>;
}

export function useAdminRefresh(): AdminRefreshValue {
  return useContext(AdminRefreshContext);
}
