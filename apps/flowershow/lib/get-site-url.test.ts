import { describe, it, expect, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'production',
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.site',
    NEXT_PUBLIC_ROOT_DOMAIN: 'my.flowershow.app',
  },
}));

// Must import AFTER mocking
const { getSiteUrl } = await import('./get-site-url');

const baseSite = {
  projectName: 'garden',
  customDomain: null,
  subdomain: 'garden-johndoe',
  plan: 'FREE' as const,
  user: { username: 'johndoe' },
};

describe('getSiteUrl', () => {
  it('returns subdomain URL for a site with a subdomain', () => {
    expect(getSiteUrl(baseSite)).toBe('https://garden-johndoe.flowershow.site');
  });

  it('returns custom domain URL when site has custom domain and PREMIUM plan', () => {
    expect(
      getSiteUrl({
        ...baseSite,
        customDomain: 'my.custom.com',
        plan: 'PREMIUM',
      }),
    ).toBe('https://my.custom.com');
  });

  it('falls back to my.flowershow.app path when no subdomain', () => {
    expect(getSiteUrl({ ...baseSite, subdomain: null })).toBe(
      'https://my.flowershow.app/@johndoe/garden',
    );
  });
});
