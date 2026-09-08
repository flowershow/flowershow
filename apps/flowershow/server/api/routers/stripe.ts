import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { env } from '@/env.mjs';
import { stripe } from '@/lib/stripe';
import type { BundleTierId } from '@/lib/stripe-plans';
import { BUNDLE_TIERS, getBundleTierId } from '@/lib/stripe-plans';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const protocol =
  process.env.NODE_ENV === 'development' ? 'http://' : 'https://';

const returnURLBase = `${protocol}${env.NEXT_PUBLIC_CLOUD_DOMAIN}/site`;

// Maps each bundle tier id to its configured Stripe coupon ID. The discount
// percentage itself lives on the coupon in Stripe — the code only knows which
// coupon backs which tier. Undefined = tier not configured -> full price.
const TIER_COUPON_IDS: Record<BundleTierId, string | undefined> = {
  A: env.STRIPE_BUNDLE_COUPON_A,
  B: env.STRIPE_BUNDLE_COUPON_B,
};

// Small in-process TTL cache so we don't hit Stripe for coupon/price metadata
// on every settings-page load. Coupons and prices change rarely; a few minutes
// of staleness is fine. Keyed by a caller-supplied string.
const STRIPE_META_TTL_MS = 5 * 60 * 1000;
const stripeMetaCache = new Map<string, { value: unknown; expires: number }>();

async function cachedStripeMeta<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = stripeMetaCache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.value as T;
  }
  const value = await fetcher();
  stripeMetaCache.set(key, { value, expires: Date.now() + STRIPE_META_TTL_MS });
  return value;
}

// Reads a coupon's live percent_off from Stripe (0 if unconfigured/missing).
async function getTierPercentOff(tierId: BundleTierId): Promise<number> {
  const couponId = TIER_COUPON_IDS[tierId];
  if (!couponId) return 0;
  return cachedStripeMeta(`coupon:${couponId}`, async () => {
    try {
      const coupon = await stripe.coupons.retrieve(couponId);
      return coupon.percent_off ?? 0;
    } catch {
      return 0;
    }
  });
}

// Reads a Stripe price's live amount (major units) and currency.
async function getPriceAmount(
  priceId: string,
): Promise<{ amount: number; currency: string } | null> {
  return cachedStripeMeta(`price:${priceId}`, async () => {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.unit_amount == null) return null;
      return {
        amount: price.unit_amount / 100,
        currency: (price.currency ?? 'usd').toUpperCase(),
      };
    } catch {
      return null;
    }
  });
}

export const stripeRouter = createTRPCRouter({
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        include: { subscription: true },
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      if (!site.subscription?.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        });
      }

      // Cancel the subscription immediately
      await stripe.subscriptions.cancel(site.subscription.stripeSubscriptionId);

      return { success: true };
    }),
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        priceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        include: { user: true },
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      // Check if site already has an active subscription
      const existingSubscription = await ctx.db.subscription.findUnique({
        where: { siteId: input.siteId },
      });

      if (existingSubscription && existingSubscription.status === 'active') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Site already has an active subscription',
        });
      }

      // Multi-site bundle discount: the more active subscriptions the user
      // already has, the cheaper their next site. The coupon is permanent
      // (duration: forever) and stays attached to this Stripe subscription, so
      // it is grandfathered even if other sites are later cancelled.
      const existingActiveSites = await ctx.db.subscription.count({
        where: { status: 'active', site: { userId: ctx.session.user.id } },
      });
      const tierId = getBundleTierId(existingActiveSites);
      const couponId = tierId ? TIER_COUPON_IDS[tierId] : undefined;

      const checkoutSession = await stripe.checkout.sessions.create({
        client_reference_id: input.siteId,
        customer_email: site.user?.email!,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
        metadata: {
          siteId: input.siteId,
        },
        success_url: `${returnURLBase}/${input.siteId}/settings?upgrade_success=true`,
        cancel_url: `${returnURLBase}/${input.siteId}/settings?upgrade_cancelled=true`,
      });

      return { url: checkoutSession.url };
    }),

  // Returns the bundle-discount context for the current user, with all money
  // amounts read live from Stripe (prices + coupon percentages). Drives the
  // pricing ladder shown in Billing so the owner can change amounts entirely
  // in Stripe with no code change.
  getBundleInfo: protectedProcedure.query(async ({ ctx }) => {
    const activeSiteCount = await ctx.db.subscription.count({
      where: { status: 'active', site: { userId: ctx.session.user.id } },
    });

    const [monthPrice, yearPrice, tierPercents] = await Promise.all([
      getPriceAmount(env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID),
      getPriceAmount(env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID),
      Promise.all(BUNDLE_TIERS.map((tier) => getTierPercentOff(tier.id))),
    ]);

    // Ladder rows: full price + one row per configured tier, with the live
    // percentage pulled from each tier's Stripe coupon.
    const tiers = BUNDLE_TIERS.map((tier, i) => ({
      id: tier.id,
      minExistingSites: tier.minExistingSites,
      percentOff: tierPercents[i] ?? 0,
    }));

    const nextTierId = getBundleTierId(activeSiteCount);
    const nextSiteDiscountPercent = nextTierId
      ? (tiers.find((t) => t.id === nextTierId)?.percentOff ?? 0)
      : 0;

    return {
      activeSiteCount,
      prices: { month: monthPrice, year: yearPrice },
      tiers,
      nextSiteDiscountPercent,
    };
  }),

  getBillingPortal: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        include: { subscription: true },
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      if (!site.subscription?.stripeCustomerId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: site.subscription.stripeCustomerId,
        return_url: `${returnURLBase}/${input.siteId}/settings`,
      });

      return { url: portalSession.url };
    }),

  getSiteSubscription: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        include: { subscription: true },
      });

      if (!site) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Site not found',
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      if (!site.subscription) {
        return null;
      }

      // Look up the actual discount applied to this subscription in Stripe so
      // the billing UI can show the real charged price. The discount isn't
      // stored locally (no schema change), so we read it live. Best-effort:
      // any failure just falls back to no discount / full price.
      let discountPercent = 0;
      if (site.subscription.stripeSubscriptionId) {
        try {
          const subId = site.subscription.stripeSubscriptionId;
          const stripeSub = await cachedStripeMeta(`sub:${subId}`, () =>
            // Expand the discounts' coupons: on newer API versions
            // `subscription.discounts` is an array of IDs unless expanded, so
            // without this the coupon's `percent_off` would be unreadable.
            stripe.subscriptions.retrieve(subId, {
              expand: ['discounts.coupon'],
            }),
          );
          // Support both the legacy single `discount` field and the newer
          // `discounts` array. Coupons are percentage-based (see bundle setup).
          const coupon =
            (stripeSub as any).discount?.coupon ??
            (stripeSub as any).discounts?.[0]?.coupon ??
            (stripeSub as any).discounts?.[0];
          discountPercent = coupon?.percent_off ?? 0;
        } catch {
          // ignore — fall back to full price display
        }
      }

      return { ...site.subscription, discountPercent };
    }),
});
