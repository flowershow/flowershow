import remarkCallout from '@r4ai/remark-callout';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows = Array.from({ length: 25 }, (_, i) => ({
  id: `r${i}`,
  path: `blog/p${String(i).padStart(2, '0')}.md`,
  appPath: `/blog/p${i}`,
  permalink: null,
  metadata: { title: `Post ${i}`, authors: ['ada'], featured: i === 7 },
}));
const queryListingIndex = vi.fn();
const fetchRowsByIds = vi.fn(async (_db: unknown, _s: string, ids: string[]) =>
  ids.map((id) => rows.find((r) => r.id === id)!),
);
const cachedResolveAuthors = vi.fn(async (a: { handles: string[] }) =>
  a.handles.map((h) => ({
    key: h,
    name: h.toUpperCase(),
    url: `/people/${h}`,
  })),
);
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('@/lib/listing/query', () => ({
  queryListingIndex: (...a: unknown[]) => queryListingIndex(...a),
  fetchRowsByIds: (...a: [unknown, string, string[]]) => fetchRowsByIds(...a),
}));
vi.mock('@/lib/listing/authors', () => ({
  cachedResolveAuthors: (a: { handles: string[] }) => cachedResolveAuthors(a),
}));
import remarkListing, { type RemarkListingOptions } from './remark-listing';

