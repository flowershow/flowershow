import { describe, expect, it } from 'vitest';
import { labelIndexes, niceMax } from './views-chart';

describe('niceMax', () => {
  it('rounds up to 1, 2 or 5 × 10ⁿ, at least 4', () => {
    expect([0, 3, 5, 7, 12, 88, 100, 101, 450].map(niceMax)).toEqual([
      4, 4, 10, 10, 20, 100, 100, 200, 500,
    ]);
  });
});

describe('labelIndexes', () => {
  it('labels every day of a week', () => {
    expect([...labelIndexes(7)].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });
  it('labels about 5 days of a month, always the last', () => {
    expect([...labelIndexes(30)].sort((a, b) => a - b)).toEqual([
      5, 11, 17, 23, 29,
    ]);
  });
  it('labels fewer days for phones', () => {
    expect([...labelIndexes(7, 4)].sort((a, b) => a - b)).toEqual([2, 6]);
  });
});
