"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
/* import LoadingDots from "@/components/icons/loading-dots"; */
import va from "@vercel/analytics";
import { api } from "@/trpc/react";

export default function SyncSiteButton() {
  const { id } = useParams() as { id: string };

  const syncSite = api.site.sync.useMutation({
    onSuccess: (res) => {
      va.track("Synced Site");
      toast.success(`Successfully synced site!`);
    },
    onError: (error) => {
      toast.error(error.message);
      /* if (error.data?.code === "UNAUTHORIZED") {
       *     setTimeout(() => {
       *         signOut();
       *     }, 3000);
       * } */
    },
  });

  return (
    <button
      onClick={() => syncSite.mutate({ id })}
      className={cn(
        "flex h-8 w-36 items-center justify-center space-x-2 rounded-lg border text-sm transition-all focus:outline-none sm:h-9",
        "border border-black bg-black text-white hover:bg-white hover:text-black active:bg-stone-100 dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
      )}
    >
      Sync Site
    </button>
  );
}

/* <button
 *     onClick={() => syncSite.mutate({ gh_username: user, projectName: project })}
 *     className={cn(
 *         "flex h-8 w-36 items-center justify-center space-x-2 rounded-lg border text-sm transition-all focus:outline-none sm:h-9",
 *         isPending
 *             ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
 *             : "border border-black bg-black text-white hover:bg-white hover:text-black active:bg-stone-100 dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
 *     )}
 *     disabled={isPending}
 * >
 *     {isPending ? <LoadingDots color="#808080" /> : <p>Create New Post</p>}
 * </button> */
