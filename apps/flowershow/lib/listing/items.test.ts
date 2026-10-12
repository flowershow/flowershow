import { describe, expect, it } from 'vitest';
import {
  canonicalGroupKeys,
  folderHasPages,
  groupKey,
  itemTitle,
  type ListingRow,
  nearestFolders,
  resolveFolderCase,
  selectListingRows,
  slotDate,
  toListingItem,
} from './items';
import { DEFAULT_FIELDS, type ListingSpec } from './spec';

const row = (
  path: string,
  metadata: Record<string, unknown> | null = {},
  extra: Partial<ListingRow> = {},
): ListingRow => ({
  id: path,
  path,
  appPath: '/' + path.replace(/\.mdx?$/, '').replace(/\/(README|index)$/i, ''),
  permalink: null,
  metadata,
  ...extra,
});
const TODAY = '2026-10-10';
const spec = (o: Partial<ListingSpec> = {}) => ({
  from: 'b',
  where: {},
  sort: { field: 'date', direction: 'desc' as const },
  fields: DEFAULT_FIELDS.list,
  group: { by: 'none' as const },
  ...o,
});
const paths = (rows: ListingRow[]) => rows.map((r) => r.path);

describe('which pages are items (4.3)', () => {
  const rows = [
    row('blog/README.md'),
    row('blog/readme.MD'),
    row('blog/a.md', { date: '2026-01-02' }),
    row('blog/sub/index.md', { date: '2026-01-03' }),
    row('blog/draft.md', { draft: true, date: '2026-02-01' }),
    row('blog/hidden.md', { publish: false, date: '2026-02-02' }),
    row('blog/pic.png', null, { appPath: null }),
    row('blog/b.mdx', { date: '2026-01-01' }),
    row('blogger/x.md', { date: '2026-03-01' }),
  ];
  it('keeps nested indexes, drops own index (any case), drafts, unpublished and non-pages', () => {
    expect(
      paths(selectListingRows(rows, spec({ from: 'blog' }), TODAY)),
    ).toEqual(['blog/sub/index.md', 'blog/a.md', 'blog/b.mdx']);
  });
});

describe('the date slot (4.4; tech M5)', () => {
  it('default chain: date → pubDate → published → publishDate → created → file name', () => {
    expect(slotDate(row('b/x.md', { pubDate: '2025-01-02' }), 'date')).toBe(
      '2025-01-02',
    );
    expect(
      slotDate(
        row('b/x.md', { created: '2025-03-04', published: '2025-02-03' }),
        'date',
      ),
    ).toBe('2025-02-03');
    expect(slotDate(row('b/2024-05-06-x.md', {}), 'date')).toBe('2024-05-06');
    expect(slotDate(row('b/x.md', { date: 'TBD' }), 'date')).toBeNull();
  });
  it('an explicit key reads only that key; sort: date follows the slot', () => {
    expect(
      slotDate(
        row('b/2024-05-06-x.md', { published: '2025-02-03' }),
        'published',
      ),
    ).toBe('2025-02-03');
    expect(slotDate(row('b/2024-05-06-x.md', {}), 'published')).toBeNull();
    const rows = [
      row('b/a.md', { pubDate: '2026-01-01' }),
      row('b/b.md', { pubDate: '2026-03-01' }),
    ];
    expect(
      paths(
        selectListingRows(
          rows,
          spec({ fields: { ...DEFAULT_FIELDS.list, date: 'pubDate' } }),
          TODAY,
        ),
      ),
    ).toEqual(['b/b.md', 'b/a.md']);
  });
});

