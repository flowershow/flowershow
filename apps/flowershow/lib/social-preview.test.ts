import { Plan } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  buildSocialMetadata,
  type CardImage,
  cardDomain,
  cardSection,
  isShareCardShaped,
  resolveCardImage,
  resolvePageSocialImage,
  resolveSocialImage,
  socialCardUrl,
  socialCardVersion,
  socialText,
  toCardInputs,
} from './social-preview';

const site = { plan: Plan.FREE, privacyMode: 'PUBLIC', projectName: 'notes' };
const blob = (
  metadata: Record<string, unknown>,
  sha = 'abc',
  path = 'blog/hello.md',
) => ({ sha, path, metadata });
const pic = (over: Partial<CardImage> = {}): CardImage => ({
  src: 'https://x.test/a.jpg',
  sitePath: 'a.jpg',
  width: 1200,
  height: 800,
  ...over,
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
      slug: '/blog/hello',
    });
    expect(c).toEqual({
      siteName: "Ana's Garden",
      logo: 'https://x/l.png',
      showMark: true,
      image: null,
      page: { title: 'Hello', section: 'Blog', sha: 'abc' },
    });
  });

  it('falls back to the project name and nav.logo', () => {
    const c = toCardInputs({
      site,
      siteConfig: { nav: { logo: '/n.png' } } as never,
      blob: null,
      slug: '/',
    });
    expect(c.siteName).toBe('notes');
    expect(c.logo).toBe('/n.png');
  });

  it('coerces non-string titles (Review Focus 1)', () => {
    const title = (t: unknown) =>
      toCardInputs({
        site,
        siteConfig: null,
        blob: blob({ title: t }),
        slug: '/x',
      }).page?.title;
    expect(title(1984)).toBe('1984');
    expect(title(true)).toBe('true');
  });

  it('coerces a non-string siteName from config.json', () => {
    const c = toCardInputs({
      site,
      siteConfig: { siteName: 2024 } as never,
      blob: blob({}),
      slug: '/x',
    });
    expect(c.siteName).toBe('2024');
    expect(c.page?.title).toBe('2024');
  });

  it('uses the site name when the page has no title, and on the home page', () => {
    expect(
      toCardInputs({ site, siteConfig: null, blob: blob({}), slug: '/x' }).page
        ?.title,
    ).toBe('notes');
    const home = toCardInputs({
      site,
      siteConfig: { siteName: 'Garden' },
      blob: blob({ title: 'Home' }, 'abc', 'README.md'),
      slug: '/',
    }).page;
    expect(home?.title).toBe('Garden');
    expect(home?.section).toBeNull();
  });

  it('gives no page and no picture for protected sites, missing pages and publish:false (Review Focus 5)', () => {
    const images = { pageImage: pic(), siteImage: pic() };
    for (const c of [
      toCardInputs({
        site: { ...site, privacyMode: 'PASSWORD' },
        siteConfig: null,
        blob: blob({ title: 'Secret' }),
        slug: '/x',
        ...images,
      }),
      toCardInputs({
        site,
        siteConfig: null,
        blob: null,
        slug: '/x',
        ...images,
      }),
      toCardInputs({
        site,
        siteConfig: null,
        blob: blob({ title: 'Draft', publish: false }),
        slug: '/x',
        ...images,
      }),
    ]) {
      expect(c.page).toBeNull();
      expect(c.image).toBeNull();
    }
  });

  it('takes the page picture, else the site picture', () => {
    const page = pic({ src: 'P' });
    const siteImg = pic({ src: 'S' });
    const at = (pageImage: CardImage | null) =>
      toCardInputs({
        site,
        siteConfig: null,
        blob: blob({}),
        slug: '/x',
        pageImage,
        siteImage: siteImg,
      }).image;
    expect(at(page)).toBe(page);
    expect(at(null)).toBe(siteImg);
  });

  it('hides the mark on premium', () => {
    expect(
      toCardInputs({
        site: { ...site, plan: Plan.PREMIUM },
        siteConfig: null,
        blob: null,
        slug: '/',
      }).showMark,
    ).toBe(false);
  });
});

describe('cardSection', () => {
  it.each([
    ['blog/hello.md', 'Blog'],
    ['docs/getting-started/install.md', 'Docs'],
    ['field_notes/x.md', 'Field Notes'],
    ['hello.md', null],
    ['README.md', null],
    ['blog/README.md', null],
    ['blog/index.md', null],
    ['blog/index.mdx', null],
    [`${'a'.repeat(60)}/x.md`, `A${'a'.repeat(30)}…`],
  ])('%s → %s', (path, expected) => {
    expect(cardSection(path)).toBe(expected);
  });
});

