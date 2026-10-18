import { describe, expect, it } from 'vitest';
import { resolveConfigRedirect } from './config-redirect';

// Every site is served from the root of its own host: a *.flowershow.me
// subdomain or a custom domain. Legacy path-based URLs
// (my.flowershow.app/@user/site/...) are 301'd to the subdomain by the
// middleware before the page renders. So a config.json redirect target is
// used as-is on every host and never gets a /@user/site prefix
// (flowershow-7bv).
const redirects = [
  { from: '/publish', to: '/cli' },
  { from: 'ai', to: '/publish-with-ai', permanent: true },
  { from: '/old', to: 'https://example.com/new' },
];

describe('resolveConfigRedirect', () => {
  it('subdomain site (*.flowershow.me): target has no /@user/site prefix', () => {
    expect(resolveConfigRedirect(redirects, '/publish')).toEqual({
      url: '/cli',
      permanent: false,
    });
  });

  it('custom domain site: target is used as-is', () => {
    expect(resolveConfigRedirect(redirects, '/ai')).toEqual({
      url: '/publish-with-ai',
      permanent: true,
    });
  });

  it('legacy path-based URL (reaches the page via the subdomain): no prefix', () => {
    const url = resolveConfigRedirect(redirects, '/publish')?.url;
    expect(url).not.toMatch(/^\/@/);
    expect(url).toBe('/cli');
  });

  it('keeps absolute external targets unchanged', () => {
    expect(resolveConfigRedirect(redirects, '/old')?.url).toBe(
      'https://example.com/new',
    );
  });

  it('matches `from` with or without a leading slash', () => {
    expect(resolveConfigRedirect(redirects, '/ai')).not.toBeNull();
  });

  it('returns null when nothing matches or no redirects are configured', () => {
    expect(resolveConfigRedirect(redirects, '/other')).toBeNull();
    expect(resolveConfigRedirect(undefined, '/publish')).toBeNull();
  });
});
