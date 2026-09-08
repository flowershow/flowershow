import { describe, expect, it } from 'vitest';
import {
  applyDiscount,
  BUNDLE_TIERS,
  getBundleTierId,
} from './stripe-plans';

describe('getBundleTierId', () => {
  it('applies no tier (full price) to the first premium site', () => {
    expect(getBundleTierId(0)).toBeNull();
  });

  it('applies tier A to the second site', () => {
    expect(getBundleTierId(1)).toBe('A');
  });

  it('applies tier B to the third and beyond', () => {
    expect(getBundleTierId(2)).toBe('B');
    expect(getBundleTierId(3)).toBe('B');
    expect(getBundleTierId(10)).toBe('B');
  });

  it('never goes past the deepest configured tier', () => {
    const deepest = BUNDLE_TIERS[BUNDLE_TIERS.length - 1]!.id;
    expect(getBundleTierId(1000)).toBe(deepest);
  });
});

describe('applyDiscount', () => {
  it('returns the full amount for 0% off', () => {
    expect(applyDiscount(5, 0)).toBe(5);
    expect(applyDiscount(50, 0)).toBe(50);
  });

  it('discounts monthly prices', () => {
    expect(applyDiscount(5, 15)).toBe(4.25);
    expect(applyDiscount(5, 25)).toBe(3.75);
  });

  it('discounts yearly prices', () => {
    expect(applyDiscount(50, 15)).toBe(42.5);
    expect(applyDiscount(50, 25)).toBe(37.5);
  });

  it('rounds to two decimals', () => {
    expect(applyDiscount(9.99, 15)).toBe(8.49);
  });
});
