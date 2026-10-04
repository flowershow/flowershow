import { Plan } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  buildSocialMetadata,
  displayUrl,
  resolveSocialImage,
  socialCardUrl,
  socialCardVersion,
  toCardInputs,
} from './social-preview';

const site = { plan: Plan.FREE, privacyMode: 'PUBLIC', projectName: 'notes' };
const blob = (metadata: Record<string, unknown>, sha = 'abc') => ({
  sha,
  metadata,
});

describe('toCardInputs', () => {
  it('builds page inputs from metadata and site config', () => {
    const c = toCardInputs({
      site,
      siteConfig: {
        siteName: "Ana's Garden",
        description: 'Notes',
        logo: 'https://x/l.png',
      },
      blob: blob({ title: 'Hello', description: 'World' }),
    });
    expect(c).toEqual({
      siteName: "Ana's Garden",
      siteDescription: 'Notes',
      logo: 'https://x/l.png',
      showMark: true,
      page: { title: 'Hello', description: 'World', sha: 'abc' },
    });
  });

  it('falls back to the project name and nav.logo', () => {
    const c = toCardInputs({
      site,
      siteConfig: { nav: { logo: '/n.png' } } as never,
      blob: null,
    });
    expect(c.siteName).toBe('notes');
    expect(c.logo).toBe('/n.png');
  });

  it('coerces non-string titles (Review Focus 1)', () => {
    expect(
      toCardInputs({ site, siteConfig: null, blob: blob({ title: 1984 }) }).page
        ?.title,
    ).toBe('1984');
    expect(
      toCardInputs({ site, siteConfig: null, blob: blob({ title: true }) }).page
        ?.title,
    ).toBe('true');
  });

  it('uses the site name when the page has no title', () => {
    expect(
      toCardInputs({ site, siteConfig: null, blob: blob({}) }).page?.title,
    ).toBe('notes');
  });

  it('gives no page for protected sites, missing pages and publish:false (Review Focus 5)', () => {
    expect(
      toCardInputs({
        site: { ...site, privacyMode: 'PASSWORD' },
        siteConfig: null,
        blob: blob({ title: 'Secret' }),
      }).page,
    ).toBeNull();
    expect(
      toCardInputs({ site, siteConfig: null, blob: null }).page,
    ).toBeNull();
    expect(
      toCardInputs({
        site,
        siteConfig: null,
        blob: blob({ title: 'Draft', publish: false }),
      }).page,
    ).toBeNull();
  });

  it('hides the mark on premium', () => {
    expect(
      toCardInputs({
        site: { ...site, plan: Plan.PREMIUM },
        siteConfig: null,
        blob: null,
      }).showMark,
    ).toBe(false);
  });
});

describe('socialCardVersion', () => {
  const base = toCardInputs({
    site,
    siteConfig: { siteName: 'S' },
    blob: blob({ title: 'T' }),
  });
  it('is stable and 10 hex chars', () => {
    expect(socialCardVersion(base)).toMatch(/^[0-9a-f]{10}$/);
    expect(socialCardVersion(base)).toBe(socialCardVersion({ ...base }));
  });
  it.each([
    ['siteName', { ...base, siteName: 'S2' }],
    ['siteDescription', { ...base, siteDescription: 'd' }],
    ['logo', { ...base, logo: 'x' }],
    ['showMark', { ...base, showMark: false }],
    ['page sha', { ...base, page: { ...base.page!, sha: 'zzz' } }],
    ['no page', { ...base, page: null }],
  ])('changes when %s changes', (_n, changed) => {
    expect(socialCardVersion(changed)).not.toBe(socialCardVersion(base));
  });
});

describe('urls', () => {
  it('builds card urls for home and pages', () => {
    expect(socialCardUrl('https://a.flowershow.me', '/', 'v1')).toBe(
      'https://a.flowershow.me/_og?v=v1',
    );
    expect(socialCardUrl('https://a.flowershow.me', '/blog/post', 'v1')).toBe(
      'https://a.flowershow.me/_og/blog/post?v=v1',
    );
  });
  it('builds a short display url', () => {
    expect(displayUrl('https://a.flowershow.me', '/')).toBe('a.flowershow.me');
    expect(displayUrl('https://a.flowershow.me', '/blog/post')).toBe(
      'a.flowershow.me/blog/post',
    );
    expect(
      displayUrl('https://a.b', `/${'x'.repeat(100)}`).length,
    ).toBeLessThanOrEqual(60);
  });
});

describe('resolveSocialImage', () => {
  const a = {
    cardsEnabled: true,
    isPremium: false,
    isProtected: false,
    pageImage: null as string | null,
    siteImage: null as string | null,
    cardUrl: 'CARD',
    siteCardUrl: 'SITECARD',
    legacyThumbnail: 'THUMB',
  };
  const card = (url: string) => ({ url, width: 1200, height: 630 });

  it.each([
    [
      'protected → site card',
      { isProtected: true, isPremium: true, pageImage: 'P' },
      card('SITECARD'),
    ],
    [
      'premium + page image → page image',
      { isPremium: true, pageImage: 'P', siteImage: 'S' },
      { url: 'P' },
    ],
    [
      'premium + site image → site image',
      { isPremium: true, siteImage: 'S' },
      { url: 'S' },
    ],
    ['premium, no images → card', { isPremium: true }, card('CARD')],
    [
      'free ignores page image → card',
      { pageImage: 'P', siteImage: 'S' },
      card('CARD'),
    ],
    [
      'flag off, free → legacy thumbnail',
      { cardsEnabled: false },
      card('THUMB'),
    ],
    [
      'flag off, premium + page image',
      { cardsEnabled: false, isPremium: true, pageImage: 'P' },
      { url: 'P' },
    ],
    [
      'flag off, premium, nothing → null',
      { cardsEnabled: false, isPremium: true },
      null,
    ],
  ])('%s', (_name, over, expected) => {
    expect(resolveSocialImage({ ...a, ...over })).toEqual(expected);
  });
});

describe('buildSocialMetadata', () => {
  it('includes the image with alt = title', () => {
    const m = buildSocialMetadata({
      title: 'T',
      description: 'D',
      url: 'U',
      image: { url: 'I', width: 1200, height: 630 },
    });
    expect(m.openGraph.images).toEqual([
      { url: 'I', width: 1200, height: 630, alt: 'T' },
    ]);
    expect(m.twitter.card).toBe('summary_large_image');
    expect(m.twitter).not.toHaveProperty('creator');
  });
  it('omits images entirely when there is none (never url: null)', () => {
    const m = buildSocialMetadata({ title: 'T', url: 'U', image: null });
    expect(m.openGraph).not.toHaveProperty('images');
    expect(m.twitter).not.toHaveProperty('images');
    expect(m.twitter.card).toBe('summary');
  });
  it('omits width/height for author images', () => {
    const m = buildSocialMetadata({
      title: 'T',
      url: 'U',
      image: { url: 'I' },
    });
    expect(m.openGraph.images).toEqual([{ url: 'I', alt: 'T' }]);
  });
});
