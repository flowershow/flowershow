import { describe, expect, it } from 'vitest';
import { resolvePostHero } from './hero';

const base = {
  pagePath: 'blog/post.md',
  files: ['/blog/post.md', '/assets/cover.png', '/blog/pics/local.jpg'],
  siteHostname: 'site.example',
  dimensions: { '/assets/cover.png': { width: 1600, height: 900 } },
  body: 'Some text.',
};

describe('resolvePostHero', () => {
  it('resolves a wiki-link image with its intrinsic ratio', () => {
    expect(
      resolvePostHero({ ...base, metadata: { image: '[[cover.png]]' } }),
    ).toEqual({
      src: 'http://site.example/assets/cover.png',
      alt: '',
      caption: null,
      ratio: 16 / 9,
      width: 1600,
      height: 900,
    });
  });
  it('accepts the unquoted Obsidian form, relative paths and URLs', () => {
    expect(
      resolvePostHero({ ...base, metadata: { image: [['cover.png']] } })?.src,
    ).toBe('http://site.example/assets/cover.png');
    expect(
      resolvePostHero({ ...base, metadata: { image: 'pics/local.jpg' } })?.src,
    ).toBe('http://site.example/blog/pics/local.jpg');
    expect(
      resolvePostHero({
        ...base,
        metadata: { image: 'https://cdn.example/x.jpg' },
      }),
    ).toMatchObject({ src: 'https://cdn.example/x.jpg', ratio: null });
  });
  it('clamps extreme ratios', () => {
    const dims = {
      '/assets/cover.png': { width: 3000, height: 500 },
    };
    expect(
      resolvePostHero({
        ...base,
        dimensions: dims,
        metadata: { image: '[[cover.png]]' },
      })?.ratio,
    ).toBe(21 / 9);
    expect(
      resolvePostHero({
        ...base,
        dimensions: { '/assets/cover.png': { width: 500, height: 3000 } },
        metadata: { image: '[[cover.png]]' },
      })?.ratio,
    ).toBe(4 / 3);
  });
  it('alt and caption from frontmatter', () => {
    expect(
      resolvePostHero({
        ...base,
        metadata: {
          image: '[[cover.png]]',
          imageAlt: 'A cover',
          imageCaption: 'Photo: me',
        },
      }),
    ).toMatchObject({ alt: 'A cover', caption: 'Photo: me' });
  });
  it('nothing without an image, for non-images, with showImage: false or showHero', () => {
    expect(resolvePostHero({ ...base, metadata: {} })).toBeNull();
    expect(
      resolvePostHero({ ...base, metadata: { image: '[[other-page]]' } }),
    ).toBeNull();
    expect(
      resolvePostHero({ ...base, metadata: { image: 'mailto:x@y.z' } }),
    ).toBeNull();
    expect(resolvePostHero({ ...base, metadata: { image: 42 } })).toBeNull();
    expect(
      resolvePostHero({
        ...base,
        metadata: { image: '[[cover.png]]', showImage: false },
      }),
    ).toBeNull();
    expect(
      resolvePostHero({
        ...base,
        metadata: { image: '[[cover.png]]', showHero: true },
      }),
    ).toBeNull();
  });
  it('the frontmatter itself never counts as the body showing the image', () => {
    expect(
      resolvePostHero({
        ...base,
        body: '---\ntitle: T\nimage: /assets/cover.png\n---\n\nText only.\n',
        metadata: { image: '/assets/cover.png' },
      })?.src,
    ).toBe('http://site.example/assets/cover.png');
  });
  it('external URLs must be image files', () => {
    expect(
      resolvePostHero({
        ...base,
        metadata: { image: 'https://screenshot.example/api?url=x' },
      }),
    ).toBeNull();
  });
  it('skips the hero when the body already shows the same image', () => {
    for (const body of [
      'Intro\n\n![[cover.png]]\n',
      'Intro ![cover](/assets/cover.png)',
      '<img src="../assets/Cover.PNG">',
    ])
      expect(
        resolvePostHero({
          ...base,
          body,
          metadata: { image: '[[cover.png]]' },
        }),
      ).toBeNull();
    expect(
      resolvePostHero({
        ...base,
        body: 'See https://cdn.example/x.jpg',
        metadata: { image: 'https://cdn.example/x.jpg' },
      }),
    ).toBeNull();
    // a different file with a similar name is not a duplicate
    expect(
      resolvePostHero({
        ...base,
        body: '![[cover.png.bak]] ![[my-cover.png]]',
        metadata: { image: '[[cover.png]]' },
      }),
    ).not.toBeNull();
  });
});
