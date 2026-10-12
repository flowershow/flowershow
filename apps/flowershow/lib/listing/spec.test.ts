import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FIELDS,
  implicitListingFrom,
  parseListingBlock,
  parseListingSpec,
} from './spec';

const ok = (r: ReturnType<typeof parseListingSpec>) => {
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.spec;
};
const errs = (r: ReturnType<typeof parseListingSpec>) => (r.ok ? [] : r.errors);
const notes = (r: ReturnType<typeof parseListingSpec>) => (r.ok ? r.notes : []);
const blog = (o: unknown) => parseListingSpec(o, { source: 'blog' });
const page = (o: unknown) =>
  parseListingSpec(o, { source: 'layout', defaultFrom: 'blog' });

describe('presets and from', () => {
  it('an empty ```blog block', () => {
    expect(ok(parseListingBlock('blog', ''))).toEqual({
      from: 'blog',
      fromRelative: false,
      view: 'list',
      sort: { field: 'date', direction: 'desc' },
      limit: null,
      pageSize: null,
      where: {},
      fields: {
        eyebrow: [],
        title: 'title',
        summary: 'description',
        date: 'date',
        image: 'image',
        authors: 'authors',
        meta: [],
      },
      media: 'thumb',
      mediaSide: 'left',
      ratio: '3/2',
      defaultImage: null,
      featured: 0,
      group: { by: 'none' },
      headings: { more: 'More posts', recent: 'Recent posts' },
    });
  });
  it('```list requires from; dir/folder are aliases; ./ is relative', () => {
    expect(errs(parseListingBlock('list', ''))).toEqual([
      '"from" is required: the folder to list, e.g. "from: blog".',
    ]);
    expect(ok(parseListingBlock('list', 'dir: /blog/')).from).toBe('blog');
    expect(ok(parseListingBlock('list', 'Folder: notes/2026')).from).toBe(
      'notes/2026',
    );
    expect(ok(parseListingBlock('list', 'from: ./posts'))).toMatchObject({
      from: 'posts',
      fromRelative: true,
    });
    expect(errs(parseListingBlock('list', 'from: a\ndir: b'))).toEqual([
      'Use either "from" or "dir", not both.',
    ]);
  });
  it('from must be a folder (people need one page per person)', () => {
    expect(errs(parseListingBlock('list', 'from: team.md'))).toEqual([
      '"from" must be a folder; "team.md" is a page. Listings show one page per item, e.g. one page per person in "people/".',
    ]);
  });
  it('from: strips slashes and rootDir, rejects ..', () => {
    expect(
      ok(
        parseListingSpec(
          { from: '/Public/blog/' },
          { source: 'list', rootDir: 'Public' },
        ),
      ).from,
    ).toBe('blog');
    expect(ok(parseListingSpec({ from: '/' }, { source: 'list' })).from).toBe(
      '',
    );
    expect(
      errs(parseListingSpec({ from: '../x' }, { source: 'list' })),
    ).toEqual(['"from" cannot contain "..".']);
  });
  it('layout: list without a folder; a non-map list:', () => {
    expect(
      errs(parseListingSpec({}, { source: 'layout', defaultFrom: null })),
    ).toEqual([
      'Add "list: { from: <folder> }" to the frontmatter: this page is not a folder index and has no folder with the same name.',
    ]);
    expect(
      errs(parseListingSpec('blog', { source: 'layout', defaultFrom: 'x' }))[0],
    ).toMatch(/must be "key: value" lines \(got a string\)/);
  });
});

describe('keys: case-insensitive, aliases, hints', () => {
  it('silently accepts the natural guesses', () => {
    const s = ok(
      parseListingBlock(
        'list',
        'folder: blog\nlayout: cards\npagesize: 5\nSortBy: title\nsortDirection: desc',
      ),
    );
    expect(s).toMatchObject({
      from: 'blog',
      view: 'grid',
      pageSize: 5,
      sort: { field: 'title', direction: 'desc' },
    });
    expect(ok(blog({ sort: '-weight' })).sort).toEqual({
      field: 'weight',
      direction: 'desc',
    });
  });
  it('produces the design 3.8 messages', () => {
    expect(
      errs(parseListingBlock('list', 'from: blog\nperPage: 5\nimage: cover')),
    ).toEqual([
      'Unknown key "perPage". Use "pageSize".',
      'Unknown key "image". Use "media: cover" (to choose which field holds the image, use "fields: { image: <key> }").',
    ]);
  });
  it('other hints and close matches', () => {
    expect(errs(blog({ limt: 3 }))).toEqual([
      'Unknown key "limt". Did you mean "limit"?',
    ]);
    expect(errs(blog({ filter: 'x' }))).toEqual([
      'Unknown key "filter". Use "where".',
    ]);
    expect(errs(blog({ show: ['title'] }))).toEqual([
      'Unknown key "show". Use "fields", e.g. "fields: [title, date, description]".',
    ]);
    expect(errs(blog({ zzz: 1 }))).toEqual(['Unknown key "zzz".']);
  });
  it('unknown views list all five', () => {
    expect(errs(blog({ view: 'masonry' }))).toEqual([
      'Unknown view "masonry". Use list, grid, compact, people or magazine.',
    ]);
  });
  it('reports YAML that is not a map, or does not parse', () => {
    expect(errs(parseListingBlock('list', '- a\n- b'))[0]).toMatch(
      /must be "key: value" lines/,
    );
    expect(errs(parseListingBlock('list', 'from: [unclosed'))[0]).toMatch(
      /^Could not read the block as YAML/,
    );
  });
  it('undoes the wiki-alias divider protectWikiLinkAliases puts inside fences', () => {
    expect(
      ok(parseListingBlock('list', 'from: p\nwhere:\n  guests: "[[adaAda]]"'))
        .where,
    ).toEqual({ guests: ['[[ada|Ada]]'] });
  });
  it('collects every error', () => {
    expect(errs(blog({ view: 'masonry', limit: -1, nope: 1 }))).toHaveLength(3);
  });
});

