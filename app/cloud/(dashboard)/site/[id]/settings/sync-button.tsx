"use client";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import LoadingDots from "@/components/icons/loading-dots";
import va from "@vercel/analytics";
import { api } from "@/trpc/react";
import { ArrowPathIcon } from "@heroicons/react/20/solid";
import { signOut } from "next-auth/react";
import { useSync } from "./sync-provider";

export default function SyncButton() {
  const { id } = useParams() as { id: string };
  const { setRefreshKey } = useSync();

  const { mutate: syncSite, isLoading } = api.site.sync.useMutation({
    onSuccess: (res) => {
      va.track("Synced Site");
      toast.success(`Successfully synced site!`);
      setRefreshKey((prev) => prev + 1);
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
      className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
      onClick={() => syncSite({ id })}
      disabled={isLoading}
    >
      <ArrowPathIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
      {isLoading ? <LoadingDots color="white" /> : "Sync"}
    </button>
  );
}