describe('sort (4.5)', () => {
  it('date desc: dated newest first, ties by path desc, undated after by title', () => {
    const rows = [
      row('b/x.md', { title: 'Zed' }),
      row('b/2026-05-01-y.md'),
      row('b/a.md', { date: '2026-05-01' }),
      row('b/c.md', { title: 'Alpha' }),
      row('b/d.md', { date: '2026-06-01' }),
    ];
    expect(paths(selectListingRows(rows, spec(), TODAY))).toEqual([
      'b/d.md',
      'b/a.md',
      'b/2026-05-01-y.md',
      'b/c.md',
      'b/x.md',
    ]);
  });
  it('custom field: numbers numerically, missing last in both directions', () => {
    const rows = [
      row('p/a.md', { weight: 10 }),
      row('p/b.md', { weight: '9' }),
      row('p/c.md', {}),
      row('p/d.md', { weight: 100 }),
    ];
    expect(
      paths(
        selectListingRows(
          rows,
          spec({ from: 'p', sort: { field: 'weight', direction: 'asc' } }),
          TODAY,
        ),
      ),
    ).toEqual(['p/b.md', 'p/a.md', 'p/d.md', 'p/c.md']);
    expect(
      paths(
        selectListingRows(
          rows,
          spec({ from: 'p', sort: { field: 'weight', direction: 'desc' } }),
          TODAY,
        ),
      ),
    ).toEqual(['p/d.md', 'p/a.md', 'p/b.md', 'p/c.md']);
  });
  it('title sort is locale-aware and numeric; never throws on odd dates', () => {
    const rows = [
      row('p/1.md', { title: 'item 10' }),
      row('p/2.md', { title: 'Item 9' }),
      row('p/3.md', { title: 'élan' }),
    ];
    expect(
      selectListingRows(
        rows,
        spec({ from: 'p', sort: { field: 'title', direction: 'asc' } }),
        TODAY,
      ).map(itemTitle),
    ).toEqual(['élan', 'Item 9', 'item 10']);
    expect(() =>
      selectListingRows(
        [row('p/a.md', { date: 'TBD' }), row('p/b.md', { date: { x: 1 } })],
        spec({ from: 'p' }),
        TODAY,
      ),
    ).not.toThrow();
  });
  it('[B2 data, tested now] group-first ordering: each group appears once (UX M-12, tech M4)', () => {
    const rows = [
      row('t/ann.md', { title: 'Ann', team: 'Eng' }),
      row('t/bob.md', { title: 'Bob', team: 'Design' }),
      row('t/cat.md', { title: 'Cat', team: 'Eng' }),
      row('t/dan.md', { title: 'Dan' }),
    ];
    const s = spec({
      from: 't',
      sort: { field: 'title', direction: 'asc' },
      group: { by: 'field', field: 'team' },
    });
    expect(paths(selectListingRows(rows, s, TODAY))).toEqual([
      't/bob.md',
      't/ann.md',
      't/cat.md',
      't/dan.md',
    ]); // Design, Eng, Eng, Other
    const years = [
      row('y/a.md', { title: 'A', date: '2025-01-01' }),
      row('y/b.md', { title: 'B', date: '2026-01-01' }),
      row('y/c.md', { title: 'C', date: '2025-06-01' }),
    ];
    expect(
      paths(
        selectListingRows(
          years,
          spec({
            from: 'y',
            sort: { field: 'title', direction: 'asc' },
            group: { by: 'year' },
          }),
          TODAY,
        ),
      ),
    ).toEqual(['y/b.md', 'y/a.md', 'y/c.md']); // 2026, then 2025 (A, C)
  });
});

describe('group keys that differ only in case or accents', () => {
  it('sort contiguously and share the most common spelling', () => {
    const rows = [
      row('t/ann.md', { title: 'Ann', team: 'Design' }),
      row('t/bob.md', { title: 'Bob', team: 'design' }),
      row('t/cat.md', { title: 'Cat', team: 'Design' }),
      row('t/dan.md', { title: 'Dan', team: 'Eng' }),
      row('t/eve.md', { title: 'Eve', team: 'design' }),
      row('t/fay.md', { title: 'Fay', team: 'Désign' }),
      row('t/gus.md', { title: 'Gus', team: 'Design' }),
    ];
    const s = spec({
      from: 't',
      sort: { field: 'title', direction: 'asc' },
      group: { by: 'field', field: 'team' },
    });
    const sorted = selectListingRows(rows, s, TODAY);
    expect(paths(sorted)).toEqual([
      't/ann.md',
      't/bob.md',
      't/cat.md',
      't/eve.md',
      't/fay.md',
      't/gus.md',
      't/dan.md',
    ]);
    expect(canonicalGroupKeys(sorted.map((r) => groupKey(r, s)!))).toEqual([
      ...Array(6).fill('Design'),
      'Eng',
    ]);
  });
  it('ties go to the first spelling in code-point order; Other stays apart', () => {
    expect(canonicalGroupKeys(['eng', 'Eng', '', 'ENG'])).toEqual([
      'ENG',
      'ENG',
      '',
      'ENG',
    ]);
  });
});

