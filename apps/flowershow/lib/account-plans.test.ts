import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_x',
    NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID: 'price_monthly',
    NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID: 'price_yearly',
  },
}));
vi.mock('stripe', () => ({ default: class {} }));

import {
  ACCOUNT_PLAN_SITE_ALLOWANCE,
  ACCOUNT_PRICE_IDS,
  accountPlanForPriceId,
  accountPlansEnabled,
  isCoveringAccountStatus,
  isLiveSiteStatus,
  premiumPriceIds,
} from './account-plans';
import { getSubscriptionKind } from './stripe';

// The shipped table is all null; tests fill the (mutable at runtime) test table.
const table = ACCOUNT_PRICE_IDS.test as any;
function setIds() {
  table.PRO = { month: 'price_pro_month_test', year: 'price_pro_year_test' };
  table.UNLIMITED = {
    month: 'price_unlimited_month_test',
    year: 'price_unlimited_year_test',
  };
}
function clearIds() {
  table.PRO = { month: null, year: null };
  table.UNLIMITED = { month: null, year: null };
}

describe('account plans', () => {
  beforeEach(setIds);
  afterEach(clearIds);

  it('site allowance', () => {
    expect(ACCOUNT_PLAN_SITE_ALLOWANCE.PRO).toBe(5);
    expect(ACCOUNT_PLAN_SITE_ALLOWANCE.UNLIMITED).toBeNull();
  });

  it('maps price ids to plan and interval', () => {
    expect(accountPlanForPriceId('price_unlimited_year_test')).toEqual({
      plan: 'UNLIMITED',
      interval: 'year',
    });
    expect(accountPlanForPriceId('price_monthly')).toBeNull();
  });

  it('is disabled while ACCOUNT_PLANS_LIVE is false, even with all ids set', () => {
    expect(accountPlansEnabled()).toBe(false);
  });

  it('premiumPriceIds returns the two Premium ids', () => {
    expect([...premiumPriceIds()].sort()).toEqual([
      'price_monthly',
      'price_yearly',
    ]);
  });

  it('isLiveSiteStatus', () => {
    for (const s of ['canceled', 'incomplete_expired'])
      expect(isLiveSiteStatus(s)).toBe(false);
    for (const s of [
      'active',
      'past_due',
      'trialing',
      'incomplete',
      'unpaid',
      'paused',
    ])
      expect(isLiveSiteStatus(s)).toBe(true);
  });

  it('isCoveringAccountStatus', () => {
    for (const s of ['active', 'trialing', 'past_due'])
      expect(isCoveringAccountStatus(s)).toBe(true);
    for (const s of [
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused',
    ])
      expect(isCoveringAccountStatus(s)).toBe(false);
  });

  it('getSubscriptionKind', () => {
    expect(getSubscriptionKind({ metadata: { kind: 'account' } })).toBe(
      'account',
    );
    expect(
      getSubscriptionKind({
        metadata: {},
        items: { data: [{ price: { id: 'price_pro_month_test' } }] },
      }),
    ).toBe('account');
    expect(
      getSubscriptionKind({
        metadata: {},
        items: { data: [{ price: { id: 'price_monthly' } }] },
      }),
    ).toBe('site');
  });
});

describe('shipped constants', () => {
  it('has no price ids configured', () => {
    expect(accountPlanForPriceId('price_pro_month_test')).toBeNull();
    expect(accountPlansEnabled()).toBe(false);
  });
});
