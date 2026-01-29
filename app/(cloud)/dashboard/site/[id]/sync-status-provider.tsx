'use client';

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from '@/trpc/react';

// Site-level sync status (separate from blob-level Status enum)
type SiteSyncStatus = 'SUCCESS' | 'PENDING' | 'ERROR' | 'OUTDATED' | 'LOADING';

interface SyncStatus {
  status: SiteSyncStatus;
  error?: string | null;
  lastSyncedAt?: Date | null;
}

interface SyncStatusContextProps extends SyncStatus {
  setSyncTriggered?: Dispatch<SetStateAction<boolean>>;
}

const SyncStatusContext = createContext<SyncStatusContextProps>({
  status: 'LOADING',
});

export function SyncStatusProvider({
  children,
  siteId,
}: {
  children: ReactNode;
  siteId: string;
}) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'LOADING',
  });

  const { data, isLoading, refetch } = api.site.getSyncStatus.useQuery(
    { id: siteId },
    {
      refetchInterval: 10 * 1000,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (data) {
      setSyncStatus(data);
    }
  }, [data]);

  const setSyncTriggered = () => {
    setSyncStatus((prev) => ({ ...prev, status: 'PENDING' }));
  };

  return (
    <SyncStatusContext.Provider value={{ setSyncTriggered, ...syncStatus }}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncStatusContext);
}
