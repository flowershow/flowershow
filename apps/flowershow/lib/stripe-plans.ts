import { env } from '@/env.mjs';

export type PlanType = 'FREE' | 'PREMIUM';

export type Plan = {
  name: string;
  description: string;
  features: string[];
  price?: {
    month?: {
      amount: number; // TODO take from stripe API ?
      currency: string;
      stripePriceId: string;
    };
    year?: {
      amount: number; // TODO take from stripe API ?
      currency: string;
      stripePriceId: string;
    };
  };
};

// Multi-site bundle discount tiers. The discount applies to the Nth premium
// site a user buys, based on how many *active* subscriptions they already have
// at checkout time.
//
// The actual discount PERCENTAGES are NOT defined here — they live entirely in
// Stripe as coupons (duration: forever). The code only knows the tier
// identities and when each applies; the server resolves each tier id to a
// Stripe coupon (see the router) and reads its live `percent_off`. To change a
// rate, swap the coupon in Stripe — no code change.
//
//   existingActiveSites -> tier applied to the new site:
//     0 (their 1st premium site) -> none (full price)
//     1 (their 2nd)              -> tier A
//     2+ (their 3rd and beyond)  -> tier B
export const BUNDLE_TIERS = [
  { id: 'A', minExistingSites: 1 },
  { id: 'B', minExistingSites: 2 },
] as const;

export type BundleTierId = (typeof BUNDLE_TIERS)[number]['id'];

/**
 * Which bundle tier applies to a user who already has `existingActiveSites`
 * active subscriptions, or null for their first site (full price).
 */
export function getBundleTierId(
  existingActiveSites: number,
): BundleTierId | null {
  let tierId: BundleTierId | null = null;
  for (const tier of BUNDLE_TIERS) {
    if (existingActiveSites >= tier.minExistingSites) {
      tierId = tier.id;
    }
  }
  return tierId;
}

/**
 * Apply a percent discount to an amount, rounded to 2 decimals for display.
 */
export function applyDiscount(amount: number, percentOff: number): number {
  return Math.round(amount * (1 - percentOff / 100) * 100) / 100;
}

// NOTE: the `amount` values below are display fallbacks only. The prices shown
// in the billing UI are read live from Stripe (via the stripePriceId), so the
// owner can change amounts in Stripe without touching this file.
export const PLANS: Record<PlanType, Plan> = {
  FREE: {
    name: 'Free',
    description: 'Basic features for personal use',
    features: ['Basic markdown support', 'GitHub sync', 'Custom subdomain'],
  },
  PREMIUM: {
    name: 'Premium',
    description: 'No branding, custom domain support, and more.',
    features: [
      'Everything in Free',
      'Custom domain',
      'Priority support',
      'Team collaboration',
      'Custom branding',
    ],
    price: {
      month: {
        amount: 5,
        currency: 'USD',
        stripePriceId: env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      },
      year: {
        amount: 50,
        currency: 'USD',
        stripePriceId: env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID,
      },
    },
  },
};
