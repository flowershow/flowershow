import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', async () => {
  const { createFakeBillingDb } = await import(
    '@/app/api/stripe/webhook/__tests__/fake-billing-db'
  );
  return { default: createFakeBillingDb() };
});
vi.mock('@/lib/stripe', () => ({
  FLOWERSHOW_PLATFORM: 'flowershow',
  stripe: {
    customers: {
      create: vi.fn(),
      listBalanceTransactions: vi.fn(),
      createBalanceTransaction: vi.fn(),
    },
    subscriptions: { retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn() },
    invoices: { list: vi.fn() },
  },
}));
vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  SeverityNumber: { INFO: 9, WARN: 13, ERROR: 17 },
}));

import type { FakeBillingDb } from '@/app/api/stripe/webhook/__tests__/fake-billing-db';
import {
  computeUnusedCreditCents,
  consolidateSiteSubscriptions,
  getOrCreateStripeCustomer,
} from '@/lib/account-billing';
import { log, SeverityNumber } from '@/lib/otel-logger';
import { stripe } from '@/lib/stripe';
import prisma from '@/server/db';

const mockCreate = vi.mocked(stripe.customers.create);
const mockUpdateMany = vi.mocked(prisma.user.updateMany);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

const USER = { id: 'user-1', email: 'ada@example.com', stripeCustomerId: null };

beforeEach(() => vi.clearAllMocks());

describe('getOrCreateStripeCustomer', () => {
  it('reuses an existing customer id without calling Stripe', async () => {
    const id = await getOrCreateStripeCustomer({
      ...USER,
      stripeCustomerId: 'cus_existing',
    });
    expect(id).toBe('cus_existing');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates a customer with platform and userId metadata and saves it', async () => {
    mockCreate.mockResolvedValue({ id: 'cus_new' } as any);
    mockUpdateMany.mockResolvedValue({ count: 1 } as any);

    const id = await getOrCreateStripeCustomer(USER);

    expect(id).toBe('cus_new');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { platform: 'flowershow', userId: 'user-1' },
      }),
    );
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', stripeCustomerId: null },
      data: { stripeCustomerId: 'cus_new' },
    });
  });

  it('returns the stored id when a concurrent checkout won the race', async () => {
    mockCreate.mockResolvedValue({ id: 'cus_loser' } as any);
    mockUpdateMany.mockResolvedValue({ count: 0 } as any);
    mockFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_winner' } as any);

    expect(await getOrCreateStripeCustomer(USER)).toBe('cus_winner');
  });
});

describe('computeUnusedCreditCents', () => {
  const period = { amountPaidCents: 1000, periodStart: 0, periodEnd: 100 };

  it('credits the unused share of the period', () => {
    expect(computeUnusedCreditCents({ ...period, now: 25 })).toBe(750);
  });

  it('returns 0 at or after the period end', () => {
    expect(computeUnusedCreditCents({ ...period, now: 100 })).toBe(0);
    expect(computeUnusedCreditCents({ ...period, now: 150 })).toBe(0);
  });

  it('returns 0 when nothing was paid', () => {
    expect(
      computeUnusedCreditCents({ ...period, amountPaidCents: 0, now: 25 }),
    ).toBe(0);
  });

  it('floors fractional cents', () => {
    expect(
      computeUnusedCreditCents({
        amountPaidCents: 100,
        periodStart: 0,
        periodEnd: 3,
        now: 1,
      }),
    ).toBe(66);
  });

  it('never credits more than was paid when now is before the period', () => {
    expect(
      computeUnusedCreditCents({
        amountPaidCents: 1000,
        periodStart: 50,
        periodEnd: 100,
        now: 10,
      }),
    ).toBe(1000);
  });
});

