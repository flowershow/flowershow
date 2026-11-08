import type { Plan, PlanSource, SubscriptionStatus } from '@prisma/client';
import { isCoveringAccountStatus, isLiveSiteStatus } from './account-plans';

export type SitePlanInput = {
  id: string;
  plan: Plan;
  planSource: PlanSource | null;
  coveredByAccountPlan: boolean;
  siteSubscriptionStatus: SubscriptionStatus | null;
  lastPublishedAt: Date | null;
  createdAt: Date;
};

// siteAllowance: null = unlimited.
export type AccountPlanInput = {
  status: SubscriptionStatus;
  siteAllowance: number | null;
} | null;

export type SitePlanTarget = {
  id: string;
  plan: Plan;
  planSource: PlanSource | null;
  coveredByAccountPlan: boolean;
};

// MANUAL > live site subscription (SITE) > covered by a live account plan
// (ACCOUNT) > FREE. PREMIUM with a null source is an admin grant: MANUAL.
function isManual(site: SitePlanInput): boolean {
  return (
    site.planSource === 'MANUAL' ||
    (site.plan === 'PREMIUM' && site.planSource === null)
  );
}

function hasLiveSiteSubscription(site: SitePlanInput): boolean {
  return (
    site.siteSubscriptionStatus !== null &&
    isLiveSiteStatus(site.siteSubscriptionStatus)
  );
}

// Most recently published first; ties broken by id so the result is stable.
function byRecency(a: SitePlanInput, b: SitePlanInput): number {
  const diff =
    (b.lastPublishedAt ?? b.createdAt).getTime() -
    (a.lastPublishedAt ?? a.createdAt).getTime();
  if (diff !== 0) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Decide each site's plan from the account's state. Pure: returns a target for
 * every input site, in input order.
 *
 * autoFill says which unflagged sites may take a free Pro slot: 'all' at first
 * activation and plan change, { siteId } on create or claim (so slots the
 * owner emptied stay empty), 'none' otherwise.
 */
export function computeSitePlans(
  sites: SitePlanInput[],
  account: AccountPlanInput,
  opts: { autoFill: 'all' | 'none' | { siteId: string } },
): SitePlanTarget[] {
  const covering = account !== null && isCoveringAccountStatus(account.status);
  const unlimited = covering && account.siteAllowance === null;

  // Flags are only rewritten on a covering Pro plan; Unlimited ignores them and
  // a lapsed account keeps them, so the owner's selection survives either.
  const flags = new Map(sites.map((s) => [s.id, s.coveredByAccountPlan]));
  if (covering && account.siteAllowance !== null) {
    const candidates = sites.filter((s) => !isManual(s));
    // Flagged sites with a live site subscription count: they are about to be
    // consolidated into the account plan.
    const flagged = candidates.filter((s) => s.coveredByAccountPlan);
    flagged.sort(byRecency);
    flagged.slice(account.siteAllowance).forEach((s) => flags.set(s.id, false));

    const slots = Math.max(0, account.siteAllowance - flagged.length);
    const { autoFill } = opts;
    const fillable = candidates.filter(
      (s) =>
        !s.coveredByAccountPlan &&
        (autoFill === 'all' ||
          (typeof autoFill === 'object' && s.id === autoFill.siteId)),
    );
    fillable.sort(
      (a, b) =>
        Number(hasLiveSiteSubscription(b)) -
          Number(hasLiveSiteSubscription(a)) || byRecency(a, b),
    );
    fillable.slice(0, slots).forEach((s) => flags.set(s.id, true));
  }

  return sites.map((site): SitePlanTarget => {
    if (isManual(site)) {
      return {
        id: site.id,
        plan: site.plan,
        planSource: site.planSource,
        coveredByAccountPlan: false,
      };
    }
    const coveredByAccountPlan = flags.get(site.id)!;
    if (hasLiveSiteSubscription(site)) {
      return {
        id: site.id,
        plan: 'PREMIUM',
        planSource: 'SITE',
        coveredByAccountPlan,
      };
    }
    if (covering && (unlimited || coveredByAccountPlan)) {
      return {
        id: site.id,
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan,
      };
    }
    return {
      id: site.id,
      plan: 'FREE',
      planSource: null,
      coveredByAccountPlan,
    };
  });
}
