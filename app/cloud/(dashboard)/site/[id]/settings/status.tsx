"use client";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { useSync } from "../sync-provider";
import {
  CircleArrowDownIcon,
  CalendarIcon,
  CircleCheckIcon,
  CircleAlertIcon,
  InfoIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";

export default function Status() {
  const { id } = useParams() as { id: string };
  const { refreshKey, isPending } = useSync();
  const [showErrorDialog, setShowErrorDialog] = useState(false);

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
            <CircleAlertIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
              aria-hidden="true"
            />
            <span>-</span>
          </div>
        ) : syncStatus?.isUpToDate ? (
          <div className="flex items-center">
            <CircleCheckIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-green-400"
              aria-hidden="true"
            />
            <span>Synced</span>
          </div>
        ) : syncStatus?.syncStatus === "PENDING" || isPending ? (
          <div className="flex items-center">
            <CircleArrowDownIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-orange-400"
              aria-hidden="true"
            />
            <span>Syncing...</span>
          </div>
        ) : syncStatus?.syncStatus === "ERROR" ? (
          <div className="group flex items-center hover:cursor-default">
            <CircleAlertIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-red-400"
              aria-hidden="true"
            />
            <Popover className="relative z-30">
              <PopoverButton
                onMouseEnter={() => setShowErrorDialog(true)}
                onMouseLeave={() => setShowErrorDialog(false)}
                className="group flex outline-none hover:text-gray-800"
              >
                <span>Error</span>
                <InfoIcon
                  className="ml-1 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
              </PopoverButton>

              <Transition
                show={showErrorDialog}
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <PopoverPanel className="absolute left-1/2 flex w-screen max-w-min -translate-x-1/2 px-4">
                  <div
                    onMouseEnter={() => setShowErrorDialog(true)}
                    onMouseLeave={() => setShowErrorDialog(false)}
                    className="max-h-80 w-80 shrink overflow-y-auto rounded-xl bg-white p-4 text-sm leading-6 text-gray-900 shadow-lg ring-1 ring-gray-900/5"
                  >
                    {syncStatus && JSON.parse(syncStatus.syncError as string)
                      ? JSON.parse(syncStatus.syncError as string).message
                      : "Unknown error"}
                  </div>
                </PopoverPanel>
              </Transition>
            </Popover>
          </div>
        ) : (
          <div className="flex items-center">
            <CircleAlertIcon
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
