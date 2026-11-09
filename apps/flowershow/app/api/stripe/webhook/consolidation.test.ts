import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The real route, account handler, consolidation and reconciler, end to end,
// against the fake DB and a small double of Stripe.

vi.mock('next/headers', () => ({
  headers: () => ({ get: () => 'test-signature' }),
}));

vi.mock('@/lib/stripe', async () => {
  const { accountPlanForPriceId } = await vi.importActual<
    typeof import('@/lib/account-plans')
  >('@/lib/account-plans');
  const isAccountPrice = (id?: string) =>
    !!id && accountPlanForPriceId(id) !== null;
  return {
    FLOWERSHOW_PLATFORM: 'flowershow',
    stripe: {
      webhooks: { constructEvent: vi.fn() },
      subscriptions: { retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn() },
      customers: {
        listBalanceTransactions: vi.fn(),
        createBalanceTransaction: vi.fn(),
      },
      invoices: { list: vi.fn() },
    },
    isFlowershowSubscription: (sub: any) =>
      sub?.metadata?.platform === 'flowershow',
    getSubscriptionKind: (sub: any) =>
      sub?.metadata?.kind === 'account' ||
      (sub?.items?.data ?? []).some((i: any) => isAccountPrice(i?.price?.id))
        ? 'account'
        : 'site',
  };
});

vi.mock('@/server/db', async () => {
  const { createFakeBillingDb } = await import('./__tests__/fake-billing-db');
  return { default: createFakeBillingDb() };
});

vi.mock('@/lib/storage-limits', () => ({
  getSiteStorageBytes: vi.fn().mockResolvedValue(0),
}));
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ data: { id: 'e' }, error: null }),
}));
vi.mock('@/lib/transactional-email', () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/domains', () => ({
  removeDomainAndVariantFromVercelProject: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
}));
vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  flushLogs: vi.fn().mockResolvedValue(undefined),
  SeverityNumber: { INFO: 9, WARN: 13, ERROR: 17 },
}));

import { ACCOUNT_PRICE_IDS } from '@/lib/account-plans';
import { removeDomainAndVariantFromVercelProject } from '@/lib/domains';
import { sendEmail } from '@/lib/email';
import { stripe } from '@/lib/stripe';
import { sendTransactionalEmail } from '@/lib/transactional-email';
import prisma from '@/server/db';
import type { FakeBillingDb } from './__tests__/fake-billing-db';
import { POST } from './route';

const db = prisma as unknown as FakeBillingDb;

const UNLIMITED_PRICE = 'price_unlimited_month_test';
const PRO_PRICE = 'price_pro_month_test';
const USER_ID = 'user-1';
const ACCOUNT_SUB = 'sub_acct_1';

function fixture(name: string): any {
  return JSON.parse(
    readFileSync(path.join(__dirname, '__fixtures__', `${name}.json`), 'utf8'),
  );
}

// Per-site periods straddle the account start date in the fixtures.
const consolidatedEvent = fixture('site-subscription-deleted-consolidated');
const PERIOD_START = consolidatedEvent.data.object.current_period_start;
const PERIOD_END = consolidatedEvent.data.object.current_period_end;
const ACCOUNT_START = PERIOD_START + (PERIOD_END - PERIOD_START) / 2;

function fire(event: any) {
  vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event);
  return POST(
    new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: 'raw-body',
    }),
  );
}

// The event Stripe sends for a per-site subscription in a given state.
function siteEvent(
  type: string,
  id: string,
  object: Record<string, unknown> = {},
) {
  const event = fixture('site-subscription-deleted-consolidated');
  event.type = type;
  Object.assign(event.data.object, {
    id,
    metadata: {
      ...event.data.object.metadata,
      siteId: id.replace('sub_', ''),
    },
    ...object,
  });
  return event;
}

function siteRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: USER_ID,
    projectName: id,
    isTemporary: false,
    plan: 'PREMIUM',
    planSource: 'SITE',
    coveredByAccountPlan: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    customDomain: `${id}.example.com`,
    storageAllowanceBytes: null,
    privacyMode: 'PUBLIC',
    publishes: [],
    ...overrides,
  };
}

