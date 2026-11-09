import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted).

vi.mock('next/headers', () => ({
  headers: () => ({ get: () => 'test-signature' }),
}));

// Hermetic copies of the ownership helpers: loading the real lib/stripe
// validates env and constructs a Stripe client.
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
      subscriptions: { retrieve: vi.fn() },
    },
    isFlowershowSubscription: (sub: any) =>
      sub?.metadata?.platform === 'flowershow' ||
      (sub?.items?.data ?? []).some((i: any) => isAccountPrice(i?.price?.id)),
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

vi.mock('@/lib/account-billing', () => ({
  consolidateSiteSubscriptions: vi
    .fn()
    .mockResolvedValue({ consolidated: [], creditedCents: 0 }),
}));

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

const posthogCapture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: posthogCapture,
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
import { consolidateSiteSubscriptions } from '@/lib/account-billing';
import { sendEmail } from '@/lib/email';
import { log, SeverityNumber } from '@/lib/otel-logger';
import { stripe } from '@/lib/stripe';
import { sendTransactionalEmail } from '@/lib/transactional-email';
import prisma from '@/server/db';
import type { FakeBillingDb } from './__tests__/fake-billing-db';
import { handleAccountEvent } from './account';
import { POST } from './route';

const db = prisma as unknown as FakeBillingDb;

const UNLIMITED_PRICE = 'price_unlimited_month_test';
const PRO_PRICE = 'price_pro_month_test';

function fixture(name: string): any {
  return JSON.parse(
    readFileSync(path.join(__dirname, '__fixtures__', `${name}.json`), 'utf8'),
  );
}

// The live subscription stripe.subscriptions.retrieve returns.
function mockRetrieve(overrides: Record<string, unknown> = {}) {
  vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
    ...fixture('account-subscription-created').data.object,
    status: 'active',
    ...overrides,
  });
}

function withPrice(id: string) {
  return {
    items: { data: [{ price: { id, recurring: { interval: 'month' } } }] },
  };
}

function fire(event: any) {
  vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event);
  return POST(
    new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: 'raw-body',
    }),
  );
}

const USER = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  stripeCustomerId: 'cus_acct_1' as string | null,
  cancelBonusGrantedAt: null as Date | null,
};

function site(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    userId: USER.id,
    isTemporary: false,
    plan: 'FREE',
    planSource: null,
    coveredByAccountPlan: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    customDomain: null,
    storageAllowanceBytes: null,
    privacyMode: 'PUBLIC',
    publishes: [],
    ...overrides,
  };
}

