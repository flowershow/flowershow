import { describe, expect, it } from 'vitest';
import { Feature, GB, MB, getEntitlements } from './entitlements';

describe('getEntitlements', () => {
  it('FREE has no features and free limits', () => {
    const e = getEntitlements({ plan: 'FREE' });
    expect(e.plan).toBe('FREE');
    expect(e.isPaid).toBe(false);
    expect(e.features.size).toBe(0);
    expect(e.limits.siteSoftBytes).toBe(100 * MB);
    expect(e.limits.siteHardBytes).toBe(200 * MB);
    expect(e.limits.freePoolHardBytes).toBe(GB);
  });

  it('PREMIUM has all features and premium limits', () => {
    const e = getEntitlements({ plan: 'PREMIUM' });
    expect(e.isPaid).toBe(true);
    expect(e.features.size).toBe(8);
    for (const f of Object.values(Feature))
      expect(e.features.has(f)).toBe(true);
    expect(e.limits.siteSoftBytes).toBe(5 * GB);
    expect(e.limits.siteHardBytes).toBe(10 * GB);
    expect(e.limits.freePoolHardBytes).toBeNull();
  });

  it('null or missing plan behaves as FREE', () => {
    expect(getEntitlements({ plan: null }).plan).toBe('FREE');
    expect(getEntitlements({}).isPaid).toBe(false);
  });
});

describe('getEntitlements planSource', () => {
  it('passes planSource through', () => {
    const e = getEntitlements({ plan: 'PREMIUM', planSource: 'ACCOUNT' });
    expect(e.planSource).toBe('ACCOUNT');
    expect(e.isPaid).toBe(true);
    expect(getEntitlements({ plan: 'FREE' }).planSource).toBeNull();
  });
});
