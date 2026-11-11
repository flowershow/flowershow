import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLANS } from '@/lib/stripe-plans';
import Billing from './billing';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const capture = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: (...args: unknown[]) => capture(...args) },
}));

vi.mock('@/trpc/react', () => ({
  api: {
    stripe: {
      createCheckoutSession: { useMutation: () => ({ mutate: vi.fn() }) },
      getBillingPortal: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

// Arbitrary test numbers; never asserted as product prices.
const bundleInfo = {
  activeSiteCount: 1,
  prices: {
    month: { amount: 111, currency: 'USD' },
    year: { amount: 222, currency: 'USD' },
  },
  tiers: [{ id: 'tier_a', minExistingSites: 1, percentOff: 10 }],
  nextSiteDiscountPercent: 10,
};

const base = {
  siteId: 'site-1',
  subscription: null,
  plans: PLANS,
  bundleInfo,
  sitePlan: 'FREE',
  planSource: null,
  accountPlansEnabled: false,
  accountPlan: null,
} as const;

afterEach(() => {
  cleanup();
  capture.mockClear();
});

describe('Billing (site settings)', () => {
  it.each([
    ['PRO', 'Pro'],
    ['UNLIMITED', 'Unlimited'],
  ] as const)(
    'ACCOUNT site shows Premium through your %s plan with no buttons',
    (accountPlan, label) => {
      render(
        <Billing
          {...base}
          accountPlansEnabled
          planSource="ACCOUNT"
          accountPlan={accountPlan}
        />,
      );
      expect(
        screen.getByText(`Premium through your ${label} plan`),
      ).toBeTruthy();
      expect(
        screen
          .getByRole('link', { name: /account billing/i })
          .getAttribute('href'),
      ).toBe('/settings/billing');
      expect(screen.queryByRole('button')).toBeNull();
      expect(capture).not.toHaveBeenCalled();
    },
  );

  it('MANUAL site shows granted by Flowershow with no buttons', () => {
    render(
      <Billing
        {...base}
        accountPlansEnabled
        sitePlan="PREMIUM"
        planSource="MANUAL"
      />,
    );
    expect(screen.getByText('Premium (granted by Flowershow)')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('PREMIUM with a null source is treated as manual', () => {
    render(
      <Billing
        {...base}
        accountPlansEnabled
        sitePlan="PREMIUM"
        planSource={null}
      />,
    );
    expect(screen.getByText('Premium (granted by Flowershow)')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('with the flag on the per-site price comes from live data, not PLANS', () => {
    render(<Billing {...base} accountPlansEnabled />);
    expect(screen.getByText('$111')).toBeTruthy();
    const fallback = PLANS.PREMIUM.price?.month?.amount;
    if (fallback !== undefined && fallback !== 111) {
      expect(screen.queryByText(`$${fallback}`)).toBeNull();
    }
  });

  it('FREE site with the flag on keeps per-site upgrade, links to account billing, no ladder', () => {
    render(<Billing {...base} accountPlansEnabled />);
    expect(
      screen.getByRole('button', { name: 'Upgrade to Premium' }),
    ).toBeTruthy();
    expect(
      screen.getByText('Have several sites? Pro covers up to 5.'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /pro covers up to 5/i })
        .getAttribute('href'),
    ).toBe('/settings/billing');
    expect(screen.queryByText('Save more with every site')).toBeNull();
    expect(screen.queryByText(/bundle discount/i)).toBeNull();
    expect(capture).not.toHaveBeenCalledWith(
      'bundle_ladder_shown',
      expect.anything(),
    );
  });

  it('with the flag off renders the ladder and captures bundle_ladder_shown as today', () => {
    render(<Billing {...base} />);
    expect(screen.getByText('Save more with every site')).toBeTruthy();
    expect(screen.queryByText(/Have several sites/)).toBeNull();
    expect(capture).toHaveBeenCalledWith('bundle_ladder_shown', {
      siteId: 'site-1',
      activeSiteCount: 1,
      nextSiteDiscountPercent: 10,
    });
  });

  it('with the flag off an active subscription still shows Manage Subscription', () => {
    render(
      <Billing
        {...base}
        planSource="SITE"
        subscription={{
          status: 'active',
          interval: 'month',
          discountPercent: 0,
        }}
      />,
    );
    expect(screen.getByText('Premium')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Manage Subscription' }),
    ).toBeTruthy();
  });
});
