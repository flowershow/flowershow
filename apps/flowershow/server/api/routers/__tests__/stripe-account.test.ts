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
  },
}));

vi.mock('@/lib/account-billing', () => ({
  getOrCreateStripeCustomer: vi.fn().mockResolvedValue('cus_1'),
}));

// Keep the real price tables; only the flag is mocked.
vi.mock('@/lib/account-plans', async (orig) => ({
  ...(await orig<typeof import('@/lib/account-plans')>()),
  accountPlansEnabled: vi.fn().mockReturnValue(false),
}));

// ── Imports ───────────────────────────────────────────────────────

import { ACCOUNT_PRICE_IDS, accountPlansEnabled } from '@/lib/account-plans';
import { getOrCreateStripeCustomer } from '@/lib/account-billing';
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

function createCaller(db: ReturnType<typeof makeDb>) {
  return appRouter.createCaller({
    session: { user: { id: 'user-1' }, expires: '' } as any,
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

  it.each(['ACCOUNT', 'MANUAL'])(
    'is BAD_REQUEST when the site is already Premium via %s',
    async (planSource) => {
      const caller = createCaller(
        makeDb({
          site: {
            id: 'site-1',
            userId: 'user-1',
            planSource,
            user: { email: 'ada@example.com' },
          },
        }),
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
});
