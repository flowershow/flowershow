/* "use client"; */
/* import { api } from "@/trpc/react"; */
import {
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/20/solid";
import LoadingDots from "@/components/icons/loading-dots";
import { Suspense } from "react";

export default async function Status({
  syncStatus,
}: {
  syncStatus: {
    synced: boolean;
    syncedAt: Date | null;
  };
}) {
  /* const { data: syncStatus, isLoading } = api.site.checkSyncStatus.useQuery({ id }); */
  return (
    <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
      <Suspense fallback={<LoadingDots />}>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          {syncStatus?.synced ? (
            <div className="flex items-center">
              <CheckCircleIcon
                className="mr-1.5 h-5 w-5 flex-shrink-0 text-green-400"
                aria-hidden="true"
              />
              <span>Synced</span>
            </div>
          ) : (
            <div className="flex items-center">
              <ExclamationCircleIcon
                className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                aria-hidden="true"
              />
              <span>Outdated</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <CalendarIcon
            className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
          Last synced {new Date(syncStatus?.syncedAt!)?.toLocaleString() || ""}
        </div>
      </Suspense>
    </div>
  );
}
