import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted).

vi.mock('next/headers', () => ({
  headers: () => ({ get: () => 'test-signature' }),
}));

// Hermetic copy of the ownership helper. We can't importActual('@/lib/stripe')
// because loading it validates env and constructs a real Stripe client. The
// logic mirrors lib/stripe.ts: metadata.platform match OR a known price id.
const TEST_KNOWN_PRICE_ID = 'price_flowershow_known';
vi.mock('@/lib/stripe', () => {
  const FLOWERSHOW_PLATFORM = 'flowershow';
  const KNOWN_PRICE_IDS = new Set(['price_flowershow_known']);
  return {
    FLOWERSHOW_PLATFORM,
    stripe: {
      webhooks: { constructEvent: vi.fn() },
      subscriptions: { retrieve: vi.fn() },
    },
    isFlowershowSubscription: (subscription: any) => {
      if (subscription?.metadata?.platform === FLOWERSHOW_PLATFORM) return true;
      const items = subscription?.items?.data ?? [];
      return items.some((item: any) => KNOWN_PRICE_IDS.has(item?.price?.id));
    },
  };
});

vi.mock('@/server/db', () => ({
  default: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    site: {
      update: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    accountSubscription: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/storage-limits', () => ({
  getSiteStorageBytes: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi
    .fn()
    .mockResolvedValue({ data: { id: 'email-1' }, error: null }),
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

import { removeDomainAndVariantFromVercelProject } from '@/lib/domains';
import { sendEmail } from '@/lib/email';
import { log } from '@/lib/otel-logger';
import { stripe } from '@/lib/stripe';
import { getSiteStorageBytes } from '@/lib/storage-limits';
import prisma from '@/server/db';
import { POST } from './route';

const USER = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  cancelBonusGrantedAt: null as Date | null,
};

function makeDbSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dbsub-1',
    siteId: 'site-1',
    interval: 'month',
    currentPeriodEnd: new Date('2026-08-01T00:00:00Z'),
    cancelAtPeriodEnd: false,
    site: {
      id: 'site-1',
      projectName: 'My Blog',
      userId: USER.id,
      customDomain: null,
      privacyMode: 'PUBLIC',
      user: { ...USER },
    },
    ...overrides,
  };
}

// Mock the DB for a per-site subscription event. The reconciler reads the
// user's sites back after the webhook has written the Subscription row, so the
// site's subscription status is whatever the handler last wrote.
function mockDbSubscription(dbSub: any, site: Record<string, unknown> = {}) {
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue(dbSub);
  vi.mocked(prisma.site.findMany).mockImplementation((async () => {
    const written =
      (vi.mocked(prisma.subscription.update).mock.lastCall?.[0] as any)?.data
        ?.status ??
      (vi.mocked(prisma.subscription.create).mock.lastCall?.[0] as any)?.data
        ?.status ??
      'active';
    return [
      {
        id: dbSub.site.id,
        plan: 'PREMIUM',
        planSource: 'SITE',
        coveredByAccountPlan: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        customDomain: dbSub.site.customDomain ?? null,
        storageAllowanceBytes: dbSub.site.storageAllowanceBytes ?? null,
        subscription: { status: written },
        publishes: [],
        ...site,
      },
    ];
  }) as any);
}

// Serialize the react body of the most recent sendEmail call so we can assert
// on its text content (e.g. that it names the specific site). We inspect the
// element tree rather than rendering it — react-email's layout suspends under
// renderToStaticMarkup, and the site name is a plain string child regardless.
function lastEmailText() {
  const call = vi.mocked(sendEmail).mock.lastCall;
  return JSON.stringify((call![0] as any).react);
}

function fireEvent(event: any) {
  vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event);
  const req = new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: 'raw-body',
  });
  return POST(req);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.subscription.update).mockResolvedValue({} as any);
  vi.mocked(prisma.site.update).mockResolvedValue({} as any);
  vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 } as any);
  vi.mocked(prisma.site.findMany).mockResolvedValue([]);
  vi.mocked(prisma.accountSubscription.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.user.update).mockResolvedValue({} as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER } as any);
  vi.mocked(getSiteStorageBytes).mockResolvedValue(0);
});

