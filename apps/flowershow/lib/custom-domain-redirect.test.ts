import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
const { getDomainResponse, getConfigResponse } = vi.hoisted(() => ({
  getDomainResponse: vi.fn(),
  getConfigResponse: vi.fn(),
}));
vi.mock('@/lib/domains', () => ({ getDomainResponse, getConfigResponse }));

import { env } from '@/env.mjs';
import { customDomainRedirect } from './custom-domain-redirect';

const mutableEnv = env as unknown as Record<string, string>;
const originalEnv = { ...mutableEnv };
const site = { customDomain: 'docs.example.com' };

function vercelSays(domain: object, config: object) {
  getDomainResponse.mockResolvedValue(domain);
  getConfigResponse.mockResolvedValue(config);
}

beforeEach(() => {
  mutableEnv.NEXT_PUBLIC_VERCEL_ENV = 'production';
});
afterEach(() => {
  Object.assign(mutableEnv, originalEnv);
  vi.resetAllMocks();
});

describe('customDomainRedirect', () => {
  it('redirects once the domain is verified and its DNS points at us', async () => {
    vercelSays({ verified: true }, { misconfigured: false });
    await expect(customDomainRedirect('alice', site)).resolves.toBe(
      'https://docs.example.com',
    );
  });

  it.each([
    ['DNS not pointing at us yet', { verified: true }, { misconfigured: true }],
    ['domain not verified', { verified: false }, { misconfigured: false }],
    [
      'domain missing from the project',
      { error: { code: 'not_found', message: 'x' } },
      { misconfigured: true },
    ],
    [
      'Vercel API error',
      { verified: true },
      { error: { code: 'rate_limited' } },
    ],
  ])('serves the site on its subdomain when %s', async (_, domain, config) => {
    vercelSays(domain, config);
    await expect(customDomainRedirect('alice', site)).resolves.toBeNull();
  });

  it('serves the site on its subdomain when Vercel is unreachable', async () => {
    getDomainResponse.mockRejectedValue(new Error('fetch failed'));
    getConfigResponse.mockResolvedValue({ misconfigured: false });
    await expect(customDomainRedirect('alice', site)).resolves.toBeNull();
  });

  it('never redirects on the custom domain itself, anonymous sites, or sites without one', async () => {
    vercelSays({ verified: true }, { misconfigured: false });
    await expect(customDomainRedirect('_domain', site)).resolves.toBeNull();
    await expect(customDomainRedirect('anon', site)).resolves.toBeNull();
    await expect(
      customDomainRedirect('alice', { customDomain: null }),
    ).resolves.toBeNull();
  });

  it('redirects without asking Vercel outside production, where domains are never provisioned', async () => {
    mutableEnv.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    await expect(customDomainRedirect('alice', site)).resolves.toBe(
      'https://docs.example.com',
    );
    expect(getDomainResponse).not.toHaveBeenCalled();
  });
});
