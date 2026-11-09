import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: { STRIPE_SECRET_KEY: 'sk_test_x', NEXT_PUBLIC_VERCEL_ENV: 'production' },
}));

vi.mock('@/server/db', () => ({
  default: {
    site: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    accountSubscription: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/storage-limits', () => ({
  getSiteStorageBytes: vi.fn(),
}));

vi.mock('@/lib/domains', () => ({
  removeDomainAndVariantFromVercelProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  SeverityNumber: { INFO: 9, WARN: 13, ERROR: 17 },
}));

import { removeDomainAndVariantFromVercelProject } from '@/lib/domains';
import { log } from '@/lib/otel-logger';
import { getSiteStorageBytes } from '@/lib/storage-limits';
import prisma from '@/server/db';
import { ACCOUNT_PLAN_SITE_ALLOWANCE } from './account-plans';
import {
  type AccountPlanInput,
  computeSitePlans,
  downgradeSiteToFree,
  reconcileAfterSiteChange,
  reconcileUserSitePlans,
  type SitePlanInput,
  type SitePlanTarget,
} from './site-plans';

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

// A FREE site published on day `n` (higher = more recent).
function site(
  id: string,
  n: number,
  overrides: Partial<SitePlanInput> = {},
): SitePlanInput {
  return {
    id,
    plan: 'FREE',
    planSource: null,
    coveredByAccountPlan: false,
    siteSubscriptionStatus: null,
    lastPublishedAt: day(n),
    createdAt: day(1),
    ...overrides,
  };
}

const pro: AccountPlanInput = {
  status: 'active',
  siteAllowance: ACCOUNT_PLAN_SITE_ALLOWANCE.PRO,
};
const unlimited: AccountPlanInput = {
  status: 'active',
  siteAllowance: ACCOUNT_PLAN_SITE_ALLOWANCE.UNLIMITED,
};

function byId(targets: SitePlanTarget[]) {
  return Object.fromEntries(targets.map((t) => [t.id, t]));
}
const premiumAccount = (id: string, covered: boolean): SitePlanTarget => ({
  id,
  plan: 'PREMIUM',
  planSource: 'ACCOUNT',
  coveredByAccountPlan: covered,
});
const free = (id: string, covered: boolean): SitePlanTarget => ({
  id,
  plan: 'FREE',
  planSource: null,
  coveredByAccountPlan: covered,
});
const flaggedIds = (targets: SitePlanTarget[]) =>
  targets.filter((t) => t.coveredByAccountPlan).map((t) => t.id);

describe('computeSitePlans', () => {
  it('never downgrades MANUAL', () => {
    const [t] = computeSitePlans(
      [site('m', 1, { plan: 'PREMIUM', planSource: 'MANUAL' })],
      null,
      { autoFill: 'all' },
    );
    expect(t).toEqual({
      id: 'm',
      plan: 'PREMIUM',
      planSource: 'MANUAL',
      coveredByAccountPlan: false,
    });
  });

  it('treats PREMIUM with null source as MANUAL', () => {
    const [t] = computeSitePlans(
      [
        site('p', 1, {
          plan: 'PREMIUM',
          planSource: null,
          coveredByAccountPlan: true,
        }),
      ],
      { status: 'canceled', siteAllowance: 5 },
      { autoFill: 'all' },
    );
    expect(t).toEqual({
      id: 'p',
      plan: 'PREMIUM',
      planSource: null,
      coveredByAccountPlan: false,
    });
  });

  it('site subscription wins over account', () => {
    const [t] = computeSitePlans(
      [
        site('s', 1, {
          plan: 'PREMIUM',
          planSource: 'SITE',
          siteSubscriptionStatus: 'active',
        }),
      ],
      unlimited,
      { autoFill: 'all' },
    );
    expect(t).toEqual({
      id: 's',
      plan: 'PREMIUM',
      planSource: 'SITE',
      coveredByAccountPlan: false,
    });
  });

  it('Unlimited covers all non-manual sites without flagging', () => {
    const sites = Array.from({ length: 12 }, (_, i) =>
      site(`s${i}`, i + 1, { coveredByAccountPlan: i % 3 === 0 }),
    );
    const targets = computeSitePlans(sites, unlimited, { autoFill: 'all' });
    expect(targets).toEqual(
      sites.map((s) => premiumAccount(s.id, s.coveredByAccountPlan)),
    );
  });

  it('incomplete account covers nothing', () => {
    const sites = [
      site('a', 1, {
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      }),
      site('b', 2),
    ];
    const targets = computeSitePlans(
      sites,
      { status: 'incomplete', siteAllowance: null },
      { autoFill: 'all' },
    );
    expect(targets).toEqual([free('a', true), free('b', false)]);
  });

  it('create autoFill only considers the new site', () => {
    const sites = [
      ...Array.from({ length: 7 }, (_, i) =>
        site(`s${i}`, i + 1, { coveredByAccountPlan: i < 3 }),
      ),
      site('new', 20),
    ];
    const targets = computeSitePlans(sites, pro, {
      autoFill: { siteId: 'new' },
    });
    expect(flaggedIds(targets)).toEqual(['s0', 's1', 's2', 'new']);
    expect(byId(targets).new).toEqual(premiumAccount('new', true));
    expect(byId(targets).s5).toEqual(free('s5', false));
  });

  it('Pro autoFill picks site-subscription sites then most recent', () => {
    const sites = [
      site('sub1', 1, {
        plan: 'PREMIUM',
        planSource: 'SITE',
        siteSubscriptionStatus: 'active',
      }),
      site('sub2', 2, {
        plan: 'PREMIUM',
        planSource: 'SITE',
        siteSubscriptionStatus: 'past_due',
      }),
      ...Array.from({ length: 5 }, (_, i) => site(`f${i}`, 10 + i)),
    ];
    const targets = computeSitePlans(sites, pro, { autoFill: 'all' });
    expect(flaggedIds(targets).sort()).toEqual(
      ['sub1', 'sub2', 'f2', 'f3', 'f4'].sort(),
    );
    const t = byId(targets);
    // Still billed per site until consolidation runs.
    expect(t.sub1).toEqual({
      id: 'sub1',
      plan: 'PREMIUM',
      planSource: 'SITE',
      coveredByAccountPlan: true,
    });
    expect(t.f4).toEqual(premiumAccount('f4', true));
    expect(t.f1).toEqual(free('f1', false));
    expect(t.f0).toEqual(free('f0', false));
  });

  it("Pro without autoFill keeps the owner's selection", () => {
    const sites = Array.from({ length: 8 }, (_, i) =>
      site(`s${i}`, i + 1, { coveredByAccountPlan: i < 3 }),
    );
    const targets = computeSitePlans(sites, pro, { autoFill: 'none' });
    expect(targets).toEqual(
      sites.map((s, i) =>
        i < 3 ? premiumAccount(s.id, true) : free(s.id, false),
      ),
    );
  });

  it('Pro over allowance trims least recently published', () => {
    const sites = Array.from({ length: 8 }, (_, i) =>
      site(`s${i}`, i + 1, {
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      }),
    );
    const targets = computeSitePlans(sites, pro, { autoFill: 'all' });
    expect(targets).toEqual(
      sites.map((s, i) =>
        i >= 3 ? premiumAccount(s.id, true) : free(s.id, false),
      ),
    );
  });

  describe('Pro with PREMIUM/ACCOUNT sites left unflagged by Unlimited', () => {
    const eight = Array.from({ length: 8 }, (_, i) =>
      site(`s${i}`, i + 1, { plan: 'PREMIUM', planSource: 'ACCOUNT' }),
    );

    it('keeps the five most recently published whatever autoFill says', () => {
      const targets = byId(computeSitePlans(eight, pro, { autoFill: 'none' }));

      for (const id of ['s3', 's4', 's5', 's6', 's7']) {
        expect(targets[id]).toEqual(premiumAccount(id, true));
      }
      for (const id of ['s0', 's1', 's2']) {
        expect(targets[id]).toEqual(free(id, false));
      }
    });

    it('never fills a released site', () => {
      const targets = byId(
        computeSitePlans(eight, pro, { autoFill: 'none', released: ['s7'] }),
      );

      expect(targets.s7).toEqual(free('s7', false));
      for (const id of ['s2', 's3', 's4', 's5', 's6']) {
        expect(targets[id]).toEqual(premiumAccount(id, true));
      }
    });

    it('released also wins over autoFill all', () => {
      const targets = byId(
        computeSitePlans(eight, pro, { autoFill: 'all', released: ['s7'] }),
      );

      expect(targets.s7).toEqual(free('s7', false));
    });
  });

  it('orders by createdAt when never published, ties broken by id', () => {
    const sites = [
      site('b', 0, { lastPublishedAt: null, createdAt: day(5) }),
      site('a', 0, { lastPublishedAt: null, createdAt: day(5) }),
      ...Array.from({ length: 4 }, (_, i) =>
        site(`s${i}`, 10 + i, {
          lastPublishedAt: null,
          createdAt: day(10 + i),
        }),
      ),
    ];
    const targets = computeSitePlans(sites, pro, { autoFill: 'all' });
    expect(flaggedIds(targets)).toEqual(['a', 's0', 's1', 's2', 's3']);
  });

  it('MANUAL sites do not use a Pro slot', () => {
    const sites = [
      site('m1', 1, { plan: 'PREMIUM', planSource: 'MANUAL' }),
      site('m2', 2, { plan: 'PREMIUM', planSource: 'MANUAL' }),
      ...Array.from({ length: 6 }, (_, i) => site(`f${i}`, 10 + i)),
    ];
    const targets = computeSitePlans(sites, pro, { autoFill: 'all' });
    expect(flaggedIds(targets)).toEqual(['f1', 'f2', 'f3', 'f4', 'f5']);
    expect(byId(targets).m1).toEqual({
      id: 'm1',
      plan: 'PREMIUM',
      planSource: 'MANUAL',
      coveredByAccountPlan: false,
    });
    expect(byId(targets).f0).toEqual(free('f0', false));
  });

  it('lapsed account downgrades ACCOUNT sites only', () => {
    const sites = [
      site('acc', 1, {
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      }),
      site('sub', 2, {
        plan: 'PREMIUM',
        planSource: 'SITE',
        siteSubscriptionStatus: 'active',
      }),
      site('man', 3, { plan: 'PREMIUM', planSource: 'MANUAL' }),
    ];
    const targets = computeSitePlans(
      sites,
      { status: 'canceled', siteAllowance: 5 },
      { autoFill: 'all' },
    );
    expect(targets).toEqual([
      free('acc', true),
      {
        id: 'sub',
        plan: 'PREMIUM',
        planSource: 'SITE',
        coveredByAccountPlan: false,
      },
      {
        id: 'man',
        plan: 'PREMIUM',
        planSource: 'MANUAL',
        coveredByAccountPlan: false,
      },
    ]);
  });

  it('canceled site subscription on a covered site becomes ACCOUNT', () => {
    const [t] = computeSitePlans(
      [
        site('s', 1, {
          plan: 'PREMIUM',
          planSource: 'SITE',
          coveredByAccountPlan: true,
          siteSubscriptionStatus: 'canceled',
        }),
      ],
      pro,
      { autoFill: 'none' },
    );
    expect(t).toEqual(premiumAccount('s', true));
  });
});

// A site row as reconcileUserSitePlans selects it.
function dbSite(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    plan: 'FREE',
    planSource: null,
    coveredByAccountPlan: false,
    createdAt: day(1),
    customDomain: null,
    storageAllowanceBytes: null,
    subscription: null,
    publishes: [],
    ...overrides,
  };
}