describe('groupKey', () => {
  it('matches the frontmatter key ignoring case, preferring an exact match', () => {
    const s = spec({ from: 't', group: { by: 'field', field: 'Team' } });
    expect(groupKey(row('t/a.md', { team: 'Eng' }), s)).toBe('Eng');
    expect(groupKey(row('t/a.md', { team: 'Eng', Team: 'Ops' }), s)).toBe(
      'Ops',
    );
    expect(groupKey(row('t/a.md', {}), s)).toBe('');
  });
  it('time units from the date slot, folder, field', () => {
    const r = row('blog/tutorials/x.md', {
      date: '2026-09-18',
      status: ['Shipped', 'x'],
    });
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'year' } }))).toBe(
      '2026',
    );
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'month' } }))).toBe(
      '2026-09',
    );
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'day' } }))).toBe(
      '2026-09-18',
    );
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'folder' } }))).toBe(
      'tutorials',
    );
    expect(
      groupKey(
        row('blog/top.md', {}),
        spec({ from: 'blog', group: { by: 'folder' } }),
      ),
    ).toBe('');
    expect(
      groupKey(
        r,
        spec({ from: 'blog', group: { by: 'field', field: 'status' } }),
      ),
    ).toBe('Shipped');
    expect(
      groupKey(r, spec({ from: 'blog', group: { by: 'none' } })),
    ).toBeNull();
  });
});

describe('where (4.6)', () => {
  const rows = [
    row('p/a.md', {
      type: 'episode',
      year: 2026,
      guests: ['Ada', '[[Grace]]'],
      date: '2026-12-01',
    }),
    row('p/b.md', { type: 'trailer', year: '2025', date: '2025-01-01' }),
    row('p/c.md', { type: 'episode' }, { tags: [{ tag: 'featured/2026' }] }),
  ];
  const sel = (where: Record<string, string[]>) =>
    paths(
      selectListingRows(
        rows,
        spec({ from: 'p', where, sort: { field: 'path', direction: 'asc' } }),
        TODAY,
      ),
    );
  it('scalar equality loose on type; lists contain; list values are any-of', () => {
    expect(sel({ type: ['episode'] })).toEqual(['p/a.md', 'p/c.md']);
    expect(sel({ year: ['2026'] })).toEqual(['p/a.md']);
    expect(sel({ guests: ['Grace'] })).toEqual(['p/a.md']);
    expect(sel({ type: ['trailer', 'bonus'] })).toEqual(['p/b.md']);
  });
  it('tags use the Tag rows and the nested-tag rule; upcoming/past use the date slot', () => {
    expect(sel({ tags: ['featured'] })).toEqual(['p/c.md']);
    expect(sel({ date: ['upcoming'] })).toEqual(['p/a.md']);
    expect(sel({ date: ['past'] })).toEqual(['p/b.md']);
  });
});

describe('folders', () => {
  const files = [
    '/Blog/a.md',
    '/Projects/x/index.md',
    '/notes/n.md',
    '/assets/pic.png',
    '/blog-old/p.md',
  ];
  it('resolveFolderCase keeps an exact folder, else a case-insensitive match', () => {
    expect(resolveFolderCase('blog', files)).toBe('Blog');
    expect(resolveFolderCase('Projects/x', files)).toBe('Projects/x');
    expect(resolveFolderCase('missing', files)).toBe('missing');
  });
  it('folderHasPages and nearestFolders (UX M-10)', () => {
    expect(folderHasPages('notes', files)).toBe(true);
    expect(folderHasPages('assets', files)).toBe(false);
    expect(folderHasPages('', files)).toBe(true);
    // edit distance from "posts": notes 3, Projects 4, Blog 5 (assets has no pages)
    expect(nearestFolders('posts', files)).toEqual([
      'notes',
      'Projects',
      'Blog',
    ]);
  });
});

