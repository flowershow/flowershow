import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({ env: { STRIPE_SECRET_KEY: 'sk_test_x' } }));

import { ACCOUNT_PLAN_SITE_ALLOWANCE } from './account-plans';
import {
  type AccountPlanInput,
  computeSitePlans,
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
