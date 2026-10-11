import { describe, expect, it } from 'vitest';
import {
  linkCollectionCrumb,
  mayBePost,
  postHostPaths,
  resolvePostRoute,
} from './route';

const files = [
  '/README.md',
  '/blog/a.md',
  '/blog/2026/b.md',
  '/blog/bundle/index.md',
  '/blog/bundle/pic.png',
  '/withreadme/blog/README.md',
  '/withreadme/blog/c.md',
  '/off/blog/README.md',
  '/off/blog/d.md',
  '/plainidx/posts/index.md',
  '/plainidx/posts/e.md',
  '/Blog2/Posts/f.md',
  '/projects/README.md',
  '/projects/alpha.md',
  '/projects/beta/index.md',
  '/foreign/README.md',
  '/foreign/g.md',
  '/notes/n.md',
  '/notes/README.md',
  '/fn/blog.md',
  '/fn/blog/z.md',
  '/vault/Writing.md',
  '/vault/Writing/w.md',
  '/docs/guide.md',
  '/docs/README.md',
  '/mdx/blog/README.mdx',
  '/catalog/README.md',
  '/catalog/item.md',
  '/people/README.md',
  '/people/ada.md',
  '/quiet/blog/README.md',
  '/quiet/blog/q.md',
  '/blog/guides/README.md',
  '/blog/guides/g.md',
  '/both/index.md',
  '/both/README.md',
  '/both/x.md',
  '/mdx/blog/post.mdx',
];

const hosts: Record<string, Record<string, unknown> | null> = {
  'README.md': { title: 'Home', layout: 'list' }, // a root listing never makes a collection
  'withreadme/blog/README.md': { title: 'Blog' },
  'off/blog/README.md': { title: 'Blog', list: false },
  'plainidx/posts/index.md': { title: 'Posts', layout: 'plain' },
  'projects/README.md': { layout: 'list', list: { view: 'grid' } },
  'catalog/README.md': {
    layout: 'list',
    list: { view: 'grid', sort: 'title' },
  },
  'people/README.md': { layout: 'list', list: { view: 'people' } },
  'quiet/blog/README.md': { title: 'Blog', postLayout: false },
  'foreign/README.md': { layout: 'list', list: { from: 'blog' } },
  'notes/README.md': { title: 'Notes' },
  'fn/blog.md': { title: 'Blog' },
  'vault/Writing.md': { layout: 'list' },
  'docs/README.md': { title: 'Docs' },
  'mdx/blog/README.mdx': { layout: 'list', list: { pageSize: 15 } },
};

const route = (
  pagePath: string,
  metadata: Record<string, unknown> | null = {},
  h = hosts,
) => resolvePostRoute({ pagePath, metadata, siteFilePaths: files, hosts: h });

describe('postHostPaths', () => {
  it('lists the index and folder-note files of every ancestor, nearest first, never the root', () => {
    expect(postHostPaths('withreadme/blog/c.md', files)).toEqual([
      'withreadme/blog/README.md',
    ]);
    expect(postHostPaths('fn/blog/z.md', files)).toEqual(['fn/blog.md']);
    expect(postHostPaths('blog/2026/b.md', files)).toEqual([]);
    expect(postHostPaths('vault/Writing/w.md', files)).toEqual([
      'vault/Writing.md',
    ]);
  });
  it('starts above the folder of a nested index (it is an item of its parent)', () => {
    expect(postHostPaths('projects/beta/index.md', files)).toEqual([
      'projects/README.md',
    ]);
  });
});

describe('mayBePost', () => {
  it('is false only for pages with a layout other than post', () => {
    expect(mayBePost({})).toBe(true);
    expect(mayBePost(null)).toBe(true);
    expect(mayBePost({ layout: 'post' })).toBe(true);
    expect(mayBePost({ layout: 'page' })).toBe(false);
    expect(mayBePost({ layout: 'list' })).toBe(false);
  });
});

