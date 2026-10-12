import { describe, expect, it } from 'vitest';
import type { Node } from '@/lib/build-site-tree';
import {
  datedShareDirs,
  hasPostDate,
  linkCollectionCrumb,
  mayBePost,
  postFiles,
  postHostPaths,
  resolvePostRoute,
} from './route';

const files = postFiles([
  '/README.md',
  '/blog/a.md',
  '/blog/2026/b.md',
  '/blog/bundle/index.md',
  '/blog/bundle/pic.png',
  '/blog/guides/README.md',
  '/blog/guides/g.md',
  '/blog/projects/README.md',
  '/blog/projects/p.md',
  '/blog/team/README.md',
  '/blog/team/t.md',
  '/blog/quiet/README.md',
  '/blog/quiet/q.md',
  '/blog/plain/README.md',
  '/blog/plain/x.md',
  '/withreadme/blog/README.md',
  '/withreadme/blog/c.md',
  '/off/blog/README.md',
  '/off/blog/d.md',
  '/plainidx/posts/index.md',
  '/plainidx/posts/e.md',
  '/Blog2/Posts/f.md',
  '/notes/Blog/idea.md',
  '/journal/README.md',
  '/journal/2026-01-01-entry.md',
  '/dated/README.md',
  '/dated/x.md',
  '/optin/README.md',
  '/optin/y.md',
  '/recipes/README.md',
  '/recipes/soup.md',
  '/catalog/README.md',
  '/catalog/item.md',
  '/people/README.md',
  '/people/ada.md',
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
  '/mdx/blog/post.mdx',
  '/both/index.md',
  '/both/README.md',
  '/both/x.md',
]);

const hosts: Record<string, Record<string, unknown> | null> = {
  'README.md': { title: 'Home', layout: 'list' }, // a root listing never makes a collection
  'blog/guides/README.md': { title: 'Guides' }, // prose only: no configuration
  'blog/projects/README.md': { layout: 'list', list: { sort: 'title' } },
  'blog/team/README.md': { layout: 'list', list: { view: 'people' } },
  'blog/quiet/README.md': { postLayout: false },
  'blog/plain/README.md': { layout: 'plain' },
  'withreadme/blog/README.md': { title: 'Blog' },
  'off/blog/README.md': { title: 'Blog', list: false },
  'plainidx/posts/index.md': { title: 'Posts', layout: 'plain' },
  'journal/README.md': { layout: 'list', list: { sort: '-date' } },
  'dated/README.md': { layout: 'list', list: { view: 'grid' } }, // decided by its dated share
  'optin/README.md': { layout: 'list', postLayout: true },
  // the content-catalogs guide's example, verbatim
  'recipes/README.md': { title: 'Recipes', layout: 'list' },
  'catalog/README.md': {
    layout: 'list',
    list: { view: 'grid', sort: 'title' },
  },
  'people/README.md': { layout: 'list', list: { view: 'people' } },
  'foreign/README.md': { layout: 'list', list: { from: 'blog' } },
  'notes/README.md': { title: 'Notes' },
  'fn/blog.md': { title: 'Blog' },
  'vault/Writing.md': { layout: 'list', list: { sort: 'date' } },
  'docs/README.md': { title: 'Docs' },
  'mdx/blog/README.mdx': {
    layout: 'list',
    list: { pageSize: 15, sort: 'date desc' },
  },
};

const dated = { date: '2026-01-01' };
const route = (
  pagePath: string,
  metadata: Record<string, unknown> | null = dated,
  h = hosts,
  datedShare: Record<string, number> = {},
) => resolvePostRoute({ pagePath, metadata, files, hosts: h, datedShare });

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
  it('index.md wins over README.md as the folder host, like the changelog', () => {
    expect(postHostPaths('both/x.md', files)).toEqual([
      'both/index.md',
      'both/README.md',
    ]);
  });
});

describe('mayBePost', () => {
  it('is false only for pages with a layout other than post (or blog)', () => {
    expect(mayBePost({})).toBe(true);
    expect(mayBePost(null)).toBe(true);
    expect(mayBePost({ layout: 'post' })).toBe(true);
    expect(mayBePost({ layout: 'blog' })).toBe(true);
    expect(mayBePost({ layout: 'page' })).toBe(false);
    expect(mayBePost({ layout: 'list' })).toBe(false);
  });
});

