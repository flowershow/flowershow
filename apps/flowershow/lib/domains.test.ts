import { describe, expect, it, vi } from 'vitest';

// isReservedDomain derives the blocked domains from these two config values
// (SITE_DOMAIN = where user subdomains live, HOME_DOMAIN = marketing/docs).
vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_SITE_DOMAIN: 'flowershow.me',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
  },
}));

// Must import AFTER mocking
const { isReservedDomain } = await import('./domains');

describe('isReservedDomain', () => {
  it.each([
    'flowershow.me', // SITE_DOMAIN apex
    'tom.flowershow.me', // subdomain of SITE_DOMAIN
    'my.site.flowershow.me', // deep subdomain of SITE_DOMAIN
    'flowershow.app', // HOME_DOMAIN apex
    'docs.flowershow.me', // subdomain of HOME_DOMAIN
    'FlowerShow.ME', // case-insensitive
    'tom.flowershow.me.', // trailing dot (FQDN)
  ])('rejects our own domain: %s', (domain) => {
    expect(isReservedDomain(domain)).toBe(true);
  });

  it.each([
    'example.com',
    'tom.dev',
    'flowershow.org', // a different TLD we don't operate
    'flowershow.site', // not one of the configured base domains
    'flowershow.example.com', // flowershow is a subdomain label, not ours
    'notflowershow.me', // not the SITE_DOMAIN apex
    'myflowershow.com',
  ])('allows a domain the user owns: %s', (domain) => {
    expect(isReservedDomain(domain)).toBe(false);
  });
});
