import { describe, expect, it } from 'vitest';
import {
  listingCanonical,
  pageFromSearchParam,
  pageHref,
  sliceListing,
} from './paginate';

const items = Array.from({ length: 45 }, (_, i) => i + 1);

describe('sliceListing', () => {
  it('limit wins and never paginates', () => {
    expect(sliceListing(items, { limit: 3, pageSize: null }, 5)).toEqual({
      items: [1, 2, 3],
      page: 1,
      pageCount: 1,
      total: 45,
      paginated: false,
    });
  });
  it('no pageSize shows everything', () => {
    expect(
      sliceListing(items, { limit: null, pageSize: null }, 2).items,
    ).toHaveLength(45);
  });
  it('slices the requested page', () => {
    expect(sliceListing(items, { limit: null, pageSize: 20 }, 3)).toEqual({
      items: [41, 42, 43, 44, 45],
      page: 3,
      pageCount: 3,
      total: 45,
      paginated: true,
    });
  });
  it('out of range and huge pages are empty, not errors (Review Focus 4)', () => {
    expect(sliceListing(items, { limit: null, pageSize: 20 }, 4).items).toEqual(
      [],
    );
    expect(
      sliceListing(
        items,
        { limit: null, pageSize: 20 },
        Number('99999999999999999999'),
      ).items,
    ).toEqual([]);
  });
  it('an empty folder still has one page', () => {
    expect(sliceListing([], { limit: null, pageSize: 20 }, 1).pageCount).toBe(
      1,
    );
  });
});

describe('pageFromSearchParam', () => {
  it('bad values mean page 1', () => {
    for (const v of [undefined, '', 'abc', '0', '-1', '2.5'])
      expect(pageFromSearchParam(v)).toBe(1);
    expect(pageFromSearchParam('3')).toBe(3);
    expect(pageFromSearchParam(['4', '5'])).toBe(4);
  });
});

describe('pageHref', () => {
  it('page 1 is the bare URL; other params and fragments are dropped', () => {
    expect(pageHref('/blog', 1)).toBe('/blog');
    expect(pageHref('/blog', 2)).toBe('/blog?page=2');
    expect(pageHref('/blog?utm_source=x#top', 3)).toBe('/blog?page=3');
    expect(pageHref('/', 2)).toBe('/?page=2');
  });
});

describe('listingCanonical', () => {
  it('self-canonical only for page-level listings beyond page 1', () => {
    expect(listingCanonical('https://s.site/blog', true, '2')).toBe(
      'https://s.site/blog?page=2',
    );
    expect(listingCanonical('https://s.site/blog', true, '1')).toBe(
      'https://s.site/blog',
    );
    expect(listingCanonical('https://s.site/blog', true, 'abc')).toBe(
      'https://s.site/blog',
    );
    expect(listingCanonical('https://s.site/blog', false, '2')).toBe(
      'https://s.site/blog',
    );
  });
});
