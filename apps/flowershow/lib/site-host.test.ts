import { afterEach, describe, expect, it } from 'vitest';
import { env } from '@/env.mjs';
import {
  getSiteOwnOrigin,
  isAppHost,
  isSiteOwnHost,
  normalizeHost,
  redirectToSiteOwnHost,
} from './site-host';

// Test env (vitest.setup.ts): SITE_DOMAIN = ROOT_DOMAIN = HOME_DOMAIN =
// test.localhost, CLOUD_DOMAIN = cloud.test.localhost.
const site = { subdomain: 'notes-alice', customDomain: 'docs.example.com' };
const mutableEnv = env as unknown as Record<string, string>;
const originalEnv = { ...mutableEnv };

afterEach(() => {
  Object.assign(mutableEnv, originalEnv);
});

describe('normalizeHost', () => {
  it.each([
    ['Example.COM', 'example.com'],
    ['example.com.', 'example.com'],
    ['  example.com ', 'example.com'],
    ['localhost:3000', 'localhost:3000'],
    [null, ''],
    [undefined, ''],
  ])('%s → %s', (input, expected) => {
    expect(normalizeHost(input)).toBe(expected);
  });
});

describe('isAppHost', () => {
  it.each(['test.localhost', 'cloud.test.localhost', 'Cloud.Test.Localhost.'])(
    'treats %s as an app host',
    (h) => expect(isAppHost(h)).toBe(true),
  );

  it.each(['notes-alice.test.localhost', 'docs.example.com', '', null])(
    'does not treat %s as an app host',
    (h) => expect(isAppHost(h)).toBe(false),
  );
});

describe('isSiteOwnHost', () => {
  it.each([
    ['subdomain host', 'notes-alice.test.localhost'],
    ['custom domain', 'docs.example.com'],
    ['custom domain, mixed case', 'Docs.Example.Com'],
    ['subdomain host with trailing dot', 'notes-alice.test.localhost.'],
    ['custom domain with trailing dot', 'docs.example.com.'],
  ])('accepts the %s', (_label, host) => {
    expect(isSiteOwnHost(host, site)).toBe(true);
  });

  it.each([
    ['another site subdomain', 'notes-bob.test.localhost'],
    ['another custom domain', 'other.example.com'],
    ['subdomain host with a port', 'notes-alice.test.localhost:443'],
    ['custom domain with a port', 'docs.example.com:443'],
    ['dashboard host', 'cloud.test.localhost'],
    ['bare site domain', 'test.localhost'],
    ['www variant of custom domain', 'www.docs.example.com'],
    ['empty host', ''],
    ['missing host', null],
  ])('rejects the %s', (_label, host) => {
    expect(isSiteOwnHost(host, site)).toBe(false);
  });

  it('accepts a Flowershow-owned site on the home domain', () => {
    mutableEnv.NEXT_PUBLIC_HOME_DOMAIN = 'flowershow.app';
    const s = {
      subdomain: 'flowershow-app-olayway',
      customDomain: 'flowershow.app',
    };
    expect(isSiteOwnHost('flowershow.app', s)).toBe(true);
    expect(isSiteOwnHost('product.flowershow.app', s)).toBe(false);
    expect(isSiteOwnHost('cloud.flowershow.app', s)).toBe(false);
  });

  it('rejects an app host for a site that does not own it', () => {
    const s = { subdomain: 'notes-alice', customDomain: 'docs.example.com' };
    expect(isSiteOwnHost('cloud.test.localhost', s)).toBe(false);
  });

  it('rejects any host when the subdomain is empty and there is no custom domain', () => {
    const s = { subdomain: '', customDomain: null };
    expect(isSiteOwnHost('test.localhost', s)).toBe(false);
    expect(isSiteOwnHost('.test.localhost', s)).toBe(false);
  });

  it('rejects a subdomain host that collides with an app host', () => {
    const s = { subdomain: 'cloud', customDomain: null };
    expect(isSiteOwnHost('cloud.test.localhost', s)).toBe(false);
  });

  it('matches dev hosts that carry a port', () => {
    mutableEnv.NEXT_PUBLIC_SITE_DOMAIN = 'localhost:3000';
    mutableEnv.NEXT_PUBLIC_ROOT_DOMAIN = 'localhost:3000';
    mutableEnv.NEXT_PUBLIC_HOME_DOMAIN = 'localhost:3000';
    mutableEnv.NEXT_PUBLIC_CLOUD_DOMAIN = 'cloud.localhost:3000';
    const s = {
      subdomain: 'notes-alice',
      customDomain: 'e2e.flowershow.local:3000',
    };
    expect(isSiteOwnHost('notes-alice.localhost:3000', s)).toBe(true);
    expect(isSiteOwnHost('e2e.flowershow.local:3000', s)).toBe(true);
    expect(isSiteOwnHost('notes-alice.localhost', s)).toBe(false);
    expect(isSiteOwnHost('cloud.localhost:3000', s)).toBe(false);
  });
});

describe('getSiteOwnOrigin', () => {
  it('prefers the custom domain', () => {
    expect(getSiteOwnOrigin(site)).toBe('http://docs.example.com');
  });

  it('falls back to the subdomain host', () => {
    expect(getSiteOwnOrigin({ ...site, customDomain: null })).toBe(
      'http://notes-alice.test.localhost',
    );
  });

  it('uses a custom domain on a Flowershow domain (own sites)', () => {
    expect(
      getSiteOwnOrigin({ ...site, customDomain: 'product.test.localhost' }),
    ).toBe('http://product.test.localhost');
  });

  it('uses https in production', () => {
    mutableEnv.NEXT_PUBLIC_VERCEL_ENV = 'production';
    expect(getSiteOwnOrigin(site)).toBe('https://docs.example.com');
  });

  it('returns null when the site has no usable own host', () => {
    expect(getSiteOwnOrigin({ subdomain: 'cloud', customDomain: null })).toBe(
      null,
    );
  });
});

describe('redirectToSiteOwnHost', () => {
  it('redirects to the path on the own origin', () => {
    const res = redirectToSiteOwnHost(site, '/a/b.html?x=1');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'http://docs.example.com/a/b.html?x=1',
    );
  });

  it('404s when there is no usable own host', () => {
    const res = redirectToSiteOwnHost(
      { subdomain: 'cloud', customDomain: null },
      '/x.html',
    );
    expect(res.status).toBe(404);
  });
});
