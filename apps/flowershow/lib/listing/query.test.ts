import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
import {
  buildIndex,
  fetchFolderRows,
  fetchRowsByIds,
  queryListingIndex,
} from './query';
import { DEFAULT_FIELDS, parseListingBlock } from './spec';

const spec = (code = '') => {
  const r = parseListingBlock('list', `from: b\n${code}`);
  if (!r.ok) throw new Error(r.errors.join());
  return r.spec;
};

describe('fetchFolderRows', () => {
  it('one folder, metadata columns only, tags only when where.tags is used', async () => {
    const findMany = vi.fn(async () => []);
    await fetchFolderRows(
      { blob: { findMany } },
      { siteId: 's', folder: 'blog', withTags: false },
    );
    expect(findMany).toHaveBeenCalledWith({
      where: {
        siteId: 's',
        appPath: { not: null },
        extension: { in: ['md', 'mdx'] },
        path: { startsWith: 'blog/' },
      },
      select: {
        id: true,
        path: true,
        appPath: true,
        permalink: true,
        metadata: true,
      },
    });
    await fetchFolderRows(
      { blob: { findMany } },
      { siteId: 's', folder: '', withTags: true },
    );
    const args = (findMany.mock.calls[1] as any[])[0];
    expect(args.where.path).toBeUndefined();
    expect(args.select.tags).toEqual({ select: { tag: true } });
  });
});

describe('buildIndex and queryListingIndex', () => {
  it('returns ids/paths in order, featured positions, no metadata', async () => {
    const findMany = vi.fn(async () => [
      {
        id: '1',
        path: 'b/old.md',
        appPath: '/b/old',
        permalink: null,
        metadata: { date: '2020-01-01', featured: true, description: 'x' },
      },
      {
        id: '2',
        path: 'b/new.md',
        appPath: '/b/new',
        permalink: null,
        metadata: { date: '2026-01-01' },
      },
    ]);
    const index = await queryListingIndex(
      { siteId: 's', spec: spec(), today: '2026-10-10' },
      { blob: { findMany } },
    );
    expect(index).toEqual({
      ids: ['2', '1'],
      paths: ['b/new.md', 'b/old.md'],
      featured: [1],
      groups: null,
    });
  });
  it('group keys are stored when grouping (PR B2 uses them)', () => {
    const rows = [
      {
        id: '1',
        path: 'b/a.md',
        appPath: '/b/a',
        permalink: null,
        metadata: { date: '2026-01-01' },
      },
    ];
    expect(
      buildIndex(rows, {
        from: 'b',
        group: { by: 'year' },
        fields: DEFAULT_FIELDS.list,
      }).groups,
    ).toEqual(['2026']);
  });
  it('a 5,000-item folder with heavy frontmatter caches well under 1 MB, with no metadata (tech M7)', () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      id: `cm${String(i).padStart(23, '0')}`,
      path: `blog/2026/${String(i).padStart(4, '0')}-a-fairly-long-post-slug-for-realism.md`,
      appPath: `/blog/x${i}`,
      permalink: null,
      metadata: {
        title: `Post ${i}`,
        date: '2026-01-01',
        description: 'x'.repeat(400),
        tags: ['a', 'b', 'c'],
        featured: i % 50 === 0,
      },
    }));
    const index = buildIndex(rows, {
      from: 'blog',
      group: { by: 'month' },
      fields: DEFAULT_FIELDS.list,
    });
    const json = JSON.stringify(index);
    expect(json.length).toBeLessThan(1_000_000);
    expect(json).not.toContain('description');
    expect(json).not.toContain('xxxx');
  });
});

describe('fetchRowsByIds', () => {
  it('one query by id, scoped to the site, returned in the requested order', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'b',
        path: 'x/b.md',
        appPath: '/x/b',
        permalink: null,
        metadata: {},
      },
      {
        id: 'a',
        path: 'x/a.md',
        appPath: '/x/a',
        permalink: null,
        metadata: {},
      },
    ]);
    const rows = await fetchRowsByIds({ blob: { findMany } }, 's', [
      'a',
      'b',
      'gone',
    ]);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 's', id: { in: ['a', 'b', 'gone'] } },
      select: {
        id: true,
        path: true,
        appPath: true,
        permalink: true,
        metadata: true,
      },
    });
  });
  it('no query for an empty page', async () => {
    const findMany = vi.fn();
    expect(await fetchRowsByIds({ blob: { findMany } }, 's', [])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