describe('limit, pageSize', () => {
  it('lenient on type; inline limit + pageSize is a note', () => {
    expect(ok(blog({ limit: '3' })).limit).toBe(3);
    expect(ok(blog({ pageSize: 'none' })).pageSize).toBeNull();
    const r = blog({ limit: 3, pageSize: 5 });
    expect(r.ok && r.spec).toMatchObject({ limit: 3, pageSize: null });
    expect(notes(r)).toEqual(['"pageSize" is ignored because "limit" is set.']);
  });
  it('page-level: pageSize 20 by default; limit is an error pointing to pageSize', () => {
    expect(ok(page({})).pageSize).toBe(20);
    expect(errs(page({ limit: 10 }))).toEqual([
      '"limit" shows only the first 10 items and hides the rest; for 10 per page use "pageSize: 10".',
    ]);
  });
});

describe('fields', () => {
  it('map: merges over the view defaults, case-insensitive slots', () => {
    expect(
      ok(blog({ fields: { Eyebrow: 'category', meta: 'status' } })).fields,
    ).toEqual({
      ...DEFAULT_FIELDS.list,
      eyebrow: ['category'],
      meta: ['status'],
    });
  });
  it('eyebrow and meta take up to two keys; a key in the eyebrow leaves the meta line', () => {
    expect(
      ok(
        blog({
          fields: {
            eyebrow: ['date', 'category'],
            meta: ['category', 'status'],
          },
        }),
      ).fields,
    ).toMatchObject({ eyebrow: ['date', 'category'], meta: ['status'] });
    expect(errs(blog({ fields: { meta: ['a', 'b', 'c'] } }))).toEqual([
      '"fields.meta" takes at most 2 fields (got 3).',
    ]);
  });
  it('list form turns on exactly the named slots', () => {
    expect(
      ok(blog({ fields: ['title', 'date', 'description'] })).fields,
    ).toEqual({
      eyebrow: [],
      title: 'title',
      summary: 'description',
      date: 'date',
      image: null,
      authors: null,
      meta: [],
    });
    expect(
      ok(blog({ fields: ['title', 'image', 'author', 'status'] })).fields,
    ).toEqual({
      eyebrow: [],
      title: 'title',
      summary: null,
      date: null,
      image: 'image',
      authors: 'authors',
      meta: ['status'],
    });
  });
  it('none/false clears a slot; title cannot be cleared', () => {
    expect(
      ok(blog({ fields: { date: 'none', authors: false } })).fields,
    ).toMatchObject({ date: null, authors: null });
    expect(errs(blog({ fields: { title: 'none' } }))).toEqual([
      '"fields.title" cannot be none.',
    ]);
  });
  it('legacy slot names', () => {
    expect(
      ok(
        blog({
          fields: { headline: 'name', media: 'cover', footnote: 'status' },
        }),
      ).fields,
    ).toMatchObject({ title: 'name', image: 'cover', meta: ['status'] });
  });
  it('unknown slots, readingTime and dotted keys are errors', () => {
    expect(errs(blog({ fields: { subtitle: 'dek' } }))).toEqual([
      'Unknown field slot "subtitle". Slots: eyebrow, title, summary, date, image, authors, meta.',
    ]);
    expect(errs(blog({ fields: { meta: ['readingTime'] } }))).toEqual([
      '"readingTime" is computed on the page and is not available in listings yet.',
    ]);
    expect(errs(blog({ fields: { meta: ['links.github'] } }))).toEqual([
      'Nested keys like "links.github" are not supported yet.',
    ]);
    expect(errs(blog({ fields: 'title' }))).toEqual([
      '"fields" must be "slot: key" lines or a list of field names, e.g. "fields: [title, date, description]".',
    ]);
  });
});

