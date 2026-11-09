import type Stripe from 'stripe';
import { consolidateSiteSubscriptions } from '@/lib/account-billing';
import {
  ACCOUNT_PLAN_SITE_ALLOWANCE,
  accountPlanForPriceId,
  isCoveringAccountStatus,
} from '@/lib/account-plans';
import { log, SeverityNumber } from '@/lib/otel-logger';
import PostHogClient from '@/lib/server-posthog';
import { reconcileUserSitePlans } from '@/lib/site-plans';
import { stripe } from '@/lib/stripe';
import prisma from '@/server/db';

const ROUTE = 'POST /api/stripe/webhook';

type SyncContext = { eventId: string; eventType: string };

// metadata.userId first; a Pro subscription made by hand in the dashboard may
// only have a customer we already know.
async function resolveUser(userId: string | undefined, customerId: string) {
  const byId = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;
  return (
    byId ??
    (await prisma.user.findUnique({ where: { stripeCustomerId: customerId } }))
  );
}

/**
 * Bring AccountSubscription and the user's sites in line with the live Stripe
 * subscription. Reads Stripe rather than the event payload, so replayed and
 * out-of-order events converge on the same state.
 */
export async function syncAccountSubscription(
  stripeSubscriptionId: string,
  ctx: SyncContext,
): Promise<void> {
  const subscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;
  const logContext = {
    route: ROUTE,
    ...ctx,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
  };

  const user = await resolveUser(subscription.metadata?.userId, customerId);
  if (!user) {
    log('No user found for account subscription', SeverityNumber.WARN, {
      ...logContext,
      reason: 'user_not_found',
    });
    return;
  }

  // Throws so Stripe retries once the price id is configured.
  const priceId = subscription.items.data[0]?.price?.id;
  const mapped = priceId ? accountPlanForPriceId(priceId) : null;
  if (!priceId || !mapped) {
    throw new Error(`Unknown account price: ${priceId}`);
  }

  const existing = await prisma.accountSubscription.findUnique({
    where: { userId: user.id },
  });
  const nowCovering = isCoveringAccountStatus(subscription.status);

  if (
    existing &&
    existing.stripeSubscriptionId !== subscription.id &&
    isCoveringAccountStatus(existing.status)
  ) {
    // Incoming live: two checkout tabs. A human refunds one (Ruling 7).
    log(
      nowCovering
        ? 'Duplicate live account subscription; left for a human'
        : 'Ignoring stale event for an old account subscription',
      nowCovering ? SeverityNumber.ERROR : SeverityNumber.WARN,
      {
        ...logContext,
        userId: user.id,
        storedStripeSubscriptionId: existing.stripeSubscriptionId,
        reason: nowCovering ? 'duplicate_subscription' : 'stale_subscription',
      },
    );
    return;
  }

  if (user.stripeCustomerId === null) {
    await prisma.user.updateMany({
      where: { id: user.id, stripeCustomerId: null },
      data: { stripeCustomerId: customerId },
    });
  }

  const data = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    plan: mapped.plan,
    interval: mapped.interval,
    siteAllowance: ACCOUNT_PLAN_SITE_ALLOWANCE[mapped.plan],
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
  await prisma.accountSubscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  if (existing?.cancelAtPeriodEnd === false && data.cancelAtPeriodEnd) {
    const posthog = PostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: 'account_plan_cancel_scheduled',
      properties: {
        stripeSubscriptionId: subscription.id,
        plan: mapped.plan,
        interval: mapped.interval,
      },
    });
    await posthog.shutdown();
  }

  // Also on activation: Stripe often creates the subscription incomplete, so
  // the row exists before the first moment there are slots to fill.
  const fillSlots =
    !existing ||
    existing.plan !== mapped.plan ||
    (nowCovering && !isCoveringAccountStatus(existing.status));
  await reconcileUserSitePlans(user.id, {
    autoFill: fillSlots ? 'all' : 'none',
  });

  // Not on past_due: covering, but consolidation needs a paid plan (Ruling 4).
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await consolidateSiteSubscriptions({
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    });
  }
}

export async function handleAccountEvent(event: Stripe.Event): Promise<void> {
  const ctx = { eventId: event.id, eventType: event.type };
  switch (event.type) {
    case 'checkout.session.completed': {
      const { subscription } = event.data.object;
      if (!subscription) return;
      await syncAccountSubscription(
        typeof subscription === 'string' ? subscription : subscription.id,
        ctx,
      );
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncAccountSubscription(event.data.object.id, ctx);
      return;
    case 'invoice.upcoming':
      // No account renewal reminder in phase 2 (Ruling 6).
      return;
  }
}