const subscriptionRow = (siteId: string) => ({
  id: `row-${siteId}`,
  siteId,
  stripeCustomerId: `cus_${siteId}`,
  stripeSubscriptionId: `sub_${siteId}`,
  status: 'active',
  cancelAtPeriodEnd: false,
  consolidatedAt: null,
  currentPeriodEnd: new Date(PERIOD_END * 1000),
});

const accountRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'acct-1',
  userId: USER_ID,
  stripeCustomerId: 'cus_acct_1',
  stripeSubscriptionId: ACCOUNT_SUB,
  stripePriceId: UNLIMITED_PRICE,
  plan: 'UNLIMITED',
  interval: 'month',
  siteAllowance: null,
  status: 'active',
  cancelAtPeriodEnd: false,
  ...overrides,
});

const USER = {
  id: USER_ID,
  email: 'ada@example.com',
  name: 'Ada',
  stripeCustomerId: 'cus_acct_1',
  cancelBonusGrantedAt: null as Date | null,
};

const sitesOf = (): Record<string, any> =>
  Object.fromEntries(db.snapshot().sites.map((s) => [s.id, s]));

function expectSilent() {
  expect(sendEmail).not.toHaveBeenCalled();
  expect(sendTransactionalEmail).not.toHaveBeenCalled();
  expect(db.user.update).not.toHaveBeenCalled();
  expect(removeDomainAndVariantFromVercelProject).not.toHaveBeenCalled();
}

let accountPrice: string;
let credits: any[];
let canceled: Set<string>;

async function* paged<T>(items: T[]) {
  yield* items;
}

beforeEach(() => {
  vi.clearAllMocks();
  ACCOUNT_PRICE_IDS.test.PRO.month = PRO_PRICE;
  ACCOUNT_PRICE_IDS.test.UNLIMITED.month = UNLIMITED_PRICE;

  accountPrice = UNLIMITED_PRICE;
  credits = [];
  canceled = new Set();

  vi.mocked(stripe.subscriptions.retrieve).mockImplementation((async (
    id: string,
  ) =>
    id === ACCOUNT_SUB
      ? {
          ...fixture('account-subscription-created').data.object,
          status: 'active',
          start_date: ACCOUNT_START,
          currency: 'usd',
          items: {
            data: [
              { price: { id: accountPrice, recurring: { interval: 'month' } } },
            ],
          },
        }
      : {
          id,
          status: canceled.has(id) ? 'canceled' : 'active',
          current_period_start: PERIOD_START,
          current_period_end: PERIOD_END,
        }) as any);
  vi.mocked(stripe.invoices.list).mockImplementation((() =>
    paged([
      {
        amount_paid: 1000,
        currency: 'usd',
        lines: {
          data: [
            {
              type: 'subscription',
              proration: false,
              period: { start: PERIOD_START, end: PERIOD_END },
            },
          ],
        },
      },
    ])) as any);
  vi.mocked(stripe.customers.listBalanceTransactions).mockImplementation((() =>
    paged(credits)) as any);
  vi.mocked(stripe.customers.createBalanceTransaction).mockImplementation(
    (async (_customer: string, params: any) => {
      credits.push(params);
      return params;
    }) as any,
  );
  vi.mocked(stripe.subscriptions.update).mockResolvedValue({} as any);
  vi.mocked(stripe.subscriptions.cancel).mockImplementation((async (
    id: string,
  ) => {
    canceled.add(id);
    return {};
  }) as any);
});

afterEach(() => {
  ACCOUNT_PRICE_IDS.test.PRO.month = null;
  ACCOUNT_PRICE_IDS.test.UNLIMITED.month = null;
});

