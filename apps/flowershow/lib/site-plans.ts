import type { Plan, PlanSource, SubscriptionStatus } from '@prisma/client';
import { env } from '@/env.mjs';
import { removeDomainAndVariantFromVercelProject } from '@/lib/domains';
import { PLAN_LIMITS } from '@/lib/entitlements';
import { log, SeverityNumber } from '@/lib/otel-logger';
import { getSiteStorageBytes } from '@/lib/storage-limits';
import prisma from '@/server/db';
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

/**
 * Lapse teardown for one site: custom domain removed (from Vercel only in
 * production), storage allowance so a site over the Free cap can keep
 * publishing edits, then FREE. Password protection is kept (the access gate is
 * plan-independent): never touches privacyMode, accessPasswordHash or
 * tokenVersion.
 */
export async function downgradeSiteToFree(site: {
  id: string;
  customDomain: string | null;
  storageAllowanceBytes: bigint | null;
}): Promise<void> {
  if (site.customDomain && env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    await removeDomainAndVariantFromVercelProject(site.customDomain);
  }

  const totalBytes = await getSiteStorageBytes(site.id);
  let storageAllowanceBytes: bigint | undefined;
  if (totalBytes > PLAN_LIMITS.FREE.siteHardBytes) {
    const needed = BigInt(Math.ceil((totalBytes * 11) / 10));
    const existing = site.storageAllowanceBytes ?? BigInt(0);
    storageAllowanceBytes = needed > existing ? needed : existing;
  }

  await prisma.site.update({
    where: { id: site.id },
    data: {
      plan: 'FREE',
      planSource: null,
      ...(site.customDomain && { customDomain: null }),
      ...(storageAllowanceBytes !== undefined && { storageAllowanceBytes }),
    },
  });
}

/**
 * The one writer of Site.plan in billing code. Loads the user's sites and
 * account plan, computes each site's plan and writes the rows that differ.
 *
 * Each write is conditional on the plan and source we read, so a concurrent
 * admin grant or a second webhook wins the race; a lost race is skipped (the
 * winner's reconcile, or the admin, decides that site).
 */
export async function reconcileUserSitePlans(
  userId: string,
  opts: { autoFill?: 'all' | 'none' | { siteId: string } } = {},
): Promise<{ changed: SitePlanTarget[] }> {
  const [sites, account] = await Promise.all([
    prisma.site.findMany({
      where: { userId, isTemporary: false },
      select: {
        id: true,
        plan: true,
        planSource: true,
        coveredByAccountPlan: true,
        createdAt: true,
        customDomain: true,
        storageAllowanceBytes: true,
        subscription: { select: { status: true } },
        publishes: {
          select: { startedAt: true },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.accountSubscription.findUnique({
      where: { userId },
      select: { status: true, siteAllowance: true },
    }),
  ]);

  const targets = computeSitePlans(
    sites.map((s) => ({
      id: s.id,
      plan: s.plan,
      planSource: s.planSource,
      coveredByAccountPlan: s.coveredByAccountPlan,
      siteSubscriptionStatus: s.subscription?.status ?? null,
      lastPublishedAt: s.publishes[0]?.startedAt ?? null,
      createdAt: s.createdAt,
    })),
    account,
    { autoFill: opts.autoFill ?? 'none' },
  );

  const changed: SitePlanTarget[] = [];
  for (const [i, target] of targets.entries()) {
    const site = sites[i]!;
    if (
      site.plan === target.plan &&
      site.planSource === target.planSource &&
      site.coveredByAccountPlan === target.coveredByAccountPlan
    ) {
      continue;
    }
    const { count } = await prisma.site.updateMany({
      where: { id: site.id, plan: site.plan, planSource: site.planSource },
      data: {
        plan: target.plan,
        planSource: target.planSource,
        coveredByAccountPlan: target.coveredByAccountPlan,
      },
    });
    if (count !== 1) continue;
    changed.push(target);
    if (site.plan === 'PREMIUM' && target.plan === 'FREE') {
      await downgradeSiteToFree(site);
    }
  }
  return { changed };
}

/**
 * After a site is created or claimed: give it a free account plan slot if
 * there is one. Never throws, so site creation never fails because of billing.
 */
export async function reconcileAfterSiteChange(
  userId: string,
  siteId: string,
): Promise<void> {
  try {
    const account = await prisma.accountSubscription.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!account) return;
    await reconcileUserSitePlans(userId, { autoFill: { siteId } });
  } catch (error) {
    log('Site plan reconcile after site change failed', SeverityNumber.ERROR, {
      userId,
      siteId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
