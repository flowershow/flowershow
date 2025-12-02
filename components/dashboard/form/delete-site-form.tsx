"use client";

import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { Subscription } from "@prisma/client";
import LoadingDots from "@/components/icons/loading-dots";

type SubscriptionWithInterval = Subscription & {
  interval?: "month" | "year";
  cancelAtPeriodEnd?: boolean;
};

// TODO refactor this
export default function DeleteSiteForm({ siteName }: { siteName: string }) {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [showSubscriptionWarning, setShowSubscriptionWarning] = useState(false);

  // Query subscription details
  const { data: subscription, refetch } =
    api.stripe.getSiteSubscription.useQuery(
      { siteId: id },
      {
        retry: false,
        refetchOnWindowFocus: false,
      },
    );

  const { isLoading: isDeletingSite, mutate: deleteSite } =
    api.site.delete.useMutation({
      onSuccess: (res) => {
        router.push("/");
        router.refresh();
        toast.success(`Successfully deleted site!`);
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

  const { mutate: cancelSubscription } =
    api.stripe.cancelSubscription.useMutation({
      onSuccess: () => {
        deleteSite({ id });
      },
      onError: (error) => {
        toast.error(error.message);
        setShowSubscriptionWarning(false);
      },
    });

  const handleDelete = async () => {
    const { data: latestSubscription } = await refetch();
    if (latestSubscription && latestSubscription.status === "active") {
      setShowSubscriptionWarning(true);
    } else {
      deleteSite({ id });
    }
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleDelete();
        }}
        className="rounded-lg border border-red-600 bg-white "
      >
        <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
          <h2 id="deleteSite" className="font-dashboard-heading text-xl ">
            Delete Site
          </h2>
          <p className="text-sm text-stone-500 ">
            Deletes your site and all posts associated with it. Type in the name
            of your site <b>{siteName}</b> to confirm.
          </p>

          <input
            data-testid="delete-site-input"
            name="confirm"
            type="text"
            required
            pattern={siteName}
            placeholder={siteName}
            className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500    "
          />
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3   sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
          <p className="w-full text-sm text-stone-500 ">
            This action is irreversible. Please proceed with caution.
          </p>
          <div className="min-w-32">
            <FormButton pending={isDeletingSite} />
          </div>
        </div>
      </form>

      {showSubscriptionWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 ">
            <h3 className="mb-4 text-lg font-semibold">
              Active Subscription Warning
            </h3>
            <div className="mb-4 text-sm text-stone-500 ">
              <p>
                {subscription?.cancelAtPeriodEnd ? (
                  <>
                    This site has a subscription that is already scheduled to
                    cancel at the end of the current billing period. Deleting
                    the site now will immediately cancel the subscription.
                  </>
                ) : (
                  "This site has an active subscription that will be automatically cancelled."
                )}
              </p>
              {subscription?.currentPeriodEnd && (
                <p className="mt-2">
                  {subscription?.cancelAtPeriodEnd
                    ? "Scheduled cancellation date"
                    : "Next billing date"}
                  :{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  <br />
                  Billing period:{" "}
                  {(subscription as SubscriptionWithInterval)?.interval ===
                  "year"
                    ? "Annually"
                    : "Monthly"}
                </p>
              )}
              <p className="mt-4 font-medium">
                Are you sure you want to delete this site and immediately cancel
                its subscription?
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSubscriptionWarning(false)}
                className="rounded-md border border-stone-200 px-4 py-2 text-sm text-stone-900 hover:bg-stone-100   "
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  cancelSubscription({ siteId: id });
                }}
                className="rounded-md border border-red-600 bg-red-600 px-4 py-2 text-sm text-white hover:bg-white hover:text-red-600"
              >
                Delete Site
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FormButton({ pending = false }) {
  return (
    <button
      className={cn(
        "flex h-8 w-32 items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none sm:h-10",
        pending
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400   "
          : "border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600 ",
      )}
      disabled={pending}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Confirm Delete</p>}
    </button>
  );
}