describe('reconcileUserSitePlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(prisma.site.update).mockResolvedValue({} as any);
    vi.mocked(getSiteStorageBytes).mockResolvedValue(0);
  });

  it('downgrades lapsed SITE and ACCOUNT sites and never touches MANUAL', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValue([
      dbSite('man', { plan: 'PREMIUM', planSource: 'MANUAL' }),
      dbSite('sub', {
        plan: 'PREMIUM',
        planSource: 'SITE',
        subscription: { status: 'canceled' },
      }),
      dbSite('acc', {
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      }),
    ] as any);
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue({
      status: 'canceled',
      siteAllowance: 5,
    } as any);

    const { changed } = await reconcileUserSitePlans('user-1');

    expect(prisma.site.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub', plan: 'PREMIUM', planSource: 'SITE' },
      data: expect.objectContaining({ plan: 'FREE', planSource: null }),
    });
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: { id: 'acc', plan: 'PREMIUM', planSource: 'ACCOUNT' },
      data: expect.objectContaining({ plan: 'FREE', planSource: null }),
    });
    const touched = [
      ...vi.mocked(prisma.site.updateMany).mock.calls,
      ...vi.mocked(prisma.site.update).mock.calls,
    ].map((c) => (c[0] as any).where.id);
    expect(touched).not.toContain('man');
    expect(changed.map((t) => t.id).sort()).toEqual(['acc', 'sub']);
  });

  it('passes released through to the computation', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValue([
      dbSite('gone', { plan: 'PREMIUM', planSource: 'ACCOUNT' }),
    ] as any);
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue({
      status: 'active',
      siteAllowance: 5,
    } as any);

    const { changed } = await reconcileUserSitePlans('user-1', {
      released: ['gone'],
    });

    expect(changed).toEqual([free('gone', false)]);
  });

  it("only loads the user's non-temporary sites", async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValue([]);
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue(null);

    await reconcileUserSitePlans('user-1');

    expect(prisma.site.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', isTemporary: false },
      }),
    );
  });

  it('reconcile loses the race safely', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValue([
      dbSite('sub', {
        plan: 'PREMIUM',
        planSource: 'SITE',
        customDomain: 'example.com',
        subscription: { status: 'canceled' },
      }),
    ] as any);
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue(null);
    // An admin set MANUAL between our read and our write.
    vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 0 } as any);

    const { changed } = await reconcileUserSitePlans('user-1');

    expect(prisma.site.updateMany).toHaveBeenCalledTimes(1);
    expect(removeDomainAndVariantFromVercelProject).not.toHaveBeenCalled();
    expect(prisma.site.update).not.toHaveBeenCalled();
    expect(changed).toEqual([]);
  });

  it('writes nothing when every site already matches', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValue([
      dbSite('free'),
      dbSite('sub', {
        plan: 'PREMIUM',
        planSource: 'SITE',
        subscription: { status: 'active' },
      }),
    ] as any);
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue(null);

    const { changed } = await reconcileUserSitePlans('user-1');

    expect(prisma.site.updateMany).not.toHaveBeenCalled();
    expect(changed).toEqual([]);
  });

  it('uses the latest publish for recency', async () => {
    // Pro with one free slot and autoFill 'all': the more recently published
    // site wins, even though the other was created later.
    vi.mocked(prisma.site.findMany).mockResolvedValue([
      dbSite('old', { createdAt: day(5), publishes: [{ startedAt: day(6) }] }),
      dbSite('new', { createdAt: day(1), publishes: [{ startedAt: day(9) }] }),
    ] as any);
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue({
      status: 'active',
      siteAllowance: 1,
    } as any);

    await reconcileUserSitePlans('user-1', { autoFill: 'all' });

    expect(prisma.site.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: { id: 'new', plan: 'FREE', planSource: null },
      data: {
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      },
    });
  });
});