const accountSite = (id: string, overrides: Record<string, unknown> = {}) =>
  site(id, { plan: 'PREMIUM', planSource: 'ACCOUNT', ...overrides });

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acct-1',
    userId: USER.id,
    stripeCustomerId: 'cus_acct_1',
    stripeSubscriptionId: 'sub_acct_1',
    stripePriceId: UNLIMITED_PRICE,
    plan: 'UNLIMITED',
    interval: 'month',
    siteAllowance: null,
    status: 'active',
    currentPeriodStart: new Date('2030-01-01T00:00:00Z'),
    currentPeriodEnd: new Date('2030-02-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

const sitesOf = (): Record<string, any> =>
  Object.fromEntries(db.snapshot().sites.map((s) => [s.id, s]));
const accountOf = () => db.snapshot().accountSubscriptions[0];

beforeEach(() => {
  vi.clearAllMocks();
  ACCOUNT_PRICE_IDS.test.UNLIMITED.month = UNLIMITED_PRICE;
  ACCOUNT_PRICE_IDS.test.PRO.month = PRO_PRICE;
  db.seed({ users: [{ ...USER }] });
  mockRetrieve();
});

afterEach(() => {
  ACCOUNT_PRICE_IDS.test.UNLIMITED.month = null;
  ACCOUNT_PRICE_IDS.test.PRO.month = null;
});

describe('account subscription webhooks', () => {
  it('checkout completed creates the account subscription and covers sites', async () => {
    db.seed({
      users: [{ ...USER }],
      sites: [site('a'), site('b'), site('c')],
    });

    const res = await fire(fixture('account-checkout-completed'));

    expect(res.status).toBe(200);
    expect(accountOf()).toMatchObject({
      userId: USER.id,
      stripeCustomerId: 'cus_acct_1',
      stripeSubscriptionId: 'sub_acct_1',
      stripePriceId: UNLIMITED_PRICE,
      plan: 'UNLIMITED',
      interval: 'month',
      siteAllowance: null,
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStart: new Date(1893456000 * 1000),
      currentPeriodEnd: new Date(1896134400 * 1000),
    });
    for (const s of Object.values(sitesOf())) {
      expect(s).toMatchObject({ plan: 'PREMIUM', planSource: 'ACCOUNT' });
    }
    expect(consolidateSiteSubscriptions).toHaveBeenCalledWith({
      userId: USER.id,
      stripeCustomerId: 'cus_acct_1',
      stripeSubscriptionId: 'sub_acct_1',
    });
  });

  it('replaying checkout completed is a no-op', async () => {
    db.seed({
      users: [{ ...USER }],
      sites: [site('a'), site('b'), site('c')],
    });
    const event = fixture('account-checkout-completed');

    await fire(event);
    const afterFirst = db.snapshot();
    db.site.updateMany.mockClear();

    const res = await fire(event);

    expect(res.status).toBe(200);
    expect(db.snapshot()).toEqual(afterFirst);
    expect(db.site.updateMany).not.toHaveBeenCalled();
  });

  it('deleted before completed converges', async () => {
    db.seed({
      users: [{ ...USER }],
      sites: [site('a'), site('b'), site('c')],
    });
    mockRetrieve({ status: 'canceled' });

    await fire(fixture('account-subscription-deleted'));
    await fire(fixture('account-checkout-completed'));

    expect(accountOf()).toMatchObject({ status: 'canceled' });
    for (const s of Object.values(sitesOf())) {
      expect(s).toMatchObject({ plan: 'FREE', planSource: null });
    }
    expect(consolidateSiteSubscriptions).not.toHaveBeenCalled();
  });

  it('cancel scheduled records the flag and sends nothing', async () => {
    db.seed({
      users: [{ ...USER }],
      accountSubscriptions: [accountRow()],
      sites: [accountSite('a'), accountSite('b')],
    });
    mockRetrieve({ cancel_at_period_end: true });

    await fire(fixture('account-subscription-updated-cancel-scheduled'));

    expect(accountOf()).toMatchObject({ cancelAtPeriodEnd: true });
    expect(sitesOf().a).toMatchObject({ plan: 'PREMIUM' });
    expect(sitesOf().b).toMatchObject({ plan: 'PREMIUM' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(db.snapshot().users[0]!.cancelBonusGrantedAt).toBeNull();
    expect(posthogCapture).toHaveBeenCalledTimes(1);
    expect(posthogCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: USER.id,
        event: 'account_plan_cancel_scheduled',
      }),
    );

    // A later update while still scheduled does not capture again.
    await fire(fixture('account-subscription-updated-cancel-scheduled'));
    expect(posthogCapture).toHaveBeenCalledTimes(1);
  });

  it('deleted downgrades ACCOUNT sites only', async () => {
    db.seed({
      users: [{ ...USER }],
      accountSubscriptions: [accountRow()],
      subscriptions: [
        { siteId: 'site-sub', status: 'active', stripeSubscriptionId: 'sub_s' },
      ],
      sites: [
        site('manual', { plan: 'PREMIUM', planSource: 'MANUAL' }),
        site('site-sub', { plan: 'PREMIUM', planSource: 'SITE' }),
        accountSite('covered', {
          customDomain: 'blog.example.com',
          privacyMode: 'PASSWORD',
        }),
      ],
    });
    mockRetrieve({ status: 'canceled' });

    await fire(fixture('account-subscription-deleted'));

    expect(accountOf()).toMatchObject({ status: 'canceled' });
    const sites = sitesOf();
    expect(sites.manual).toMatchObject({
      plan: 'PREMIUM',
      planSource: 'MANUAL',
    });
    expect(sites['site-sub']).toMatchObject({
      plan: 'PREMIUM',
      planSource: 'SITE',
    });
    expect(sites.covered).toMatchObject({
      plan: 'FREE',
      planSource: null,
      customDomain: null,
      privacyMode: 'PASSWORD',
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('plan change Unlimited to Pro trims to five', async () => {
    // Unlimited never writes the flags, so all eight are unflagged. site-0 was
    // published longest ago, site-7 most recently.
    db.seed({
      users: [{ ...USER }],
      accountSubscriptions: [accountRow()],
      sites: Array.from({ length: 8 }, (_, i) =>
        accountSite(`site-${i}`, {
          publishes: [{ startedAt: new Date(Date.UTC(2026, 0, i + 1)) }],
        }),
      ),
    });
    mockRetrieve(withPrice(PRO_PRICE));

    await fire(fixture('account-subscription-updated-plan-change'));

    expect(accountOf()).toMatchObject({
      plan: 'PRO',
      siteAllowance: 5,
      stripePriceId: PRO_PRICE,
    });
    const sites = sitesOf();
    const covered = Object.values(sites)
      .filter((s) => s.plan === 'PREMIUM' && s.planSource === 'ACCOUNT')
      .map((s) => s.id)
      .sort();
    expect(covered).toEqual(['site-3', 'site-4', 'site-5', 'site-6', 'site-7']);
    expect(sites['site-0']).toMatchObject({ plan: 'FREE', planSource: null });
  });

  it('stale event for an old subscription is ignored', async () => {
    const stored = accountRow({ stripeSubscriptionId: 'sub_acct_2' });
    db.seed({
      users: [{ ...USER }],
      accountSubscriptions: [stored],
      sites: [accountSite('a')],
    });
    mockRetrieve({ status: 'canceled' });

    const res = await fire(fixture('account-subscription-deleted'));

    expect(res.status).toBe(200);
    expect(accountOf()).toEqual(stored);
    expect(sitesOf().a).toMatchObject({ plan: 'PREMIUM' });
    expect(log).not.toHaveBeenCalledWith(
      expect.anything(),
      SeverityNumber.ERROR,
      expect.anything(),
    );
  });

  it('created incomplete then expired never consolidates or covers', async () => {
    const sites = [site('a'), site('b')];
    db.seed({ users: [{ ...USER }], sites });
    const before = db.snapshot().sites;

    mockRetrieve({ status: 'incomplete' });
    await fire(fixture('account-subscription-created'));
    expect(accountOf()).toMatchObject({ status: 'incomplete' });

    mockRetrieve({ status: 'incomplete_expired' });
    await fire(fixture('account-subscription-created'));

    expect(accountOf()).toMatchObject({ status: 'incomplete_expired' });
    expect(db.snapshot().sites).toEqual(before);
    expect(consolidateSiteSubscriptions).not.toHaveBeenCalled();
  });

  it('first activation after incomplete fills the Pro slots', async () => {
    db.seed({
      users: [{ ...USER }],
      sites: [site('a'), site('b')],
    });
    mockRetrieve({ status: 'incomplete', ...withPrice(PRO_PRICE) });
    await fire(fixture('account-subscription-created'));

    mockRetrieve({ status: 'active', ...withPrice(PRO_PRICE) });
    await fire(fixture('account-checkout-completed'));

    expect(sitesOf().a).toMatchObject({
      plan: 'PREMIUM',
      planSource: 'ACCOUNT',
      coveredByAccountPlan: true,
    });
    expect(sitesOf().b).toMatchObject({
      plan: 'PREMIUM',
      planSource: 'ACCOUNT',
      coveredByAccountPlan: true,
    });
    expect(consolidateSiteSubscriptions).toHaveBeenCalledTimes(1);
  });

  it('a routine update does not refill a slot the owner emptied', async () => {
    db.seed({
      users: [{ ...USER }],
      accountSubscriptions: [
        accountRow({
          plan: 'PRO',
          siteAllowance: 5,
          stripePriceId: PRO_PRICE,
        }),
      ],
      sites: [accountSite('a', { coveredByAccountPlan: true }), site('b')],
    });
    mockRetrieve(withPrice(PRO_PRICE));

    await fire(fixture('account-subscription-updated-plan-change'));

    expect(sitesOf().b).toMatchObject({
      plan: 'FREE',
      coveredByAccountPlan: false,
    });
  });

  it('duplicate live account subscription is not overwritten', async () => {
    const stored = accountRow({ stripeSubscriptionId: 'sub_acct_2' });
    db.seed({ users: [{ ...USER }], accountSubscriptions: [stored] });
    mockRetrieve({ id: 'sub_acct_3' });

    const event = fixture('account-subscription-created');
    event.data.object.id = 'sub_acct_3';
    const res = await fire(event);

    expect(res.status).toBe(200);
    expect(accountOf()).toEqual(stored);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Duplicate'),
      SeverityNumber.ERROR,
      expect.objectContaining({
        stripeSubscriptionId: 'sub_acct_3',
        storedStripeSubscriptionId: 'sub_acct_2',
      }),
    );
    expect(consolidateSiteSubscriptions).not.toHaveBeenCalled();
  });

  it('missing userId falls back to the customer id', async () => {
    const metadata = { platform: 'flowershow', kind: 'account' };
    mockRetrieve({ metadata });

    const res = await fire(fixture('account-subscription-created'));

    expect(res.status).toBe(200);
    expect(accountOf()).toMatchObject({ userId: USER.id });
    expect(db.snapshot().users).toEqual([{ ...USER }]);
  });

  it('sets User.stripeCustomerId when it is null', async () => {
    db.seed({ users: [{ ...USER, stripeCustomerId: null }] });

    await fire(fixture('account-subscription-created'));

    expect(db.snapshot().users[0]!.stripeCustomerId).toBe('cus_acct_1');
  });

  it('logs and returns 200 when no user resolves', async () => {
    db.seed({ users: [] });
    mockRetrieve({ metadata: { platform: 'flowershow', kind: 'account' } });

    const res = await fire(fixture('account-subscription-created'));

    expect(res.status).toBe(200);
    expect(db.snapshot().accountSubscriptions).toEqual([]);
    expect(log).toHaveBeenCalledWith(
      expect.any(String),
      SeverityNumber.WARN,
      expect.objectContaining({ reason: 'user_not_found' }),
    );
  });

  it('falls back to the customer id when metadata.userId is unknown', async () => {
    mockRetrieve({
      metadata: { platform: 'flowershow', kind: 'account', userId: 'gone' },
    });

    await fire(fixture('account-subscription-created'));

    expect(accountOf()).toMatchObject({ userId: USER.id });
  });

  it('unknown account price returns 500', async () => {
    mockRetrieve(withPrice('price_not_configured'));

    const res = await fire(fixture('account-subscription-created'));

    expect(res.status).toBe(500);
    expect(db.snapshot().accountSubscriptions).toEqual([]);
  });

  it('invoice.upcoming for an account subscription is a no-op', async () => {
    db.seed({
      users: [{ ...USER }],
      accountSubscriptions: [accountRow()],
    });
    const before = db.snapshot();
    const event = {
      id: 'evt_invoice',
      type: 'invoice.upcoming',
      data: { object: { subscription: 'sub_acct_1', amount_due: 1 } },
    };

    const res = await fire(event);
    await handleAccountEvent(event as any);

    expect(res.status).toBe(200);
    expect(db.snapshot()).toEqual(before);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
