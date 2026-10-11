import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
import { collectionSpecs, loadPostFooter } from './footer';

type Row = {
  id: string;
  path: string;
  appPath: string;
  permalink: null;
  metadata: Record<string, unknown>;
  tags?: { tag: string }[];
};
const row = (
  id: string,
  path: string,
  metadata: Record<string, unknown>,
): Row => ({
  id,
  path,
  appPath: `/${path.replace(/\.md$/, '')}`,
  permalink: null,
  metadata,
});
const rows: Row[] = [
  row('1', 'blog/a.md', { title: 'A', date: '2026-01-01', tags: ['x'] }),
  row('2', 'blog/b.md', { title: 'B', date: '2026-02-01' }),
  row('3', 'blog/c.md', { title: 'C', date: '2026-03-01', tags: ['x'] }),
  row('4', 'blog/d.md', { title: 'D', date: '2026-04-01', authors: ['ann'] }),
  row('5', 'blog/e.md', { title: 'E', date: '2026-05-01' }),
  row('6', 'blog/f.md', { title: 'F', date: '2026-06-01', draft: true }),
  row('7', 'people/ann.md', { title: 'Ann Author' }),
];

function fakeDb() {
  const findMany = vi.fn(async ({ where, select }: any) =>
    rows
      .filter((r) => {
        if (where.id?.in) return where.id.in.includes(r.id);
        if (where.OR)
          return where.OR.some((o: any) =>
            typeof o.path === 'string'
              ? r.path === o.path
              : r.path.endsWith(o.path.endsWith),
          );
        if (where.tags?.some && !((r.metadata.tags as string[]) ?? []).length)
          return false;
        return where.path?.startsWith
          ? r.path.startsWith(where.path.startsWith)
          : true;
      })
      .map((r) =>
        select.tags
          ? {
              ...r,
              tags: ((r.metadata.tags as string[]) ?? []).map((tag) => ({
                tag,
              })),
            }
          : r,
      ),
  );
  return { blob: { findMany } };
}

const args = (pagePath: string, tags: string[] = []) => ({
  siteId: 's',
  collection: {
    dir: 'blog',
    options: undefined,
    source: 'auto' as const,
    hostPath: null,
  },
  pagePath,
  tags,
  siteHostname: 'site.example',
  files: rows.map((r) => `/${r.path}`),
  locale: 'en-US',
  today: '2026-10-11',
});

describe('loadPostFooter', () => {
  it('previous is older, next is newer; read more is same-tag first, then recent, avoiding prev/next', async () => {
    const db = fakeDb();
    const f = await loadPostFooter(args('blog/b.md', ['x']), db);
    expect(f.previous?.title).toBe('A');
    expect(f.next?.title).toBe('C');
    // same tag: C (avoided, next) and A (avoided, previous); then E, D; avoided fill the rest
    expect(f.readMore.map((i) => i.title)).toEqual(['E', 'D', 'C']);
    expect(f.authors.get('ann')).toMatchObject({
      name: 'Ann Author',
      url: '/people/ann',
    });
  });
  it('same-tag posts come first', async () => {
    const f = await loadPostFooter(args('blog/e.md', ['x']), fakeDb());
    expect(f.readMore.map((i) => i.title)).toEqual(['C', 'A', 'B']);
  });
  it('drafts are never neighbours or cards; the post itself never a card', async () => {
    const f = await loadPostFooter(args('blog/e.md'), fakeDb());
    expect(f.next).toBeNull();
    expect(f.previous?.title).toBe('D');
    expect(f.readMore.map((i) => i.title)).toEqual(['C', 'B', 'A']);
  });
  it('bounded: one folder scan, one folder tag map (only with tags), one by-id fetch of at most five rows', async () => {
    const db = fakeDb();
    await loadPostFooter(args('blog/c.md', ['x', 'y']), db);
    const calls = db.blob.findMany.mock.calls.map((c: any[]) => c[0]);
    const scans = calls.filter(
      (c: any) => c.where.path?.startsWith === 'blog/',
    );
    const byId = calls.filter((c: any) => c.where.id?.in);
    expect(scans).toHaveLength(2);
    const tagScan = scans.find((c: any) => c.where.tags);
    expect(tagScan.select).toEqual({
      path: true,
      tags: { select: { tag: true } },
    });
    const db2 = fakeDb();
    await loadPostFooter(args('blog/c.md'), db2);
    expect(
      db2.blob.findMany.mock.calls.some((c: any[]) => c[0].where.tags),
    ).toBe(false); // no tag map without tags
    expect(byId).toHaveLength(1);
    expect(byId[0].where.id.in.length).toBeLessThanOrEqual(5);
    for (const c of calls) expect(c.select).not.toHaveProperty('content');
  });
  it('a post not in the index (a draft) still gets read-more cards, no neighbours', async () => {
    const f = await loadPostFooter(args('blog/f.md'), fakeDb());
    expect(f.previous).toBeNull();
    expect(f.next).toBeNull();
    expect(f.readMore.map((i) => i.title)).toEqual(['E', 'D', 'C']);
  });
});

describe('collectionSpecs', () => {
  it('cards are a three-item grid with the collection fields; the index keeps the page spec', () => {
    const { index, cards } = collectionSpecs({
      dir: 'projects',
      options: { view: 'compact', sort: 'title' },
      source: 'layout',
      hostPath: 'projects/README.md',
    });
    expect(index).toMatchObject({
      from: 'projects',
      view: 'compact',
      group: { by: 'year' },
    });
    expect(cards).toMatchObject({
      view: 'grid',
      media: 'cover',
      limit: 3,
      pageSize: null,
      featured: 0,
      ratio: '16/9',
      sort: { field: 'title' },
    });
    expect(cards.fields.summary).toBe('description');
  });
  it('invalid options fall back to the default spec', () => {
    const { index } = collectionSpecs({
      dir: 'blog',
      options: 'nonsense',
      source: 'auto',
      hostPath: null,
    });
    expect(index).toMatchObject({
      from: 'blog',
      view: 'list',
      sort: { field: 'date', direction: 'desc' },
    });
  });
});
