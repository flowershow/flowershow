"use client";

import {
  ReactNode,
  Dispatch,
  createContext,
  useContext,
  useState,
} from "react";

interface SyncContextProps {
  refreshKey: number;
  setRefreshKey: Dispatch<React.SetStateAction<number>>;
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
