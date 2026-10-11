import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
import { loadDatedShares, loadPostHosts } from './hosts';

const row = (path: string, metadata: Record<string, unknown>) => ({
  id: path,
  path,
  appPath: `/${path.replace(/\.md$/, '')}`,
  permalink: null,
  metadata,
});

describe('loadPostHosts', () => {
  it('one query for the host paths, metadata only; none for no paths', async () => {
    const findMany = vi.fn(async () => [
      { path: 'blog/README.md', metadata: { title: 'Blog' } },
    ]);
    expect(await loadPostHosts('s', [], { blob: { findMany } })).toEqual({});
    expect(findMany).not.toHaveBeenCalled();
    expect(
      await loadPostHosts('s', ['blog/README.md'], { blob: { findMany } }),
    ).toEqual({ 'blog/README.md': { title: 'Blog' } });
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 's', path: { in: ['blog/README.md'] } },
      select: { path: true, metadata: true },
    });
  });
});

describe('loadDatedShares', () => {
  it('the share of listed pages with a date (the folder index, drafts and unpublished pages do not count)', async () => {
    const findMany = vi.fn(async () => [
      row('recipes/README.md', { title: 'Recipes', layout: 'list' }),
      row('recipes/soup.md', { title: 'Soup' }),
      row('recipes/stew.md', { title: 'Stew', date: '2026-01-01' }),
      row('recipes/draft.md', { title: 'Draft', draft: true }),
      row('recipes/2026-02-02-bread.md', { title: 'Bread' }),
      row('recipes/hidden.md', { title: 'Hidden', publish: false }),
    ]);
    expect(
      await loadDatedShares('s', [{ dir: 'recipes', dateKey: 'date' }], {
        blob: { findMany },
      }),
    ).toEqual({ recipes: 2 / 3 });
  });
});
