import type {
  Plan,
  PlanSource,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { env } from '@/env.mjs';
import { removeDomainAndVariantFromVercelProject } from '@/lib/domains';
import { PLAN_LIMITS } from '@/lib/entitlements';
import { log, SeverityNumber } from '@/lib/otel-logger';
import { getSiteStorageBytes } from '@/lib/storage-limits';
import prisma from '@/server/db';
import {
  isCoveringAccountStatus,
  isLiveSiteStatus,
  isManualSite,
} from './account-plans';

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
 * every input site, in input order. Precedence: MANUAL > live site subscription
 * (SITE) > covered by a live account plan (ACCOUNT) > FREE.
 *
 * autoFill says which unflagged sites may take a free Pro slot: 'all' at first
 * activation and plan change, { siteId } on create or claim (so slots the
 * owner emptied stay empty), 'none' otherwise.
 *
 * Whatever autoFill says, a site still PREMIUM/ACCOUNT but unflagged can take a
 * free slot: Unlimited never writes flags, so this is how Unlimited to Pro trims
 * to the allowance on every sync, including a retry after a failed reconcile.
 * Ids in `released` (sites the owner just removed) are never filled.
 */
export function computeSitePlans(
  sites: SitePlanInput[],
  account: AccountPlanInput,
  opts: {
    autoFill: 'all' | 'none' | { siteId: string };
    released?: string[];
  },
): SitePlanTarget[] {
  const covering = account !== null && isCoveringAccountStatus(account.status);
  const unlimited = covering && account.siteAllowance === null;

  // Flags are only rewritten on a covering Pro plan; Unlimited ignores them and
  // a lapsed account keeps them, so the owner's selection survives either.
  const flags = new Map(sites.map((s) => [s.id, s.coveredByAccountPlan]));
  if (covering && account.siteAllowance !== null) {
    const candidates = sites.filter((s) => !isManualSite(s));
    // Flagged sites with a live site subscription count: they are about to be
    // consolidated into the account plan.
    const flagged = candidates.filter((s) => s.coveredByAccountPlan);
    flagged.sort(byRecency);
    flagged.slice(account.siteAllowance).forEach((s) => flags.set(s.id, false));

    const slots = Math.max(0, account.siteAllowance - flagged.length);
    const { autoFill } = opts;
    const released = new Set(opts.released);
    const fillable = candidates.filter(
      (s) =>
        !s.coveredByAccountPlan &&
        !released.has(s.id) &&
        (autoFill === 'all' ||
          (typeof autoFill === 'object' && s.id === autoFill.siteId) ||
          (s.plan === 'PREMIUM' && s.planSource === 'ACCOUNT')),
    );
    fillable.sort(
      (a, b) =>
        Number(hasLiveSiteSubscription(b)) -
          Number(hasLiveSiteSubscription(a)) || byRecency(a, b),
    );
    fillable.slice(0, slots).forEach((s) => flags.set(s.id, true));
  }

  return sites.map((site): SitePlanTarget => {
    if (isManualSite(site)) {
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
 * Lapse teardown for one site, as one write conditional on the plan and source
 * the caller read (so a concurrent admin grant wins): FREE, custom domain
 * cleared, and a storage allowance so a site over the Free cap can keep
 * publishing edits. Password protection is kept (the access gate is
 * plan-independent): never touches privacyMode, accessPasswordHash or
 * tokenVersion. Returns whether the write happened.
 *
 * Only after the write does the domain leave Vercel (production only). A
 * Vercel failure is logged, not thrown: the DB is already consistent and an
 * orphaned Vercel domain is the lesser harm.
 */
export async function downgradeSiteToFree(
  site: DowngradeSite,
  expected: { plan: Plan; planSource: PlanSource | null },
  opts: { coveredByAccountPlan?: boolean } = {},
): Promise<boolean> {
  const written = await writeSiteDowngrade(prisma, site, expected, opts);
  if (written && site.customDomain) {
    await removeDowngradedDomain(site.id, site.customDomain);
  }
  return written;
}

type DowngradeSite = {
  id: string;
  customDomain: string | null;
  storageAllowanceBytes: bigint | null;
};

// The DB half of downgradeSiteToFree, so it can run inside a transaction.
async function writeSiteDowngrade(
  db: Prisma.TransactionClient,
  site: DowngradeSite,
  expected: { plan: Plan; planSource: PlanSource | null },
  opts: { coveredByAccountPlan?: boolean },
): Promise<boolean> {
  const totalBytes = await getSiteStorageBytes(site.id);
  let storageAllowanceBytes: bigint | undefined;
  if (totalBytes > PLAN_LIMITS.FREE.siteHardBytes) {
    const needed = BigInt(Math.ceil((totalBytes * 11) / 10));
    const existing = site.storageAllowanceBytes ?? BigInt(0);
    storageAllowanceBytes = needed > existing ? needed : existing;
  }

  const { count } = await db.site.updateMany({
    where: {
      id: site.id,
      plan: expected.plan,
      planSource: expected.planSource,
    },
    data: {
      plan: 'FREE',
      planSource: null,
      ...(opts.coveredByAccountPlan !== undefined && {
        coveredByAccountPlan: opts.coveredByAccountPlan,
      }),
      ...(site.customDomain && {
        customDomain: null,
        customDomainLiveAt: null,
      }),
      ...(storageAllowanceBytes !== undefined && { storageAllowanceBytes }),
    },
  });
  return count === 1;
}

async function removeDowngradedDomain(
  siteId: string,
  domain: string,
): Promise<void> {
  if (env.NEXT_PUBLIC_VERCEL_ENV !== 'production') return;
  try {
    await removeDomainAndVariantFromVercelProject(domain);
  } catch (error) {
    log('Vercel domain removal on downgrade failed', SeverityNumber.ERROR, {
      siteId,
      domain,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * The one writer of Site.plan in billing code. Loads the user's sites and
 * account plan, computes each site's plan and writes the rows that differ.
 *
 * Each write is conditional on the plan and source we read, so a concurrent
 * admin grant or a second webhook wins the race; a lost race is skipped (the
 * winner's reconcile, or the admin, decides that site). PREMIUM to FREE goes
 * through downgradeSiteToFree, which makes the same conditional write.
 *
 * The read and the writes run in one transaction holding the account row lock
 * that setSiteCovered also takes, so a cover and a reconcile cannot both fill
 * the last Pro slot. Vercel domains are removed after commit.
 */
export async function reconcileUserSitePlans(
  userId: string,
  opts: {
    autoFill?: 'all' | 'none' | { siteId: string };
    released?: string[];
  } = {},
): Promise<{ changed: SitePlanTarget[] }> {
  const removedDomains: { siteId: string; domain: string }[] = [];
  const changed = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AccountSubscription" WHERE user_id = ${userId} FOR UPDATE`;
      return reconcileLocked(tx, userId, opts, removedDomains);
    },
    { timeout: 15_000 },
  );
  for (const { siteId, domain } of removedDomains) {
    await removeDowngradedDomain(siteId, domain);
  }
  return { changed };
}

async function reconcileLocked(
  tx: Prisma.TransactionClient,
  userId: string,
  opts: {
    autoFill?: 'all' | 'none' | { siteId: string };
    released?: string[];
  },
  removedDomains: { siteId: string; domain: string }[],
): Promise<SitePlanTarget[]> {
  // Sequential: an interactive transaction has one connection.
  const sites = await tx.site.findMany({
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
  });
  const account = await tx.accountSubscription.findUnique({
    where: { userId },
    select: { status: true, siteAllowance: true },
  });

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
    { autoFill: opts.autoFill ?? 'none', released: opts.released },
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
    const expected = { plan: site.plan, planSource: site.planSource };
    let written: boolean;
    if (site.plan === 'PREMIUM' && target.plan === 'FREE') {
      written = await writeSiteDowngrade(tx, site, expected, {
        coveredByAccountPlan: target.coveredByAccountPlan,
      });
      if (written && site.customDomain) {
        removedDomains.push({ siteId: site.id, domain: site.customDomain });
      }
    } else {
      const { count } = await tx.site.updateMany({
        where: { id: site.id, ...expected },
        data: {
          plan: target.plan,
          planSource: target.planSource,
          coveredByAccountPlan: target.coveredByAccountPlan,
        },
      });
      written = count === 1;
    }
    if (written) changed.push(target);
  }
  return changed;
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