describe('resolvePostRoute', () => {
  it('a page in a README-less blog folder is a post of that folder', () => {
    expect(route('blog/a.md')).toEqual({
      kind: 'post',
      collection: {
        dir: 'blog',
        options: undefined,
        source: 'auto',
        hostPath: null,
      },
    });
  });
  it('subfolders and page bundles are items of the nearest collection', () => {
    expect(route('blog/2026/b.md')).toMatchObject({
      collection: { dir: 'blog' },
    });
    expect(route('blog/bundle/index.md')).toMatchObject({
      collection: { dir: 'blog' },
    });
    expect(route('projects/beta/index.md')).toMatchObject({
      collection: { dir: 'projects', source: 'layout' },
    });
  });
  it('a prose README keeps the folder a collection', () => {
    expect(route('withreadme/blog/c.md')).toMatchObject({
      kind: 'post',
      collection: { dir: 'withreadme/blog', source: 'auto' },
    });
  });
  it('list: false or another layout on the index turns a blog folder off', () => {
    expect(route('off/blog/d.md')).toEqual({ kind: 'none' });
    expect(route('plainidx/posts/e.md')).toEqual({ kind: 'none' });
  });
  it('blog/posts names match in any case', () => {
    expect(route('Blog2/Posts/f.md')).toMatchObject({
      collection: { dir: 'Blog2/Posts' },
    });
  });
  it('layout: list makes its own folder a collection, with its options', () => {
    expect(route('projects/alpha.md')).toEqual({
      kind: 'post',
      collection: {
        dir: 'projects',
        options: { view: 'grid' },
        source: 'layout',
        hostPath: 'projects/README.md',
      },
    });
    expect(route('mdx/blog/post.mdx')).toMatchObject({
      collection: { dir: 'mdx/blog', options: { pageSize: 15 } },
    });
  });
  it('catalogues (people view, or not sorted by date) are not posts', () => {
    expect(route('catalog/item.md')).toEqual({ kind: 'none' });
    expect(route('people/ada.md')).toEqual({ kind: 'none' });
  });
  it('postLayout: false on the folder index keeps its pages as they are', () => {
    expect(route('quiet/blog/q.md')).toEqual({ kind: 'none' });
  });
  it('layout: blog (legacy) counts as layout: post', () => {
    expect(mayBePost({ layout: 'blog' })).toBe(true);
    expect(route('docs/guide.md', { layout: 'blog' })).toEqual({
      kind: 'post',
      collection: null,
    });
  });
  it('a subfolder index inside a blog is a post of the blog', () => {
    expect(route('blog/guides/README.md')).toMatchObject({
      collection: { dir: 'blog' },
    });
    expect(route('blog/guides/g.md')).toMatchObject({
      collection: { dir: 'blog' },
    });
  });
  it('index.md wins over README.md as the folder host, like the changelog', () => {
    expect(postHostPaths('both/x.md', files)).toEqual([
      'both/index.md',
      'both/README.md',
    ]);
  });
  it('a layout: list page listing another folder does not make its own folder a collection', () => {
    expect(route('foreign/g.md')).toEqual({ kind: 'none' });
  });
  it('folder notes count, including their own case', () => {
    expect(route('fn/blog/z.md')).toMatchObject({
      collection: { dir: 'fn/blog', source: 'auto', hostPath: 'fn/blog.md' },
    });
    expect(route('vault/Writing/w.md')).toMatchObject({
      collection: { dir: 'vault/Writing', source: 'layout' },
    });
  });
  it('ordinary folders and the root are not collections', () => {
    expect(route('notes/n.md')).toEqual({ kind: 'none' });
    expect(route('docs/guide.md')).toEqual({ kind: 'none' });
    expect(route('README.md')).toEqual({ kind: 'none' });
  });
  it("the collection's own index is never a post", () => {
    expect(route('withreadme/blog/README.md')).toEqual({ kind: 'none' });
    expect(route('projects/README.md')).toEqual({ kind: 'none' });
    expect(route('fn/blog.md')).toEqual({ kind: 'none' });
  });
  it('any layout other than post opts a page out', () => {
    expect(route('blog/a.md', { layout: 'page' })).toEqual({ kind: 'none' });
    expect(route('blog/a.md', { layout: 'default' })).toEqual({
      kind: 'none',
    });
  });
  it('layout: post forces the layout, with or without a collection', () => {
    expect(route('blog/a.md', { layout: 'post' })).toMatchObject({
      kind: 'post',
      collection: { dir: 'blog' },
    });
    expect(route('docs/guide.md', { layout: 'post' })).toEqual({
      kind: 'post',
      collection: null,
    });
  });
  it('a date alone does not make a page a post', () => {
    expect(route('docs/guide.md', { date: '2026-01-01' })).toEqual({
      kind: 'none',
    });
  });
  it('missing host metadata is treated as a plain host', () => {
    expect(route('withreadme/blog/c.md', {}, {})).toMatchObject({
      collection: { dir: 'withreadme/blog' },
    });
    expect(route('projects/alpha.md', {}, {})).toEqual({ kind: 'none' });
  });
  it('an invalid list: map on a layout: list host still lists its folder', () => {
    expect(
      route(
        'projects/alpha.md',
        {},
        {
          'projects/README.md': { layout: 'list', list: 'grid' },
        },
      ),
    ).toMatchObject({ collection: { dir: 'projects', source: 'layout' } });
  });
});

describe('linkCollectionCrumb', () => {
  const col = (dir: string) => ({
    dir,
    options: undefined,
    source: 'auto' as const,
    hostPath: null,
  });
  it('links a README-less collection folder to its generated listing page', () => {
    expect(
      linkCollectionCrumb(
        [
          { label: 'Post demo', href: null },
          { label: 'Blog', href: null },
          { label: 'Alpha', href: null },
        ],
        col('post-demo/blog'),
      ),
    ).toEqual([
      { label: 'Post demo', href: null },
      { label: 'Blog', href: '/post-demo/blog' },
      { label: 'Alpha', href: null },
    ]);
  });
  it('keeps existing links, sections and pages outside collections as they are', () => {
    const crumbs = [
      { label: 'Blog', href: '/blog' },
      { label: 'A', href: null },
    ];
    expect(linkCollectionCrumb(crumbs, col('blog'))).toBe(crumbs);
    const sec = [
      { label: 'Writing', href: null },
      { label: 'A', href: null },
    ];
    expect(linkCollectionCrumb(sec, col('blog'), 'Writing')).toBe(sec);
    expect(linkCollectionCrumb(sec, null)).toBe(sec);
  });
});
