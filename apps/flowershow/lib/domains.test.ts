import { describe, expect, it, vi } from 'vitest';

// lib/domains imports env (used by the Vercel API helpers); stub it so the
// module can be imported in isolation.
vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'production',
    PROJECT_ID_VERCEL: 'prj_test',
    TEAM_ID_VERCEL: 'team_test',
    AUTH_BEARER_TOKEN: 'token_test',
  },
}));

// Must import AFTER mocking
const { isReservedDomain } = await import('./domains');

describe('isReservedDomain', () => {
  it.each([
    'flowershow.me',
    'tom.flowershow.me',
    'my.site.flowershow.me',
    'flowershow.app',
    'docs.flowershow.app',
    'flowershow.site',
    'FlowerShow.ME', // case-insensitive
    'tom.flowershow.me.', // trailing dot (FQDN)
  ])('rejects our own domain: %s', (domain) => {
    expect(isReservedDomain(domain)).toBe(true);
  });

  it.each([
    'example.com',
    'tom.dev',
    'flowershow.example.com', // flowershow is a subdomain label, not ours
    'notflowershow.me', // not the flowershow apex
    'myflowershow.com',
  ])('allows a domain the user owns: %s', (domain) => {
    expect(isReservedDomain(domain)).toBe(false);
  });
});
