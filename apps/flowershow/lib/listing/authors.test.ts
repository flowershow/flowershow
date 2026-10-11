import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
import {
  authorPathMatches,
  cachedResolveAuthors,
  pickAuthorBlob,
  resolveAuthors,
} from './authors';

describe('authorPathMatches (anchored)', () => {
  it('matches exact and /-anchored suffixes only', () => {
    expect(authorPathMatches('jane', 'jane.md')).toBe(true);
    expect(authorPathMatches('jane', 'people/jane.mdx')).toBe(true);
    expect(authorPathMatches('jane', 'people/mary-jane.md')).toBe(false);
    expect(authorPathMatches('people/jane', 'site/people/jane.md')).toBe(true);
  });
});

describe('pickAuthorBlob', () => {
  it('prefers people/ or authors/, then the shortest path', () => {
    const c = [
      { path: 'notes/deep/jane.md' },
      { path: 'jane.md' },
      { path: 'team/authors/jane.md' },
      { path: 'people/jane.md' },
    ];
    expect(pickAuthorBlob('jane', c)?.path).toBe('people/jane.md');
    expect(
      pickAuthorBlob('jane', [
        { path: 'notes/deep/jane.md' },
        { path: 'x/jane.md' },
      ])?.path,
    ).toBe('x/jane.md');
  });
});

describe('resolveAuthors', () => {
  it('one query for all handles, input order kept, unresolved as plain names', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'b1',
        path: 'people/ada.md',
        appPath: '/people/ada',
        permalink: null,
        metadata: { title: 'Ada Lovelace', avatar: '[[ada.jpg]]' },
      },
      {
        id: 'b2',
        path: 'people/mary-ada.md',
        appPath: '/people/mary-ada',
        permalink: null,
        metadata: { title: 'Mary' },
      },
    ]);
    const out = await resolveAuthors(
      { blob: { findMany } },
      {
        siteId: 's',
        handles: ['nobody', '[[ada]]', 'ada'],
        siteHostname: 'h.site',
        files: ['people/assets/ada.jpg'],
      },
    );
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(out).toEqual([
      { key: 'nobody', name: 'nobody', url: null },
      {
        key: 'b1',
        name: 'Ada Lovelace',
        url: '/people/ada',
        avatar: 'http://h.site/people/assets/ada.jpg',
      },
      {
        key: 'b1',
        name: 'Ada Lovelace',
        url: '/people/ada',
        avatar: 'http://h.site/people/assets/ada.jpg',
      },
    ]);
  });
  it('cachedResolveAuthors: one author query, no site-wide path scan, input order kept', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'b1',
        path: 'people/ada.md',
        appPath: '/people/ada',
        permalink: null,
        metadata: {
          title: 'Ada',
          avatar: '[[ada.jpg]]',
          bio: 'long text that must not be cached',
        },
      },
    ]);
    const out = await cachedResolveAuthors(
      {
        siteId: 's',
        handles: ['zed', 'ada'],
        siteHostname: 'h',
        files: ['/people/ada.jpg'],
      },
      { blob: { findMany } },
    );
    expect(out.map((a) => a.name)).toEqual(['zed', 'Ada']);
    expect(out[1]!.avatar).toBe('http://h/people/ada.jpg');
    expect(findMany).toHaveBeenCalledTimes(1);
  });
  it('does not query for an empty list', async () => {
    const findMany = vi.fn();
    expect(
      await resolveAuthors(
        { blob: { findMany } },
        { siteId: 's', handles: [], siteHostname: 'h', files: [] },
      ),
    ).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
