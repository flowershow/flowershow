import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangelogEntryMeta } from '@/lib/changelog';

const getChangelogEntries = vi.fn();
const getAuthors = vi.fn();
const getBlobByPath = vi.fn();
const getBlobContent = vi.fn();

vi.mock('@/trpc/server', () => ({
  api: {
    site: {
      getChangelogEntries: { query: (i: unknown) => getChangelogEntries(i) },
      getAuthors: { query: (i: unknown) => getAuthors(i) },
      getBlobByPath: { query: (i: unknown) => getBlobByPath(i) },
      getBlobContent: { query: (i: unknown) => getBlobContent(i) },
    },
  },
}));

vi.mock('@/lib/render-page-content', () => ({
  renderPageContent: vi.fn(async ({ content }: { content: string }) => (
    <p>{content}</p>
  )),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { renderPageContent } from '@/lib/render-page-content';
import { ChangelogIndexPage } from './changelog-index-page';

function entry(n: number, authors: string[] = []): ChangelogEntryMeta {
  const d = String(n).padStart(2, '0');
  return {
    id: `id-${n}`,
    path: `changelog/2026-01-${d}-entry-${n}.md`,
    url: `/changelog/2026-01-${d}-entry-${n}`,
    anchor: `2026-01-${d}-entry-${n}`,
    title: `Entry ${n}`,
    date: `2026-01-${d}`,
    authors,
  };
}

const baseProps = {
  site: { id: 'site-1' } as any,
  dir: 'changelog',
  title: 'Changelog',
  renderMode: undefined,
  siteHostname: 'example.flowershow.me',
  siteFilePaths: [],
  permalinksMapping: {},
  imageDimensions: {},
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  // 12 entries, newest first, as the procedure returns them
  getChangelogEntries.mockResolvedValue({
    entries: Array.from({ length: 12 }, (_, i) =>
      entry(12 - i, i === 0 ? ['olayway', 'ghost'] : ['olayway']),
    ),
  });
  getAuthors.mockResolvedValue([
    { key: 'b1', name: 'Ola Rubaj', url: '/people/olayway', avatar: 'a.png' },
    { key: 'ghost', name: 'ghost', url: null },
  ]);
  getBlobByPath.mockImplementation(async ({ path }: { path: string }) => ({
    id: `blob-${path}`,
    path,
    metadata: null,
  }));
  getBlobContent.mockImplementation(
    async ({ id }: { id: string }) => `Body of ${id}`,
  );
});

describe('ChangelogIndexPage', () => {
  it('renders the first 10 entries with compiled bodies', async () => {
    const { container } = render(
      await ChangelogIndexPage({ ...baseProps, page: 1 }),
    );
    const entries = container.querySelectorAll('li.changelog-entry');
    expect(entries).toHaveLength(10);
    expect(
      entries[0]!.querySelector('.changelog-entry-title')!.textContent,
    ).toBe('Entry 12');
    expect(
      entries[0]!.querySelector('.changelog-entry-body')!.textContent,
    ).toBe('Body of blob-changelog/2026-01-12-entry-12.md');
    expect(
      container.querySelector('.changelog-pagination')!.textContent,
    ).toContain('Page 1 of 2');
  });

  it('resolves authors with one batched call and maps them per entry', async () => {
    const { container } = render(
      await ChangelogIndexPage({ ...baseProps, page: 1 }),
    );
    expect(getAuthors).toHaveBeenCalledTimes(1);
    expect(getAuthors).toHaveBeenCalledWith({
      siteId: 'site-1',
      authors: ['olayway', 'ghost'],
    });
    const first = container.querySelector('li.changelog-entry')!;
    expect(first.textContent).toContain('Ola Rubaj');
    expect(first.textContent).toContain('ghost');
  });

  it('renders entry bodies as embedded: static list blocks sharing one listing budget', async () => {
    await ChangelogIndexPage({ ...baseProps, page: 2 });
    const calls = vi.mocked(renderPageContent).mock.calls.map((c) => c[0]);
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.listing?.static).toBe(true);
      expect(c.listing?.page).toBeUndefined(); // never the timeline's ?page=
    }
    expect(calls[0]!.listing?.budget).toBe(calls[1]!.listing?.budget);
    expect(calls[0]!.listing?.publicUrl).toBe('/changelog/2026-01-02-entry-2');
  });

  it('renders the second page', async () => {
    const { container } = render(
      await ChangelogIndexPage({ ...baseProps, page: 2 }),
    );
    expect(container.querySelectorAll('li.changelog-entry')).toHaveLength(2);
  });

  it('404s past the last page', async () => {
    await expect(ChangelogIndexPage({ ...baseProps, page: 3 })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