describe('stripe webhook — cancellation split', () => {
  function subscriptionEvent(sub: Record<string, unknown>) {
    return {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          cancel_at_period_end: false,
          current_period_start: 1893369600,
          current_period_end: 1893456000,
          // Ownership marker so the shared-account filter recognises this as
          // a Flowershow subscription and processes it.
          metadata: { platform: 'flowershow' },
          items: {
            data: [
              { price: { id: 'price_1', recurring: { interval: 'month' } } },
            ],
          },
          ...sub,
        },
      },
    };
  }

  describe('lapse safety', () => {
    const canceled = () =>
      subscriptionEvent({
        status: 'canceled',
        cancel_at_period_end: false,
        cancellation_details: { reason: 'payment_failure' },
      });

    function dbSubWithSite(site: Record<string, unknown>) {
      const base = makeDbSubscription();
      return makeDbSubscription({ site: { ...base.site, ...site } }) as any;
    }

    it('keeps password protection when the subscription lapses and removes the custom domain', async () => {
      mockDbSubscription(
        dbSubWithSite({
          privacyMode: 'PASSWORD',
          customDomain: 'example.com',
        }),
      );

      await fireEvent(canceled());

      const data = (vi.mocked(prisma.site.updateMany).mock.lastCall![0] as any)
        .data;
      expect(data.plan).toBe('FREE');
      expect(data.customDomain).toBeNull();
      expect(data).not.toHaveProperty('privacyMode');
      expect(data).not.toHaveProperty('accessPasswordHash');
      expect(data).not.toHaveProperty('tokenVersion');
      expect(data).not.toHaveProperty('storageAllowanceBytes');
    });

    it('sets a storage allowance of ceil(total * 1.1) when over the Free cap', async () => {
      mockDbSubscription(dbSubWithSite({ storageAllowanceBytes: null }));
      const total = 300 * 1024 * 1024 + 1;
      vi.mocked(getSiteStorageBytes).mockResolvedValue(total);

      await fireEvent(canceled());

      const data = (vi.mocked(prisma.site.updateMany).mock.lastCall![0] as any)
        .data;
      expect(data.storageAllowanceBytes).toBe(
        BigInt(Math.ceil((total * 11) / 10)),
      );
    });

    it('never lowers an existing larger allowance', async () => {
      const existing = BigInt(900 * 1024 * 1024);
      mockDbSubscription(dbSubWithSite({ storageAllowanceBytes: existing }));
      vi.mocked(getSiteStorageBytes).mockResolvedValue(300 * 1024 * 1024);

      await fireEvent(canceled());

      const data = (vi.mocked(prisma.site.updateMany).mock.lastCall![0] as any)
        .data;
      expect(data.storageAllowanceBytes).toBe(existing);
    });
  });

  it('per-site cancellation keeps MANUAL', async () => {
    const base = makeDbSubscription();
    mockDbSubscription(
      makeDbSubscription({
        site: { ...base.site, customDomain: 'example.com' },
      }),
      { planSource: 'MANUAL' },
    );

    const res = await fireEvent(
      subscriptionEvent({ status: 'canceled', cancel_at_period_end: false }),
    );

    expect(res.status).toBe(200);
    const planWrites = [
      ...vi.mocked(prisma.site.update).mock.calls,
      ...vi.mocked(prisma.site.updateMany).mock.calls,
    ].filter((c) => (c[0] as any).data?.plan === 'FREE');
    expect(planWrites).toEqual([]);
    expect(removeDomainAndVariantFromVercelProject).not.toHaveBeenCalled();
  });

  it('voluntary cancellation sends the downgrade email, not the expiry email', async () => {
    mockDbSubscription(makeDbSubscription({ cancelAtPeriodEnd: false }) as any);

    await fireEvent(
      subscriptionEvent({ status: 'active', cancel_at_period_end: true }),
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your Flowershow subscription has been cancelled',
      }),
    );
  });

  it('involuntary (payment_failure) expiry sends the expired email, not the downgrade email', async () => {
    mockDbSubscription(makeDbSubscription({ cancelAtPeriodEnd: false }) as any);

    const res = await fireEvent(
      subscriptionEvent({
        status: 'canceled',
        cancel_at_period_end: false,
        cancellation_details: { reason: 'payment_failure' },
      }),
    );

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your Flowershow Premium has expired',
      }),
    );
    // The email names the specific site the subscription belonged to.
    expect(lastEmailText()).toContain('My Blog');
    // Site is reverted to FREE.
    expect(prisma.site.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: 'FREE' }),
      }),
    );
  });

  it('voluntary immediate cancellation does NOT send the involuntary expiry email', async () => {
    mockDbSubscription(makeDbSubscription({ cancelAtPeriodEnd: false }) as any);

    await fireEvent(
      subscriptionEvent({
        status: 'canceled',
        cancel_at_period_end: false,
        cancellation_details: { reason: 'cancellation_requested' },
      }),
    );

    const subjects = vi
      .mocked(sendEmail)
      .mock.calls.map((c) => (c[0] as any).subject);
    expect(subjects).not.toContain('Your Flowershow Premium has expired');
  });

  it('passes a stable idempotency key so Resend dedupes redelivered expiry events', async () => {
    mockDbSubscription(makeDbSubscription({ cancelAtPeriodEnd: false }) as any);

    await fireEvent(
      subscriptionEvent({
        status: 'canceled',
        cancel_at_period_end: false,
        cancellation_details: { reason: 'payment_failure' },
      }),
    );

    // Dedup is delegated to Resend via a stable key keyed on the subscription;
    // a redelivered event reuses the key and Resend suppresses the second send.
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your Flowershow Premium has expired',
        idempotencyKey: 'expiry:sub_1',
      }),
    );
  });
});

