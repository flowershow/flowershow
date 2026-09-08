'use client';

import { Radio, RadioGroup } from '@headlessui/react';
import { useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

import type { Plan, PlanType } from '@/lib/stripe-plans';
import { applyDiscount } from '@/lib/stripe-plans';
import { api } from '@/trpc/react';
import { LoadingButton } from './loading-button';

const frequencies = [
  { value: 'month', label: 'Monthly', priceSuffix: '/month' },
  { value: 'year', label: 'Annually', priceSuffix: '/year' },
] as const;

interface LivePrice {
  amount: number;
  currency: string;
}

interface BundleTier {
  id: string;
  minExistingSites: number;
  percentOff: number;
}

interface BundleInfo {
  activeSiteCount: number;
  prices: { month: LivePrice | null; year: LivePrice | null };
  tiers: BundleTier[];
  nextSiteDiscountPercent: number;
}

interface BillingProps {
  siteId: string;
  subscription: any;
  plans: Record<PlanType, Plan>;
  bundleInfo?: BundleInfo;
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

export default function Billing({
  siteId,
  subscription,
  plans,
  bundleInfo,
}: BillingProps) {
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState(frequencies[0]);
  const searchParams = useSearchParams();

  const activeSiteCount = bundleInfo?.activeSiteCount ?? 0;
  const nextSiteDiscountPercent = bundleInfo?.nextSiteDiscountPercent ?? 0;
  const isEligibleForDiscount =
    (!subscription || subscription.status !== 'active') &&
    nextSiteDiscountPercent > 0;

  useEffect(() => {
    if (searchParams.get('upgrade_success') === 'true') {
      const url = new URL(window.location.href);
      url.searchParams.delete('upgrade_success');
      window.location.replace(url.toString());
    }
  }, [searchParams]);

  // Fire once when the pricing ladder is shown to a user who hasn't yet
  // upgraded this site, so we can measure bundle-discount interest.
  useEffect(() => {
    if (subscription?.status === 'active') return;
    posthog.capture('bundle_ladder_shown', {
      siteId,
      activeSiteCount,
      nextSiteDiscountPercent,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Base price for the selected interval, read live from Stripe (via
  // bundleInfo) so amount changes in Stripe reflect here with no code change.
  // Falls back to the static PLANS amount if the live lookup is unavailable.
  const getIntervalPrice = (plan: Plan): LivePrice | null => {
    const interval = frequency.value as 'month' | 'year';
    const live = bundleInfo?.prices?.[interval];
    if (live) return live;
    const fallback = plan.price?.[interval];
    return fallback
      ? { amount: fallback.amount, currency: fallback.currency }
      : null;
  };

  const formatAmount = (amount: number, currency: string) =>
    `${currency === 'USD' ? '$' : ''}${amount % 1 === 0 ? amount : amount.toFixed(2)}`;

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
    const interval = frequency.value;
    const priceId =
      plans.PREMIUM.price?.[interval as 'month' | 'year']?.stripePriceId;
    if (!priceId) {
      console.error('No price ID found for selected interval');
      setLoading(false);
      return;
    }
    posthog.capture('upgrade_cta_clicked', {
      siteId,
      interval,
      priceId,
      source: 'billing_settings',
      current_site_count: activeSiteCount,
      nth_site: activeSiteCount + 1,
      discount_percent: nextSiteDiscountPercent,
    });
    createCheckoutSession.mutate({ siteId, priceId });
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    createBillingPortalSession.mutate({ siteId });
  };

  return (
    <div
      data-testid="billing"
      className="rounded-lg border border-stone-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 id="billing" className="font-dashboard-heading text-xl">
          Billing
        </h2>

        <p>
          Current plan:
          <span className="ml-1 font-semibold">
            {subscription?.status === 'active' ? 'Premium' : 'Free'}
          </span>
        </p>

        {subscription?.status === 'canceled' && (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-950/40 dark:text-red-400">
            Expired
          </span>
        )}

        {(!subscription || subscription.status !== 'active') && (
          <div className="space-y-4">
            <div>
              {(() => {
                const price = getIntervalPrice(plans.PREMIUM);
                if (!price) {
                  return (
                    <p className="mb-2 flex items-baseline gap-x-2 text-lg">
                      <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
                        Free
                      </span>
                    </p>
                  );
                }
                const discounted = applyDiscount(
                  price.amount,
                  nextSiteDiscountPercent,
                );
                return (
                  <p className="mb-2 flex items-baseline gap-x-2 text-lg">
                    {isEligibleForDiscount ? (
                      <>
                        <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
                          {formatAmount(discounted, price.currency)}
                        </span>
                        <span className="text-stone-400 line-through dark:text-zinc-500">
                          {formatAmount(price.amount, price.currency)}
                        </span>
                        <span
                          className="cursor-help self-center rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-600/20 dark:bg-pink-950/40 dark:text-pink-400"
                          title={`Multi-site bundle discount: ${nextSiteDiscountPercent}% off because you already have ${activeSiteCount} premium ${
                            activeSiteCount === 1 ? 'site' : 'sites'
                          }. Every additional site costs less.`}
                        >
                          {nextSiteDiscountPercent}% off
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
                        {formatAmount(price.amount, price.currency)}
                      </span>
                    )}
                  </p>
                );
              })()}
              <p className="text-stone-500 dark:text-zinc-400">
                billed {frequency.label.toLowerCase()}
                {isEligibleForDiscount && (
                  <>
                    {' '}
                    — bundle discount applied to your{' '}
                    {ordinal(activeSiteCount + 1)} site
                  </>
                )}
              </p>
            </div>

            {/* Multi-site bundle discount ladder */}
            <div className="rounded-md bg-stone-50 p-3 text-sm ring-1 ring-inset ring-stone-200 dark:bg-zinc-950 dark:ring-zinc-700">
              <p className="mb-2 font-medium text-stone-700 dark:text-zinc-200">
                Save more with every site
              </p>
              <ul className="space-y-1 text-stone-600 dark:text-zinc-300">
                {(() => {
                  const price = getIntervalPrice(plans.PREMIUM);
                  if (!price) return null;
                  const rows = [
                    { label: '1st site', percentOff: 0 },
                    ...(bundleInfo?.tiers ?? []).map((tier) => ({
                      label:
                        tier.minExistingSites === 1
                          ? '2nd site'
                          : `${ordinal(tier.minExistingSites + 1)}+ site`,
                      percentOff: tier.percentOff,
                    })),
                  ];
                  return rows.map((row) => {
                    const isCurrent =
                      row.percentOff === nextSiteDiscountPercent &&
                      isEligibleForDiscount;
                    return (
                      <li
                        key={row.label}
                        className={`flex items-center justify-between ${
                          isCurrent
                            ? 'font-semibold text-stone-900 dark:text-zinc-100'
                            : ''
                        }`}
                      >
                        <span>{row.label}</span>
                        <span className="flex items-center gap-x-2">
                          <span>
                            {formatAmount(
                              applyDiscount(price.amount, row.percentOff),
                              price.currency,
                            )}
                            /{frequency.value}
                          </span>
                          {row.percentOff > 0 && (
                            <span className="text-xs text-green-700 dark:text-green-400">
                              {row.percentOff}% off
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  });
                })()}
              </ul>
              <p className="mt-2 text-xs text-stone-400 dark:text-zinc-500">
                Discounts apply automatically at checkout.
              </p>
            </div>

            <div className="inline-block">
              <fieldset aria-label="Payment frequency">
                <RadioGroup
                  value={frequency}
                  onChange={setFrequency}
                  className="grid grid-cols-2 gap-x-1 rounded-md p-1 text-center text-xs/5 font-semibold ring-1 ring-inset ring-stone-200 dark:ring-zinc-700"
                >
                  {frequencies.map((option) => (
                    <Radio
                      key={option.value}
                      value={option}
                      className="cursor-pointer rounded-md px-2.5 py-1 text-stone-500 dark:text-zinc-400 data-[checked]:bg-black data-[checked]:text-white"
                    >
                      {option.label}
                    </Radio>
                  ))}
                </RadioGroup>
              </fieldset>
            </div>
          </div>
        )}

        {subscription?.status === 'active' &&
          (() => {
            const interval = subscription.interval as 'month' | 'year';
            const fallback = plans.PREMIUM.price?.[interval];
            const price =
              bundleInfo?.prices?.[interval] ??
              (fallback
                ? { amount: fallback.amount, currency: fallback.currency }
                : null);
            if (!price) return null;
            const discountPercent = subscription.discountPercent ?? 0;
            const charged = applyDiscount(price.amount, discountPercent);
            return (
              <div>
                <p className="mb-2 flex items-baseline gap-x-2 text-lg">
                  {discountPercent > 0 ? (
                    <>
                      <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
                        {formatAmount(charged, price.currency)}
                      </span>
                      <span className="text-stone-400 line-through dark:text-zinc-500">
                        {formatAmount(price.amount, price.currency)}
                      </span>
                      <span
                        className="cursor-help self-center rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-600/20 dark:bg-pink-950/40 dark:text-pink-400"
                        title={`You're getting ${discountPercent}% off this site as part of your multi-site bundle discount.`}
                      >
                        {discountPercent}% off
                      </span>
                    </>
                  ) : (
                    <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
                      {formatAmount(price.amount, price.currency)}
                    </span>
                  )}
                </p>
                <p className="text-stone-500 dark:text-zinc-400">
                  billed {interval === 'month' ? 'monthly' : 'annually'}
                </p>
              </div>
            );
          })()}

        {subscription?.status === 'active' && subscription.currentPeriodEnd && (
          <div className="text-sm text-stone-500 dark:text-zinc-400">
            {subscription.cancelAtPeriodEnd ? (
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Your subscription will end on{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' },
                )}
              </p>
            ) : (
              <p>
                Next billing date:{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                  'en-US',
                  { year: 'numeric', month: 'long', day: 'numeric' },
                )}{' '}
                <span className="text-stone-500 dark:text-zinc-400">
                  (Renews{' '}
                  {subscription.interval === 'month' ? 'monthly' : 'annually'})
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
        <p className="w-full text-sm text-stone-500 dark:text-zinc-400">
          {subscription?.status === 'active' ? (
            'Manage your subscription and payment method.'
          ) : (
            <>
              Select billing interval and upgrade to Premium.{' '}
              <a
                href="https://flowershow.app/pricing"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-stone-700 dark:hover:text-zinc-200"
              >
                See pricing
              </a>
            </>
          )}
        </p>
        <LoadingButton
          onClick={
            subscription?.status === 'active'
              ? handleManageSubscription
              : handleSubscribe
          }
          loading={loading}
          variant={subscription?.status === 'active' ? 'outlined' : 'filled'}
        >
          {subscription?.status === 'active'
            ? 'Manage Subscription'
            : 'Upgrade to Premium'}
        </LoadingButton>
      </div>
    </div>
  );
}
