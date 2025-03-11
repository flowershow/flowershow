import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/server/db";
import { env } from "@/env.mjs";

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
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return NextResponse.json(
      { message: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case "checkout.session.completed": {
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

          // Check for existing subscription
          const existingSubscription = await prisma.subscription.findUnique({
            where: { siteId: checkoutSession.metadata.siteId },
          });

          // If there's an existing canceled subscription, delete it
          if (
            existingSubscription &&
            existingSubscription.status === "canceled"
          ) {
            await prisma.subscription.delete({
              where: { id: existingSubscription.id },
            });
          }

          // Create new subscription
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
          await prisma.site.update({
            where: {
              id: checkoutSession.metadata.siteId,
            },
            data: {
              plan: "PREMIUM",
            },
          });

          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;

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
            await prisma.site.update({
              where: {
                id: dbSubscription.siteId,
              },
              data: {
                plan: "FREE",
              },
            });
          }

          break;
        }
        default:
          throw new Error("Unhandled relevant event!");
      }
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { message: "Webhook handler failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