describe('itemTitle', () => {
  it('frontmatter, numbers, file names, nested folders', () => {
    expect(itemTitle(row('b/x.md', { title: 1984 }))).toBe('1984');
    expect(
      itemTitle(
        row('b/2026-09-01-filename-only-post.md', {
          title: '2026-09-01-filename-only-post',
          computed: ['title'],
        }),
      ),
    ).toBe('Filename only post');
    expect(
      itemTitle(
        row('projects/alpha/index.md', { title: 'index', computed: ['title'] }),
      ),
    ).toBe('Alpha');
    expect(itemTitle(row('projects/beta/README.md', { title: 'README' }))).toBe(
      'Beta',
    );
  });
});

describe('toListingItem (4.4, Review Focus 2 and 3)', () => {
  const ctx = {
    siteHostname: 'demo.flowershow.site',
    locale: 'en-US',
    files: [
      '/blog/assets/cover.jpg',
      '/blog/2026/pic ü.png',
      '/people/ada.md',
      '/assets/sapiens.jpg',
      '/notes/page.md',
    ],
    fields: {
      ...DEFAULT_FIELDS.list,
      eyebrow: ['category'],
      meta: ['status', 'guests'],
    },
  };
  it('maps the default slots', () => {
    const item = toListingItem(
      row(
        'blog/a.md',
        {
          title: 'A',
          date: '2026-09-18',
          description: 'D',
          image: 'assets/cover.jpg',
          authors: 'ada',
          category: 'Themes',
        },
        { permalink: '/a-post' },
      ),
      ctx,
    );
    expect(item).toMatchObject({
      url: '/a-post',
      title: 'A',
      date: '2026-09-18',
      dateInEyebrow: false,
      summary: 'D',
      authorHandles: ['ada'],
      eyebrow: [{ text: 'Themes' }],
      group: null,
    });
    expect(item.image).toBe(
      'http://demo.flowershow.site/blog/assets/cover.jpg',
    );
  });
  it('titles are plain text too: no code ticks or emphasis markers', () => {
    const title = (t: string) =>
      toListingItem(row('blog/a.md', { title: t }), ctx).title;
    expect(title('`fl` now creates or syncs **automatically**')).toBe(
      'fl now creates or syncs automatically',
    );
    expect(title('Array<string> helpers')).toBe('Array<string> helpers');
    expect(title('2 * 3')).toBe('2 * 3');
  });
  it('summaries are plain text: code spans keep their text, stray fences and emphasis go', () => {
    const summary = (description: string) =>
      toListingItem(row('blog/a.md', { title: 'A', description }), ctx).summary;
    expect(
      summary(
        'A blog/ folder lists itself, and a ```blog block or layout: list shows any folder.',
      ),
    ).toBe(
      'A blog/ folder lists itself, and a blog block or layout: list shows any folder.',
    );
    expect(summary('Add `<List />` inline with `fl publish`.')).toBe(
      'Add <List /> inline with fl publish.',
    );
    expect(
      summary('**Bold** and [a link](https://x.y) and [[Page|alias]]'),
    ).toBe('Bold and a link and alias');
    expect(summary('``')).toBeNull();
    // hand-written descriptions keep text that only looks like html
    expect(summary('Typed as Map<K, V> and Array<string>.')).toBe(
      'Typed as Map<K, V> and Array<string>.',
    );
    expect(summary('Docs at <https://flowershow.app>.')).toBe(
      'Docs at https://flowershow.app.',
    );
  });
  it('image fallbacks: image → cover → heroImage → thumbnail → avatar; unquoted wiki links', () => {
    expect(
      toListingItem(
        row('x/a.md', { heroImage: 'https://cdn.x.org/h.png' }),
        ctx,
      ).image,
    ).toBe('https://cdn.x.org/h.png');
    expect(
      toListingItem(row('x/a.md', { cover: [['sapiens.jpg']] }), ctx).image,
    ).toBe('http://demo.flowershow.site/assets/sapiens.jpg');
    expect(
      toListingItem(
        row('people/ada.md', { avatar: 'https://x.org/ada.png' }),
        ctx,
      ).image,
    ).toBe('https://x.org/ada.png');
  });
  it('only real images become src (tech minor 9)', () => {
    expect(
      toListingItem(row('x/a.md', { image: '[[page]]' }), ctx).image,
    ).toBeNull();
    expect(
      toListingItem(row('x/a.md', { image: '#hero' }), ctx).image,
    ).toBeNull();
    expect(
      toListingItem(row('x/a.md', { image: 'mailto:a@b.c' }), ctx).image,
    ).toBeNull();
  });
  it('authors: authors → author; wiki-link handles; display names stay text', () => {
    expect(
      toListingItem(row('x/a.md', { author: 'Jane Smith' }), ctx).authorHandles,
    ).toEqual(['Jane Smith']);
    expect(
      toListingItem(row('x/a.md', { authors: ['[[olayway]]'] }), ctx)
        .authorHandles,
    ).toEqual(['olayway']);
    expect(
      toListingItem(row('x/a.md', { authors: [['ada']] }), ctx).authorHandles,
    ).toEqual(['ada']);
  });
  it('eyebrow: date moves the date up and out of the meta line (UX M-8)', () => {
    const c = {
      ...ctx,
      fields: { ...ctx.fields, eyebrow: ['date', 'category'], meta: [] },
    };
    const item = toListingItem(
      row('x/a.md', { date: '2026-09-18', category: 'Themes' }),
      c,
    );
    expect(item).toMatchObject({
      dateInEyebrow: true,
      eyebrow: [{ text: 'Sep 18, 2026' }, { text: 'Themes' }],
    });
  });
  it('people defaults: bio → description, avatar → image → photo, role in meta', () => {
    const c = { ...ctx, fields: DEFAULT_FIELDS.people };
    const item = toListingItem(
      row('people/ada.md', {
        title: 'Ada',
        description: 'Mathematician.',
        photo: 'https://x.org/p.png',
        role: 'Founder',
      }),
      c,
    );
    expect(item).toMatchObject({
      summary: 'Mathematician.',
      image: 'https://x.org/p.png',
      date: null,
      meta: [{ key: 'role', label: 'Role', parts: [{ text: 'Founder' }] }],
    });
  });
  it('encodes spaces and non-ASCII; URL is the stored appPath with a single leading slash', () => {
    expect(
      toListingItem(
        row('blog/2026/nested post ü.md', { image: 'pic ü.png' }),
        ctx,
      ).image,
    ).toBe(
      `http://demo.flowershow.site/blog/2026/${encodeURIComponent('pic ü.png')}`,
    );
    expect(
      toListingItem(
        row(
          'blog/2026/nested post ü.md',
          {},
          { appPath: '/blog/2026/nested+post+%C3%BC' },
        ),
        ctx,
      ).url,
    ).toBe('/blog/2026/nested+post+%C3%BC');
    expect(
      toListingItem(
        row('x/a.md', {}, { permalink: 'javascript:alert(1)' }),
        ctx,
      ).url,
    ).toBe('/javascript:alert(1)');
    expect(
      toListingItem(row('x/a.md', {}, { permalink: '//evil.com/x' }), ctx).url,
    ).toBe('/evil.com/x');
  });
  it('never throws on malformed frontmatter', () => {
    const item = toListingItem(
      row('x/a.md', {
        title: 1984,
        date: 'TBD',
        authors: { name: 'x' },
        image: ['a', 'b'],
        description: 42,
        category: { a: 1 },
        status: { nested: true },
      }),
      ctx,
    );
    expect(item).toMatchObject({
      title: '1984',
      date: null,
      authorHandles: [],
      image: null,
      summary: '42',
      eyebrow: [],
    });
    expect(item.meta).toEqual([]);
  });
  it('meta values: wiki links resolve, booleans and numbers stringify', () => {
    const item = toListingItem(
      row('x/a.md', {
        status: true,
        guests: ['[[ada|Ada Lovelace]]', 'Grace Hopper'],
      }),
      ctx,
    );
    expect(item.meta).toEqual([
      { key: 'status', label: 'Status', parts: [{ text: 'Yes' }] },
      {
        key: 'guests',
        label: 'Guests',
        parts: [
          { text: 'Ada Lovelace', href: '/people/ada' },
          { text: 'Grace Hopper' },
        ],
      },
    ]);
  });
});
