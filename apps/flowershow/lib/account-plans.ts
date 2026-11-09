import type {
  AccountPlan,
  Plan,
  PlanSource,
  SubscriptionStatus,
} from '@prisma/client';
import { env } from '@/env.mjs';

// Account plans stay dark until phase 3 (`flowershow-a7k`) flips this in code
// and fills in ACCOUNT_PRICE_IDS below.
export const ACCOUNT_PLANS_LIVE = false;

// Sites an account plan covers; null = unlimited.
export const ACCOUNT_PLAN_SITE_ALLOWANCE: Readonly<
  Record<AccountPlan, number | null>
> = { PRO: 5, UNLIMITED: null };

export type BillingInterval = 'month' | 'year';

// Price ids are code constants (not env vars, not amounts). All null until the
// Stripe products exist; phase 3 fills them in a commit.
export const ACCOUNT_PRICE_IDS: Readonly<
  Record<
    'test' | 'live',
    Record<AccountPlan, Record<BillingInterval, string | null>>
  >
> = {
  test: {
    PRO: { month: null, year: null },
    UNLIMITED: { month: null, year: null },
  },
  live: {
    PRO: { month: null, year: null },
    UNLIMITED: { month: null, year: null },
  },
};

export function stripeMode(): 'test' | 'live' {
  return env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test';
}

const PLANS: AccountPlan[] = ['PRO', 'UNLIMITED'];
const INTERVALS: BillingInterval[] = ['month', 'year'];

export function accountPriceId(
  plan: AccountPlan,
  interval: BillingInterval,
): string | null {
  return ACCOUNT_PRICE_IDS[stripeMode()][plan][interval];
}

export function accountPlanForPriceId(
  priceId: string,
): { plan: AccountPlan; interval: BillingInterval } | null {
  for (const plan of PLANS) {
    for (const interval of INTERVALS) {
      if (accountPriceId(plan, interval) === priceId) {
        return { plan, interval };
      }
    }
  }
  return null;
}

// `live` is a test seam; production callers use the default.
export function accountPlansEnabled(
  live: boolean = ACCOUNT_PLANS_LIVE,
): boolean {
  return (
    live &&
    PLANS.every((plan) =>
      INTERVALS.every((interval) => accountPriceId(plan, interval) !== null),
    )
  );
}

// A per-site subscription keeps its site Premium unless it is over for good.
export function isLiveSiteStatus(status: SubscriptionStatus | string): boolean {
  return status !== 'canceled' && status !== 'incomplete_expired';
}

// PREMIUM with a null source is an admin grant (an admin who forgot the column).
export function isManualSite(site: {
  plan: Plan;
  planSource: PlanSource | null;
}): boolean {
  return (
    site.planSource === 'MANUAL' ||
    (site.plan === 'PREMIUM' && site.planSource === null)
  );
}

// An account subscription covers sites only while it is actually paying.
export function isCoveringAccountStatus(
  status: SubscriptionStatus | string,
): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export function premiumPriceIds(): ReadonlySet<string> {
  return new Set(
    [
      env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
    ].filter((id): id is string => Boolean(id)),
  );
}
