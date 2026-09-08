import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizeSiteConfig, validateConfigPatch } from './site-config-schema';

describe('validateConfigPatch — accepts valid patches', () => {
  it('accepts an empty patch', () => {
    expect(() => validateConfigPatch({})).not.toThrow();
  });

  it('accepts well-formed scalar fields', () => {
    expect(() =>
      validateConfigPatch({
        siteName: 'Brand',
        description: 'A site',
        analytics: 'UA-1',
        syntaxMode: 'md',
        showToc: true,
        enableRss: false,
      }),
    ).not.toThrow();
  });

  it('accepts the deprecated `title` field', () => {
    expect(() => validateConfigPatch({ title: 'Old Brand' })).not.toThrow();
  });

  it('accepts well-formed nested objects', () => {
    expect(() =>
      validateConfigPatch({
        nav: {
          title: 'Nav',
          links: [{ name: 'Home', href: '/' }],
          logo: '/logo.png',
          cta: { name: 'Sign up', href: '/signup' },
        },
        sidebar: { orderBy: 'title', paths: ['a/', 'b/'] },
        footer: {
          navigation: [
            { title: 'Docs', links: [{ name: 'Guide', href: '/docs' }] },
          ],
        },
        redirects: [{ from: '/old', to: '/new', permanent: true }],
        contentInclude: ['posts/'],
      }),
    ).not.toThrow();
  });

  // --- polymorphic / deprecated landmines ---

  it('accepts umami in both the string and object forms', () => {
    expect(() => validateConfigPatch({ umami: 'website-id' })).not.toThrow();
    expect(() =>
      validateConfigPatch({ umami: { websiteId: 'w', src: 'https://u.io' } }),
    ).not.toThrow();
  });

  it('accepts theme in both the string and object forms', () => {
    expect(() => validateConfigPatch({ theme: 'forest' })).not.toThrow();
    expect(() =>
      validateConfigPatch({
        theme: { theme: 'dark', defaultMode: 'system', showModeSwitch: true },
      }),
    ).not.toThrow();
  });

  it('accepts hero in both the boolean and object forms', () => {
    expect(() => validateConfigPatch({ hero: true })).not.toThrow();
    expect(() =>
      validateConfigPatch({
        hero: {
          title: 'Hi',
          cta: [{ href: '/x', label: 'Go' }],
          imagelayout: 'full',
        },
      }),
    ).not.toThrow();
  });

  it('accepts nav.links as a dropdown (union) entry', () => {
    expect(() =>
      validateConfigPatch({
        nav: {
          links: [
            { name: 'Home', href: '/' },
            { name: 'More', links: [{ name: 'Blog', href: '/blog' }] },
          ],
        },
      }),
    ).not.toThrow();
  });
});

describe('validateConfigPatch — allows clearing via null/undefined', () => {
  it('allows clearing a scalar field with null', () => {
    expect(() => validateConfigPatch({ description: null })).not.toThrow();
    expect(() => validateConfigPatch({ analytics: null })).not.toThrow();
  });

  it('allows clearing a nested field with null (nav.title)', () => {
    expect(() => validateConfigPatch({ nav: { title: null } })).not.toThrow();
  });

  it('allows clearing footer.navigation with null', () => {
    expect(() =>
      validateConfigPatch({ footer: { navigation: null } }),
    ).not.toThrow();
  });

  it('allows the umami { src: null } partial patch (dashboard clears src)', () => {
    expect(() => validateConfigPatch({ umami: { src: null } })).not.toThrow();
  });

  it('allows clearing a nested media field with null (image-upload-form)', () => {
    expect(() => validateConfigPatch({ favicon: null })).not.toThrow();
    expect(() => validateConfigPatch({ nav: { logo: null } })).not.toThrow();
  });
});

describe('validateConfigPatch — rejects bad shapes', () => {
  it('rejects a wrong-typed scalar', () => {
    expect(() => validateConfigPatch({ showToc: 'yes' })).toThrow();
    expect(() => validateConfigPatch({ siteName: 123 })).toThrow();
  });

  it('rejects an invalid enum value', () => {
    expect(() => validateConfigPatch({ syntaxMode: 'xml' })).toThrow();
  });

  it('rejects a flat list of links in footer.navigation', () => {
    // The exact shape that 500'd portais-cyan-quoisee.flowershow.me.
    expect(() =>
      validateConfigPatch({
        footer: {
          navigation: [
            { href: '/blog', name: 'Blog' },
            { href: '/about', name: 'About' },
          ],
        },
      }),
    ).toThrow(/footer/i);
  });

  it('rejects a footer group missing its links array', () => {
    expect(() =>
      validateConfigPatch({
        footer: { navigation: [{ title: 'Broken' }] },
      }),
    ).toThrow(/links/i);
  });

  it('rejects footer.navigation that is not an array', () => {
    expect(() =>
      validateConfigPatch({
        footer: { navigation: { title: 'Docs', links: [] } },
      }),
    ).toThrow();
  });

  it('rejects a malformed social list', () => {
    expect(() => validateConfigPatch({ social: [{ name: 'X' }] })).toThrow();
  });

  it('rejects a malformed redirects list', () => {
    expect(() =>
      validateConfigPatch({ redirects: [{ from: '/old' }] }),
    ).toThrow();
  });

  it('rejects a wrong-typed umami', () => {
    expect(() => validateConfigPatch({ umami: 123 })).toThrow();
  });
});