const index = (rs = rows, groups: string[] | null = null) => ({
  ids: rs.map((r) => r.id),
  paths: rs.map((r) => r.path),
  featured: rs.flatMap((r, i) => (r.metadata.featured ? [i] : [])),
  groups,
});
const base: RemarkListingOptions = {
  siteId: 's',
  siteHostname: 'h',
  filePath: 'README.md',
  files: ['/blog/p00.md', '/notes/n.md', '/projects/x.md'],
  publicUrl: '/',
  today: '2026-10-10',
};
async function run(md: string, opts: Partial<RemarkListingOptions> = {}) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCallout)
    .use(remarkListing, { ...base, ...opts });
  return processor.run(processor.parse(md)) as Promise<any>;
}
const cls = (n: any) => n.data?.hProperties?.className ?? [];
const sections = (tree: any) =>
  (JSON.stringify(tree).match(/"className":\["list-component"/g) ?? []).length;

beforeEach(() => {
  queryListingIndex.mockReset().mockResolvedValue(index());
  fetchRowsByIds.mockClear();
  cachedResolveAuthors.mockClear();
});

describe('remarkListing', () => {
  it('replaces ```blog and ```list fences, leaves other code alone', async () => {
    const tree = await run(
      '```blog\nlimit: 3\n```\n\n```js\nx\n```\n\n```list\nfrom: blog\nlimit: 1\n```',
    );
    expect(tree.children.map((n: any) => cls(n)[0] ?? n.type)).toEqual([
      'list-component',
      'code',
      'list-component',
    ]);
    expect(queryListingIndex).toHaveBeenCalledWith({
      siteId: 's',
      spec: expect.objectContaining({ from: 'blog' }),
      today: '2026-10-10',
    });
  });
  it('fetches only the page rows by id', async () => {
    await run('```blog\nlimit: 3\n```');
    expect(fetchRowsByIds).toHaveBeenCalledWith(expect.anything(), 's', [
      'r0',
      'r1',
      'r2',
    ]);
  });
  it('renders blocks nested in callouts, blockquotes, list items, and ~~~ fences (Review Focus 5)', async () => {
    const tree = await run(
      '> [!note]\n> ```blog\n> limit: 1\n> ```\n\n> ```blog\n> limit: 1\n> ```\n\n- item\n\n  ```blog\n  limit: 1\n  ```\n\n~~~blog\nlimit: 1\n~~~',
    );
    expect(sections(tree)).toBe(4);
  });
  it('excludes the current page; resolves authors once per block with the page files', async () => {
    const tree = await run('```blog\nlimit: 2\n```', {
      filePath: 'blog/p00.md',
    });
    expect(fetchRowsByIds).toHaveBeenCalledWith(expect.anything(), 's', [
      'r1',
      'r2',
    ]);
    expect(cachedResolveAuthors).toHaveBeenCalledTimes(1);
    expect(cachedResolveAuthors.mock.calls[0]![0]).toMatchObject({
      files: base.files,
    });
    expect(JSON.stringify(tree)).not.toContain('"Post 0"');
  });
  it('a missing folder is an error card with the nearest folders (UX M-10)', async () => {
    const tree = await run('```list\nfrom: posts\n```');
    expect(JSON.stringify(tree.children[0])).toContain(
      'No folder \\"posts\\" with pages. Folders with pages: ',
    );
    expect(queryListingIndex).not.toHaveBeenCalled();
  });
  it('a missing folder is reported together with invalid keys, folder first (design 3.8)', async () => {
    const tree = await run(
      '```list\nfrom: posts\nperPage: 5\nimage: cover\n```',
    );
    const card = JSON.stringify(tree.children[0]);
    const folder = card.indexOf('No folder \\"posts\\" with pages.');
    expect(folder).toBeGreaterThan(-1);
    expect(card.indexOf('Unknown key \\"perPage\\"')).toBeGreaterThan(folder);
    expect(card).toContain('Unknown key \\"image\\"');
    expect(queryListingIndex).not.toHaveBeenCalled();
  });
  it('defaultImage fills items without an image, resolved against the listing page like item images', async () => {
    const tree = await run(
      '```blog\nlimit: 2\ndefaultImage: "[[cover.png]]"\n```',
      {
        files: [...base.files, '/assets/cover.png'],
      },
    );
    const srcs = JSON.stringify(tree).match(
      /"name":"src","value":"[^"]+"(?=\},\{"type":"mdxJsxAttribute","name":"alt")/g,
    );
    expect(srcs).toEqual([
      '"name":"src","value":"http://h/assets/cover.png"',
      '"name":"src","value":"http://h/assets/cover.png"',
    ]);
    // not an image: ignored, the rows stay text only
    const t2 = await run('```blog\nlimit: 2\ndefaultImage: notes/n.md\n```');
    expect(JSON.stringify(t2)).not.toContain('notes/n.md');
    expect(JSON.stringify(t2)).not.toContain('list-component-item-media');
  });
  it('./ resolves against the page folder; capitalised folders resolve (Review Focus 1)', async () => {
    await run('```list\nfrom: ./x\n```', {
      filePath: 'projects/README.md',
      files: ['/projects/x/a.md'],
    });
    expect(queryListingIndex.mock.calls[0]![0].spec.from).toBe('projects/x');
    await run('```blog\nlimit: 1\n```', { files: ['/Blog/a.md'] });
    expect(queryListingIndex.mock.calls[1]![0].spec.from).toBe('Blog');
  });
  it('an invalid block becomes an error card and the rest still renders; a data failure leaks nothing', async () => {
    const t1 = await run(
      '```list\nfrom: blog\nperPage: 5\n```\n\nafter\n\n```blog\nlimit: 1\n```',
    );
    expect(cls(t1.children[0])).toContain('list-component-error');
    expect(t1.children[1].type).toBe('paragraph');
    expect(cls(t1.children[2])).toContain('list-component');
    queryListingIndex.mockRejectedValueOnce(new Error('db down'));
    const t2 = await run('```blog\n```\n\n```blog\nlimit: 1\n```');
    expect(cls(t2.children[0])).toContain('list-component-error');
    expect(JSON.stringify(t2.children[0])).not.toContain('db down');
  });
  it('one paginated listing per page; a page-level listing claims it first', async () => {
    const t = await run(
      '```blog\npageSize: 5\n```\n\n```blog\npageSize: 5\n```',
    );
    expect(cls(t.children[1])).toContain('list-component-error');
    const t2 = await run('```blog\npageSize: 5\n```', {
      paginationClaimed: true,
    });
    expect(JSON.stringify(t2.children[0])).toContain(
      'Only one list per page can paginate',
    );
  });
  it('caps a page at 10 listings', async () => {
    const tree = await run(
      Array.from({ length: 11 }, () => '```blog\nlimit: 1\n```').join('\n\n'),
    );
    expect(queryListingIndex).toHaveBeenCalledTimes(10);
    expect(JSON.stringify(tree.children[10])).toContain(
      'At most 10 lists per page',
    );
  });
  it('notes go to the data attribute, not the page', async () => {
    const tree = await run('```blog\nlimit: 2\npageSize: 5\n```');
    expect(tree.children[0].data.hProperties.dataListingNotes).toContain(
      '"pageSize" is ignored',
    );
  });
  it('a list with neither limit nor pageSize fetches at most 200 rows and says so', async () => {
    const many = Array.from({ length: 250 }, (_, i) => ({
      ...rows[0]!,
      id: `m${i}`,
      path: `blog/m${i}.md`,
    }));
    queryListingIndex.mockResolvedValue(index(many));
    fetchRowsByIds.mockImplementationOnce(async (_d, _s, ids) =>
      ids.map((id) => many.find((r) => r.id === id)!),
    );
    const tree = await run('```blog\n```');
    expect(fetchRowsByIds.mock.calls[0]![2]).toHaveLength(200);
    expect(tree.children[0].data.hProperties.dataListingNotes).toContain(
      'Showing the first 200 of 250 items',
    );
  });
  it('a page-level listing fetches only its page window', async () => {
    await run('', {
      implicit: { options: undefined, defaultFrom: 'blog', pageTitle: 'Blog' },
    });
    expect(fetchRowsByIds.mock.calls[0]![2]).toHaveLength(20);
  });
  it('a page-level listing (implicit) is appended with the page title as label and paginates at 20', async () => {
    const tree = await run('', {
      implicit: { options: undefined, defaultFrom: 'blog', pageTitle: 'Blog' },
      page: 2,
      publicUrl: '/blog',
    });
    const section = tree.children.at(-1);
    expect(section.data.hProperties.ariaLabel).toBe('Blog');
    expect(
      section.children.filter((c: any) => c.data?.hName === 'article'),
    ).toHaveLength(5);
  });
  it('page-level errors use the settings heading', async () => {
    expect(
      JSON.stringify(
        await run('', {
          implicit: { options: { veiw: 'grid' }, defaultFrom: 'blog' },
        }),
      ),
    ).toContain('List settings have problems');
  });
});

