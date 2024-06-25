"use client";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { useSync } from "../sync-provider";

import {
  ArrowDownCircleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/20/solid";
import { useEffect } from "react";

export default function Status() {
  const { id } = useParams() as { id: string };
  const { refreshKey, isPending } = useSync();

  const {
    data: syncStatus,
    isLoading,
    refetch,
  } = api.site.checkSyncStatus.useQuery(
    { id },
    {
      refetchInterval: 10 * 1000,
      keepPreviousData: true,
      refetchOnWindowFocus: "always",
    },
  );

  useEffect(() => {
    refetch();
  }, [refreshKey]);

  return (
    <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
      <div className="mt-2 flex items-center text-sm text-gray-500">
        {isLoading ? (
          <div className="flex items-center">
            <ExclamationCircleIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
              aria-hidden="true"
            />
            <span>-</span>
          </div>
        ) : syncStatus?.isUpToDate ? (
          <div className="flex items-center">
            <CheckCircleIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-green-400"
              aria-hidden="true"
            />
            <span>Synced</span>
          </div>
        ) : syncStatus?.syncStatus === "PENDING" || isPending ? (
          <div className="flex items-center">
            <ArrowDownCircleIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-orange-400"
              aria-hidden="true"
            />
            <span>Syncing...</span>
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
        {isLoading ? (
          <span>-</span>
        ) : (
          <span>
            Last synced{" "}
            {syncStatus && syncStatus.syncedAt
              ? new Date(syncStatus?.syncedAt)?.toLocaleString()
              : "—"}
          </span>
        )}
      </div>
    </div>
  );
}