describe('media and ratio', () => {
  it('per-view defaults and explicit values', () => {
    expect(ok(blog({}))).toMatchObject({ media: 'thumb', ratio: '3/2' });
    expect(ok(blog({ view: 'grid' }))).toMatchObject({
      media: 'cover',
      ratio: '16/9',
    });
    expect(ok(blog({ media: 'cover' }))).toMatchObject({
      media: 'cover',
      ratio: '16/9',
    });
    expect(ok(blog({ media: 'thumb', ratio: '1:1' }))).toMatchObject({
      media: 'thumb',
      ratio: '1/1',
    });
    expect(ok(blog({ media: false })).media).toBe('none');
    expect(errs(blog({ media: 'huge' }))).toEqual([
      '"media" must be none, thumb or cover (got "huge").',
    ]);
    expect(errs(blog({ ratio: '2/1' }))).toEqual([
      '"ratio" must be one of 16/9, 3/2, 4/3, 1/1, 3/4 (got "2/1").',
    ]);
  });
  it('thumbnail side: left by default, "thumb right" / "thumb left" (one word plus an option)', () => {
    expect(ok(blog({}))).toMatchObject({ media: 'thumb', mediaSide: 'left' });
    expect(ok(blog({ media: 'thumb right' }))).toMatchObject({
      media: 'thumb',
      mediaSide: 'right',
    });
    expect(ok(blog({ media: 'Thumb  Left' })).mediaSide).toBe('left');
    expect(errs(blog({ media: 'thumb top' }))).toEqual([
      '"media: thumb" takes "left" or "right" (got "top").',
    ]);
    expect(errs(blog({ media: 'cover right' }))).toEqual([
      '"left" and "right" apply only to "media: thumb" (got "cover right").',
    ]);
    const g = blog({ view: 'grid', media: 'thumb right' });
    expect(g.ok && g.spec.media).toBe('cover');
  });
  it('defaultImage: a path or [[wikilink]] for items without an image; distinct from fields.image and media', () => {
    expect(ok(blog({ defaultImage: '/assets/cover.png' })).defaultImage).toBe(
      '/assets/cover.png',
    );
    expect(ok(blog({ defaultimage: '[[cover.png]]' })).defaultImage).toBe(
      '[[cover.png]]',
    );
    // unquoted [[cover.png]] in YAML is a nested list
    expect(
      ok(parseListingBlock('blog', 'defaultImage: [[cover.png]]')).defaultImage,
    ).toBe('[[cover.png]]');
    expect(errs(blog({ defaultImage: 42 }))).toEqual([
      '"defaultImage" must be an image path or [[wikilink]], e.g. "defaultImage: [[cover.png]]".',
    ]);
    const none = blog({ defaultImage: 'a.png', media: 'none' });
    expect(none.ok && none.spec.defaultImage).toBe('a.png');
    expect(notes(none)).toEqual([
      '"defaultImage" is ignored because "media" is none.',
    ]);
    expect(
      ok(blog({ defaultImage: 'a.png', fields: { image: 'cover' } })),
    ).toMatchObject({ defaultImage: 'a.png', fields: { image: 'cover' } });
  });
  it('defaultImage: none (or false) turns placeholder tiles off; no "ignored" note', () => {
    expect(ok(blog({ defaultImage: 'none' })).defaultImage).toBe(false);
    expect(ok(blog({ defaultImage: 'None' })).defaultImage).toBe(false);
    expect(
      ok(parseListingBlock('blog', 'defaultImage: false')).defaultImage,
    ).toBe(false);
    expect(notes(blog({ defaultImage: 'none', media: 'none' }))).toEqual([]);
  });
  it('grid shows thumb as cover, with a note', () => {
    const r = blog({ view: 'grid', media: 'thumb' });
    expect(r.ok && r.spec.media).toBe('cover');
    expect(notes(r)).toEqual([
      '"media: thumb" is shown as "cover" in the grid view.',
    ]);
  });
});

describe('where and sort', () => {
  it('scalars and lists (any-of), stringified; upcoming/past; dotted keys error', () => {
    expect(
      ok(blog({ where: { year: 2026, tags: ['a', 'b'], date: 'upcoming' } }))
        .where,
    ).toEqual({ year: ['2026'], tags: ['a', 'b'], date: ['upcoming'] });
    expect(errs(blog({ where: { tags: [{ a: 1 }] } }))).toEqual([
      '"where.tags" must be a value or a list of values, e.g. "tags: featured".',
    ]);
    expect(errs(blog({ where: 'tags = x' }))).toEqual([
      '"where" must be "field: value" lines, e.g. "where: { tags: featured }".',
    ]);
    expect(errs(blog({ where: { 'meta.type': 'x' } }))).toEqual([
      'Nested keys like "meta.type" are not supported yet.',
    ]);
  });
  it('sort direction defaults per field', () => {
    expect(ok(blog({ sort: 'title' })).sort).toEqual({
      field: 'title',
      direction: 'asc',
    });
    expect(errs(blog({ sort: 'date sideways' }))).toEqual([
      'Sort direction must be "asc" or "desc" (got "sideways").',
    ]);
  });
});

