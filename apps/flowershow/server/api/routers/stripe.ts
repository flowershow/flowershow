import { canManageSite, isSiteOwner, siteAuthzSelect } from '@/lib/site-authz';
import type { AccountPlan } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { env } from '@/env.mjs';
import {
  consolidateSiteSubscriptions,
  getOrCreateStripeCustomer,
} from '@/lib/account-billing';
import {
  ACCOUNT_PLAN_SITE_ALLOWANCE,
  accountPlansEnabled,
  accountPriceId,
  type BillingInterval,
  isCoveringAccountStatus,
  isLiveSiteStatus,
  isManualSite,
  premiumPriceIds,
} from '@/lib/account-plans';
import { reconcileUserSitePlans } from '@/lib/site-plans';
import { FLOWERSHOW_PLATFORM, stripe } from '@/lib/stripe';
import type { BundleTierId } from '@/lib/stripe-plans';
import { BUNDLE_TIERS, getBundleTierId } from '@/lib/stripe-plans';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const protocol =
  process.env.NODE_ENV === 'development' ? 'http://' : 'https://';

const cloudBase = `${protocol}${env.NEXT_PUBLIC_CLOUD_DOMAIN}`;
const returnURLBase = `${cloudBase}/site`;

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

      if (!isSiteOwner(ctx.session.user.id, site)) {
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

      if (!isSiteOwner(ctx.session.user.id, site)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized',
        });
      }

      // Only the Premium prices may be bought per site; a client-supplied
      // account price must never end up attached to a single site.
      if (!premiumPriceIds().has(input.priceId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid price',
        });
      }

      // Dark until account plans launch: today's MANUAL sites keep their
      // upgrade button, as before.
      if (
        accountPlansEnabled() &&
        site.plan === 'PREMIUM' &&
        (site.planSource === 'ACCOUNT' || site.planSource === 'MANUAL')
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This site is already Premium through your account plan.',
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
      // Account plans replace the bundle ladder; only retired when enabled so
      // turning the flag off is a true rollback.
      const couponId =
        tierId && !accountPlansEnabled() ? TIER_COUPON_IDS[tierId] : undefined;

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
          // Shared Stripe account: mark this session as ours so the webhook can
          // tell it apart from other products' checkout sessions.
          platform: FLOWERSHOW_PLATFORM,
        },
        // Propagate the platform marker onto the subscription Stripe creates.
        // Checkout metadata does NOT flow through to the subscription, and
        // customer.subscription.* webhook events only carry the subscription's
        // own metadata — this is what lets the webhook identify our subs.
        subscription_data: {
          metadata: {
            siteId: input.siteId,
            platform: FLOWERSHOW_PLATFORM,
          },
        },
        success_url: `${returnURLBase}/${input.siteId}/settings?upgrade_success=true`,
        cancel_url: `${returnURLBase}/${input.siteId}/settings?upgrade_cancelled=true`,
      });

      return { url: checkoutSession.url };
    }),

  // Account-level plan (Pro / Unlimited). Dark until accountPlansEnabled().
  // The client sends { plan, interval }, never a price id.
  createAccountCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(['PRO', 'UNLIMITED']),
        interval: z.enum(['month', 'year']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (!accountPlansEnabled()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Account plans are not available yet',
        });
      }

      const priceId = accountPriceId(input.plan, input.interval);
      if (!priceId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'This plan is not available',
        });
      }

      // Any account subscription that is not over for good (including
      // `incomplete`, e.g. 3DS pending) blocks a second checkout.
      const existing = await ctx.db.accountSubscription.findUnique({
        where: { userId },
        select: { status: true },
      });
      if (existing && isLiveSiteStatus(existing.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You already have an account plan. Change it from Billing.',
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, stripeCustomerId: true },
      });
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const customer = await getOrCreateStripeCustomer(user);

      // Metadata goes on both the session and the subscription: checkout
      // metadata does not flow to the subscription, and subscription webhooks
      // only carry the subscription's own metadata.
      const metadata = {
        platform: FLOWERSHOW_PLATFORM,
        kind: 'account',
        userId,
      };
      const checkoutSession = await stripe.checkout.sessions.create({
        customer,
        mode: 'subscription',
        payment_method_types: ['card'],
        client_reference_id: userId,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata,
        subscription_data: { metadata },
        success_url: `${cloudBase}/settings/billing?upgrade_success=true`,
        cancel_url: `${cloudBase}/settings/billing?upgrade_cancelled=true`,
      });

      return { url: checkoutSession.url };
    }),

  // Everything the billing page needs about the account plan. Amounts are read
  // live from Stripe; the credit is the customer's balance (negative = credit).
  getAccountPlan: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [account, user, sites] = await Promise.all([
      ctx.db.accountSubscription.findUnique({ where: { userId } }),
      ctx.db.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      }),
      ctx.db.site.findMany({
        where: { userId, isTemporary: false },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          projectName: true,
          plan: true,
          planSource: true,
          coveredByAccountPlan: true,
          subscription: { select: { status: true } },
        },
      }),
    ]);

    const priceFor = async (plan: AccountPlan, interval: BillingInterval) => {
      // Dark: no Stripe lookups for plans nobody can buy yet.
      const priceId = accountPlansEnabled()
        ? accountPriceId(plan, interval)
        : null;
      return priceId ? getPriceAmount(priceId) : null;
    };
    const [proMonth, proYear, unlMonth, unlYear, creditBalanceCents] =
      await Promise.all([
        priceFor('PRO', 'month'),
        priceFor('PRO', 'year'),
        priceFor('UNLIMITED', 'month'),
        priceFor('UNLIMITED', 'year'),
        (async () => {
          if (!user?.stripeCustomerId) return 0;
          try {
            const customer = await stripe.customers.retrieve(
              user.stripeCustomerId,
            );
            return customer.deleted ? 0 : Math.max(0, -customer.balance);
          } catch {
            return 0;
          }
        })(),
      ]);

    return {
      enabled: accountPlansEnabled(),
      plan: account?.plan ?? null,
      interval: account?.interval ?? null,
      status: account?.status ?? null,
      cancelAtPeriodEnd: account?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: account?.currentPeriodEnd ?? null,
      siteAllowance: account?.siteAllowance ?? null,
      // The Pro allowance, for the no-plan card (independent of any account row).
      proSiteAllowance: ACCOUNT_PLAN_SITE_ALLOWANCE.PRO,
      creditBalanceCents,
      prices: {
        PRO: { month: proMonth, year: proYear },
        UNLIMITED: { month: unlMonth, year: unlYear },
      },
      sites: sites.map((site) => ({
        id: site.id,
        projectName: site.projectName,
        plan: site.plan,
        planSource: site.planSource,
        covered: site.coveredByAccountPlan || site.planSource === 'ACCOUNT',
        hasSiteSubscription:
          !!site.subscription && isLiveSiteStatus(site.subscription.status),
      })),
    };
  }),

  // Cover or uncover one site with the account plan. Owner only.
  setSiteCovered: protectedProcedure
    .input(z.object({ siteId: z.string(), covered: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: {
          id: true,
          userId: true,
          plan: true,
          planSource: true,
          subscription: { select: { status: true } },
        },
      });
      if (!site) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });
      }
      if (!isSiteOwner(userId, site)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const account = accountPlansEnabled()
        ? await ctx.db.accountSubscription.findUnique({ where: { userId } })
        : null;
      if (!account || !isCoveringAccountStatus(account.status)) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'You need an active account plan to cover sites.',
        });
      }

      if (isManualSite(site)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This site was granted Premium by Flowershow.',
        });
      }

      if (input.covered) {
        const allowance = ACCOUNT_PLAN_SITE_ALLOWANCE[account.plan];
        if (allowance !== null) {
          const used = await ctx.db.site.count({
            where: {
              userId,
              isTemporary: false,
              coveredByAccountPlan: true,
              NOT: { id: site.id },
            },
          });
          if (used >= allowance) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: `All ${allowance} sites on your Pro plan are in use. Remove one first.`,
            });
          }
        }
      }

      // Clear the flag before reconciling, and tell the reconciler the site was
      // released, or its stateless trim would refill the freed slot at once.
      await ctx.db.site.update({
        where: { id: site.id },
        data: { coveredByAccountPlan: input.covered },
      });
      if (input.covered) {
        await reconcileUserSitePlans(userId);
        // Only active or trialing plans consolidate (an incomplete plan must
        // never cancel subscriptions someone is paying for).
        if (
          site.subscription &&
          isLiveSiteStatus(site.subscription.status) &&
          (account.status === 'active' || account.status === 'trialing')
        ) {
          await consolidateSiteSubscriptions({
            userId,
            stripeCustomerId: account.stripeCustomerId,
            stripeSubscriptionId: account.stripeSubscriptionId,
          });
        }
      } else {
        await reconcileUserSitePlans(userId, { released: [site.id] });
      }

      return { covered: input.covered };
    }),

  getAccountBillingPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No billing account found',
      });
    }
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${cloudBase}/settings/billing`,
    });
    return { url: portalSession.url };
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

      if (!isSiteOwner(ctx.session.user.id, site)) {
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

  // What the site settings billing panel needs, for anyone who can manage the
  // site (owner or Premium editor). No Stripe calls. `accountPlan` is the
  // OWNER's plan, never the caller's.
  getSiteBillingStatus: protectedProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const site = await ctx.db.site.findUnique({
        where: { id: input.siteId },
        select: { planSource: true, ...siteAuthzSelect(userId) },
      });
      if (!site) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });
      }
      if (!canManageSite(userId, site)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
      }

      const account = await ctx.db.accountSubscription.findUnique({
        where: { userId: site.userId },
        select: { plan: true, status: true },
      });
      return {
        planSource: site.planSource,
        isOwner: isSiteOwner(userId, site),
        accountPlan:
          account && isCoveringAccountStatus(account.status)
            ? account.plan
            : null,
      };
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

      if (!isSiteOwner(ctx.session.user.id, site)) {
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
