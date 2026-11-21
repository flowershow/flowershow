import { describe, expect, it } from 'vitest';
import type { PageMetadata } from '@/server/api/types';
import { resolveHeroConfig } from './hero-config';

describe('resolveHeroConfig', () => {
  it('uses hero object values with top-level fallbacks for unset fields', () => {
    const result = resolveHeroConfig(
      {
        title: 'Top Title',
        description: 'Top Description',
        image: '/top.png',
        cta: [{ href: '/top', label: 'Top CTA' }],
        hero: {
          title: 'Hero Title',
          imagelayout: 'full',
        },
      },
      null,
    );

    expect(result).toEqual({
      showHero: true,
      title: 'Hero Title',
      description: 'Top Description',
      image: '/top.png',
      cta: [{ href: '/top', label: 'Top CTA' }],
      imageLayout: 'full',
      overlay: 'dark',
    });
  });

  it('treats hero: true as legacy showHero and uses top-level fields', () => {
    const result = resolveHeroConfig(
      {
        title: 'Top Title',
        description: 'Top Description',
        image: '/top.png',
        cta: [{ href: '/top', label: 'Top CTA' }],
        hero: true,
      },
      null,
    );

    expect(result).toEqual({
      showHero: true,
      title: 'Top Title',
      description: 'Top Description',
      image: '/top.png',
      cta: [{ href: '/top', label: 'Top CTA' }],
      imageLayout: undefined,
    });
  });

  it('lets explicit hero: false disable the hero even if site config enables it', () => {
    const result = resolveHeroConfig(
      {
        title: 'Top Title',
        hero: false,
      },
      {
        hero: {
          title: 'Config Title',
        },
      },
    );

    expect(result).toEqual({
      showHero: false,
      title: 'Top Title',
      description: undefined,
      image: undefined,
      cta: undefined,
      imageLayout: undefined,
    });
  });

  it('uses site config hero object with top-level fallbacks when page metadata does not define hero', () => {
    const result = resolveHeroConfig(
      {
        title: 'Top Title',
        description: 'Top Description',
      },
      {
        hero: {
          title: 'Config Title',
          imagelayout: 'right',
        },
      },
    );

    expect(result).toEqual({
      showHero: true,
      title: 'Config Title',
      description: 'Top Description',
      image: undefined,
      cta: undefined,
      imageLayout: 'right',
    });
  });

  describe('overlay', () => {
    // Frontmatter is untrusted, so hero values may be any type.
    const overlayFor = (hero: unknown) =>
      resolveHeroConfig({ title: 'T', hero } as PageMetadata, null).overlay;
    const fullHero = (extra: Record<string, unknown> = {}) =>
      overlayFor({ image: '/bg.jpg', imagelayout: 'full', ...extra });

    it('defaults to dark for a full-width image', () => {
      expect(fullHero()).toBe('dark');
    });

    it.each(['dark', 'light', 'none'] as const)('accepts %s', (value) => {
      expect(fullHero({ overlay: value })).toBe(value);
    });

    it('normalises case', () => {
      expect(fullHero({ overlay: 'Light' })).toBe('light');
      expect(fullHero({ overlay: 'NONE' })).toBe('none');
    });

    it('falls back to dark for unknown or non-string values', () => {
      expect(fullHero({ overlay: 'blur' })).toBe('dark');
      expect(fullHero({ overlay: 0.5 })).toBe('dark');
      expect(fullHero({ overlay: true })).toBe('dark');
    });

    it('is undefined unless the image layout is full', () => {
      expect(
        overlayFor({
          image: '/bg.jpg',
          imagelayout: 'right',
          overlay: 'light',
        }),
      ).toBeUndefined();
      expect(overlayFor({ image: '/bg.jpg', overlay: 'dark' })).toBeUndefined();
      expect(overlayFor(true)).toBeUndefined();
    });

    it('reads overlay from the site config hero object', () => {
      expect(
        resolveHeroConfig(null, {
          hero: { image: '/bg.jpg', imagelayout: 'full', overlay: 'light' },
        }).overlay,
      ).toBe('light');
    });
  });
});