describe('stripe webhook — annual renewal reminder (invoice.upcoming)', () => {
  function upcomingEvent(interval: string) {
    return {
      type: 'invoice.upcoming',
      data: {
        object: {
          subscription: 'sub_1',
          amount_due: 5000,
          currency: 'usd',
          period_end: 1893456000,
          lines: { data: [{ price: { recurring: { interval } } }] },
        },
      },
    };
  }

  it('sends a reminder for a yearly plan', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      makeDbSubscription({ interval: 'year' }) as any,
    );

    const res = await fireEvent(upcomingEvent('year'));

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: USER.email,
        subject: 'Your Flowershow Premium renews soon',
      }),
    );
    // The reminder names the specific site being renewed.
    expect(lastEmailText()).toContain('My Blog');
  });

  it('sends nothing for a monthly plan', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      makeDbSubscription({ interval: 'month' }) as any,
    );

    const res = await fireEvent(upcomingEvent('month'));

    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

// The Stripe account is shared across products, so the webhook receives
// customer.subscription.* events for subscriptions Flowershow never created.
// Those must be ignored (200, no-op) rather than throwing — throwing makes
// Stripe retry the same event for ~3 days.
describe('stripe webhook — shared-account ownership filtering', () => {
  function subscriptionEvent(sub: Record<string, unknown>) {
    return {
      id: 'evt_sub_1',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_foreign',
          status: 'active',
          cancel_at_period_end: false,
          customer: 'cus_foreign',
          current_period_start: 1893369600,
          current_period_end: 1893456000,
          items: {
            data: [
              {
                price: { id: 'price_other', recurring: { interval: 'month' } },
              },
            ],
          },
          ...sub,
        },
      },
    };
  }

  it('ignores a foreign subscription without touching the DB or throwing', async () => {
    // No metadata.platform and a price id we don't own.
    const res = await fireEvent(subscriptionEvent({}));

    expect(res.status).toBe(200);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'Ignoring non-Flowershow subscription event',
      expect.anything(),
      expect.objectContaining({ reason: 'not_flowershow' }),
    );
  });

  it('treats a subscription tagged metadata.platform=flowershow as ours', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as any);

    const res = await fireEvent(
      subscriptionEvent({ metadata: { platform: 'flowershow' } }),
    );

    expect(res.status).toBe(200);
    // Ownership passed → it did look for the record.
    expect(prisma.subscription.findUnique).toHaveBeenCalled();
  });

  it('treats a known-price subscription as ours (pre-metadata fallback)', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as any);

    const res = await fireEvent(
      subscriptionEvent({
        items: {
          data: [
            {
              price: {
                id: TEST_KNOWN_PRICE_ID,
                recurring: { interval: 'month' },
              },
            },
          ],
        },
      }),
    );

    expect(res.status).toBe(200);
    expect(prisma.subscription.findUnique).toHaveBeenCalled();
  });

  it('no-ops (200 + warn) when a Flowershow subscription is missing in the DB', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as any);

    const res = await fireEvent(
      subscriptionEvent({ metadata: { platform: 'flowershow' } }),
    );

    expect(res.status).toBe(200);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'Flowershow subscription not found in DB; ignoring',
      expect.anything(),
      expect.objectContaining({ reason: 'subscription_not_in_db' }),
    );
  });
});

