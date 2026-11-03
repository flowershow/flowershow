import type { CredentialsConfig } from 'next-auth/providers/credentials';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnv, prismaMock } = vi.hoisted(() => ({
  mockEnv: { env: {} as Record<string, string | undefined> },
  prismaMock: { user: { findUnique: vi.fn() } },
}));

vi.mock('@/env.mjs', () => mockEnv);
vi.mock('@/server/db', () => ({ default: prismaMock }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
  __esModule: true,
}));

import { hashReviewPassword } from '@/lib/review-password';

const REVIEW_EMAIL = 'review@flowershow.app';
const PASSWORD = 'correct horse battery staple';
const reviewUser = {
  id: 'user-review',
  name: 'OpenAI Review',
  username: 'app-review',
  email: REVIEW_EMAIL,
  image: '',
  role: 'USER' as const,
  accounts: [] as { id: string }[],
};

let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashReviewPassword(PASSWORD);
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockImplementation(
    async ({ where }: { where: { email: string } }) =>
      where.email === REVIEW_EMAIL ? reviewUser : null,
  );
});

// authOptions is built when server/auth loads, so each env needs a fresh
// module load: a static import can't exercise the switch.
async function loadAuth(env: Record<string, string | undefined>) {
  mockEnv.env = env;
  vi.resetModules();
  return (await import('@/server/auth')).authOptions;
}

function enabledEnv() {
  return {
    REVIEW_LOGIN_ENABLED: 'true',
    REVIEW_LOGIN_EMAIL: REVIEW_EMAIL,
    REVIEW_LOGIN_PASSWORD_HASH: passwordHash,
  };
}

// NextAuth merges each provider's configured options (id, authorize) over
// its defaults at request time; read the configured ones.
async function reviewProvider(env: Record<string, string | undefined>) {
  const options = await loadAuth(env);
  const configured = options.providers.map(
    (p) => ({ ...p, ...p.options }) as CredentialsConfig,
  );
  return configured.find((p) => p.id === 'review-login');
}

async function authorize(email: string, password: string) {
  const provider = await reviewProvider(enabledEnv());
  if (!provider) throw new Error('review-login provider is not registered');
  return provider.authorize({ email, password }, {});
}

describe('review-account password login', () => {
  it('is not offered while REVIEW_LOGIN_ENABLED is off', async () => {
    await expect(reviewProvider(enabledEnv())).resolves.toBeDefined();
    await expect(
      reviewProvider({ ...enabledEnv(), REVIEW_LOGIN_ENABLED: undefined }),
    ).resolves.toBeUndefined();
  });

  it('signs in the review account with its password', async () => {
    await expect(authorize(REVIEW_EMAIL, PASSWORD)).resolves.toMatchObject({
      id: 'user-review',
      username: 'app-review',
    });
  });

  it('matches the review email regardless of case and surrounding spaces', async () => {
    await expect(
      authorize('  Review@Flowershow.app ', PASSWORD),
    ).resolves.toMatchObject({ id: 'user-review' });
  });

  it('rejects any other email, even with the review password', async () => {
    await expect(
      authorize('someone@example.com', PASSWORD),
    ).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a wrong password', async () => {
    await expect(authorize(REVIEW_EMAIL, `${PASSWORD}!`)).resolves.toBeNull();
    await expect(authorize(REVIEW_EMAIL, '')).resolves.toBeNull();
  });

  it("won't sign in a real account set as the review email by mistake", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...reviewUser,
      accounts: [{ id: 'github-account' }],
    });
    await expect(authorize(REVIEW_EMAIL, PASSWORD)).resolves.toBeNull();
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...reviewUser,
      role: 'ADMIN',
    });
    await expect(authorize(REVIEW_EMAIL, PASSWORD)).resolves.toBeNull();
    // A magic-link user has no Account row either; only the username tells.
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...reviewUser,
      username: 'jane',
    });
    await expect(authorize(REVIEW_EMAIL, PASSWORD)).resolves.toBeNull();
  });

  it('passes the signIn callback, which has no OAuth profile for it', async () => {
    const { callbacks } = await loadAuth(enabledEnv());
    await expect(
      callbacks?.signIn?.({
        user: reviewUser,
        account: {
          provider: 'review-login',
          providerAccountId: 'user-review',
          type: 'credentials',
        },
      }),
    ).resolves.toBe(true);
  });
});
