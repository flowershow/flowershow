import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks (must come before imports that depend on them) ──────────

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock('@/server/auth', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/db', () => ({ db: {}, default: {} }));

vi.mock('@/lib/stripe', () => ({
  FLOWERSHOW_PLATFORM: 'flowershow',
  stripe: {
    checkout: { sessions: { create: vi.fn() } },
    prices: { retrieve: vi.fn() },
    coupons: { retrieve: vi.fn() },
    customers: { retrieve: vi.fn() },
    billingPortal: { sessions: { create: vi.fn() } },
  },
}));

vi.mock('@/lib/account-billing', () => ({
  getOrCreateStripeCustomer: vi.fn().mockResolvedValue('cus_1'),
  consolidateSiteSubscriptions: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/site-plans', () => ({
  reconcileUserSitePlans: vi.fn().mockResolvedValue({ changed: [] }),
}));

// Keep the real price tables; only the flag is mocked.
vi.mock('@/lib/account-plans', async (orig) => ({
  ...(await orig<typeof import('@/lib/account-plans')>()),
  accountPlansEnabled: vi.fn().mockReturnValue(false),
}));

// ── Imports ───────────────────────────────────────────────────────

import { ACCOUNT_PRICE_IDS, accountPlansEnabled } from '@/lib/account-plans';
import {
  consolidateSiteSubscriptions,
  getOrCreateStripeCustomer,
} from '@/lib/account-billing';
import { reconcileUserSitePlans } from '@/lib/site-plans';
import { stripe } from '@/lib/stripe';
import { appRouter } from '@/server/api/root';

// ── Helpers ───────────────────────────────────────────────────────

const mockCreateSession = vi.mocked(stripe.checkout.sessions.create);

function makeDb(
  opts: {
    accountSubscription?: unknown;
    site?: unknown;
    siteSubscription?: unknown;
  } = {},
) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'ada@example.com',
        stripeCustomerId: null,
      }),
    },
    accountSubscription: {
      findUnique: vi.fn().mockResolvedValue(opts.accountSubscription ?? null),
    },
    site: {
      findUnique: vi.fn().mockResolvedValue(
        opts.site ?? {
          id: 'site-1',
          userId: 'user-1',
          planSource: null,
          user: { email: 'ada@example.com' },
        },
      ),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(opts.siteSubscription ?? null),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

function createCaller(db: any, userId = 'user-1') {
  return appRouter.createCaller({
    session: { user: { id: userId }, expires: '' } as any,
    db: db as any,
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(accountPlansEnabled).mockReturnValue(false);
  vi.mocked(getOrCreateStripeCustomer).mockResolvedValue('cus_1');
  mockCreateSession.mockResolvedValue({
    url: 'https://checkout.test/x',
  } as any);
  // Placeholder ids; the shipped tables are all null.
  ACCOUNT_PRICE_IDS.test.PRO.month = 'price_pro_month_test';
  ACCOUNT_PRICE_IDS.test.PRO.year = 'price_pro_year_test';
  ACCOUNT_PRICE_IDS.test.UNLIMITED.month = 'price_unl_month_test';
  ACCOUNT_PRICE_IDS.test.UNLIMITED.year = 'price_unl_year_test';
});

// ── Tests ─────────────────────────────────────────────────────────

describe('stripe.createAccountCheckoutSession', () => {
  it('is PRECONDITION_FAILED and never calls Stripe when the flag is off', async () => {
    const caller = createCaller(makeDb());
    await expect(
      caller.stripe.createAccountCheckoutSession({
        plan: 'PRO',
        interval: 'year',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(getOrCreateStripeCustomer).not.toHaveBeenCalled();
  });

  it('creates one subscription checkout with account metadata and no discounts', async () => {
    vi.mocked(accountPlansEnabled).mockReturnValue(true);
    const caller = createCaller(makeDb());

    const result = await caller.stripe.createAccountCheckoutSession({
      plan: 'PRO',
      interval: 'year',
    });

    expect(result).toEqual({ url: 'https://checkout.test/x' });
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
    const args = mockCreateSession.mock.calls[0]![0] as any;
    const metadata = {
      platform: 'flowershow',
      kind: 'account',
      userId: 'user-1',
    };
    expect(args.mode).toBe('subscription');
    expect(args.customer).toBe('cus_1');
    expect(args.client_reference_id).toBe('user-1');
    expect(args.line_items).toEqual([
      { price: 'price_pro_year_test', quantity: 1 },
    ]);
    expect(args.metadata).toEqual(metadata);
    expect(args.subscription_data.metadata).toEqual(metadata);
    expect(args).not.toHaveProperty('discounts');
    expect(args.success_url).toMatch(
      /\/settings\/billing\?upgrade_success=true$/,
    );
    expect(args.cancel_url).toMatch(
      /\/settings\/billing\?upgrade_cancelled=true$/,
    );
  });

  it('is PRECONDITION_FAILED when the plan has no price id', async () => {
    vi.mocked(accountPlansEnabled).mockReturnValue(true);
    ACCOUNT_PRICE_IDS.test.PRO.year = null;
    const caller = createCaller(makeDb());
    await expect(
      caller.stripe.createAccountCheckoutSession({
        plan: 'PRO',
        interval: 'year',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('is BAD_REQUEST when the user already has a live account plan', async () => {
    vi.mocked(accountPlansEnabled).mockReturnValue(true);
    const caller = createCaller(
      makeDb({ accountSubscription: { status: 'incomplete' } }),
    );
    await expect(
      caller.stripe.createAccountCheckoutSession({
        plan: 'PRO',
        interval: 'month',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'You already have an account plan. Change it from Billing.',
    });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('allows a new checkout when the previous account plan was canceled', async () => {
    vi.mocked(accountPlansEnabled).mockReturnValue(true);
    const caller = createCaller(
      makeDb({ accountSubscription: { status: 'canceled' } }),
    );
    await caller.stripe.createAccountCheckoutSession({
      plan: 'UNLIMITED',
      interval: 'month',
    });
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
  });
});

describe('stripe.createCheckoutSession (per site)', () => {
  it('rejects an account price id', async () => {
    const caller = createCaller(makeDb());
    await expect(
      caller.stripe.createCheckoutSession({
        siteId: 'site-1',
        priceId: 'price_pro_month_test',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('still accepts the Premium price id', async () => {
    const caller = createCaller(makeDb());
    const result = await caller.stripe.createCheckoutSession({
      siteId: 'site-1',
      priceId: 'price_monthly',
    });
    expect(result.url).toBe('https://checkout.test/x');
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
  });

  const siteWith = (plan: string, planSource: string | null) => ({
    id: 'site-1',
    userId: 'user-1',
    plan,
    planSource,
    user: { email: 'ada@example.com' },
  });

  it.each(['ACCOUNT', 'MANUAL'])(
    'is BAD_REQUEST when the site is already Premium via %s',
    async (planSource) => {
      vi.mocked(accountPlansEnabled).mockReturnValue(true);
      const caller = createCaller(
        makeDb({ site: siteWith('PREMIUM', planSource) }),
      );
      await expect(
        caller.stripe.createCheckoutSession({
          siteId: 'site-1',
          priceId: 'price_monthly',
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'This site is already Premium through your account plan.',
      });
      expect(mockCreateSession).not.toHaveBeenCalled();
    },
  );

  it.each(['ACCOUNT', 'MANUAL'])(
    'reaches checkout for a %s site while account plans are dark',
    async (planSource) => {
      const caller = createCaller(
        makeDb({ site: siteWith('PREMIUM', planSource) }),
      );
      const result = await caller.stripe.createCheckoutSession({
        siteId: 'site-1',
        priceId: 'price_monthly',
      });
      expect(result.url).toBe('https://checkout.test/x');
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
    },
  );

  it('reaches checkout for a FREE site left with a MANUAL source', async () => {
    vi.mocked(accountPlansEnabled).mockReturnValue(true);
    const caller = createCaller(makeDb({ site: siteWith('FREE', 'MANUAL') }));
    const result = await caller.stripe.createCheckoutSession({
      siteId: 'site-1',
      priceId: 'price_monthly',
    });
    expect(result.url).toBe('https://checkout.test/x');
  });
});

// ── Account billing procedures ────────────────────────────────────

const livePro = {
  userId: 'user-1',
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_acct',
  plan: 'PRO',
  interval: 'year',
  siteAllowance: 5,
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: new Date('2027-01-01T00:00:00Z'),
};

function coverSite(overrides: Record<string, unknown> = {}) {
  return {
    id: 'site-1',
    userId: 'user-1',
    projectName: 'garden',
    plan: 'FREE',
    planSource: null,
    coveredByAccountPlan: false,
    subscription: null,
    ...overrides,
  };
}

function makeCoverDb(
  opts: {
    site?: unknown;
    account?: unknown;
    coveredCount?: number;
    sites?: unknown[];
    stripeCustomerId?: string | null;
  } = {},
) {
  return {
    site: {
      findUnique: vi.fn().mockResolvedValue(opts.site ?? coverSite()),
      findMany: vi.fn().mockResolvedValue(opts.sites ?? []),
      count: vi.fn().mockResolvedValue(opts.coveredCount ?? 0),
      update: vi.fn().mockResolvedValue({}),
    },
    accountSubscription: {
      findUnique: vi
        .fn()
        .mockResolvedValue(opts.account === undefined ? livePro : opts.account),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        stripeCustomerId:
          opts.stripeCustomerId === undefined ? 'cus_1' : opts.stripeCustomerId,
      }),
    },
  };
}

describe('stripe.setSiteCovered', () => {
  beforeEach(() => {
    vi.mocked(accountPlansEnabled).mockReturnValue(true);
  });

  it('is FORBIDDEN for an editor of the site and writes nothing', async () => {
    const db = makeCoverDb();
    const caller = createCaller(db, 'user-2');
    await expect(
      caller.stripe.setSiteCovered({ siteId: 'site-1', covered: true }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(db.site.update).not.toHaveBeenCalled();
    expect(reconcileUserSitePlans).not.toHaveBeenCalled();
  });

  it('is PRECONDITION_FAILED without a live account plan', async () => {
    const db = makeCoverDb({ account: { ...livePro, status: 'canceled' } });
    await expect(
      createCaller(db).stripe.setSiteCovered({
        siteId: 'site-1',
        covered: true,
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(db.site.update).not.toHaveBeenCalled();
  });

  it('is BAD_REQUEST for a MANUAL site', async () => {
    const db = makeCoverDb({
      site: coverSite({ plan: 'PREMIUM', planSource: 'MANUAL' }),
    });
    await expect(
      createCaller(db).stripe.setSiteCovered({
        siteId: 'site-1',
        covered: true,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(db.site.update).not.toHaveBeenCalled();
  });

  it('is CONFLICT naming the allowance when covering a sixth site', async () => {
    const db = makeCoverDb({ coveredCount: 5 });
    await expect(
      createCaller(db).stripe.setSiteCovered({
        siteId: 'site-1',
        covered: true,
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'All 5 sites on your Pro plan are in use. Remove one first.',
    });
    expect(db.site.update).not.toHaveBeenCalled();
    expect(reconcileUserSitePlans).not.toHaveBeenCalled();
  });

  it('covers a site, reconciles, and does not consolidate without a site subscription', async () => {
    const db = makeCoverDb({ coveredCount: 4 });
    const result = await createCaller(db).stripe.setSiteCovered({
      siteId: 'site-1',
      covered: true,
    });
    expect(result).toEqual({ covered: true });
    expect(db.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { coveredByAccountPlan: true },
    });
    expect(reconcileUserSitePlans).toHaveBeenCalledWith('user-1');
    expect(consolidateSiteSubscriptions).not.toHaveBeenCalled();
  });

  it('consolidates when the covered site has a live per-site subscription', async () => {
    const db = makeCoverDb({
      site: coverSite({
        plan: 'PREMIUM',
        planSource: 'SITE',
        subscription: { status: 'active' },
      }),
    });
    await createCaller(db).stripe.setSiteCovered({
      siteId: 'site-1',
      covered: true,
    });
    expect(consolidateSiteSubscriptions).toHaveBeenCalledWith({
      userId: 'user-1',
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: 'sub_acct',
    });
  });

  it('does not consolidate on a plan that is not active or trialing', async () => {
    const db = makeCoverDb({
      account: { ...livePro, status: 'past_due' },
      site: coverSite({
        plan: 'PREMIUM',
        planSource: 'SITE',
        subscription: { status: 'active' },
      }),
    });
    await createCaller(db).stripe.setSiteCovered({
      siteId: 'site-1',
      covered: true,
    });
    expect(consolidateSiteSubscriptions).not.toHaveBeenCalled();
  });

  it('uncovers: clears the flag first, then reconciles with the site released', async () => {
    const db = makeCoverDb({
      site: coverSite({
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
      }),
    });
    const order: string[] = [];
    db.site.update.mockImplementation(async () => {
      order.push('update');
      return {};
    });
    vi.mocked(reconcileUserSitePlans).mockImplementation((async () => {
      order.push('reconcile');
      return { changed: [] };
    }) as any);

    const result = await createCaller(db).stripe.setSiteCovered({
      siteId: 'site-1',
      covered: false,
    });
    expect(result).toEqual({ covered: false });
    expect(db.site.update).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { coveredByAccountPlan: false },
    });
    expect(reconcileUserSitePlans).toHaveBeenCalledWith('user-1', {
      released: ['site-1'],
    });
    expect(order).toEqual(['update', 'reconcile']);
    expect(consolidateSiteSubscriptions).not.toHaveBeenCalled();
  });
});

describe('stripe.getAccountPlan', () => {
  it('returns plan null and every site for a user without a plan', async () => {
    const db = makeCoverDb({
      account: null,
      stripeCustomerId: null,
      sites: [
        coverSite({ id: 'a', projectName: 'a' }),
        coverSite({
          id: 'b',
          projectName: 'b',
          plan: 'PREMIUM',
          planSource: 'SITE',
          subscription: { status: 'active' },
        }),
      ],
    });
    const result = await createCaller(db).stripe.getAccountPlan();
    expect(result).toMatchObject({
      enabled: false,
      plan: null,
      siteAllowance: null,
      creditBalanceCents: 0,
    });
    expect(result.sites.map((s) => s.id)).toEqual(['a', 'b']);
    expect(result.sites.map((s) => s.hasSiteSubscription)).toEqual([
      false,
      true,
    ]);
    expect(stripe.customers.retrieve).not.toHaveBeenCalled();
  });

  it('reports the plan, allowance, covered sites and the negated customer balance', async () => {
    vi.mocked(accountPlansEnabled).mockReturnValue(true);
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({
      id: 'cus_1',
      balance: -1234,
    } as any);
    vi.mocked(stripe.prices.retrieve).mockResolvedValue({
      unit_amount: 700,
      currency: 'usd',
    } as any);
    const db = makeCoverDb({
      sites: [coverSite({ coveredByAccountPlan: true })],
    });
    const result = await createCaller(db).stripe.getAccountPlan();
    expect(result).toMatchObject({
      enabled: true,
      plan: 'PRO',
      interval: 'year',
      status: 'active',
      cancelAtPeriodEnd: false,
      siteAllowance: 5,
      creditBalanceCents: 1234,
    });
    expect(result.sites[0]).toMatchObject({ covered: true });
    expect(result.prices.PRO.year).toEqual({ amount: 7, currency: 'USD' });
  });
});

describe('stripe.getAccountBillingPortal', () => {
  it('is NOT_FOUND without a Stripe customer', async () => {
    const db = makeCoverDb({ stripeCustomerId: null });
    await expect(
      createCaller(db).stripe.getAccountBillingPortal(),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('opens the portal for the session user customer', async () => {
    vi.mocked(stripe.billingPortal.sessions.create).mockResolvedValue({
      url: 'https://portal.test/x',
    } as any);
    const result = await createCaller(
      makeCoverDb(),
    ).stripe.getAccountBillingPortal();
    expect(result).toEqual({ url: 'https://portal.test/x' });
    const args = vi.mocked(stripe.billingPortal.sessions.create).mock
      .calls[0]![0] as any;
    expect(args.customer).toBe('cus_1');
    expect(args.return_url).toMatch(/\/settings\/billing$/);
  });
});