describe('validateConfigPatch — rejects unknown keys', () => {
  it('rejects an unknown top-level key', () => {
    expect(() => validateConfigPatch({ bogusKey: 'x' })).toThrow(/bogusKey/i);
  });

  it('rejects an unknown nested key in a modeled object', () => {
    expect(() => validateConfigPatch({ nav: { bogusNavKey: 'x' } })).toThrow();
  });
});

describe('sanitizeSiteConfig — never throws', () => {
  it('returns an empty object for non-object input', () => {
    expect(sanitizeSiteConfig(null)).toEqual({});
    expect(sanitizeSiteConfig(undefined)).toEqual({});
    expect(sanitizeSiteConfig('garbage')).toEqual({});
    expect(sanitizeSiteConfig(42)).toEqual({});
    expect(sanitizeSiteConfig([{ nope: true }])).toEqual({});
  });

  it('returns a well-formed config unchanged', () => {
    const config = {
      siteName: 'Brand',
      description: 'A site',
      showToc: true,
      nav: { title: 'Nav', links: [{ name: 'Home', href: '/' }] },
      footer: {
        navigation: [
          { title: 'Docs', links: [{ name: 'Guide', href: '/docs' }] },
        ],
      },
      social: [{ name: 'X', href: 'https://x.com' }],
    };
    expect(sanitizeSiteConfig(config)).toEqual(config);
  });
});

describe('sanitizeSiteConfig — drops malformed scalar/object fields wholesale', () => {
  it('drops a wrong-typed scalar but keeps valid siblings', () => {
    const result = sanitizeSiteConfig({
      siteName: 123,
      description: 'kept',
    });
    expect(result).toEqual({ description: 'kept' });
  });

  it('drops a malformed giscus/umami/sidebar/theme/hero wholesale', () => {
    const result = sanitizeSiteConfig({
      giscus: 'not-an-object',
      umami: 123,
      sidebar: 'nope',
      theme: 42,
      hero: 'yes-please',
      siteName: 'kept',
    });
    expect(result).toEqual({ siteName: 'kept' });
  });

  it('keeps polymorphic valid forms (umami string, theme string, hero boolean, nav dropdown)', () => {
    const result = sanitizeSiteConfig({
      umami: 'website-id',
      theme: 'forest',
      hero: true,
      nav: {
        links: [
          { name: 'Home', href: '/' },
          { name: 'More', links: [{ name: 'Blog', href: '/blog' }] },
        ],
      },
    });
    expect(result).toEqual({
      umami: 'website-id',
      theme: 'forest',
      hero: true,
      nav: {
        links: [
          { name: 'Home', href: '/' },
          { name: 'More', links: [{ name: 'Blog', href: '/blog' }] },
        ],
      },
    });
  });
});

describe('sanitizeSiteConfig — salvages valid list elements', () => {
  it('drops only the bad group in footer.navigation', () => {
    const result = sanitizeSiteConfig({
      footer: {
        navigation: [
          { title: 'Docs', links: [{ name: 'Guide', href: '/docs' }] },
          { title: 'Broken' }, // no links array
          { name: 'Blog', href: '/blog' }, // flat link, not a group
        ],
      },
    });
    expect(result.footer?.navigation).toEqual([
      { title: 'Docs', links: [{ name: 'Guide', href: '/docs' }] },
    ]);
  });

  it('drops only the bad entries in nav.links, nav.social, social and redirects', () => {
    const result = sanitizeSiteConfig({
      nav: {
        links: [{ name: 'Home', href: '/' }, { href: '/no-name' }],
        social: [{ name: 'X', href: 'https://x.com' }, { name: 'bad' }],
      },
      social: [{ name: 'GH', href: 'https://gh.com' }, 'nope'],
      redirects: [
        { from: '/a', to: '/b' },
        { from: '/broken' }, // no `to`
      ],
    });
    expect(result.nav?.links).toEqual([{ name: 'Home', href: '/' }]);
    expect(result.nav?.social).toEqual([{ name: 'X', href: 'https://x.com' }]);
    expect(result.social).toEqual([{ name: 'GH', href: 'https://gh.com' }]);
    expect(result.redirects).toEqual([{ from: '/a', to: '/b' }]);
  });

  it('drops a list field wholesale when it is not an array', () => {
    const result = sanitizeSiteConfig({
      social: { name: 'X', href: 'https://x.com' },
      siteName: 'kept',
    });
    expect(result).toEqual({ siteName: 'kept' });
  });
});

describe('sanitizeSiteConfig — unknown keys and warnings', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes unknown keys through untouched', () => {
    const result = sanitizeSiteConfig({
      futureFeature: { enabled: true },
      siteName: 'Brand',
    });
    expect(result).toEqual({
      futureFeature: { enabled: true },
      siteName: 'Brand',
    });
  });

  it('warns with the siteId and field path on every drop', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sanitizeSiteConfig(
      { siteName: 123, footer: { navigation: [{ title: 'Broken' }] } },
      { siteId: 'site_abc' },
    );
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('siteName'))).toBe(true);
    expect(messages.some((m) => m.includes('footer.navigation'))).toBe(true);
    expect(messages.every((m) => m.includes('site_abc'))).toBe(true);
  });

  it('does not warn for a clean config', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sanitizeSiteConfig({ siteName: 'Brand', showToc: true });
    expect(warn).not.toHaveBeenCalled();
  });
});
