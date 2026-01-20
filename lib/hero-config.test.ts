import { describe, expect, it } from 'vitest';
import { resolveHeroConfig } from './hero-config';

describe('resolveHeroConfig', () => {
  it('uses hero object values without falling back to top-level fields', () => {
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
      description: undefined,
      image: undefined,
      cta: undefined,
      imageLayout: 'full',
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

  it('uses site config hero object when page metadata does not define hero', () => {
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
      description: undefined,
      image: undefined,
      cta: undefined,
      imageLayout: 'right',
    });
  });
});