describe('[B2] compact, people, featured, group', () => {
  it('views', () => {
    expect(ok(blog({ view: 'compact' }))).toMatchObject({
      view: 'compact',
      media: 'none',
      group: { by: 'none' },
      fields: DEFAULT_FIELDS.compact,
    });
    expect(ok(page({ view: 'compact' })).group).toEqual({ by: 'year' });
    expect(ok(blog({ view: 'people' }))).toMatchObject({
      sort: { field: 'title', direction: 'asc' },
      media: 'cover',
      ratio: '1/1',
    });
  });
  it('magazine: a hero by default, list fields and thumbnails, headings', () => {
    expect(ok(blog({ view: 'magazine' }))).toMatchObject({
      view: 'magazine',
      featured: 1,
      media: 'thumb',
      ratio: '3/2',
      fields: DEFAULT_FIELDS.list,
      headings: { more: 'More posts', recent: 'Recent posts' },
    });
    expect(ok(blog({ view: 'Substack' })).view).toBe('magazine');
    // featured: 0 keeps the hero but does not promote a featured: true post
    expect(ok(blog({ view: 'magazine', featured: 0 })).featured).toBe(0);
    expect(ok(blog({ view: 'magazine', featured: false })).featured).toBe(0);
    expect(
      ok(
        blog({
          view: 'magazine',
          headings: { more: 'Latest', recent: 'none' },
        }),
      ).headings,
    ).toEqual({ more: 'Latest', recent: null });
    expect(ok(blog({ view: 'magazine', headings: 'none' })).headings).toEqual({
      more: null,
      recent: null,
    });
    expect(errs(blog({ view: 'magazine', headings: { side: 'x' } }))).toEqual([
      'Unknown heading "side". Headings: more, recent.',
    ]);
    expect(errs(blog({ view: 'magazine', headings: 'Latest' }))).toEqual([
      '"headings" must be "more: <text>" and "recent: <text>" lines, or "none".',
    ]);
    const r = blog({ view: 'grid', headings: { more: 'Latest' } });
    expect(r.ok && r.notes).toEqual([
      '"headings" is ignored in the grid view.',
    ]);
  });
  it('group values', () => {
    expect(ok(blog({ group: 'Month' })).group).toEqual({ by: 'month' });
    expect(ok(blog({ group: 'folder' })).group).toEqual({ by: 'folder' });
    expect(ok(blog({ group: 'team' })).group).toEqual({
      by: 'field',
      field: 'team',
    });
    expect(ok(page({ view: 'compact', group: false })).group).toEqual({
      by: 'none',
    });
  });
  it('featured', () => {
    expect(ok(blog({ featured: true })).featured).toBe(1);
    expect(errs(blog({ featured: 3 }))).toEqual([
      '"featured" must be 0 or 1 (got "3").',
    ]);
    const r = blog({ view: 'compact', featured: 1, media: 'cover' });
    expect(r.ok && r.spec).toMatchObject({ featured: 0, media: 'none' });
    expect(notes(r)).toEqual([
      '"media" is ignored in the compact view.',
      '"featured" is ignored in the compact view.',
    ]);
  });
  it('compact drops summary and authors, even when asked for', () => {
    const r = blog({
      view: 'compact',
      fields: { summary: 'description', authors: 'authors' },
    });
    expect(r.ok && r.spec.fields).toMatchObject({
      summary: null,
      authors: null,
    });
    expect(notes(r)).toEqual([
      '"fields.summary" and "fields.authors" are ignored in the compact view.',
    ]);
    const list = blog({
      view: 'compact',
      fields: ['title', 'date', 'authors'],
    });
    expect(list.ok && list.spec.fields.authors).toBeNull();
    expect(notes(list)).toEqual([
      '"fields.authors" is ignored in the compact view.',
    ]);
  });
});

describe('implicitListingFrom', () => {
  const files = [
    '/blog/README.md',
    '/blog/a.md',
    '/podcast.md',
    '/podcast/ep-1.md',
    '/about.md',
  ];
  it('folder index → own folder; folder note → sibling folder; else null', () => {
    expect(implicitListingFrom('blog/README.md', files)).toBe('blog');
    expect(implicitListingFrom('README.md', files)).toBe('');
    expect(implicitListingFrom('podcast.md', files)).toBe('podcast');
    expect(implicitListingFrom('about.md', files)).toBeNull();
  });
});