describe('hasPostDate', () => {
  it('date, publishDate, pubDate, published or a dated file name; not created', () => {
    expect(hasPostDate({ date: '2026-01-01' }, 'blog/a.md')).toBe(true);
    expect(hasPostDate({ publishDate: '2026-01-01' }, 'blog/a.md')).toBe(true);
    expect(hasPostDate({}, 'blog/2026-01-01-a.md')).toBe(true);
    expect(hasPostDate({ created: '2026-01-01' }, 'blog/a.md')).toBe(false);
    expect(hasPostDate({ date: 'TBD' }, 'blog/a.md')).toBe(false);
    expect(hasPostDate(null, 'blog/a.md')).toBe(false);
  });
});

describe('resolvePostRoute: zero-config blog/posts folders', () => {
  it('a dated page in a README-less blog folder is a post of that folder', () => {
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
  it('only dated pages are posts', () => {
    expect(route('blog/a.md', {})).toEqual({ kind: 'none' });
    expect(route('notes/Blog/idea.md', {})).toEqual({ kind: 'none' });
    expect(route('notes/Blog/idea.md')).toMatchObject({
      collection: { dir: 'notes/Blog' },
    });
  });
  it('subfolders, prose-only sub-indexes and page bundles are items of the blog', () => {
    expect(route('blog/2026/b.md')).toMatchObject({
      collection: { dir: 'blog' },
    });
    expect(route('blog/bundle/index.md')).toMatchObject({
      collection: { dir: 'blog' },
    });
    expect(route('blog/guides/g.md')).toMatchObject({
      collection: { dir: 'blog' },
    });
    // a sub-index with no date stays a normal page
    expect(route('blog/guides/README.md', { title: 'Guides' })).toEqual({
      kind: 'none',
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
  it('folder notes count, including their own case', () => {
    expect(route('fn/blog/z.md')).toMatchObject({
      collection: { dir: 'fn/blog', source: 'auto', hostPath: 'fn/blog.md' },
    });
  });
});

describe('resolvePostRoute: configured subfolders stop the walk up', () => {
  it('postLayout: false on a nested folder: its pages are not posts of the blog above', () => {
    expect(route('blog/quiet/q.md')).toEqual({ kind: 'none' });
  });
  it('a catalogue (sorted by title, or people) inside blog/ is not claimed by the blog', () => {
    expect(route('blog/projects/p.md')).toEqual({ kind: 'none' });
    expect(route('blog/team/t.md')).toEqual({ kind: 'none' });
  });
  it('any other configured index (layout: plain) inside blog/ stops it too', () => {
    expect(route('blog/plain/x.md')).toEqual({ kind: 'none' });
  });
});

describe('resolvePostRoute: layout: list folders', () => {
  it('an explicit sort by date is a feed', () => {
    expect(route('journal/2026-01-01-entry.md', {})).toEqual({
      kind: 'post',
      collection: {
        dir: 'journal',
        options: { sort: '-date' },
        source: 'layout',
        hostPath: 'journal/README.md',
      },
    });
    expect(route('mdx/blog/post.mdx')).toMatchObject({
      collection: { dir: 'mdx/blog', options: { pageSize: 15 } },
    });
    expect(route('vault/Writing/w.md')).toMatchObject({
      collection: { dir: 'vault/Writing', source: 'layout' },
    });
  });
  it('postLayout: true on the host opts a folder in', () => {
    expect(route('optin/y.md')).toMatchObject({
      collection: { dir: 'optin' },
    });
  });
  it('otherwise a feed only when at least 80% of its pages are dated', () => {
    expect(route('dated/x.md', dated, hosts, { dated: 0.8 })).toMatchObject({
      collection: { dir: 'dated' },
    });
    expect(route('dated/x.md', dated, hosts, { dated: 0.5 })).toEqual({
      kind: 'none',
    });
    expect(route('dated/x.md')).toEqual({ kind: 'none' });
  });
  it("the content-catalogs guide's bare layout: list Recipes folder is not posts", () => {
    expect(
      route('recipes/soup.md', { title: 'Soup' }, hosts, { recipes: 0 }),
    ).toEqual({ kind: 'none' });
  });
  it('catalogues (people view, or not sorted by date) are not posts', () => {
    expect(route('catalog/item.md')).toEqual({ kind: 'none' });
    expect(route('people/ada.md')).toEqual({ kind: 'none' });
  });
  it('a layout: list page listing another folder does not make its own folder a collection', () => {
    expect(route('foreign/g.md')).toEqual({ kind: 'none' });
  });
});

describe('datedShareDirs', () => {
  it('names the layout: list folder whose verdict needs the dated share, with its date key', () => {
    expect(datedShareDirs({ pagePath: 'dated/x.md', files, hosts })).toEqual([
      { dir: 'dated', dateKey: 'date' },
    ]);
    expect(
      datedShareDirs({ pagePath: 'journal/2026-01-01-entry.md', files, hosts }),
    ).toEqual([]);
    expect(datedShareDirs({ pagePath: 'blog/a.md', files, hosts })).toEqual([]);
  });
});

describe('resolvePostRoute: other pages', () => {
  it('ordinary folders and the root are not collections', () => {
    expect(route('notes/n.md')).toEqual({ kind: 'none' });
    expect(route('docs/guide.md')).toEqual({ kind: 'none' });
    expect(route('README.md')).toEqual({ kind: 'none' });
  });
  it("the collection's own index is never a post", () => {
    expect(route('withreadme/blog/README.md')).toEqual({ kind: 'none' });
    expect(route('journal/README.md')).toEqual({ kind: 'none' });
    expect(route('fn/blog.md')).toEqual({ kind: 'none' });
  });
  it('any layout other than post opts a page out', () => {
    expect(route('blog/a.md', { ...dated, layout: 'page' })).toEqual({
      kind: 'none',
    });
    expect(route('blog/a.md', { ...dated, layout: 'default' })).toEqual({
      kind: 'none',
    });
  });
  it('layout: post (or blog) forces the layout, with or without a collection or a date', () => {
    expect(route('blog/a.md', { layout: 'post' })).toMatchObject({
      kind: 'post',
      collection: { dir: 'blog' },
    });
    expect(route('docs/guide.md', { layout: 'post' })).toEqual({
      kind: 'post',
      collection: null,
    });
    expect(route('docs/guide.md', { layout: 'blog' })).toEqual({
      kind: 'post',
      collection: null,
    });
  });
  it('a date alone does not make a page a post', () => {
    expect(route('docs/guide.md')).toEqual({ kind: 'none' });
  });
  it('missing host metadata is treated as a plain host', () => {
    expect(route('withreadme/blog/c.md', dated, {})).toMatchObject({
      collection: { dir: 'withreadme/blog' },
    });
    expect(route('journal/2026-01-01-entry.md', {}, {})).toEqual({
      kind: 'none',
    });
  });
});

describe('linkCollectionCrumb', () => {
  const col = (dir: string) => ({
    dir,
    options: undefined,
    source: 'auto' as const,
    hostPath: null,
  });
  const tree: Node[] = [
    {
      kind: 'dir',
      label: 'Post demo',
      name: 'post-demo',
      path: 'post-demo',
      urlPath: '/post-demo',
      children: [
        {
          kind: 'dir',
          label: 'Blog',
          name: 'blog',
          path: 'post-demo/blog',
          urlPath: '/post-demo/blog',
          children: [],
        },
      ],
    },
  ] as Node[];
  it('links a README-less collection folder to its generated listing page, found by its path', () => {
    expect(
      linkCollectionCrumb(
        [
          { label: 'Post demo', href: null },
          { label: 'Blog', href: null },
        ],
        col('post-demo/blog'),
        { tree },
      ),
    ).toEqual([
      { label: 'Post demo', href: null },
      { label: 'Blog', href: '/post-demo/blog' },
    ]);
    // a hidden parent folder (contentHide) does not shift it
    expect(
      linkCollectionCrumb(
        [{ label: 'Blog', href: null }],
        col('post-demo/blog'),
        {
          tree,
        },
      ),
    ).toEqual([{ label: 'Blog', href: '/post-demo/blog' }]);
  });
  it('keeps existing links, sections and pages outside collections as they are', () => {
    const crumbs = [{ label: 'Blog', href: '/post-demo/blog' }];
    expect(linkCollectionCrumb(crumbs, col('post-demo/blog'), { tree })).toBe(
      crumbs,
    );
    const sec = [{ label: 'Writing', href: null }];
    expect(
      linkCollectionCrumb(sec, col('post-demo/blog'), {
        section: 'Writing',
        tree,
      }),
    ).toBe(sec);
    expect(linkCollectionCrumb(sec, null, { tree })).toBe(sec);
    expect(linkCollectionCrumb(sec, col('elsewhere'), { tree })).toBe(sec);
  });
});
