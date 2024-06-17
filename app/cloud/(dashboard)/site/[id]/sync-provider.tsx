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
  isPending: boolean;
  setIsPending: Dispatch<React.SetStateAction<boolean>>;
}

const SyncContext = createContext<SyncContextProps>({
  refreshKey: 0,
  setRefreshKey: () => {},
  // hack to display loading status if triggered by a button as
  // it's not possible to revalidate query from within the "sync" TRPC method
  isPending: false,
  setIsPending: () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, setIsPending] = useState(false);

  return (
    <SyncContext.Provider
      value={{ refreshKey, setRefreshKey, isPending, setIsPending }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
