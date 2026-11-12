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

// Price ids are code constants (not env vars, not amounts). Test ids come from
// the setup script in flowershow/product (scripts/stripe-account-plans-setup.mjs);
// live stays null until the live products exist.
export const ACCOUNT_PRICE_IDS: Readonly<
  Record<
    'test' | 'live',
    Record<AccountPlan, Record<BillingInterval, string | null>>
  >
> = {
  test: {
    PRO: {
      month: 'price_1Ub07FFoOGQY9BQ4RThA2KQl',
      year: 'price_1Ub07GFoOGQY9BQ4fWecf1AL',
    },
    UNLIMITED: {
      month: 'price_1Ub07JFoOGQY9BQ4NetfNMkJ',
      year: 'price_1Ub07KFoOGQY9BQ4a1Vb46i4',
    },
  },
  live: {
    PRO: { month: null, year: null },
    UNLIMITED: { month: null, year: null },
  },
};

// A portal of its own, so account customers can switch only between account
// plans (never to per-site Premium). Null falls back to the default portal.
export const ACCOUNT_PORTAL_CONFIG_IDS: Readonly<
  Record<'test' | 'live', string | null>
> = {
  test: 'bpc_1Ub07MFoOGQY9BQ4HQe2n0fk',
  live: null,
};

export function stripeMode(): 'test' | 'live' {
  return /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY ?? '') ? 'live' : 'test';
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
// A FREE site is never manual, whatever its source says.
export function isManualSite(site: {
  plan: Plan;
  planSource: PlanSource | null;
}): boolean {
  return (
    site.plan === 'PREMIUM' &&
    (site.planSource === 'MANUAL' || site.planSource === null)
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

// Account billing page; the MCP upgrade hint links here.
export function accountBillingUrl(): string {
  return `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/settings/billing`;
}