describe('downgradeSiteToFree', () => {
  const expected = { plan: 'PREMIUM', planSource: 'SITE' } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(getSiteStorageBytes).mockResolvedValue(0);
  });

  it('removes the custom domain and keeps password protection', async () => {
    const changed = await downgradeSiteToFree(
      {
        id: 'site-1',
        customDomain: 'example.com',
        storageAllowanceBytes: null,
      },
      expected,
    );

    expect(changed).toBe(true);
    expect(prisma.site.updateMany).toHaveBeenCalledTimes(1);
    const args = vi.mocked(prisma.site.updateMany).mock.lastCall![0] as any;
    expect(args.where).toEqual({
      id: 'site-1',
      plan: 'PREMIUM',
      planSource: 'SITE',
    });
    expect(args.data).toMatchObject({
      plan: 'FREE',
      planSource: null,
      customDomain: null,
    });
    expect(args.data).not.toHaveProperty('privacyMode');
    expect(args.data).not.toHaveProperty('accessPasswordHash');
    expect(args.data).not.toHaveProperty('tokenVersion');
    expect(args.data).not.toHaveProperty('storageAllowanceBytes');
    expect(removeDomainAndVariantFromVercelProject).toHaveBeenCalledWith(
      'example.com',
    );
    // The domain leaves Vercel only after the DB write.
    expect(
      vi.mocked(prisma.site.updateMany).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(removeDomainAndVariantFromVercelProject).mock
        .invocationCallOrder[0]!,
    );
  });

  it('sets a storage allowance of ceil(total * 1.1) when over the Free cap', async () => {
    const total = 300 * 1024 * 1024 + 1;
    vi.mocked(getSiteStorageBytes).mockResolvedValue(total);

    await downgradeSiteToFree(
      { id: 'site-1', customDomain: null, storageAllowanceBytes: null },
      expected,
    );

    const data = (vi.mocked(prisma.site.updateMany).mock.lastCall![0] as any)
      .data;
    expect(data.storageAllowanceBytes).toBe(
      BigInt(Math.ceil((total * 11) / 10)),
    );
    expect(data).not.toHaveProperty('customDomain');
  });

  it('race lost: no Vercel call', async () => {
    vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 0 } as any);

    const changed = await downgradeSiteToFree(
      {
        id: 'site-1',
        customDomain: 'example.com',
        storageAllowanceBytes: null,
      },
      expected,
    );

    expect(changed).toBe(false);
    expect(removeDomainAndVariantFromVercelProject).not.toHaveBeenCalled();
  });

  it('Vercel failure is logged at ERROR, not rethrown; the DB write stands', async () => {
    vi.mocked(removeDomainAndVariantFromVercelProject).mockRejectedValueOnce(
      new Error('vercel down'),
    );

    await expect(
      downgradeSiteToFree(
        {
          id: 'site-1',
          customDomain: 'example.com',
          storageAllowanceBytes: null,
        },
        expected,
      ),
    ).resolves.toBe(true);

    expect(prisma.site.updateMany).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.any(String),
      17,
      expect.objectContaining({ siteId: 'site-1', domain: 'example.com' }),
    );
  });
});

