"use client";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import LoadingDots from "@/components/icons/loading-dots";
import va from "@vercel/analytics";
import { api } from "@/trpc/react";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { signOut } from "next-auth/react";
import { useSync } from "../sync-provider";

export default function SyncButton() {
  const { id } = useParams() as { id: string };
  const { setRefreshKey } = useSync();

  const { mutate: syncSite, isLoading } = api.site.sync.useMutation({
    onSuccess: (res) => {
      va.track("Synced Site");
      toast.success(`Successfully synced site!`);
      setRefreshKey((prev: number) => prev + 1);
    },
    onError: (error) => {
      toast.error(error.message);
      if (error.data?.code === "UNAUTHORIZED") {
        setTimeout(() => {
          signOut();
        }, 3000);
      }
    },
  });
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      onClick={() => syncSite({ id })}
      disabled={isLoading}
    >
      <ArrowPathIcon
        className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400"
        aria-hidden="true"
      />
      {isLoading ? <LoadingDots color="#111827" /> : "Sync"}
    </button>
  );
}