describe('stripe webhook — checkout.session.completed guards', () => {
  function checkoutEvent(session: Record<string, unknown>) {
    return {
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_1', ...session } },
    };
  }

  it('ignores a foreign checkout session without calling retrieve', async () => {
    const res = await fireEvent(checkoutEvent({ subscription: 'sub_x' }));

    expect(res.status).toBe(200);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'Ignoring non-Flowershow checkout.session.completed',
      expect.anything(),
      expect.objectContaining({ reason: 'not_flowershow' }),
    );
  });

  it('per-site checkout sets SITE', async () => {
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: 'sub_new',
      status: 'active',
      current_period_start: 1893369600,
      current_period_end: 1893456000,
      cancel_at_period_end: false,
      items: {
        data: [{ price: { id: 'price_1', recurring: { interval: 'month' } } }],
      },
    } as any);
    vi.mocked(prisma.subscription.create).mockResolvedValue({} as any);
    mockDbSubscription(makeDbSubscription(), {
      plan: 'FREE',
      planSource: null,
    });
    // The handler looks up the Subscription row for this site before writing.
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.site.findUnique).mockResolvedValue({
      id: 'site-1',
      userId: USER.id,
      user: { ...USER },
    } as any);

    const res = await fireEvent(
      checkoutEvent({
        subscription: 'sub_new',
        metadata: { siteId: 'site-1', platform: 'flowershow' },
      }),
    );

    expect(res.status).toBe(200);
    expect(prisma.site.updateMany).toHaveBeenCalledWith({
      where: { id: 'site-1', plan: 'FREE', planSource: null },
      data: {
        plan: 'PREMIUM',
        planSource: 'SITE',
        coveredByAccountPlan: false,
      },
    });
    // The Subscription row is written before the reconciler reads it.
    expect(
      vi.mocked(prisma.subscription.create).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(prisma.site.updateMany).mock.invocationCallOrder[0]!,
    );
    // No direct plan write.
    expect(prisma.site.update).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "You're now on Flowershow Premium" }),
    );
  });

  it('does not call retrieve(null) when our session has no subscription id', async () => {
    const res = await fireEvent(
      checkoutEvent({
        subscription: null,
        metadata: { siteId: 'site-1', platform: 'flowershow' },
      }),
    );

    expect(res.status).toBe(200);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'Ignoring checkout.session.completed without a subscription id',
      expect.anything(),
      expect.objectContaining({ reason: 'missing_subscription_id' }),
    );
  });
});
