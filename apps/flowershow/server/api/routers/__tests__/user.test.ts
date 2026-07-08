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
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
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

// ── Imports ───────────────────────────────────────────────────────

import { appRouter } from '@/server/api/root';
import { sendTransactionalEmail } from '@/lib/transactional-email';

// ── Helpers ───────────────────────────────────────────────────────

function makeDb(user: unknown) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
}

function createCaller(db: unknown) {
  return appRouter.createCaller({
    session: { user: { id: 'user-1' }, expires: '' } as any,
    db: db as any,
    headers: new Headers(),
  });
}

const USER = {
  username: 'ada',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  sites: [] as unknown[],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('user.deleteAccount', () => {
  it('sends the account-deletion confirmation to the right address after deleting', async () => {
    const db = makeDb(USER);
    const caller = createCaller(db);

    const result = await caller.user.deleteAccount({ confirm: 'ada' });

    expect(result).toEqual({ success: true });
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        type: 'account_deleted',
        idempotencyKey: 'account-deleted:user-1',
      }),
    );
  });

  it('does not delete or email when the confirmation does not match the username', async () => {
    const db = makeDb(USER);
    const caller = createCaller(db);

    await expect(
      caller.user.deleteAccount({ confirm: 'wrong' }),
    ).rejects.toThrow('Confirmation does not match username');

    expect(db.user.delete).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('blocks deletion (and sends nothing) when a site has an active subscription', async () => {
    const db = makeDb({
      ...USER,
      sites: [
        {
          id: 's1',
          projectName: 'my-site',
          subscription: { status: 'active' },
        },
      ],
    });
    const caller = createCaller(db);

    await expect(caller.user.deleteAccount({ confirm: 'ada' })).rejects.toThrow(
      /active subscription/,
    );

    expect(db.user.delete).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
