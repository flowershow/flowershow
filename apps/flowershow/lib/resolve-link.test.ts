import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'test',
    NEXT_PUBLIC_ROOT_DOMAIN: 'localhost:3000',
  },
}));

import { resolveFilePathToUrlPath } from './resolve-link';

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
    const resolved = resolveFilePathToUrlPath({ target });
    expect(resolved).toBe('/');
  });

  it('Root index.md', () => {
    const target = 'index.md';
    const resolved = resolveFilePathToUrlPath({ target });
    expect(resolved).toBe('/');
  });

  it('Directory README.md', () => {
    const target = 'blog/README.md';
    const resolved = resolveFilePathToUrlPath({ target });
    expect(resolved).toBe('/blog');
  });

  it('Directory index.md', () => {
    const target = 'blog/index.md';
    const resolved = resolveFilePathToUrlPath({ target });
    expect(resolved).toBe('/blog');
  });

  it('Other', () => {
    const target = 'some/file.md';
    const resolved = resolveFilePathToUrlPath({ target });
    expect(resolved).toBe('/some/file');
  });
});

describe('resolve links on a README page', () => {
  const sitePrefix = '/@username/abc'; // this could also be url to R2 bucket site folder
  const originFilePath = '/blog/README.md';

  it('external link', () => {
    const target = 'https://example.com';
    const resolved = resolveFilePathToUrlPath({ target, originFilePath });
    expect(resolved).toBe(target);
  });

  it('absolute link', () => {
    const target = '/blog/post-1';
    const expected = `${sitePrefix}/blog/post-1`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link to home page', () => {
    const target = '/';
    const expected = `${sitePrefix}`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with README', () => {
    const target = '/README';
    const expected = `${sitePrefix}`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with .md extension', () => {
    const target = 'post-2.md';
    const expected = `${sitePrefix}/blog/post-2`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link with no sitePrefix', () => {
    const target = 'post-2';
    const expected = `/blog/post-2`;
    const resolved = resolveFilePathToUrlPath({ target, originFilePath });
    expect(resolved).toBe(expected);
  });

  describe('relative links', () => {
    it('same directory, no dot', () => {
      const target = 'post-1';
      const expected = `${sitePrefix}/blog/post-1`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('same directory, with dot', () => {
      const target = './post-1';
      const expected = `${sitePrefix}/blog/post-1`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('up a directory', () => {
      const target = '../about';
      const expected = `${sitePrefix}/about`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('to sibling directory', () => {
      const target = '../projects/project-1';
      const expected = `${sitePrefix}/projects/project-1`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });
  });

  describe('links with headings', () => {
    it('absolute link with heading', () => {
      const target = '/blog/post-1#introduction';
      const expected = `${sitePrefix}/blog/post-1#introduction`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('relative link with heading', () => {
      const target = 'post-1#getting-started';
      const expected = `${sitePrefix}/blog/post-1#getting-started`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('link with heading containing spaces', () => {
      const target = '/blog/post-1#My Section Title';
      const expected = `${sitePrefix}/blog/post-1#my-section-title`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('only heading (same page)', () => {
      const target = '#conclusion';
      const expected = target;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('relative link up directory with heading', () => {
      const target = '../about#contact-info';
      const expected = `${sitePrefix}/about#contact-info`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('link with .md extension and heading', () => {
      const target = 'post-2.md#summary';
      const expected = `${sitePrefix}/blog/post-2#summary`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });
  });
});

describe('resolve links on non-README page', () => {
  const sitePrefix = '/@username/abc'; // this could also be url to R2 bucket site folder
  const originFilePath = '/blog/post-1.md';

  it('external link', () => {
    const target = 'https://example.com';
    const resolved = resolveFilePathToUrlPath({ target, originFilePath });
    expect(resolved).toBe(target);
  });

  it('absolute link', () => {
    const target = '/blog/post-2';
    const expected = `${sitePrefix}/blog/post-2`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link to home page', () => {
    const target = '/';
    const expected = `${sitePrefix}`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with README', () => {
    const target = '/README';
    const expected = `${sitePrefix}`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link ending with .md extension', () => {
    const target = 'post-2.md';
    const expected = `${sitePrefix}/blog/post-2`;
    const resolved = resolveFilePathToUrlPath({
      target,
      originFilePath,
      sitePrefix,
    });
    expect(resolved).toBe(expected);
  });

  it('link with no sitePrefix', () => {
    const target = 'post-2';
    const expected = `/blog/post-2`;
    const resolved = resolveFilePathToUrlPath({ target, originFilePath });
    expect(resolved).toBe(expected);
  });

  describe('relative links', () => {
    it('same directory, no dot', () => {
      const target = 'post-2';
      const expected = `${sitePrefix}/blog/post-2`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('same directory, with dot', () => {
      const target = './post-2';
      const expected = `${sitePrefix}/blog/post-2`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('up a directory', () => {
      const target = '../about';
      const expected = `${sitePrefix}/about`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('to sibling directory', () => {
      const target = '../projects/project-1';
      const expected = `${sitePrefix}/projects/project-1`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });
  });

  describe('links with headings', () => {
    it('absolute link with heading', () => {
      const target = '/blog/post-2#introduction';
      const expected = `${sitePrefix}/blog/post-2#introduction`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('only heading (same page)', () => {
      const target = '#conclusion';
      const expected = target;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });

    it('relative link up directory with heading', () => {
      const target = '../about#contact-info';
      const expected = `${sitePrefix}/about#contact-info`;
      const resolved = resolveFilePathToUrlPath({
        target,
        originFilePath,
        sitePrefix,
      });
      expect(resolved).toBe(expected);
    });
  });
});
