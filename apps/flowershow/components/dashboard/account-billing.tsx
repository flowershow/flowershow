'use client';

import { Radio, RadioGroup } from '@headlessui/react';
import type { inferRouterOutputs } from '@trpc/server';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AppRouter } from '@/server/api/root';
import { api } from '@/trpc/react';
import { LoadingButton } from './loading-button';

export type AccountPlanData =
  inferRouterOutputs<AppRouter>['stripe']['getAccountPlan'];

type Plan = 'PRO' | 'UNLIMITED';
type Interval = 'month' | 'year';

// Annual first.
const frequencies = [
  { value: 'year', label: 'Annually', suffix: '/year' },
  { value: 'month', label: 'Monthly', suffix: '/month' },
] as const;

// Amounts are in major units and come from Stripe, in the price's own currency.
const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    amount,
  );

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

const PLAN_NAME: Record<Plan, string> = {
  PRO: 'Pro',
  UNLIMITED: 'Unlimited',
};

export default function AccountBilling({ data }: { data: AccountPlanData }) {
  const router = useRouter();
  const [frequency, setFrequency] = useState<(typeof frequencies)[number]>(
    frequencies[0],
  );
  const [loading, setLoading] = useState(false);
  const [pendingSiteId, setPendingSiteId] = useState<string | null>(null);

  const onRedirect = ({ url }: { url: string | null }) => {
    if (url) {
      window.location.href = url;
    } else {
      setLoading(false);
    }
  };
  const onError = (error: { message: string }) => {
    setLoading(false);
    toast.error(error.message);
  };

  const checkout = api.stripe.createAccountCheckoutSession.useMutation({
    onSuccess: onRedirect,
    onError,
  });
  const portal = api.stripe.getAccountBillingPortal.useMutation({
    onSuccess: onRedirect,
    onError,
  });
  const setCovered = api.stripe.setSiteCovered.useMutation({
    onSuccess: () => router.refresh(),
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => setPendingSiteId(null),
  });

  const choose = (plan: Plan) => {
    setLoading(true);
    checkout.mutate({ plan, interval: frequency.value as Interval });
  };

  const coveredCount = data.sites.filter((s) => s.covered).length;
  const plan = data.plan as Plan | null;

  return (
    <div
      data-testid="account-billing"
      className="rounded-lg border border-stone-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 id="billing" className="font-dashboard-heading text-xl">
          Billing
        </h2>

        {!plan ? (
          <>
            <fieldset aria-label="Payment frequency" className="inline-block">
              <RadioGroup
                value={frequency}
                onChange={setFrequency}
                className="grid grid-cols-2 gap-x-1 rounded-md p-1 text-center text-xs/5 font-semibold ring-1 ring-inset ring-stone-200 dark:ring-zinc-700"
              >
                {frequencies.map((option) => (
                  <Radio
                    key={option.value}
                    value={option}
                    className="cursor-pointer rounded-md px-2.5 py-1 text-stone-500 data-[checked]:bg-black data-[checked]:text-white dark:text-zinc-400"
                  >
                    {option.label}
                  </Radio>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              {(['PRO', 'UNLIMITED'] as const).map((p) => {
                const price = data.prices[p][frequency.value];
                return (
                  <div
                    key={p}
                    className="flex flex-col space-y-3 rounded-md p-4 ring-1 ring-inset ring-stone-200 dark:ring-zinc-700"
                  >
                    <p className="font-medium">
                      {p === 'PRO'
                        ? `Pro: up to ${data.siteAllowance ?? 5} sites on Premium`
                        : 'Unlimited: every site on Premium'}
                    </p>
                    {price && (
                      <p className="flex items-baseline gap-x-1">
                        <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100">
                          {formatAmount(price.amount, price.currency)}
                        </span>
                        <span className="text-stone-500 dark:text-zinc-400">
                          {frequency.suffix}
                        </span>
                      </p>
                    )}
                    <LoadingButton
                      onClick={() => choose(p)}
                      loading={loading}
                      variant="filled"
                    >
                      {`Choose ${PLAN_NAME[p]}`}
                    </LoadingButton>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-medium">
              {`${PLAN_NAME[plan]}, ${coveredCount} of ${
                plan === 'PRO' ? (data.siteAllowance ?? 5) : 'all'
              } sites covered`}
            </p>
            {data.creditBalanceCents > 0 && (
              <p className="text-sm text-stone-500 dark:text-zinc-400">
                Credit applied:{' '}
                {formatAmount(
                  data.creditBalanceCents / 100,
                  (data.interval &&
                    data.prices[plan][data.interval as Interval]?.currency) ||
                    'USD',
                )}
              </p>
            )}
            {data.cancelAtPeriodEnd && data.currentPeriodEnd && (
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Ends on {formatDate(data.currentPeriodEnd)}
              </p>
            )}

            {/* Unlimited covers every site; the covered flag is ignored there. */}
            {plan === 'PRO' && (
              <ul className="divide-y divide-stone-200 rounded-md ring-1 ring-inset ring-stone-200 dark:divide-zinc-700 dark:ring-zinc-700">
                {data.sites.map((site) => {
                  const manual = site.planSource === 'MANUAL';
                  const atLimit =
                    data.siteAllowance !== null &&
                    coveredCount >= data.siteAllowance;
                  return (
                    <li key={site.id} className="px-4 py-3">
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          aria-label={site.projectName}
                          checked={manual || site.covered}
                          disabled={
                            manual ||
                            pendingSiteId === site.id ||
                            (!site.covered && atLimit)
                          }
                          onChange={(e) => {
                            setPendingSiteId(site.id);
                            setCovered.mutate({
                              siteId: site.id,
                              covered: e.target.checked,
                            });
                          }}
                        />
                        <span className="flex flex-col">
                          <span className="font-medium">
                            {site.projectName}
                          </span>
                          {manual ? (
                            <span className="text-stone-500 dark:text-zinc-400">
                              Premium (granted)
                            </span>
                          ) : (
                            site.hasSiteSubscription &&
                            !site.covered && (
                              <span className="text-stone-500 dark:text-zinc-400">
                                Own subscription; covering it cancels that
                                subscription and credits the unused time
                              </span>
                            )
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {plan && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
          <p className="w-full text-sm text-stone-500 dark:text-zinc-400">
            Manage your subscription and payment method.
          </p>
          <LoadingButton
            onClick={() => {
              setLoading(true);
              portal.mutate();
            }}
            loading={loading}
            variant="outlined"
          >
            Manage billing
          </LoadingButton>
        </div>
      )}
    </div>
  );
}
