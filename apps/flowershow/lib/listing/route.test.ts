import { describe, expect, it } from 'vitest';
import {
  autoListingFor,
  hasExplicitListing,
  isAutoListingDirName,
  mayBeListingRoute,
  resolveListingRoute,
  virtualListingDir,
} from './route';

const files = [
  '/blog/a.md',
  '/blog/2026/b.md',
  '/Posts/x.md',
  '/posts-old/y.md',
  '/empty/blog/pic.png',
  '/withreadme/blog/README.md',
  '/withreadme/blog/c.md',
  '/My Blog/posts/p.md',
  '/lower/blog/readme.md',
  '/lower/blog/q.md',
  '/notes.md',
  '/notes/n.md',
  '/podcast.md',
  '/podcast/ep.md',
  '/fn/blog.md',
  '/fn/blog/z.md',
  '/vault/blog.md',
  '/vault/Blog/w.md',
];
const route = (o: Partial<Parameters<typeof resolveListingRoute>[0]>) =>
  resolveListingRoute({
    slug: '/',
    blob: null,
    metadata: null,
    content: '',
    siteFilePaths: files,
    changelogKind: null,
    ...o,
  });

describe('names and detection', () => {
  it('blog and posts, any case, any depth; nothing else', () => {
    for (const d of ['blog', 'Blog', 'POSTS', 'notes/blog', '/blog/'])
      expect(isAutoListingDirName(d)).toBe(true);
    for (const d of [
      '',
      'articles',
      'news',
      'notes',
      'blogs',
      'blog/2026',
      'myblog',
    ])
      expect(isAutoListingDirName(d)).toBe(false);
  });
  it('hasExplicitListing uses the AST: nested fences count, prose and other code do not', () => {
    expect(hasExplicitListing('Intro\n\n```blog\nlimit: 3\n```')).toBe(true);
    expect(hasExplicitListing('> [!note]\n> ```list\n> from: x\n> ```')).toBe(
      true,
    );
    expect(hasExplicitListing('- item\n\n  ```blog\n  ```')).toBe(true);
    expect(hasExplicitListing('~~~base\nviews: []\n~~~')).toBe(true);
    expect(hasExplicitListing('<List dir="/blog" />')).toBe(true);
    expect(
      hasExplicitListing(
        '---\ntitle: x\n---\nI keep a blog.\n\n- [One](one.md)',
      ),
    ).toBe(false);
    expect(hasExplicitListing('```js\nconst blog = 1;\n```')).toBe(false);
    expect(hasExplicitListing('```Blog\n```')).toBe(false); // the plugin is case-sensitive too, so this renders nothing and is not a listing
    expect(hasExplicitListing('Use `<List />` in MDX.')).toBe(false); // inline code, not an element
  });
  it('Obsidian %% comments %% hide a fence from detection, as they do from rendering', () => {
    expect(hasExplicitListing('Prose.\n\n%%\n```blog\nlimit: 3\n```\n%%')).toBe(
      false,
    );
    expect(hasExplicitListing('%% a note to self %%\n\n```blog\n```')).toBe(
      true,
    );
  });
  it('MDX: a fence inside a JSX element (no blank lines) counts; in .md it is raw HTML and does not', () => {
    const jsx = '<div className="x">\n```blog\nlimit: 3\n```\n</div>';
    expect(hasExplicitListing(jsx, { mdx: true })).toBe(true);
    expect(hasExplicitListing(jsx)).toBe(false);
    expect(
      hasExplicitListing('<div>\n```js\nconst blog = 1;\n```\n</div>', {
        mdx: true,
      }),
    ).toBe(false);
  });
});

describe('virtualListingDir (case 1)', () => {
  it('README-less blog/posts folder with pages; slug in the URL form', () => {
    expect(virtualListingDir('/blog', files)).toBe('blog');
    expect(virtualListingDir('/Posts', files)).toBe('Posts');
    expect(virtualListingDir('/posts', files)).toBeNull(); // the slug must match the folder's real case
    expect(virtualListingDir('/My+Blog/posts', files)).toBe('My Blog/posts'); // encoded slug (tech minor 2)
    expect(virtualListingDir('/lower/blog', files)).toBe('lower/blog'); // readme.md is not an index for ingestion, so /lower/blog has no blob
    expect(virtualListingDir('/empty/blog', files)).toBeNull();
    expect(virtualListingDir('/withreadme/blog', files)).toBeNull();
    expect(virtualListingDir('/articles', ['/articles/a.md'])).toBeNull();
  });
});