describe('consolidated per-site events', () => {
  function seedConsolidating(overrides: Record<string, unknown> = {}) {
    db.seed({
      users: [{ ...USER }],
      accountSubscriptions: [accountRow(overrides)],
      sites: [siteRow('site-1')],
      // The fixture's subscription id.
      subscriptions: [
        { ...subscriptionRow('site-1'), stripeSubscriptionId: 'sub_site_1' },
      ],
    });
  }

  it('consolidated deletion keeps the site Premium and is silent', async () => {
    seedConsolidating();

    const res = await fire(fixture('site-subscription-deleted-consolidated'));

    expect(res.status).toBe(200);
    expect(sitesOf()['site-1']).toMatchObject({
      plan: 'PREMIUM',
      planSource: 'ACCOUNT',
      customDomain: 'site-1.example.com',
    });
    expect(db.snapshot().subscriptions[0]!.status).toBe('canceled');
    expectSilent();
  });

  it('a late metadata update does not revive a canceled row', async () => {
    seedConsolidating();
    await fire(fixture('site-subscription-deleted-consolidated'));

    await fire(
      siteEvent('customer.subscription.updated', 'sub_site_1', {
        status: 'active',
      }),
    );

    expect(db.snapshot().subscriptions[0]!.status).toBe('canceled');
    expect(sitesOf()['site-1']).toMatchObject({
      plan: 'PREMIUM',
      planSource: 'ACCOUNT',
    });
    expectSilent();
  });

  it('a consolidated update with cancel_at_period_end grants no bonus and sends nothing', async () => {
    seedConsolidating();

    await fire(
      siteEvent('customer.subscription.updated', 'sub_site_1', {
        status: 'active',
        cancel_at_period_end: true,
      }),
    );

    expect(sitesOf()['site-1']).toMatchObject({
      plan: 'PREMIUM',
      planSource: 'SITE',
    });
    expectSilent();
  });

  it('a payment-failure-shaped consolidated deletion still sends no expiry email', async () => {
    seedConsolidating();

    await fire(
      siteEvent('customer.subscription.deleted', 'sub_site_1', {
        cancellation_details: { reason: 'payment_failure' },
      }),
    );

    expectSilent();
  });
});

describe('Pro bought with more per-site subscriptions than the allowance', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  function checkoutEvent() {
    return fixture('account-checkout-completed');
  }

  it('consolidates five, leaves two billed, and survives the replay and the deletions', async () => {
    accountPrice = PRO_PRICE;
    db.seed({
      users: [{ ...USER }],
      // Older to newer, so the five newest (c..g) win the slots.
      sites: ids.map((id, i) =>
        siteRow(id, { createdAt: new Date(2026, 0, i + 1) }),
      ),
      subscriptions: ids.map(subscriptionRow),
    });

    await fire(checkoutEvent());

    const covered = ['c', 'd', 'e', 'f', 'g'];
    const cancels = vi
      .mocked(stripe.subscriptions.cancel)
      .mock.calls.map(([id]) => id);
    expect(cancels.sort()).toEqual(covered.map((id) => `sub_${id}`));
    expect(credits).toHaveLength(5);
    expect(
      new Set(credits.map((c) => c.metadata.siteSubscriptionId)).size,
    ).toBe(5);

    // Replayed two days later: no second credit, no second cancel.
    await fire(checkoutEvent());
    expect(credits).toHaveLength(5);
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(5);

    // Stripe's deleted events for the five arrive.
    for (const id of covered) {
      await fire(siteEvent('customer.subscription.deleted', `sub_${id}`));
    }

    const sites = sitesOf();
    for (const id of covered) {
      expect(sites[id]).toMatchObject({
        plan: 'PREMIUM',
        planSource: 'ACCOUNT',
        coveredByAccountPlan: true,
        customDomain: `${id}.example.com`,
      });
    }
    for (const id of ['a', 'b']) {
      expect(sites[id]).toMatchObject({
        plan: 'PREMIUM',
        planSource: 'SITE',
        coveredByAccountPlan: false,
      });
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalledWith(
        `sub_${id}`,
        expect.anything(),
      );
    }
    expectSilent();
  });
});
