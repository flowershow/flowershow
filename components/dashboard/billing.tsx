"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { LoadingButton } from "./loading-button";
import type { PlanType, Plan } from "@/lib/stripe";
import { Radio, RadioGroup } from "@headlessui/react";

const frequencies = [
  { value: "month", label: "Monthly", priceSuffix: "/month" },
  { value: "year", label: "Annually", priceSuffix: "/year" },
] as const;

interface BillingProps {
  siteId: string;
  subscription: any;
  plans: Record<PlanType, Plan>;
}

export default function Billing({ siteId, subscription, plans }: BillingProps) {
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState(frequencies[0]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for success parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setShowSuccess(true);
      // Remove success parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  const getPriceString = (plan: Plan) => {
    const interval = frequency.value as "month" | "year";
    if (!plan.price?.[interval]) return "Free";
    const price = plan.price[interval]!; // Non-null assertion since we checked above
    return `${price.currency === "USD" ? "$" : ""}${price.amount}`;
  };

  const createCheckoutSession = api.stripe.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      setLoading(false);
      if (url) {
        window.location.href = url;
      }
    },
    onError: (error) => {
      setLoading(false);
      console.error(error);
    },
  });

  const createBillingPortalSession = api.stripe.getBillingPortal.useMutation({
    onSuccess: ({ url }) => {
      setLoading(false);
      if (url) {
        window.location.href = url;
      }
    },
    onError: (error) => {
      setLoading(false);
      console.error(error);
    },
  });

  const handleSubscribe = async () => {
    setLoading(true);
    const priceId =
      plans.PREMIUM.price?.[frequency.value as "month" | "year"]?.stripePriceId;
    if (!priceId) {
      console.error("No price ID found for selected interval");
      setLoading(false);
      return;
    }
    createCheckoutSession.mutate({ siteId, priceId });
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    createBillingPortalSession.mutate({ siteId });
  };

  return (
    <div
      data-testid="billing"
      className="rounded-lg border border-stone-200 bg-white"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 id="billing" className="font-cal text-xl">
          Billing
        </h2>

        <p>
          Current plan:
          <span className="ml-1 font-semibold">
            {subscription?.status === "active" ? "Premium" : "Free"}
          </span>
        </p>

        {subscription?.status === "canceled" && (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
            Expired
          </span>
        )}

        {(!subscription || subscription.status !== "active") && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 flex items-baseline gap-x-2 text-lg">
                <span className="text-xl font-semibold tracking-tight text-stone-900">
                  {getPriceString(plans.PREMIUM)}
                </span>
                <span className="text-stone-500">USD</span>
              </p>
              <p className="text-stone-500">
                per month, per site, billed {frequency.label.toLowerCase()}
              </p>
            </div>
            <div className="inline-block">
              <fieldset aria-label="Payment frequency">
                <RadioGroup
                  value={frequency}
                  onChange={setFrequency}
                  className="grid grid-cols-2 gap-x-1 rounded-md p-1 text-center text-xs/5 font-semibold ring-1 ring-inset ring-stone-200"
                >
                  {frequencies.map((option) => (
                    <Radio
                      key={option.value}
                      value={option}
                      className="cursor-pointer rounded-md px-2.5 py-1 text-stone-500 data-[checked]:bg-black data-[checked]:text-white"
                    >
                      {option.label}
                    </Radio>
                  ))}
                </RadioGroup>
              </fieldset>
            </div>
          </div>
        )}

        {subscription?.status === "active" && subscription.currentPeriodEnd && (
          <div className="text-sm text-stone-500">
            {subscription.cancelAtPeriodEnd ? (
              <p className="font-medium text-amber-600">
                Your subscription will end on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            ) : (
              <p>
                Next billing date:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}{" "}
                <span className="text-stone-500">
                  (Renews{" "}
                  {subscription.interval === "month" ? "monthly" : "annually"})
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
        <p className="w-full text-sm text-stone-500">
          {subscription?.status === "active"
            ? "Manage your subscription and payment method."
            : "Select billing interval and upgrade to Premium."}
        </p>
        <LoadingButton
          onClick={
            subscription?.status === "active"
              ? handleManageSubscription
              : handleSubscribe
          }
          loading={loading}
          variant={subscription?.status === "active" ? "outlined" : "filled"}
        >
          {subscription?.status === "active"
            ? "Manage Subscription"
            : "Upgrade to Premium"}
        </LoadingButton>
      </div>
    </div>
  );
}
