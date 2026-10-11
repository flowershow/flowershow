import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
const index = { ids: [] as string[], paths: [] as string[] };
vi.mock('@/lib/listing/query', () => ({
  queryListingIndex: vi.fn(async () => ({
    ...index,
    featured: [],
    groups: null,
  })),
  fetchRowsByIds: async () => [],
}));

import { isListingPageOutOfRange } from './page-listing';

const files = ['/blog/README.md', '/blog/a.md'];
const withCount = (n: number) => {
  index.ids = Array.from({ length: n }, (_, i) => String(i));
  index.paths = index.ids.map((i) => `blog/p${i}.md`);
};
const check = (page: number, options: unknown = undefined) =>
  isListingPageOutOfRange({
    siteId: 's',
    filePath: 'blog/README.md',
    siteFilePaths: files,
    route: {
      kind: 'page',
      options,
      defaultFrom: 'blog',
      source: 'auto',
      view: 'list',
      pageSize: 20,
    },
    page,
  });

describe('isListingPageOutOfRange', () => {
  beforeEach(() => withCount(0));
  it('page 1 is never out of range, even with no items', async () => {
    expect(await check(1)).toBe(false);
  });
  it('20 items fit page 1; page 2 is out of range', async () => {
    withCount(20);
    expect(await check(2)).toBe(true);
  });
  it('21 items make 2 pages; page 3 is out of range', async () => {
    withCount(21);
    expect(await check(2)).toBe(false);
    expect(await check(3)).toBe(true);
  });
  it('an empty folder: page 2 is out of range', async () => {
    expect(await check(2)).toBe(true);
  });
  it('an unparsable spec is never out of range (the error card renders)', async () => {
    withCount(0);
    expect(await check(5, { veiw: 'x' })).toBe(false);
  });
  it('the page itself does not count', async () => {
    withCount(20);
    index.paths[0] = 'blog/README.md';
    index.ids.push('x');
    index.paths.push('blog/extra.md');
    expect(await check(2)).toBe(true); // 21 rows, one is the page itself → 20 → 1 page
  });
});

describe('listingPaginatesByPage (self-canonical only when ?page changes the content)', () => {
  it('virtual folders and page-level listings with a page size; not none or pageSize: none', async () => {
    const { listingPaginatesByPage } = await import('./page-listing');
    expect(
      listingPaginatesByPage({ kind: 'virtual', dir: 'blog', title: 'Blog' }),
    ).toBe(true);
    expect(
      listingPaginatesByPage({
        kind: 'page',
        options: undefined,
        defaultFrom: 'blog',
        source: 'auto',
        view: 'list',
        pageSize: 20,
      }),
    ).toBe(true);
    expect(
      listingPaginatesByPage({
        kind: 'page',
        options: { veiw: 'x' },
        defaultFrom: 'blog',
        source: 'layout',
        view: 'list',
        pageSize: null,
      }),
    ).toBe(false);
    expect(listingPaginatesByPage({ kind: 'none' })).toBe(false);
  });
});

describe('resolveMetadataListingRoute (generateMetadata has no body until it needs one)', () => {
  const base = {
    slug: '/blog',
    blob: { path: 'blog/README.md' },
    metadata: {},
    siteFilePaths: ['/blog/README.md', '/blog/a.md'],
    changelogKind: null,
  };
  it('loads the body for an auto listing and drops it when the body has its own block', async () => {
    const { resolveMetadataListingRoute } = await import('./page-listing');
    const load = vi.fn(async () => 'Intro\n\n```blog\npageSize: 5\n```');
    expect(await resolveMetadataListingRoute(base, load)).toEqual({
      kind: 'none',
    });
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('keeps the auto listing for a prose-only body; never loads for layout: list', async () => {
    const { resolveMetadataListingRoute } = await import('./page-listing');
    expect(
      (await resolveMetadataListingRoute(base, async () => 'Prose.')).kind,
    ).toBe('page');
    const load = vi.fn(async () => '');
    expect(
      (
        await resolveMetadataListingRoute(
          { ...base, metadata: { layout: 'list' } },
          load,
        )
      ).kind,
    ).toBe('page');
    expect(load).not.toHaveBeenCalled();
  });
});
