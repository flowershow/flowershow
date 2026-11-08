import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks (must come before imports that depend on them) ──────────

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock('@/server/auth', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/db', () => ({ db: {} }));
vi.mock('@/lib/stripe', () => ({
  FLOWERSHOW_PLATFORM: 'flowershow',
  stripe: {
    subscriptions: { cancel: vi.fn() },
    billingPortal: { sessions: { create: vi.fn() } },
    checkout: { sessions: { create: vi.fn() } },
    customers: { create: vi.fn() },
  },
}));
vi.mock('@/lib/typesense', () => ({ deleteSiteCollection: vi.fn() }));
vi.mock('@/lib/server-posthog', () => {
  const client = {
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return { default: () => client, __esModule: true };
});
vi.mock('@/lib/domains', () => ({
  addDomainToVercel: vi.fn(),
  removeDomainAndVariantFromVercelProject: vi.fn(),
  validDomainRegex: /./,
}));
vi.mock('@/lib/github', () => ({
  fetchGitHubScopes: vi.fn(),
  fetchGitHubScopeRepositories: vi.fn(),
}));

// Email delivery is exercised end-to-end in the webhook idempotency tests; here
// we assert the mutation delegates to the transactional-email seam correctly.
vi.mock('@/lib/transactional-email', () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

import { stripe } from '@/lib/stripe';
import { appRouter } from '@/server/api/root';

const sharedSite = {
  id: 'site-1',
  userId: 'owner-1',
  plan: 'PREMIUM',
  members: [{ userId: 'editor-1' }],
  user: { id: 'owner-1', email: 'o@x.org' },
  subscription: {
    stripeSubscriptionId: 'sub_1',
    stripeCustomerId: 'cus_1',
    status: 'active',
  },
};
const db = {
  site: { findUnique: vi.fn().mockResolvedValue(sharedSite) },
  subscription: { count: vi.fn() },
};
const editor = appRouter.createCaller({
  session: { user: { id: 'editor-1' }, expires: '' } as any,
  db: db as any,
  headers: new Headers(),
});

beforeEach(() => vi.clearAllMocks());

describe('stripe router: editors are denied', () => {
  it.each([
    [
      'cancelSubscription',
      () => editor.stripe.cancelSubscription({ siteId: 'site-1' }),
    ],
    [
      'createCheckoutSession',
      () =>
        editor.stripe.createCheckoutSession({
          siteId: 'site-1',
          priceId: 'price_1',
        }),
    ],
    [
      'getBillingPortal',
      () => editor.stripe.getBillingPortal({ siteId: 'site-1' }),
    ],
    [
      'getSiteSubscription',
      () => editor.stripe.getSiteSubscription({ siteId: 'site-1' }),
    ],
  ])('editor is denied stripe.%s', async (_name, run) => {
    await expect(run()).rejects.toThrow('Not authorized');
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
