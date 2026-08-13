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
