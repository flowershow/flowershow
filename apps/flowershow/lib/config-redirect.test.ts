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

const urlFor = (
  slug: string,
  rules: Parameters<typeof resolveConfigRedirect>[0],
) => resolveConfigRedirect(rules, slug)?.url ?? null;

describe('resolveConfigRedirect with folder wildcards', () => {
  it('matches exact paths only when `from` has no wildcard', () => {
    const rules = [{ from: '/old', to: '/new' }];
    expect(urlFor('/old/page', rules)).toBeNull();
    expect(urlFor('/older', rules)).toBeNull();
  });

  it('carries the rest of the path into :splat, including nested folders', () => {
    const rules = [
      { from: '/markdown/*', to: 'https://wayofmarkdown.com/:splat' },
    ];
    expect(urlFor('/markdown/kb/turndown', rules)).toBe(
      'https://wayofmarkdown.com/kb/turndown',
    );
    expect(urlFor('/markdown/learn/howtos/a', rules)).toBe(
      'https://wayofmarkdown.com/learn/howtos/a',
    );
  });

  it('matches the bare folder without leaving a trailing slash', () => {
    expect(
      urlFor('/markdown', [
        { from: '/markdown/*', to: 'https://wayofmarkdown.com/:splat' },
      ]),
    ).toBe('https://wayofmarkdown.com');
    expect(urlFor('/old', [{ from: '/old/*', to: '/new/:splat' }])).toBe(
      '/new',
    );
    expect(urlFor('/old', [{ from: '/old/*', to: '/:splat' }])).toBe('/');
  });

  it('does not match a sibling that shares the prefix', () => {
    expect(
      urlFor('/markdownx', [{ from: '/markdown/*', to: '/x/:splat' }]),
    ).toBeNull();
  });

  it('redirects a whole folder to one page when `to` has no :splat', () => {
    expect(urlFor('/old/a/b', [{ from: '/old/*', to: '/archive' }])).toBe(
      '/archive',
    );
  });

  it('uses the first matching rule, so specific rules go above wildcards', () => {
    const rules = [
      { from: '/markdown/kb/apple-notes', to: '/apple' },
      { from: '/markdown/*', to: '/md/:splat' },
      { from: '/markdown/kb/google-docs', to: '/never' },
    ];
    expect(urlFor('/markdown/kb/apple-notes', rules)).toBe('/apple');
    expect(urlFor('/markdown/kb/google-docs', rules)).toBe(
      '/md/kb/google-docs',
    );
  });

  it('supports a site-wide `/*` rule', () => {
    const rules = [{ from: '/*', to: 'https://new.example.com/:splat' }];
    expect(urlFor('/', rules)).toBe('https://new.example.com');
    expect(urlFor('/a/b', rules)).toBe('https://new.example.com/a/b');
  });

  it('never turns a relative target into a protocol-relative URL', () => {
    const rules = [{ from: '/old/*', to: '/:splat' }];
    expect(urlFor('/old//evil.com', rules)).toBe('/evil.com');
    expect(urlFor('/old/\\evil.com', rules)).toBe('/evil.com');
  });
});
