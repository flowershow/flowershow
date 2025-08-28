"use client";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { RefreshCwIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useSync } from "../sync-status-provider";
import clsx from "clsx";
import posthog from "posthog-js";

export default function SyncButton({ siteId }: { siteId: string }) {
  const { setSyncTriggered, status } = useSync();

  const { mutate: syncSite, isLoading: isLoadingMutation } =
    api.site.sync.useMutation({
      onMutate: async () => {
        setSyncTriggered!(true);
        posthog.capture("site_sync_triggered", {
          id: siteId,
          source: "dashboard",
        });
      },
      onError: (error) => {
        toast.error(error.message);
        setSyncTriggered!(false);
        if (error.data?.code === "UNAUTHORIZED") {
          setTimeout(() => {
            signOut();
          }, 3000);
        }
      },
    });

  const isDisabled =
    ["SUCCESS", "PENDING", "LOADING"].includes(status) || isLoadingMutation;

  return (
    <button
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
