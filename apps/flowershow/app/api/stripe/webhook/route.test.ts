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
    site: { update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
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

import { sendEmail } from '@/lib/email';
import { log } from '@/lib/otel-logger';
import { stripe } from '@/lib/stripe';
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
  vi.mocked(prisma.user.update).mockResolvedValue({} as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER } as any);
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

  it('voluntary cancellation sends the downgrade email, not the expiry email', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      makeDbSubscription({ cancelAtPeriodEnd: false }) as any,
    );

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
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      makeDbSubscription({ cancelAtPeriodEnd: false }) as any,
    );

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
    expect(prisma.site.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: 'FREE' }),
      }),
    );
  });

  it('voluntary immediate cancellation does NOT send the involuntary expiry email', async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      makeDbSubscription({ cancelAtPeriodEnd: false }) as any,
    );

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
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(
      makeDbSubscription({ cancelAtPeriodEnd: false }) as any,
    );

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