describe('socialCardVersion', () => {
  const base = toCardInputs({
    site,
    siteConfig: { siteName: 'S' },
    blob: blob({ title: 'T' }),
    slug: '/blog/hello',
  });
  it('is stable and 10 hex chars', () => {
    expect(socialCardVersion(base)).toMatch(/^[0-9a-f]{10}$/);
    expect(socialCardVersion(base)).toBe(socialCardVersion({ ...base }));
  });
  it.each([
    ['siteName', { ...base, siteName: 'S2' }],
    ['logo', { ...base, logo: 'x' }],
    ['showMark', { ...base, showMark: false }],
    ['page sha', { ...base, page: { ...base.page!, sha: 'zzz' } }],
    ['section', { ...base, page: { ...base.page!, section: 'Docs' } }],
    ['no page', { ...base, page: null }],
    ['picture', { ...base, image: pic() }],
  ])('changes when %s changes', (_n, changed) => {
    expect(socialCardVersion(changed)).not.toBe(socialCardVersion(base));
  });
  it('changes when the picture size changes', () => {
    expect(
      socialCardVersion({ ...base, image: pic({ width: 1300 }) }),
    ).not.toBe(socialCardVersion({ ...base, image: pic() }));
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
  it('shows the domain only', () => {
    expect(cardDomain('https://a.flowershow.me')).toBe('a.flowershow.me');
    expect(cardDomain('http://localhost:3000/@ana/notes')).toBe(
      'localhost:3000',
    );
  });
});

describe('resolveCardImage', () => {
  const ctx = {
    siteHostname: 'garden.test',
    files: ['/blog/hello.md', '/assets/cover.jpg', '/assets/tiny.png'],
    dimensions: {
      '/assets/cover.jpg': { width: 1200, height: 800 },
      '/assets/tiny.png': { width: 300, height: 300 },
    },
  };
  const at = (raw: unknown) => resolveCardImage(raw, 'blog/hello.md', ctx);

  it('resolves relative, absolute and wikilink site files with their size', () => {
    const expected = {
      src: 'http://garden.test/assets/cover.jpg',
      sitePath: 'assets/cover.jpg',
      width: 1200,
      height: 800,
    };
    expect(at('../assets/cover.jpg')).toEqual(expected);
    expect(at('/assets/cover.jpg')).toEqual(expected);
    expect(at('[[cover.jpg]]')).toEqual(expected);
    expect(at([['cover.jpg']])).toEqual(expected); // unquoted YAML [[x]]
  });

  it('keeps external https images, with no size', () => {
    expect(at('https://cdn.example.com/p.webp')).toEqual({
      src: 'https://cdn.example.com/p.webp',
      sitePath: null,
    });
  });

  it.each([
    ['nothing', undefined],
    ['an empty string', ' '],
    ['a missing site file', '/assets/gone.jpg'],
    ['a small site file', '/assets/tiny.png'],
    ['an svg', 'https://cdn.example.com/logo.svg'],
    ['a page, not an image', 'https://example.com/post'],
    ['http', 'http://cdn.example.com/p.jpg'],
    [
      'a stray % in the URL (must not throw)',
      'https://cdn.example.com/50%off.jpg',
    ],
    ['an emoji', '🌸'],
  ])('ignores %s', (_n, raw) => {
    expect(at(raw)).toBeNull();
  });
});

describe('isShareCardShaped', () => {
  it.each([
    [{ width: 1200, height: 630 }, true],
    [{ width: 2400, height: 1260 }, true],
    [{ width: 1000, height: 500 }, true],
    [{ width: 999, height: 520 }, false],
    [{ width: 1200, height: 800 }, false],
    [{ width: 1024, height: 1024 }, false],
    [{ width: 2100, height: 1000 }, false],
    [{}, false],
  ])('%o → %s', (size, expected) => {
    expect(
      isShareCardShaped(pic({ width: undefined, height: undefined, ...size })),
    ).toBe(expected);
  });
});

describe('resolveSocialImage', () => {
  const a = {
    cardsEnabled: true,
    isPremium: false,
    isProtected: false,
    isHome: false,
    pageImage: null as CardImage | null,
    siteImage: null as CardImage | null,
    legacyPageImage: null as string | null,
    legacySiteImage: null as string | null,
    cardUrl: 'CARD',
    siteCardUrl: 'SITECARD',
    legacyThumbnail: 'THUMB',
  };
  const card = (url: string) => ({ url, width: 1200, height: 630 });
  const shaped = pic({ src: 'SHAPED', width: 1200, height: 630 });
  const photo = pic({ src: 'PHOTO' });

  it.each([
    [
      'protected → site card',
      { isProtected: true, isPremium: true, pageImage: shaped },
      card('SITECARD'),
    ],
    [
      'page image shaped like a share card → as it is, with its size',
      { pageImage: shaped, siteImage: photo },
      { url: 'SHAPED', width: 1200, height: 630 },
    ],
    ['page image → card', { pageImage: photo }, card('CARD')],
    [
      'premium page image → card too',
      { isPremium: true, pageImage: photo },
      card('CARD'),
    ],
    [
      'site image shaped like a share card, home → as it is',
      { isHome: true, siteImage: shaped },
      { url: 'SHAPED', width: 1200, height: 630 },
    ],
    [
      'uploaded site image (size unknown), home → as it is',
      { isHome: true, siteImage: { src: 'UPLOAD', sitePath: null } },
      { url: 'UPLOAD' },
    ],
    [
      'site file not shaped like a share card, home → card',
      { isHome: true, siteImage: photo },
      card('CARD'),
    ],
    [
      'site image shaped like a share card, inner page → card',
      { siteImage: shaped },
      card('CARD'),
    ],
    ['nothing → card', {}, card('CARD')],
    [
      'flag off, free → legacy thumbnail',
      { cardsEnabled: false },
      card('THUMB'),
    ],
    [
      'flag off, premium + page image',
      { cardsEnabled: false, isPremium: true, legacyPageImage: 'P' },
      { url: 'P' },
    ],
    [
      'flag off, premium + site image',
      { cardsEnabled: false, isPremium: true, legacySiteImage: 'S' },
      { url: 'S' },
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

describe('resolvePageSocialImage', () => {
  const base = {
    cardsEnabled: true,
    isPremium: false,
    site,
    siteConfig: { title: 'File Title' } as never,
    dbConfig: { title: 'DB Title' } as never,
    blob: blob({ title: 'Page' }, 'abc', 'a/b.md'),
    siteUrl: 'https://x.test',
    slug: '/a/b',
    legacyThumbnail: 'https://x.test/t.png',
    pageImage: null,
    siteImage: null,
  };

  it('page card v equals the route v for the same inputs', () => {
    const v = socialCardVersion(
      toCardInputs({
        site,
        siteConfig: base.siteConfig,
        blob: base.blob,
        slug: '/a/b',
        pageImage: photoFor(),
      }),
    );
    expect(
      resolvePageSocialImage({ ...base, pageImage: photoFor() })?.url,
    ).toBe(`https://x.test/_og/a/b?v=${v}`);
  });

  it('protected sites use the DB-config site card, never page data', () => {
    const protectedSite = { ...site, privacyMode: 'PASSWORD' };
    const v = socialCardVersion(
      toCardInputs({
        site: protectedSite,
        siteConfig: base.dbConfig,
        blob: null,
        slug: '/',
      }),
    );
    expect(
      resolvePageSocialImage({
        ...base,
        site: protectedSite,
        pageImage: photoFor(),
      })?.url,
    ).toBe(`https://x.test/_og?v=${v}`);
  });

  it('falls back to the legacy thumbnail when cards are disabled', () => {
    expect(resolvePageSocialImage({ ...base, cardsEnabled: false })?.url).toBe(
      'https://x.test/t.png',
    );
  });
});

function photoFor(): CardImage {
  return pic({ src: 'https://x.test/p.jpg', sitePath: 'p.jpg' });
}

describe('socialText', () => {
  const page = {
    title: 'Secret Page - Garden',
    description: 'Secret page description',
    projectName: 'notes',
  };

  it('uses the page title and description on public sites', () => {
    expect(
      socialText({ ...page, isProtected: false, siteConfig: null }),
    ).toEqual({
      title: 'Secret Page - Garden',
      description: 'Secret page description',
    });
  });

  it('uses only the site name and site description on PASSWORD sites', () => {
    const text = socialText({
      ...page,
      isProtected: true,
      siteConfig: { siteName: 'Garden', description: 'My notes' } as never,
    });
    expect(text).toEqual({ title: 'Garden', description: 'My notes' });
    expect(JSON.stringify(text)).not.toContain('Secret');
  });

  it('falls back to the project name and no description on PASSWORD sites', () => {
    expect(
      socialText({ ...page, isProtected: true, siteConfig: null }),
    ).toEqual({ title: 'notes', description: undefined });
  });

  it('feeds the site name into og/twitter title and image alt', () => {
    const m = buildSocialMetadata({
      ...socialText({
        ...page,
        isProtected: true,
        siteConfig: { title: 'Garden' } as never,
      }),
      url: 'U',
      image: { url: 'I' },
    });
    expect(m.openGraph.title).toBe('Garden');
    expect(m.twitter.title).toBe('Garden');
    expect(m.openGraph.images).toEqual([{ url: 'I', alt: 'Garden' }]);
    expect(JSON.stringify(m)).not.toContain('Secret');
  });
});
