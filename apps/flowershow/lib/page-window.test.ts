import { describe, expect, it } from 'vitest';
import { pageWindow } from './page-window';

describe('pageWindow', () => {
  it('shows nothing for zero pages and a single page for one', () => {
    expect(pageWindow(1, 0)).toEqual([]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
  it('shows every page when there is no gap', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('collapses each gap into exactly one ellipsis', () => {
    expect(pageWindow(1, 12)).toEqual([1, 2, 3, 'ellipsis', 12]);
    expect(pageWindow(6, 12)).toEqual([
      1,
      'ellipsis',
      4,
      5,
      6,
      7,
      8,
      'ellipsis',
      12,
    ]);
    expect(pageWindow(12, 12)).toEqual([1, 'ellipsis', 10, 11, 12]);
  });
  it('fills a one-page gap with the page instead of an ellipsis', () => {
    expect(pageWindow(5, 12)).toEqual([1, 2, 3, 4, 5, 6, 7, 'ellipsis', 12]);
  });
  it('clamps out-of-range and non-integer current pages', () => {
    expect(pageWindow(99, 12)).toEqual(pageWindow(12, 12));
    expect(pageWindow(0, 12)).toEqual(pageWindow(1, 12));
    expect(pageWindow(Number.NaN, 3)).toEqual([1, 2, 3]);
  });
});