describe('reconcileAfterSiteChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 } as any);
  });

  it('puts a new site on a live Pro with 4 covered sites on the account plan', async () => {
    const covered = ['a', 'b', 'c', 'd'].map((id) =>
      dbSite(id, {
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      }),
    );
    vi.mocked(prisma.site.findMany).mockResolvedValue([
      ...covered,
      dbSite('new'),
    ] as any);
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue({
      status: 'active',
      siteAllowance: 5,
    } as any);

    await reconcileAfterSiteChange('user-1', 'new');

    expect(prisma.site.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: { id: 'new', plan: 'FREE', planSource: null },
      data: {
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      },
    });
  });

  it('does not reconcile without an account subscription', async () => {
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue(null);

    await reconcileAfterSiteChange('user-1', 'new');

    expect(prisma.site.findMany).not.toHaveBeenCalled();
    expect(prisma.site.updateMany).not.toHaveBeenCalled();
  });

  it('logs and swallows reconciler errors', async () => {
    vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue({
      status: 'active',
      siteAllowance: 5,
    } as any);
    vi.mocked(prisma.site.findMany).mockRejectedValue(new Error('db down'));

    await expect(
      reconcileAfterSiteChange('user-1', 'new'),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      expect.any(String),
      17,
      expect.objectContaining({ userId: 'user-1', siteId: 'new' }),
    );
  });
});
