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
  it('resolves a wiki-link image with its intrinsic size', () => {
    expect(
      resolvePostHero({ ...base, metadata: { image: '[[cover.png]]' } }),
    ).toEqual({
      src: 'http://site.example/assets/cover.png',
      alt: '',
      caption: null,
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
    // unknown size: no width/height (rendered at its natural size, uncropped)
    expect(
      resolvePostHero({
        ...base,
        metadata: { image: 'https://cdn.example/x.jpg' },
      }),
    ).toEqual({
      src: 'https://cdn.example/x.jpg',
      alt: '',
      caption: null,
    });
  });
  it('known sizes: no cover for small or square-ish images (logos, icons, portraits)', () => {
    const at = (width: number, height: number) =>
      resolvePostHero({
        ...base,
        dimensions: { '/assets/cover.png': { width, height } },
        metadata: { image: '[[cover.png]]' },
      });
    expect(at(599, 300)).toBeNull();
    expect(at(1000, 1000)).toBeNull();
    expect(at(1000, 900)).toBeNull();
    expect(at(1200, 1000)).not.toBeNull(); // 1.2
    expect(at(600, 400)).not.toBeNull();
    expect(at(3000, 500)).toMatchObject({ width: 3000, height: 500 });
  });
  it('finds the size under a path prefix (the longest matching key)', () => {
    expect(
      resolvePostHero({
        ...base,
        siteHostname: 'host.example',
        files: ['/assets/cover.png'],
        dimensions: {
          '/cover.png': { width: 100, height: 100 },
          '/assets/cover.png': { width: 1600, height: 900 },
        },
        metadata: { image: 'http://host.example/@me/site/assets/cover.png' },
      }),
    ).toMatchObject({ width: 1600 });
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
  it('decodes the body: %20 and angle-bracket forms of a name with spaces', () => {
    const spaced = {
      ...base,
      files: ['/blog/post.md', '/assets/my cover.png'],
      dimensions: {},
      metadata: { image: '[[my cover.png]]' },
    };
    expect(resolvePostHero({ ...spaced, body: 'x' })?.src).toBe(
      'http://site.example/assets/my%20cover.png',
    );
    for (const body of [
      '![a](assets/my%20cover.png)',
      '![a](<assets/my cover.png>)',
      '![[my cover.png]]',
      '<img src="/assets/my%20cover.png">',
    ])
      expect(resolvePostHero({ ...spaced, body }), body).toBeNull();
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
      'Intro\n\n![[assets/cover.png|300]]\n',
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
