import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted).

vi.mock('next/headers', () => ({
  headers: () => ({ get: () => 'test-signature' }),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  },
}));

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
  SeverityNumber: { ERROR: 17 },
}));

import { sendEmail } from '@/lib/email';
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
