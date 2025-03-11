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
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 sm:p-10">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h3 className="text-sm font-medium text-primary-muted">Current Plan</h3>

        {subscription?.status === "canceled" && (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
            Expired
          </span>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span className="font-cal text-xl font-semibold">
            {subscription?.status === "active" ? "Premium" : "Free Plan"}
          </span>
        </div>
      </div>

      {(!subscription || subscription.status !== "active") && (
        <div className="mt-6 space-y-4">
          <div>
            <p className="mb-2 flex items-baseline gap-x-2">
              <span className="text-4xl font-semibold tracking-tight">
                {getPriceString(plans.PREMIUM)}
              </span>
              <span className="text-xl text-primary-subtle">USD</span>
            </p>
            <p className="text-primary-subtle">
              per month, per site, billed {frequency.label.toLowerCase()}
            </p>
          </div>
          <div className="inline-block">
            <fieldset aria-label="Payment frequency">
              <RadioGroup
                value={frequency}
                onChange={setFrequency}
                className="grid grid-cols-2 gap-x-1 rounded-md p-1 text-center text-xs/5 font-semibold ring-1 ring-inset ring-gray-200"
              >
                {frequencies.map((option) => (
                  <Radio
                    key={option.value}
                    value={option}
                    className="cursor-pointer rounded-md px-2.5 py-1 text-primary-subtle data-[checked]:bg-indigo-600 data-[checked]:text-white"
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
        <div className="mt-4 text-sm text-primary-subtle">
          {subscription.cancelAtPeriodEnd ? (
            <p className="font-medium text-amber-600">
              Your subscription will end on{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          ) : (
            <p>
              Next billing date:{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}{" "}
              <span className="text-primary-subtle">
                (Renews{" "}
                {subscription.interval === "month" ? "monthly" : "annually"})
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
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
