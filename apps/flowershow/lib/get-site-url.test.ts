import { describe, expect, it, vi } from 'vitest';

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
  user: { username: 'johndoe' },
};

describe('getSiteUrl', () => {
  it('returns subdomain URL for a site with no custom domain', () => {
    expect(getSiteUrl(baseSite)).toBe('https://garden-johndoe.flowershow.site');
  });

  it('returns custom domain URL whenever a custom domain is set', () => {
    expect(
      getSiteUrl({
        ...baseSite,
        customDomain: 'my.custom.com',
      }),
    ).toBe('https://my.custom.com');
  });
});
