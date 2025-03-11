import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { stripe } from "@/lib/stripe";
import { env } from "@/env.mjs";

const protocol =
  process.env.NODE_ENV === "development" ? "http://" : "https://";

const subdomain =
  env.NEXT_PUBLIC_VERCEL_ENV === "preview" ? "staging-cloud" : "cloud";

const returnURLBase = `${protocol}${subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}/site`;

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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      if (!site.subscription?.stripeSubscriptionId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found",
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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      // Check if site already has an active subscription
      const existingSubscription = await ctx.db.subscription.findUnique({
        where: { siteId: input.siteId },
      });

      if (existingSubscription && existingSubscription.status === "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Site already has an active subscription",
        });
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        client_reference_id: input.siteId,
        customer_email: site.user?.email!,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        metadata: {
          siteId: input.siteId,
        },
        success_url: `${returnURLBase}/${input.siteId}/settings/billing?success=true`,
        cancel_url: `${returnURLBase}/${input.siteId}/settings/billing?canceled=true`,
      });

      return { url: checkoutSession.url };
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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      if (!site.subscription?.stripeCustomerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found",
        });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: site.subscription.stripeCustomerId,
        return_url: `${returnURLBase}/${input.siteId}/settings/billing`,
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
          code: "NOT_FOUND",
          message: "Site not found",
        });
      }

      if (site.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return site.subscription;
    }),
});
