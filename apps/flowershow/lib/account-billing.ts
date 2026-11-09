import type Stripe from 'stripe';
import { isLiveSiteStatus, isManualSite } from '@/lib/account-plans';
import { log, SeverityNumber } from '@/lib/otel-logger';
import { FLOWERSHOW_PLATFORM, stripe } from '@/lib/stripe';
import prisma from '@/server/db';

type CustomerUser = {
  id: string;
  email: string | null;
  stripeCustomerId: string | null;
};

// Returns the user's account-level Stripe customer, creating it on first use.
// Two concurrent checkouts may both create a customer; the conditional
// updateMany lets only one win, and the loser returns the stored id (the extra
// Stripe customer is empty and harmless).
export async function getOrCreateStripeCustomer(
  user: CustomerUser,
): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    ...(user.email ? { email: user.email } : {}),
    metadata: { platform: FLOWERSHOW_PLATFORM, userId: user.id },
  });

  const { count } = await prisma.user.updateMany({
    where: { id: user.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (count > 0) return customer.id;

  const stored = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });
  return stored?.stripeCustomerId ?? customer.id;
}

/**
 * The unused share of a paid period, in cents, floored. `now` before the period
 * is treated as the period start, so a credit never exceeds what was paid.
 */
export function computeUnusedCreditCents(input: {
  amountPaidCents: number;
  periodStart: number;
  periodEnd: number;
  now: number;
}): number {
  const { amountPaidCents, periodStart, periodEnd, now } = input;
  if (amountPaidCents === 0 || now >= periodEnd) return 0;
  const remaining = periodEnd - Math.max(now, periodStart);
  return Math.floor((amountPaidCents * remaining) / (periodEnd - periodStart));
}

// The paid invoice for the subscription's current Stripe period. Matching on
// the line period skips later proration invoices, and uses Stripe's period
// rather than the DB one, which the cancel bonus may have extended.
async function findCurrentPeriodInvoice(
  subscription: Stripe.Subscription,
): Promise<Stripe.Invoice | null> {
  const invoices = stripe.invoices.list({
    subscription: subscription.id,
    status: 'paid',
    limit: 100,
  });
  for await (const invoice of invoices) {
    const covers = invoice.lines.data.some(
      (line) =>
        line.type === 'subscription' &&
        !line.proration &&
        line.period.start === subscription.current_period_start &&
        line.period.end === subscription.current_period_end,
    );
    if (covers) return invoice;
  }
  return null;
}

// Stripe idempotency keys expire after 24 hours and webhook retries run for 3
// days, so the durable guard against a second credit is this lookup.
async function hasConsolidationCredit(
  customerId: string,
  siteSubscriptionId: string,
): Promise<boolean> {
  const transactions = stripe.customers.listBalanceTransactions(customerId, {
    limit: 100,
  });
  for await (const transaction of transactions) {
    if (transaction.metadata?.siteSubscriptionId === siteSubscriptionId) {
      return true;
    }
  }
  return false;
}

// When consolidation of this subscription began, stored on the subscription so
// a retry computes the same credit however much later it runs. A stamp from
// before the current period (it renewed before a retry) says nothing about this
// period's unused time, so it is replaced.
async function consolidationStamp(
  subscription: Stripe.Subscription,
): Promise<number> {
  const stored = Number(subscription.metadata?.consolidationStartedAt);
  if (stored >= subscription.current_period_start) return stored;

  const consolidationStartedAt = Math.floor(Date.now() / 1000);
  await stripe.subscriptions.update(subscription.id, {
    metadata: { consolidationStartedAt: String(consolidationStartedAt) },
  });
  return consolidationStartedAt;
}

