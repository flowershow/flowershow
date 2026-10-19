import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    account: { findFirst: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    verificationToken: { findFirst: vi.fn() },
  },
}));

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

import { authOptions } from '@/server/auth';

const signIn = authOptions.callbacks!.signIn! as (args: any) => Promise<any>;

function provider(id: string) {
  return authOptions.providers.find((p: any) => p.id === id) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.account.findFirst.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OAuth providers', () => {
  it('enable email linking only on Google and GitHub, not magic link', () => {
    expect(provider('github').options.allowDangerousEmailAccountLinking).toBe(
      true,
    );
    expect(provider('google').options.allowDangerousEmailAccountLinking).toBe(
      true,
    );
    expect(
      provider('email').options?.allowDangerousEmailAccountLinking,
    ).toBeFalsy();
  });

  it('GitHub userinfo only flags verified emails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { email: 'victim@x.com', primary: true, verified: false },
        ],
      }),
    );
    const request = provider('github').options.userinfo.request;
    const profile = await request({
      client: {
        userinfo: async () => ({ id: 1, login: 'mallory', email: null }),
      },
      tokens: { access_token: 't' },
    });
    expect(profile.email).toBeNull();
    expect(profile.email_verified).toBe(false);
  });
});

describe('signIn callback: first sign-in with a provider', () => {
  const account = {
    provider: 'github',
    providerAccountId: '42',
    type: 'oauth',
  };

  it('allows a brand-new user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(
      signIn({
        user: { email: 'ola@x.com' },
        account,
        profile: { email_verified: true },
      }),
    ).resolves.toBe(true);
  });

  it('allows linking Google-first user when GitHub email is verified', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: null,
      accounts: [{ provider: 'google' }],
    });
    await expect(
      signIn({
        user: { email: 'ola@x.com' },
        account,
        profile: { email_verified: true },
      }),
    ).resolves.toBe(true);
  });

  it('redirects with the original method when the email is unverified', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: null,
      accounts: [{ provider: 'google' }],
    });
    await expect(
      signIn({
        user: { email: 'ola@x.com' },
        account,
        profile: { email_verified: false },
      }),
    ).resolves.toBe('/login?error=OAuthAccountNotLinked&method=google');
  });

  it('refuses to link into an existing user whose email is untrusted', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      emailVerified: null,
      accounts: [{ provider: 'github' }],
    });
    await expect(
      signIn({
        user: { email: 'ola@x.com' },
        account: { ...account, provider: 'google' },
        profile: { email_verified: true },
      }),
    ).resolves.toBe('/login?error=OAuthAccountNotLinked&method=github');
  });

  it('lets magic-link sign-ins through untouched', async () => {
    await expect(
      signIn({ user: { email: 'ola@x.com' }, account: { provider: 'email' } }),
    ).resolves.toBe(true);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
