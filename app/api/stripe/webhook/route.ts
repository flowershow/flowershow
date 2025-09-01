import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/server/db";
import { env } from "@/env.mjs";
import PostHogClient from "@/lib/server-posthog";

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("Stripe-Signature");

  let event;

  try {
    console.log(`📥 Incoming Stripe webhook request`);
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      env.STRIPE_WEBHOOK_SECRET,
    );
    console.log(`✅ Webhook verified. Event type: ${event.type}`);
  } catch (err: any) {
    console.error(`❌ Webhook verification failed: ${err.message}`);
    return NextResponse.json(
      { message: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          console.log(`🔄 Processing checkout.session.completed`);
          const checkoutSession = event.data.object as any;
          const subscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription,
          );

          const priceId = subscription.items.data[0]?.price?.id;
          const interval =
            subscription.items.data[0]?.price?.recurring?.interval;

          if (!priceId || !interval) {
            throw new Error("Missing required subscription data");
          }

          console.log(`📋 Subscription details:
            - Customer: ${checkoutSession.customer}
            - Site ID: ${checkoutSession.metadata.siteId}
            - Price ID: ${priceId}
            - Interval: ${interval}
          `);

          // Check for existing subscription
          const existingSubscription = await prisma.subscription.findUnique({
            where: { siteId: checkoutSession.metadata.siteId },
          });

          // If there's an existing canceled subscription, delete it
          if (
            existingSubscription &&
            existingSubscription.status === "canceled"
          ) {
            console.log(
              `🗑️ Deleting existing canceled subscription: ${existingSubscription.id}`,
            );
            await prisma.subscription.delete({
              where: { id: existingSubscription.id },
            });
          }

          // Create new subscription
          console.log(`📝 Creating new subscription record`);

          await prisma.subscription.create({
            data: {
              siteId: checkoutSession.metadata.siteId,
              stripeCustomerId: checkoutSession.customer,
              stripeSubscriptionId: subscription.id,
              stripePriceId: priceId,
              status: subscription.status,
              interval: interval,
              currentPeriodStart: new Date(
                subscription.current_period_start * 1000,
              ),
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });

          // Update site's features to PREMIUM
          console.log(`⭐ Upgrading site to PREMIUM plan`);
          const updatedSite = await prisma.site.update({
            where: {
              id: checkoutSession.metadata.siteId,
            },
            data: {
              plan: "PREMIUM",
            },
            include: {
              user: true,
            },
          });

          const posthog = PostHogClient();
          posthog.capture({
            distinctId: updatedSite.userId,
            event: "site_upgraded",
            properties: {
              siteId: checkoutSession.metadata.siteId,
              interval: interval,
              priceId: priceId,
            },
          });
          await posthog.shutdown();

          console.log(`✅ Checkout session processing completed`);
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          console.log(`🔄 Processing ${event.type}`);
          const subscription = event.data.object as any;

          console.log(`📋 Subscription details:
            - ID: ${subscription.id}
            - Status: ${subscription.status}
          `);

          const dbSubscription = await prisma.subscription.findUnique({
            where: {
              stripeSubscriptionId: subscription.id,
            },
            include: {
              site: true,
            },
          });

          if (!dbSubscription) {
            throw new Error("Subscription not found");
          }

          const priceId = subscription.items.data[0]?.price?.id;
          const interval =
            subscription.items.data[0]?.price?.recurring?.interval;

          if (!priceId || !interval) {
            throw new Error("Missing required subscription data");
          }

          console.log(`📝 Updating subscription record`);
          await prisma.subscription.update({
            where: {
              stripeSubscriptionId: subscription.id,
            },
            data: {
              status: subscription.status,
              currentPeriodStart: new Date(
                subscription.current_period_start * 1000,
              ),
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              stripePriceId: priceId,
              interval: interval,
            },
          });

          // If subscription is cancelled/deleted, downgrade site to FREE
          if (subscription.status === "canceled") {
            console.log(`⬇️ Downgrading site to FREE plan`);
            await prisma.site.update({
              where: {
                id: dbSubscription.siteId,
              },
              data: {
                plan: "FREE",
              },
            });
          }

          console.log(`✅ Subscription update processing completed`);
          break;
        }
        default:
          throw new Error("Unhandled relevant event!");
      }
    } catch (error) {
      console.error(`❌ Webhook handler failed:`, error);
      return NextResponse.json(
        { message: "Webhook handler failed" },
        { status: 500 },
      );
    }
  } else {
    console.log(`ℹ️ Ignoring irrelevant event type: ${event.type}`);
  }

  console.log(`✅ Webhook processing completed successfully`);
  return NextResponse.json({ received: true });
}
