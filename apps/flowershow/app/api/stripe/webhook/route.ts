import type { StripeWebhookReceivedResponse } from '@flowershow/api-contract';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { PremiumDowngradeEmail } from '@/emails/premium-downgrade';
import { PremiumExpiredEmail } from '@/emails/premium-expired';
import { PremiumUpgradeEmail } from '@/emails/premium-upgrade';
import { RenewalReminderEmail } from '@/emails/renewal-reminder';
import { removeDomainAndVariantFromVercelProject } from '@/lib/domains';
import { sendEmail } from '@/lib/email';
import PostHogClient from '@/lib/server-posthog';
import { stripe } from '@/lib/stripe';
import { sendTransactionalEmail } from '@/lib/transactional-email';
import prisma from '@/server/db';

// Email ownership: payment-failure emails are sent by Stripe itself.
// We therefore do NOT handle `invoice.payment_failed` here.
// Flowershow only sends emails Stripe does not: annual renewal reminders
// (invoice.upcoming) and involuntary-expiry notices (subscription cancelled on
// payment_failure, handled in the subscription case below).
const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.upcoming',
]);

const billingSettingsUrl = (siteId: string) =>
  `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/site/${siteId}/settings`;

function formatAmount(
  amountInCents: number | null | undefined,
  currency = 'usd',
) {
  const value = (amountInCents ?? 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get('Stripe-Signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    const posthog = PostHogClient();
    posthog.captureException(err, 'system', {
      route: 'POST /api/stripe/webhook',
      step: 'webhook_verification',
    });
    await posthog.shutdown();
    return NextResponse.json(
      { message: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const checkoutSession = event.data.object as any;
          const subscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription,
          );

          const priceId = subscription.items.data[0]?.price?.id;
          const interval =
            subscription.items.data[0]?.price?.recurring?.interval;

          if (!priceId || !interval) {
            throw new Error('Missing required subscription data');
          }

          // Check for existing subscription
          const existingSubscription = await prisma.subscription.findUnique({
            where: { siteId: checkoutSession.metadata.siteId },
          });

          // If there's an existing canceled subscription, delete it
          if (
            existingSubscription &&
            existingSubscription.status === 'canceled'
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
          const updatedSite = await prisma.site.update({
            where: {
              id: checkoutSession.metadata.siteId,
            },
            data: {
              plan: 'PREMIUM',
            },
            include: {
              user: true,
            },
          });

          const posthog = PostHogClient();
          posthog.capture({
            distinctId: updatedSite.userId,
            event: 'site_upgraded',
            properties: {
              siteId: checkoutSession.metadata.siteId,
              interval: interval,
              priceId: priceId,
            },
          });
          await posthog.shutdown();

          // Send premium upgrade email
          const upgradeUserName =
            updatedSite.user.name?.split(' ')[0] || 'there';
          await sendEmail({
            to: updatedSite.user.email!,
            subject: "You're now on Flowershow Premium",
            react: PremiumUpgradeEmail({
              userName: upgradeUserName,
              dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
              discordInviteUrl: env.DISCORD_PREMIUM_INVITE_URL,
            }),
          });

          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
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
            throw new Error('Subscription not found');
          }

          const priceId = subscription.items.data[0]?.price?.id;
          const interval =
            subscription.items.data[0]?.price?.recurring?.interval;

          if (!priceId || !interval) {
            throw new Error('Missing required subscription data');
          }

          // Detect new cancellation: cancel_at_period_end just flipped to true
          const justCancelled =
            subscription.cancel_at_period_end === true &&
            dbSubscription.cancelAtPeriodEnd === false;

          // Look up the user to check if they've already received the cancel bonus
          const user = await prisma.user.findUnique({
            where: { id: dbSubscription.site.userId },
          });

          const bonusAlreadyGranted = user?.cancelBonusGrantedAt != null;
          const grantBonus = justCancelled && !bonusAlreadyGranted;

          // Compute period end to store:
          // - Grant bonus (first cancellation ever for this user): extend by 3 months
          // - Already cancelled on this sub: preserve our extended date
          // - Otherwise: use Stripe's value
          let periodEnd: Date;
          if (grantBonus) {
            periodEnd = new Date(subscription.current_period_end * 1000);
            periodEnd.setMonth(periodEnd.getMonth() + 3);
          } else if (
            subscription.cancel_at_period_end === true &&
            dbSubscription.cancelAtPeriodEnd === true
          ) {
            // Subsequent update events (e.g. cancellation reason submission) —
            // keep the extended date we already stored
            periodEnd = dbSubscription.currentPeriodEnd;
          } else {
            periodEnd = new Date(subscription.current_period_end * 1000);
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
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              stripePriceId: priceId,
              interval: interval,
            },
          });

          if (justCancelled) {
            if (grantBonus) {
              await prisma.user.update({
                where: { id: dbSubscription.site.userId },
                data: { cancelBonusGrantedAt: new Date() },
              });
            }

            const posthog = PostHogClient();
            posthog.capture({
              distinctId: dbSubscription.site.userId,
              event: 'subscription_canceled',
              properties: {
                siteId: dbSubscription.siteId,
                interval: interval,
                priceId: priceId,
                bonusGranted: grantBonus,
              },
            });
            await posthog.shutdown();

            if (user?.email) {
              const extendedEndDate = grantBonus
                ? periodEnd.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : null;

              const downgradeUserName = user.name?.split(' ')[0] || 'there';
              await sendEmail({
                to: user.email,
                subject: 'Your Flowershow subscription has been cancelled',
                react: PremiumDowngradeEmail({
                  userName: downgradeUserName,
                  extendedEndDate,
                }),
              });
            }
          }

          // When Stripe confirms the subscription is fully cancelled, downgrade to FREE
          if (subscription.status === 'canceled') {
            const site = dbSubscription.site;

            if (
              site.customDomain &&
              env.NEXT_PUBLIC_VERCEL_ENV === 'production'
            ) {
              await removeDomainAndVariantFromVercelProject(site.customDomain);
            }

            await prisma.site.update({
              where: { id: dbSubscription.siteId },
              data: {
                plan: 'FREE',
                ...(site.customDomain && { customDomain: null }),
                ...(site.privacyMode === 'PASSWORD' && {
                  privacyMode: 'PUBLIC',
                  accessPasswordHash: null,
                  accessPasswordUpdatedAt: new Date(),
                  tokenVersion: { increment: 1 },
                }),
              },
            });

            // Involuntary expiry: the subscription was cancelled because payment
            // failed (not a voluntary cancellation). Send a distinct "expired,
            // reactivate anytime" email.
            const cancellationReason =
              subscription.cancellation_details?.reason;
            if (cancellationReason === 'payment_failure' && user?.email) {
              const expiredUserName = user.name?.split(' ')[0] || 'there';
              await sendTransactionalEmail({
                to: user.email,
                subject: 'Your Flowershow Premium has expired',
                react: PremiumExpiredEmail({
                  userName: expiredUserName,
                  siteName: dbSubscription.site.projectName,
                  reactivateUrl: billingSettingsUrl(dbSubscription.siteId),
                }),
                type: 'premium_expired',
                userId: user.id,
                idempotencyKey: `expiry:${subscription.id}`,
                distinctId: user.id,
                properties: { siteId: dbSubscription.siteId },
              });
            }
          }

          break;
        }
        case 'invoice.upcoming': {
          const invoice = event.data.object as any;
          const stripeSubscriptionId = invoice.subscription;

          if (!stripeSubscriptionId) {
            break;
          }

          const dbSubscription = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId },
            include: { site: { include: { user: true } } },
          });

          const user = dbSubscription?.site.user;
          if (!dbSubscription || !user?.email) {
            break;
          }

          // Annual plans only — monthly renewals send nothing.
          const lineInterval =
            invoice.lines?.data?.[0]?.price?.recurring?.interval;
          const interval = lineInterval ?? dbSubscription.interval;
          if (interval !== 'year') {
            break;
          }

          const periodEnd: number | null =
            invoice.period_end ?? invoice.next_payment_attempt ?? null;
          const renewalDate = periodEnd
            ? new Date(periodEnd * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'soon';
          const amount = formatAmount(invoice.amount_due, invoice.currency);

          const renewalUserName = user.name?.split(' ')[0] || 'there';
          await sendTransactionalEmail({
            to: user.email,
            subject: 'Your Flowershow Premium renews soon',
            react: RenewalReminderEmail({
              userName: renewalUserName,
              siteName: dbSubscription.site.projectName,
              renewalDate,
              amount,
              manageBillingUrl: billingSettingsUrl(dbSubscription.siteId),
            }),
            type: 'renewal_reminder',
            userId: user.id,
            idempotencyKey: `renewal:${stripeSubscriptionId}:${periodEnd}`,
            distinctId: user.id,
            properties: { siteId: dbSubscription.siteId, interval: 'year' },
          });

          break;
        }
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      console.error(`❌ Webhook handler failed:`, error);
      const posthog = PostHogClient();
      posthog.captureException(error, 'system', {
        route: 'POST /api/stripe/webhook',
        eventType: event.type,
      });
      await posthog.shutdown();
      return NextResponse.json(
        { message: 'Webhook handler failed' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    received: true,
  } satisfies StripeWebhookReceivedResponse);
}