describe('[B2] featured and grouping in the plugin', () => {
  it('featured: 1 promotes the first featured: true item to the front of page 1 only', async () => {
    await run('```blog\nview: grid\nfeatured: 1\nlimit: 3\n```');
    expect(fetchRowsByIds.mock.calls[0]![2]).toEqual(['r7', 'r0', 'r1']);
  });
  it('an inline limit block keeps its hero on ?page=2 of the host page; a paginated one shows it on its page 1 only', async () => {
    const heroes = (tree: any) =>
      (JSON.stringify(tree).match(/list-component-item--featured/g) ?? [])
        .length;
    const teaser = await run(
      '```blog\nview: grid\nfeatured: 1\nlimit: 3\n```',
      {
        page: 2,
      },
    );
    expect(heroes(teaser)).toBe(1);
    expect(fetchRowsByIds.mock.calls[0]![2]).toEqual(['r7', 'r0', 'r1']);
    const paged = '```blog\nview: grid\nfeatured: 1\npageSize: 5\n```';
    expect(heroes(await run(paged, { page: 1 }))).toBe(1);
    expect(heroes(await run(paged, { page: 2 }))).toBe(0);
  });
  it('only the first hero on the page gets fetchPriority high', async () => {
    const withImages = rows.map((r) => ({
      ...r,
      metadata: { ...r.metadata, image: 'https://img.example/x.png' },
    }));
    fetchRowsByIds.mockImplementation(async (_d, _s, ids) =>
      ids.map((id) => withImages.find((r) => r.id === id)!),
    );
    const block = '```blog\nview: grid\nfeatured: 1\nlimit: 3\n```';
    const json = JSON.stringify(await run(`${block}\n\n${block}`));
    fetchRowsByIds.mockImplementation(async (_d, _s, ids) =>
      ids.map((id) => rows.find((r) => r.id === id)!),
    );
    expect(json.match(/"name":"fetchPriority"/g)).toHaveLength(1);
    expect(json.match(/"name":"loading","value":"eager"/g)).toHaveLength(2);
  });
  it('group labels come from the index keys and the locale', async () => {
    queryListingIndex.mockResolvedValueOnce(
      index(rows.slice(0, 2), ['2026-09', '2026-08']),
    );
    const tree = await run('```blog\ngroup: month\nlimit: 2\n```', {
      locale: 'en-US',
    });
    expect(JSON.stringify(tree)).toContain('"September 2026"');
  });
});

