"use client";

import { ReactNode, createContext, useContext, useState } from "react";

interface SyncContextProps {
  refreshKey: number;
  setRefreshKey: (number) => void;
}

const SyncContext = createContext<SyncContextProps>({
  refreshKey: 0,
  setRefreshKey: () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <SyncContext.Provider value={{ refreshKey, setRefreshKey }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
