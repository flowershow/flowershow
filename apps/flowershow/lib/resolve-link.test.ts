import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'test',
    NEXT_PUBLIC_ROOT_DOMAIN: 'localhost:3000',
  },
}));

import { resolveContentLink, resolveToAbsolutePath } from './resolve-link';

/* example site file tree:
 * /README.md
 * /about.md
 * /blog
 *   /README.md
 *   /post-1.md
 *   /post-2.md
 * /projects
 *   /README.md
 *   /project-1.md
 *   /project-2.md
 * /assets
 *   /image.jpg
 * */

describe('resolve file paths to app URL paths', () => {
  it('Root README.md', () => {
    const target = 'README.md';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/');
  });

  it('Root index.md', () => {
    const target = 'index.md';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/');
  });

  it('Directory README.md', () => {
    const target = 'blog/README.md';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/blog');
  });

  it('Directory index.md', () => {
    const target = 'blog/index.md';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/blog');
  });

  it('Other', () => {
    const target = 'some/file.md';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/some/file');
  });

  it('Spaces are encoded as +', () => {
    const target = '/Abc Resources/Xyz Map.md';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/Abc+Resources/Xyz+Map');
  });
});

describe('resolve file paths to app URL paths', () => {
  it('canvas link resolves to extension-free slug', () => {
    const target = 'My Canvas.canvas';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/My+Canvas');
  });

  it('extension-less link is treated as a page link (supports Obsidian wikilinks)', () => {
    const target = 'blog/post-2';
    const resolved = resolveContentLink({ target });
    expect(resolved).toBe('/blog/post-2');
  });
});

describe('resolve links on a README page', () => {
  const originFilePath = '/blog/README.md';

  it('external link', () => {
    const target = 'https://example.com';
    const resolved = resolveContentLink({ target, originFilePath });
    expect(resolved).toBe(target);
  });

  it('absolute link', () => {
    const target = '/blog/post-1';
    const expected = `/blog/post-1`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link to home page', () => {
    const target = '/';
    const expected = `/`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with README', () => {
    const target = '/README';
    const expected = `/`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with .md extension', () => {
    const target = 'post-2.md';
    const expected = `/blog/post-2`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link with no sitePrefix', () => {
    const target = 'post-2';
    const expected = `/blog/post-2`;
    const resolved = resolveContentLink({ target, originFilePath });
    expect(resolved).toBe(expected);
  });

  describe('relative links', () => {
    it('same directory, no dot', () => {
      const target = 'post-1';
      const expected = `/blog/post-1`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('same directory, with dot', () => {
      const target = './post-1';
      const expected = `/blog/post-1`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('up a directory', () => {
      const target = '../about';
      const expected = `/about`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('to sibling directory', () => {
      const target = '../projects/project-1';
      const expected = `/projects/project-1`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });
  });

  describe('links with headings', () => {
    it('absolute link with heading', () => {
      const target = '/blog/post-1#introduction';
      const expected = `/blog/post-1#introduction`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('relative link with heading', () => {
      const target = 'post-1#getting-started';
      const expected = `/blog/post-1#getting-started`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('link with heading containing spaces', () => {
      const target = '/blog/post-1#My Section Title';
      const expected = `/blog/post-1#my-section-title`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('only heading (same page)', () => {
      const target = '#conclusion';
      const expected = target;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('relative link up directory with heading', () => {
      const target = '../about#contact-info';
      const expected = `/about#contact-info`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('link with .md extension and heading', () => {
      const target = 'post-2.md#summary';
      const expected = `/blog/post-2#summary`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });
  });
});

describe('resolve links on non-README page', () => {
  const originFilePath = '/blog/post-1.md';

  it('external link', () => {
    const target = 'https://example.com';
    const resolved = resolveContentLink({ target, originFilePath });
    expect(resolved).toBe(target);
  });

  it('absolute link', () => {
    const target = '/blog/post-2';
    const expected = `/blog/post-2`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link to home page', () => {
    const target = '/';
    const expected = `/`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with README', () => {
    const target = '/README';
    const expected = `/`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with .md extension', () => {
    const target = 'post-2.md';
    const expected = `/blog/post-2`;
    const resolved = resolveContentLink({
      target,
      originFilePath,
    });
    expect(resolved).toBe(expected);
  });

  it('link with no sitePrefix', () => {
    const target = 'post-2';
    const expected = `/blog/post-2`;
    const resolved = resolveContentLink({ target, originFilePath });
    expect(resolved).toBe(expected);
  });

  describe('relative links', () => {
    it('same directory, no dot', () => {
      const target = 'post-2';
      const expected = `/blog/post-2`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('same directory, with dot', () => {
      const target = './post-2';
      const expected = `/blog/post-2`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('up a directory', () => {
      const target = '../about';
      const expected = `/about`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('to sibling directory', () => {
      const target = '../projects/project-1';
      const expected = `/projects/project-1`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });
  });

  describe('links with headings', () => {
    it('absolute link with heading', () => {
      const target = '/blog/post-2#introduction';
      const expected = `/blog/post-2#introduction`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('only heading (same page)', () => {
      const target = '#conclusion';
      const expected = target;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });

    it('relative link up directory with heading', () => {
      const target = '../about#contact-info';
      const expected = `/about#contact-info`;
      const resolved = resolveContentLink({
        target,
        originFilePath,
      });
      expect(resolved).toBe(expected);
    });
  });
});

describe('resolveToAbsolutePath', () => {
  it('resolves a relative target from the root', () => {
    expect(resolveToAbsolutePath('about.md', '/')).toBe('/about.md');
  });

  it('resolves a relative target from a nested file', () => {
    expect(resolveToAbsolutePath('post-1.md', '/blog/README.md')).toBe(
      '/blog/post-1.md',
    );
  });

  it('resolves ../ traversal', () => {
    expect(resolveToAbsolutePath('../about.md', '/blog/post-1.md')).toBe(
      '/about.md',
    );
  });

  it('passes through an absolute target unchanged', () => {
    expect(
      resolveToAbsolutePath('/projects/project-1.md', '/blog/post-1.md'),
    ).toBe('/projects/project-1.md');
  });

  it('decodes %20 space encoding', () => {
    expect(resolveToAbsolutePath('my%20file.md', '/')).toBe('/my file.md');
  });

  it('strips a heading fragment', () => {
    expect(resolveToAbsolutePath('about.md#section', '/')).toBe('/about.md');
  });

  it('returns empty string for a heading-only target', () => {
    expect(resolveToAbsolutePath('#section', '/')).toBe('');
  });

  it('adds a leading slash to originFilePath if missing', () => {
    expect(resolveToAbsolutePath('post-1.md', 'blog/README.md')).toBe(
      '/blog/post-1.md',
    );
  });
});
