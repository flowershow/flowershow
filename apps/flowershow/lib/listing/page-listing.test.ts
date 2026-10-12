import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
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
        chronological: true,
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
        chronological: true,
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