describe('consolidateSiteSubscriptions', () => {
  const db = prisma as unknown as FakeBillingDb;
  const ACCOUNT = {
    userId: 'user-1',
    stripeCustomerId: 'cus_acct_1',
    stripeSubscriptionId: 'sub_acct_1',
  };
  // Consolidation first runs a quarter of the way through the per-site period.
  const CONSOLIDATION_NOW = 1_900_001_000;
  const PERIOD_START = 1_900_000_000;
  const PERIOD_END = 1_900_004_000;
  const AMOUNT_PAID = 1000;
  const EXPECTED_CREDIT = 750;

  // Test double of the Stripe state consolidation reads and writes.
  let balanceTransactions: any[];
  let invoices: Record<string, any[]>;
  let siteStatuses: Record<string, string>;
  let siteMetadata: Record<string, Record<string, string>>;
  let accountSubscription: Record<string, unknown>;

  async function* paged<T>(items: T[]) {
    yield* items;
  }

  function line(overrides: Record<string, unknown> = {}) {
    return {
      type: 'subscription',
      proration: false,
      period: { start: PERIOD_START, end: PERIOD_END },
      ...overrides,
    };
  }

  function invoice(lines: any[] = [line()], overrides = {}) {
    return {
      id: 'in_1',
      status: 'paid',
      amount_paid: AMOUNT_PAID,
      currency: 'usd',
      lines: { data: lines },
      ...overrides,
    };
  }

  // Sites with live per-site subscriptions sub_<id>.
  function seed(
    siteIds: string[],
    opts: {
      siteAllowance?: number | null;
      covered?: string[];
      site?: Record<string, unknown>;
      subscription?: Record<string, unknown>;
    } = {},
  ) {
    const covered = opts.covered ?? [];
    db.seed({
      accountSubscriptions: [
        {
          id: 'acct-1',
          ...ACCOUNT,
          status: 'active',
          siteAllowance:
            opts.siteAllowance === undefined ? null : opts.siteAllowance,
        },
      ],
      sites: siteIds.map((id) => ({
        id,
        userId: 'user-1',
        isTemporary: false,
        plan: 'PREMIUM',
        planSource: 'SITE',
        coveredByAccountPlan: covered.includes(id),
        ...opts.site,
      })),
      subscriptions: siteIds.map((id) => ({
        id: `row-${id}`,
        siteId: id,
        stripeSubscriptionId: `sub_${id}`,
        stripeCustomerId: `cus_${id}`,
        status: 'active',
        consolidatedAt: null,
        ...opts.subscription,
      })),
    });
  }

  const rows = () => db.snapshot().subscriptions;
  const consolidatedRows = () =>
    rows()
      .filter((row) => row.consolidatedAt !== null)
      .map((row) => row.stripeSubscriptionId);
  const mockCreateCredit = vi.mocked(stripe.customers.createBalanceTransaction);
  const mockCancel = vi.mocked(stripe.subscriptions.cancel);
  const mockUpdate = vi.mocked(stripe.subscriptions.update);

  beforeEach(() => {
    balanceTransactions = [];
    invoices = {};
    siteStatuses = {};
    siteMetadata = {};
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(CONSOLIDATION_NOW * 1000));
    accountSubscription = {
      id: ACCOUNT.stripeSubscriptionId,
      status: 'active',
      // Long before the per-site period: the credit must not depend on it.
      start_date: PERIOD_START - 200 * 86_400,
      currency: 'usd',
    };

    vi.mocked(stripe.subscriptions.retrieve).mockImplementation((async (
      id: string,
    ) =>
      id === ACCOUNT.stripeSubscriptionId
        ? accountSubscription
        : {
            id,
            status: siteStatuses[id] ?? 'active',
            metadata: siteMetadata[id] ?? {},
            current_period_start: PERIOD_START,
            current_period_end: PERIOD_END,
          }) as any);
    vi.mocked(stripe.invoices.list).mockImplementation(((params: any) =>
      paged(invoices[params.subscription] ?? [invoice()])) as any);
    vi.mocked(stripe.customers.listBalanceTransactions).mockImplementation(
      (() => paged(balanceTransactions)) as any,
    );
    mockCreateCredit.mockImplementation((async (
      _customer: string,
      params: any,
    ) => {
      balanceTransactions.push(params);
      return params;
    }) as any);
    mockUpdate.mockReset();
    mockUpdate.mockImplementation((async (id: string, params: any) => {
      siteMetadata[id] = { ...siteMetadata[id], ...params.metadata };
      return {};
    }) as any);
    mockCancel.mockReset();
    mockCancel.mockResolvedValue({} as any);
  });

  afterEach(() => vi.useRealTimers());

  it('consolidates covered per-site subscriptions with one credit each', async () => {
    seed(['a', 'b']);

    const result = await consolidateSiteSubscriptions(ACCOUNT);

    expect(result).toEqual({
      consolidated: ['sub_a', 'sub_b'],
      creditedCents: 2 * EXPECTED_CREDIT,
    });
    expect(mockCreateCredit).toHaveBeenCalledTimes(2);
    expect(mockCreateCredit).toHaveBeenCalledWith(
      'cus_acct_1',
      {
        amount: -EXPECTED_CREDIT,
        currency: 'usd',
        metadata: {
          platform: 'flowershow',
          reason: 'consolidation_credit',
          siteSubscriptionId: 'sub_a',
        },
      },
      { idempotencyKey: 'consolidation-credit:sub_a' },
    );
    expect(mockUpdate).toHaveBeenCalledWith('sub_a', {
      metadata: { reason: 'consolidated', consolidatedInto: 'sub_acct_1' },
    });
    expect(mockCancel).toHaveBeenCalledWith('sub_a', { prorate: false });
    expect(mockCancel).toHaveBeenCalledWith('sub_b', { prorate: false });
    expect(consolidatedRows()).toEqual(['sub_a', 'sub_b']);
  });

  it('stamps, credits, tags, cancels, then records', async () => {
    seed(['a']);

    await consolidateSiteSubscriptions(ACCOUNT);

    const callIndex = (key: string) =>
      mockUpdate.mock.calls.findIndex(
        ([, params]) => params?.metadata?.[key] !== undefined,
      );
    const updateOrder = (key: string) =>
      mockUpdate.mock.invocationCallOrder[callIndex(key)]!;
    const order = [
      updateOrder('consolidationStartedAt'),
      mockCreateCredit.mock.invocationCallOrder[0]!,
      updateOrder('reason'),
      mockCancel.mock.invocationCallOrder[0]!,
      db.subscription.update.mock.invocationCallOrder[0]!,
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('replay after partial failure does not double credit', async () => {
    seed(['a']);
    mockCancel.mockRejectedValueOnce(new Error('stripe down'));

    await expect(consolidateSiteSubscriptions(ACCOUNT)).rejects.toThrow(
      'stripe down',
    );
    expect(mockCreateCredit).toHaveBeenCalledTimes(1);
    expect(consolidatedRows()).toEqual([]);

    const result = await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCreateCredit).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(consolidatedRows()).toEqual(['sub_a']);
    expect(result).toEqual({ consolidated: ['sub_a'], creditedCents: 0 });
  });

  it('resumes the remaining subscriptions on retry after one fails', async () => {
    seed(['a', 'b']);
    mockCancel.mockRejectedValueOnce(new Error('stripe down'));

    await expect(consolidateSiteSubscriptions(ACCOUNT)).rejects.toThrow();
    await consolidateSiteSubscriptions(ACCOUNT);

    expect(consolidatedRows()).toEqual(['sub_a', 'sub_b']);
    expect(mockCreateCredit).toHaveBeenCalledTimes(2);
  });

  it('skips rows already consolidated', async () => {
    seed(['a'], { subscription: { consolidatedAt: new Date() } });

    expect(await consolidateSiteSubscriptions(ACCOUNT)).toEqual({
      consolidated: [],
      creditedCents: 0,
    });
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('only records the row when Stripe already shows it canceled', async () => {
    seed(['a']);
    siteStatuses.sub_a = 'canceled';

    await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCreateCredit).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
    expect(consolidatedRows()).toEqual(['sub_a']);
  });

  it('Pro leaves uncovered per-site subscriptions alone', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    seed(ids, { siteAllowance: 5, covered: ids.slice(0, 5) });

    const result = await consolidateSiteSubscriptions(ACCOUNT);

    expect(result.consolidated).toHaveLength(5);
    expect(mockCancel).toHaveBeenCalledTimes(5);
    expect(mockCancel).not.toHaveBeenCalledWith('sub_f', expect.anything());
    expect(mockCancel).not.toHaveBeenCalledWith('sub_g', expect.anything());
    expect(mockCreateCredit).toHaveBeenCalledTimes(5);
    expect(consolidatedRows()).toEqual(
      ids.slice(0, 5).map((id) => `sub_${id}`),
    );
  });

  it.each([
    ['MANUAL', { planSource: 'MANUAL' }],
    ['PREMIUM with no source', { planSource: null }],
  ])('leaves a %s site alone on Unlimited', async (_name, site) => {
    seed(['a'], { site });

    await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockCreateCredit).not.toHaveBeenCalled();
    expect(consolidatedRows()).toEqual([]);
  });

  it('leaves a subscription that is no longer live alone', async () => {
    seed(['a'], { subscription: { status: 'canceled' } });

    await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCancel).not.toHaveBeenCalled();
  });

  it.each(['past_due', 'incomplete', 'canceled'])(
    'does nothing while the account subscription is %s',
    async (status) => {
      seed(['a']);
      accountSubscription.status = status;

      await consolidateSiteSubscriptions(ACCOUNT);

      expect(mockCancel).not.toHaveBeenCalled();
      expect(mockCreateCredit).not.toHaveBeenCalled();
    },
  );

  it('no credit when there is no paid invoice for the current period', async () => {
    seed(['a']);
    invoices.sub_a = [
      invoice([
        line({ period: { start: PERIOD_START - 4000, end: PERIOD_START } }),
      ]),
    ];

    const result = await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCreateCredit).not.toHaveBeenCalled();
    expect(mockCancel).toHaveBeenCalledWith('sub_a', { prorate: false });
    expect(result.creditedCents).toBe(0);
    expect(consolidatedRows()).toEqual(['sub_a']);
  });

  it('credit uses the invoice whose line period matches, not a later proration invoice', async () => {
    seed(['a']);
    invoices.sub_a = [
      invoice(
        [
          line({
            type: 'invoiceitem',
            proration: true,
            period: { start: PERIOD_START + 100, end: PERIOD_END },
          }),
        ],
        { id: 'in_proration', amount_paid: 9000 },
      ),
      invoice(),
    ];

    await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCreateCredit.mock.calls[0]![1]).toMatchObject({
      amount: -EXPECTED_CREDIT,
    });
  });

  it('ignores a proration line that spans the whole current period', async () => {
    seed(['a']);
    invoices.sub_a = [
      invoice([line({ proration: true })], { amount_paid: 9000 }),
    ];

    await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCreateCredit).not.toHaveBeenCalled();
  });

  it('currency mismatch skips the credit and logs ERROR but still consolidates', async () => {
    seed(['a']);
    invoices.sub_a = [invoice([line()], { currency: 'eur' })];

    const result = await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockCreateCredit).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.any(String),
      SeverityNumber.ERROR,
      expect.objectContaining({ siteSubscriptionId: 'sub_a' }),
    );
    expect(mockCancel).toHaveBeenCalledWith('sub_a', { prorate: false });
    expect(result).toEqual({ consolidated: ['sub_a'], creditedCents: 0 });
  });

  it('retries compute the same credit', async () => {
    seed(['a']);
    mockCreateCredit.mockRejectedValueOnce(new Error('stripe down'));

    await expect(consolidateSiteSubscriptions(ACCOUNT)).rejects.toThrow();
    // A day on is past this period's end: only the stamp gives a credit at all.
    vi.setSystemTime(new Date((CONSOLIDATION_NOW + 86_400) * 1000));
    await consolidateSiteSubscriptions(ACCOUNT);

    const [first, second] = mockCreateCredit.mock.calls;
    expect(first![1].amount).toBe(-EXPECTED_CREDIT);
    expect(second![1].amount).toBe(first![1].amount);
    expect(second![2]).toEqual(first![2]);
    expect(siteMetadata.sub_a!.consolidationStartedAt).toBe(
      String(CONSOLIDATION_NOW),
    );
  });

  it('late coverage credits only the unused time', async () => {
    seed(['a']);
    const span = PERIOD_END - PERIOD_START;
    siteMetadata.sub_a = {
      consolidationStartedAt: String(PERIOD_START + span * 0.75),
    };

    const result = await consolidateSiteSubscriptions(ACCOUNT);

    expect(result.creditedCents).toBe(AMOUNT_PAID * 0.25);
    expect(mockCreateCredit.mock.calls[0]![1].amount).toBe(-AMOUNT_PAID * 0.25);
  });

  it('does not re-stamp when the stamp exists', async () => {
    seed(['a']);
    siteMetadata.sub_a = {
      consolidationStartedAt: String(CONSOLIDATION_NOW - 100),
    };

    await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockUpdate).not.toHaveBeenCalledWith(
      'sub_a',
      expect.objectContaining({
        metadata: { consolidationStartedAt: expect.anything() },
      }),
    );
    expect(siteMetadata.sub_a!.consolidationStartedAt).toBe(
      String(CONSOLIDATION_NOW - 100),
    );
  });

  it('stamps a subscription that has no stamp with the current time', async () => {
    seed(['a']);

    await consolidateSiteSubscriptions(ACCOUNT);

    expect(mockUpdate).toHaveBeenCalledWith('sub_a', {
      metadata: { consolidationStartedAt: String(CONSOLIDATION_NOW) },
    });
  });
});