describe('magazine in the plugin', () => {
  const layout = (tree: any) =>
    JSON.stringify(tree).match(/"dataLayout":"([a-z-]+)"/)?.[1] ?? null;
  const heroTitle = (tree: any) => {
    const hero = JSON.stringify(tree).split('list-component-item--featured')[1];
    return hero?.match(/"value":"(Post \d+)"/)?.[1] ?? null;
  };
  it('promotes the featured: true post to the hero by default; featured: 0 keeps the order', async () => {
    const tree = await run('```blog\nview: magazine\nlimit: 8\n```');
    expect(fetchRowsByIds.mock.calls[0]![2]).toEqual([
      'r7',
      'r0',
      'r1',
      'r2',
      'r3',
      'r4',
      'r5',
      'r6',
    ]);
    expect(layout(tree)).toBe('full');
    expect(heroTitle(tree)).toBe('Post 7');
    fetchRowsByIds.mockClear();
    const plain = await run(
      '```blog\nview: magazine\nfeatured: 0\nlimit: 8\n```',
    );
    expect(fetchRowsByIds.mock.calls[0]![2]).toEqual([
      'r0',
      'r1',
      'r2',
      'r3',
      'r4',
      'r5',
      'r6',
      'r7',
    ]);
    // still a hero, just not promoted
    expect(heroTitle(plain)).toBe('Post 0');
    expect(
      (JSON.stringify(plain).match(/list-component-item--featured/g) ?? [])
        .length,
    ).toBe(1);
  });
  it('a paginated magazine has its front page on page 1 only; the promoted post is not repeated', async () => {
    const md = '```blog\nview: magazine\npageSize: 10\n```';
    const p1 = await run(md, { page: 1 });
    expect(layout(p1)).toBe('full');
    expect(fetchRowsByIds.mock.calls[0]![2][0]).toBe('r7');
    fetchRowsByIds.mockClear();
    const p2 = await run(md, { page: 2 });
    expect(layout(p2)).toBeNull();
    const ids2 = fetchRowsByIds.mock.calls[0]![2];
    expect(ids2).not.toContain('r7');
    // page 1 was r7, r0–r6, r8, r9
    expect(ids2).toEqual(Array.from({ length: 10 }, (_, k) => `r${k + 10}`));
  });
  it('the image decision covers the whole listing, not one page', async () => {
    // only the first 12 posts (page 1 and part of page 2) have an image: 12 of 25 is under half
    const imgs = rows.map((r, i) =>
      i < 12 ? 'https://img.example/x.png' : null,
    );
    queryListingIndex.mockResolvedValue({ ...index(), images: imgs });
    const withImages = rows.map((r, i) => ({
      ...r,
      metadata: { ...r.metadata, ...(i < 12 ? { image: imgs[i] } : {}) },
    }));
    fetchRowsByIds.mockImplementation(async (_d, _s, ids) =>
      ids.map((id) => withImages.find((r) => r.id === id)!),
    );
    const md = '```blog\npageSize: 10\n```';
    const p1 = JSON.stringify(await run(md, { page: 1 }));
    const p3 = JSON.stringify(await run(md, { page: 3 }));
    fetchRowsByIds.mockImplementation(async (_d, _s, ids) =>
      ids.map((id) => rows.find((r) => r.id === id)!),
    );
    // page 1 is all images, page 3 has none: both keep the thumbnail column, neither gets tiles
    expect(p1).toContain('"dataMedia":"thumb"');
    expect(p3).toContain('"dataMedia":"thumb"');
    expect(p1).not.toContain('list-component-item-media--placeholder');
    expect(p3).not.toContain('list-component-item-media--placeholder');
    // 13 of 25 with images: tiles on every page
    queryListingIndex.mockResolvedValue({
      ...index(),
      images: rows.map((_, i) => (i < 13 ? 'https://img.example/x.png' : null)),
    });
    expect(JSON.stringify(await run(md, { page: 3 }))).toContain(
      'list-component-item-media--placeholder',
    );
  });
});
