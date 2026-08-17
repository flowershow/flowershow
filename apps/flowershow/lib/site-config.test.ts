import { describe, expect, it } from 'vitest';
import {
  buildPageTitle,
  resolveSiteConfig,
  resolveSiteName,
  validateConfigPatch,
} from './site-config';

describe('resolveSiteConfig', () => {
  it('returns empty object when all inputs are null', () => {
    expect(resolveSiteConfig(null, null)).toEqual({});
  });

  it('returns dbConfig when fileConfig is null', () => {
    const db = { title: 'From DB', showToc: true };
    expect(resolveSiteConfig(db, null)).toEqual({
      title: 'From DB',
      showToc: true,
    });
  });

  it('returns fileConfig when dbConfig is null', () => {
    const file = { title: 'From File', showToc: false };
    expect(resolveSiteConfig(null, file)).toEqual({
      title: 'From File',
      showToc: false,
    });
  });

  it('fileConfig scalar fields override dbConfig', () => {
    const db = { title: 'DB Title', showToc: true };
    const file = { title: 'File Title' };
    const result = resolveSiteConfig(db, file);
    expect(result.title).toBe('File Title');
    expect(result.showToc).toBe(true); // DB value preserved when file doesn't set it
  });

  it('deep merges nested objects: fileConfig.nav overrides dbConfig.nav keys', () => {
    const db = { nav: { title: 'DB Nav Title', logo: '/logo.png' } };
    const file = { nav: { title: 'File Nav Title' } };
    const result = resolveSiteConfig(db, file);
    expect(result.nav?.title).toBe('File Nav Title');
    expect(result.nav?.logo).toBe('/logo.png'); // DB key preserved when file doesn't set it
  });

  it('deep merges theme objects', () => {
    const db = {
      theme: {
        theme: 'dark',
        defaultMode: 'light' as const,
        showModeSwitch: true,
      },
    };
    const file = { theme: { defaultMode: 'dark' as const } };
    const result = resolveSiteConfig(db, file);
    expect(result.theme).toEqual({
      theme: 'dark',
      defaultMode: 'dark',
      showModeSwitch: true,
    });
  });

  it('fileConfig arrays completely replace dbConfig arrays', () => {
    const db = { contentInclude: ['notes/', 'blog/'] };
    const file = { contentInclude: ['posts/'] };
    const result = resolveSiteConfig(db, file);
    expect(result.contentInclude).toEqual(['posts/']);
  });

  it('handles fileConfig theme as string overriding db theme object', () => {
    const db = { theme: { theme: 'midnight', defaultMode: 'dark' as const } };
    const file = { theme: 'forest' };
    const result = resolveSiteConfig(db, file);
    expect(result.theme).toBe('forest');
  });

  describe('sanitizes each source before merging', () => {
    it('a malformed field in file config cannot wipe a valid db value', () => {
      const db = { theme: 'db-theme' };
      const file = { theme: 123 as never }; // garbage
      const result = resolveSiteConfig(db, file);
      expect(result.theme).toBe('db-theme');
    });

    it('a malformed field in db config is dropped, not merged', () => {
      const db = { social: 'not-an-array' as never };
      const file = { siteName: 'Brand' };
      const result = resolveSiteConfig(db, file);
      expect(result).toEqual({ siteName: 'Brand' });
    });
  });

  describe('opt-in link resolution via siteHostname', () => {
    const siteHostname = 'sub.flowershow.site';

    it('leaves media paths untouched when no hostname is given', () => {
      const result = resolveSiteConfig(null, { logo: 'assets/logo.png' });
      expect(result.logo).toBe('assets/logo.png');
    });

    it('resolves a media asset to a full URL when a hostname is given', () => {
      const result = resolveSiteConfig(
        null,
        { logo: 'assets/logo.png' },
        {
          siteHostname,
        },
      );
      expect(result.logo).toBe(`http://${siteHostname}/assets/logo.png`);
    });

    it('resolves DB-sourced media links too (not only file-sourced)', () => {
      const result = resolveSiteConfig({ logo: 'assets/db-logo.png' }, null, {
        siteHostname,
      });
      expect(result.logo).toBe(`http://${siteHostname}/assets/db-logo.png`);
    });

    it('resolves relative nav.links hrefs but leaves absolute URLs alone', () => {
      const result = resolveSiteConfig(
        null,
        {
          nav: {
            links: [
              { name: 'Blog', href: 'blog/post' },
              { name: 'Ext', href: 'https://example.com' },
            ],
          },
        },
        { siteHostname },
      );
      const links = result.nav?.links as Array<{ name: string; href: string }>;
      expect(links[0]!.href).toMatch(/^\//); // relative → resolved to a slug
      expect(links[1]!.href).toBe('https://example.com'); // absolute untouched
    });

    it('preserves an emoji logo instead of resolving it as a link', () => {
      const result = resolveSiteConfig(null, { logo: '🌸' }, { siteHostname });
      expect(result.logo).toBe('🌸');
    });
  });
});

describe('resolveSiteName', () => {
  it('prefers siteName over the deprecated title and the project name', () => {
    expect(
      resolveSiteName({ siteName: 'Brand', title: 'Old' }, 'my-project'),
    ).toBe('Brand');
  });

  it('falls back to the deprecated title when siteName is unset', () => {
    expect(resolveSiteName({ title: 'Old Brand' }, 'my-project')).toBe(
      'Old Brand',
    );
  });

  it('falls back to the project name when neither is set', () => {
    expect(resolveSiteName({}, 'my-project')).toBe('my-project');
    expect(resolveSiteName(null, 'my-project')).toBe('my-project');
  });
});

describe('buildPageTitle', () => {
  it('appends the brand as a suffix to the page title', () => {
    expect(buildPageTitle('About', 'My Site')).toBe('About | My Site');
  });

  it('returns the brand alone when the page has no title', () => {
    expect(buildPageTitle(undefined, 'My Site')).toBe('My Site');
    expect(buildPageTitle('', 'My Site')).toBe('My Site');
  });

  it('deduplicates when the page title equals the brand (case-insensitive)', () => {
    expect(buildPageTitle('My Site', 'My Site')).toBe('My Site');
    expect(buildPageTitle('  my site ', 'My Site')).toBe('My Site');
  });
});

describe('validateConfigPatch', () => {
  it('accepts a well-formed footer.navigation', () => {
    expect(() =>
      validateConfigPatch({
        footer: {
          navigation: [
            { title: 'Docs', links: [{ name: 'Guide', href: '/docs' }] },
          ],
        },
      }),
    ).not.toThrow();
  });

  it('accepts patches that do not touch footer navigation', () => {
    expect(() => validateConfigPatch({ siteName: 'Brand' })).not.toThrow();
    expect(() => validateConfigPatch({ footer: {} })).not.toThrow();
  });

  it('allows clearing footer.navigation with null', () => {
    expect(() =>
      validateConfigPatch({ footer: { navigation: null } }),
    ).not.toThrow();
  });

  it('rejects a flat list of links (missing title/links)', () => {
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

  it('rejects a group missing its links array', () => {
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
});