// Credits the unused prepaid time, as of `now`, to the account customer.
// Returns the cents credited.
async function creditUnusedTime(
  siteSubscription: Stripe.Subscription,
  accountSubscription: Stripe.Subscription,
  customerId: string,
  now: number,
): Promise<number> {
  const invoice = await findCurrentPeriodInvoice(siteSubscription);
  if (!invoice) {
    log(
      'Consolidation credit is 0: no paid invoice for the current period',
      SeverityNumber.WARN,
      {
        siteSubscriptionId: siteSubscription.id,
        accountSubscriptionId: accountSubscription.id,
        reason: 'no_paid_invoice',
      },
    );
    return 0;
  }

  if (invoice.currency !== accountSubscription.currency) {
    log(
      'Consolidation credit skipped: currency differs',
      SeverityNumber.ERROR,
      {
        siteSubscriptionId: siteSubscription.id,
        accountSubscriptionId: accountSubscription.id,
        invoiceCurrency: invoice.currency,
        accountCurrency: accountSubscription.currency,
        reason: 'currency_mismatch',
      },
    );
    return 0;
  }

  const cents = computeUnusedCreditCents({
    amountPaidCents: invoice.amount_paid,
    periodStart: siteSubscription.current_period_start,
    periodEnd: siteSubscription.current_period_end,
    now,
  });
  if (cents === 0) return 0;

  await stripe.customers.createBalanceTransaction(
    customerId,
    {
      amount: -cents,
      currency: invoice.currency,
      metadata: {
        platform: FLOWERSHOW_PLATFORM,
        reason: 'consolidation_credit',
        siteSubscriptionId: siteSubscription.id,
      },
    },
    { idempotencyKey: `consolidation-credit:${siteSubscription.id}` },
  );
  return cents;
}

/**
 * Move the per-site subscriptions the account plan covers onto it: stamp the
 * start, credit the unused prepaid time, tag, cancel, record that.
 *
 * Safe to repeat. Any step that throws propagates so Stripe retries the event,
 * and the retry resumes: consolidatedAt skips finished subscriptions, the
 * balance transaction lookup stops a second credit.
 */
export async function consolidateSiteSubscriptions(account: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}): Promise<{ consolidated: string[]; creditedCents: number }> {
  const result = { consolidated: [] as string[], creditedCents: 0 };

  const [accountRow, sites] = await Promise.all([
    prisma.accountSubscription.findUnique({
      where: { userId: account.userId },
      select: { siteAllowance: true },
    }),
    prisma.site.findMany({
      where: { userId: account.userId, isTemporary: false },
      select: {
        plan: true,
        planSource: true,
        coveredByAccountPlan: true,
        subscription: {
          select: {
            id: true,
            stripeSubscriptionId: true,
            status: true,
            consolidatedAt: true,
          },
        },
      },
    }),
  ]);
  if (!accountRow) return result;

  // Unlimited covers sites without setting coveredByAccountPlan.
  const unlimited = accountRow.siteAllowance === null;
  const inScope = sites.flatMap((site) => {
    const { subscription } = site;
    return subscription &&
      subscription.consolidatedAt === null &&
      isLiveSiteStatus(subscription.status) &&
      !isManualSite(site) &&
      (unlimited || site.coveredByAccountPlan)
      ? [subscription]
      : [];
  });
  if (inScope.length === 0) return result;

  const accountSubscription = await stripe.subscriptions.retrieve(
    account.stripeSubscriptionId,
  );
  // Never cancel subscriptions someone is paying for on an unpaid plan (Ruling
  // 4), nor fold them into a plan that is about to end.
  if (
    (accountSubscription.status !== 'active' &&
      accountSubscription.status !== 'trialing') ||
    accountSubscription.cancel_at_period_end
  ) {
    return result;
  }

  for (const row of inScope) {
    const id = row.stripeSubscriptionId;
    const siteSubscription = await stripe.subscriptions.retrieve(id);

    // Already canceled (say the cancel worked but the write below failed): only
    // the record is missing.
    if (isLiveSiteStatus(siteSubscription.status)) {
      const now = await consolidationStamp(siteSubscription);
      if (!(await hasConsolidationCredit(account.stripeCustomerId, id))) {
        result.creditedCents += await creditUnusedTime(
          siteSubscription,
          accountSubscription,
          account.stripeCustomerId,
          now,
        );
      }
      await stripe.subscriptions.update(id, {
        metadata: {
          reason: 'consolidated',
          consolidatedInto: account.stripeSubscriptionId,
        },
      });
      await stripe.subscriptions.cancel(id, { prorate: false });
    }

    await prisma.subscription.update({
      where: { id: row.id },
      data: { consolidatedAt: new Date() },
    });
    result.consolidated.push(id);
  }

  return result;
}
