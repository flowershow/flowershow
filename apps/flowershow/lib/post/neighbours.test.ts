import { describe, expect, it } from 'vitest';
import { pickReadMore, postNeighbours } from './neighbours';

const paths = ['blog/e.md', 'blog/d.md', 'blog/c.md', 'blog/b.md', 'blog/a.md']; // newest first

describe('postNeighbours', () => {
  it('date desc: previous is the older post, next the newer one', () => {
    expect(
      postNeighbours(paths, 'blog/c.md', { field: 'date', direction: 'desc' }),
    ).toEqual({ previous: 'blog/b.md', next: 'blog/d.md' });
  });
  it('any other order: previous and next follow the list', () => {
    expect(
      postNeighbours(paths, 'blog/c.md', { field: 'title', direction: 'asc' }),
    ).toEqual({ previous: 'blog/d.md', next: 'blog/b.md' });
    expect(
      postNeighbours(paths, 'blog/c.md', { field: 'date', direction: 'asc' }),
    ).toEqual({ previous: 'blog/d.md', next: 'blog/b.md' });
  });
  it('ends have one side; a page not in the list has none', () => {
    const desc = { field: 'date', direction: 'desc' } as const;
    expect(postNeighbours(paths, 'blog/e.md', desc)).toEqual({
      previous: 'blog/d.md',
      next: null,
    });
    expect(postNeighbours(paths, 'blog/a.md', desc)).toEqual({
      previous: null,
      next: 'blog/b.md',
    });
    expect(postNeighbours(paths, 'blog/x.md', desc)).toEqual({
      previous: null,
      next: null,
    });
    expect(postNeighbours(['blog/a.md'], 'blog/a.md', desc)).toEqual({
      previous: null,
      next: null,
    });
  });
});

describe('pickReadMore', () => {
  it('same-tag posts first (in list order), then the most recent others', () => {
    expect(
      pickReadMore({
        paths,
        sameTag: ['blog/a.md', 'blog/d.md', 'blog/c.md'],
        self: 'blog/c.md',
        avoid: [],
      }),
    ).toEqual(['blog/d.md', 'blog/a.md', 'blog/e.md']);
  });
  it('never the post itself; prev/next only when nothing else is left', () => {
    expect(
      pickReadMore({
        paths,
        sameTag: [],
        self: 'blog/c.md',
        avoid: ['blog/b.md', 'blog/d.md'],
      }),
    ).toEqual(['blog/e.md', 'blog/a.md', 'blog/d.md']);
    expect(
      pickReadMore({
        paths: ['blog/b.md', 'blog/a.md'],
        sameTag: [],
        self: 'blog/a.md',
        avoid: ['blog/b.md'],
      }),
    ).toEqual(['blog/b.md']);
  });
  it('same-tag posts outside the collection list are ignored', () => {
    expect(
      pickReadMore({
        paths,
        sameTag: ['elsewhere/z.md'],
        self: 'blog/e.md',
        avoid: [],
        n: 2,
      }),
    ).toEqual(['blog/d.md', 'blog/c.md']);
  });
  it('fewer posts than n is fine; none is empty', () => {
    expect(
      pickReadMore({
        paths: ['blog/a.md'],
        sameTag: [],
        self: 'blog/a.md',
        avoid: [],
      }),
    ).toEqual([]);
  });
});
