"use client";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { RefreshCwIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useSync } from "../sync-provider";
import clsx from "clsx";
import { sendGTMEvent } from "@next/third-parties/google";
import { env } from "@/env.mjs";

export default function SyncButton({
  siteId,
  userId,
}: {
  siteId: string;
  userId: string;
}) {
  const { setRefreshKey, setIsPending } = useSync();

  const { data: syncStatus, isLoading: isLoadingStatusCheck } =
    api.site.checkSyncStatus.useQuery(
      { id: siteId },
      {
        refetchInterval: 10 * 1000,
        keepPreviousData: true,
        refetchOnWindowFocus: "always",
      },
    );

  const { mutate: syncSite, isLoading: isLoadingMutation } =
    api.site.sync.useMutation({
      onMutate: async () => {
        // hack to immedaitely update the status, as there is no way
        // to revalidate the query from the TRPC method
        setIsPending(true);
        if (env.NEXT_PUBLIC_VERCEL_ENV === "production") {
          sendGTMEvent({
            event: "manual_sync",
            site_id: siteId,
            user_id: userId,
          });
        }
      },
      onSuccess: (res) => {
        /* toast.success(`Successfully synced site!`); */
        setIsPending(false);
        setRefreshKey((prev: number) => prev + 1);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsPending(false);
        setRefreshKey((prev: number) => prev + 1);
        if (error.data?.code === "UNAUTHORIZED") {
          setTimeout(() => {
            signOut();
          }, 3000);
        }
      },
    });

  const isDisabled =
    isLoadingStatusCheck ||
    syncStatus?.isUpToDate ||
    syncStatus?.syncStatus === "PENDING" ||
    isLoadingMutation;

  return (
    <button
      id="sync-button"
      type="button"
      className={clsx(
        "inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
        isDisabled && "cursor-default opacity-50 hover:bg-white",
      )}
      onClick={() => syncSite({ id: siteId })}
      disabled={isDisabled}
    >
      <RefreshCwIcon
        className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400"
        aria-hidden="true"
      />
      Sync
    </button>
  );
}
