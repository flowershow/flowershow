'use client';

import { useSearchParams } from 'next/navigation';
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from '@/trpc/react';

// Site-level sync status (separate from blob-level Status enum)
type SiteSyncStatus =
  | 'UNPUBLISHED'
  | 'SUCCESS'
  | 'PENDING'
  | 'ERROR'
  | 'OUTDATED'
  | 'LOADING';

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
  const searchParams = useSearchParams();
  const syncJustStarted = searchParams.get('syncStarted') === '1';

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: syncJustStarted ? 'PENDING' : 'LOADING',
  });

  const { data } = api.site.getSyncStatus.useQuery(
    { id: siteId },
    {
      refetchInterval: 10 * 1000,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (data) {
      // If sync was just triggered, show PENDING until the API returns something
      // other than UNPUBLISHED (blobs haven't been created yet)
      if (syncJustStarted && data.status === 'UNPUBLISHED') {
        setSyncStatus({ status: 'PENDING' });
        return;
      }
      setSyncStatus(data);
    }
  }, [data, syncJustStarted]);

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