describe('autoListingFor (cases 2 and 3)', () => {
  const prose = 'Notes on building things.';
  it('prose-only README in a blog/posts folder; folder note beside the folder', () => {
    expect(
      autoListingFor({
        blobPath: 'blog/README.md',
        metadata: { title: 'Blog' },
        content: prose,
        siteFilePaths: files,
      }),
    ).toEqual({ options: undefined, defaultFrom: 'blog' });
    expect(
      autoListingFor({
        blobPath: 'fn/blog.md',
        metadata: {},
        content: prose,
        siteFilePaths: files,
      }),
    ).toEqual({ options: undefined, defaultFrom: 'fn/blog' });
    // Obsidian capitalises folders: blog.md beside Blog/ (Review Focus 1)
    expect(
      autoListingFor({
        blobPath: 'vault/blog.md',
        metadata: {},
        content: prose,
        siteFilePaths: files,
      }),
    ).toEqual({ options: undefined, defaultFrom: 'vault/Blog' });
    expect(
      autoListingFor({
        blobPath: 'blog/README.md',
        metadata: { list: { view: 'grid' } },
        content: prose,
        siteFilePaths: files,
      })?.options,
    ).toEqual({ view: 'grid' });
  });
  it('back-compat: any layout, list: false, an existing listing, other folders, other pages are untouched', () => {
    const none = (
      blobPath: string,
      metadata: Record<string, unknown>,
      content = prose,
    ) =>
      expect(
        autoListingFor({ blobPath, metadata, content, siteFilePaths: files }),
      ).toBeNull();
    none('blog/README.md', { layout: 'plain' });
    none('blog/README.md', { list: false });
    none('blog/README.md', { list: 'false' });
    none('blog/README.mdx', {}, '<List dir="/blog" />');
    none('blog/index.md', {}, '> ```blog\n> ```');
    none('notes.md', {}); // notes is not an auto folder name
    none('blog/first-post.md', {});
    none('podcast.md', {}); // folder note, but podcast is not an auto folder name
    none(
      'blog/README.mdx',
      {},
      'Intro.\n\n<section>\n```blog\nlimit: 3\n```\n</section>',
    ); // MDX parses the fence inside JSX: no second listing
  });
  it('a folder note beside an attachments-only folder gets no listing (no error card on a published page)', () => {
    expect(
      autoListingFor({
        blobPath: 'att/posts.md',
        metadata: {},
        content: 'Prose.',
        siteFilePaths: ['/att/posts.md', '/att/posts/cover.png'],
      }),
    ).toBeNull();
  });
});

describe('resolveListingRoute (precedence table)', () => {
  it('no blob: virtual folder; changelog and other misses are none', () => {
    expect(route({ slug: '/blog' })).toEqual({
      kind: 'virtual',
      dir: 'blog',
      title: 'Blog',
    });
    expect(route({ slug: '/changelog', changelogKind: 'index' })).toEqual({
      kind: 'none',
    });
    expect(route({ slug: '/nope' })).toEqual({ kind: 'none' });
  });
  it('layout: list wins and is page-level with its view and page size', () => {
    expect(
      route({
        slug: '/projects',
        blob: { path: 'projects/README.md' },
        metadata: { layout: 'list', list: { view: 'grid' } },
        siteFilePaths: [...files, '/projects/a.md'],
      }),
    ).toEqual({
      kind: 'page',
      options: { view: 'grid' },
      defaultFrom: 'projects',
      source: 'layout',
      view: 'grid',
      pageSize: 20,
    });
  });
  it('auto cases are page-level list views', () => {
    expect(
      route({
        slug: '/blog',
        blob: { path: 'blog/README.md' },
        metadata: {},
        content: 'Hi.',
      }),
    ).toMatchObject({
      kind: 'page',
      source: 'auto',
      view: 'list',
      defaultFrom: 'blog',
    });
  });
  it('a changelog index or file is never a listing page; an invalid list: map still routes (the plugin shows the error card)', () => {
    expect(
      route({
        slug: '/changelog',
        blob: { path: 'changelog/README.md' },
        metadata: { layout: 'list' },
        changelogKind: 'index',
      }),
    ).toEqual({ kind: 'none' });
    expect(
      route({
        slug: '/blog',
        blob: { path: 'blog/README.md' },
        metadata: { layout: 'list', list: { veiw: 'x' } },
      }),
    ).toMatchObject({ kind: 'page', view: 'list' });
  });
});

describe('mayBeListingRoute (skip the site path query on ordinary pages)', () => {
  const cases: Array<Parameters<typeof resolveListingRoute>[0]> = [
    {
      slug: '/blog',
      blob: null,
      metadata: null,
      content: '',
      siteFilePaths: files,
      changelogKind: null,
    },
    {
      slug: '/My+Blog/posts',
      blob: null,
      metadata: null,
      content: '',
      siteFilePaths: files,
      changelogKind: null,
    },
    {
      slug: '/blog',
      blob: { path: 'blog/README.md' },
      metadata: {},
      content: 'Hi.',
      siteFilePaths: files,
      changelogKind: null,
    },
    {
      slug: '/fn/blog',
      blob: { path: 'fn/blog.md' },
      metadata: {},
      content: 'Hi.',
      siteFilePaths: files,
      changelogKind: null,
    },
    {
      slug: '/vault/blog',
      blob: { path: 'vault/blog.md' },
      metadata: {},
      content: 'Hi.',
      siteFilePaths: files,
      changelogKind: null,
    },
    {
      slug: '/podcast',
      blob: { path: 'podcast.md' },
      metadata: { layout: 'list' },
      content: '',
      siteFilePaths: files,
      changelogKind: null,
    },
    {
      slug: '/notes',
      blob: { path: 'notes.md' },
      metadata: { layout: 'list' },
      content: '',
      siteFilePaths: files,
      changelogKind: null,
    },
  ];
  it('is true for every page the resolver makes a listing (sound)', () => {
    for (const c of cases) {
      expect(resolveListingRoute(c).kind, c.slug).not.toBe('none');
      expect(
        mayBeListingRoute({
          slug: c.slug,
          blobPath: c.blob?.path ?? null,
          metadata: c.metadata,
        }),
        c.slug,
      ).toBe(true);
    }
  });
  it('is false for ordinary pages, so they never load the site paths for listings', () => {
    for (const [slug, blobPath, metadata] of [
      ['/about', 'about.md', { title: 'About' }],
      ['/blog/first-post', 'blog/first-post.md', {}],
      ['/notes', 'notes/README.md', { layout: 'plain' }],
      ['/', 'README.md', {}],
      ['/articles', null, null],
    ] as const)
      expect(mayBeListingRoute({ slug, blobPath, metadata }), slug).toBe(false);
  });
});
