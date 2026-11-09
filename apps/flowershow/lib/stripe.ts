import Stripe from 'stripe';
import { env } from '@/env.mjs';
import { accountPlanForPriceId, premiumPriceIds } from '@/lib/account-plans';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia' as any,
  typescript: true,
});

// This Stripe account is shared across several products/platforms, and a
// webhook endpoint receives every event of its subscribed types for the whole
// account — there is no per-product filtering at Stripe's end. Tag every
// object Flowershow creates with this platform marker so the webhook can tell
// its own events apart from foreign ones. Keep the value stable — it is
// matched verbatim in the webhook.
export const FLOWERSHOW_PLATFORM = 'flowershow';

// Fallback ownership signal for subscriptions created before metadata tagging
// (they won't carry metadata.platform). A Flowershow subscription always bills
// one of our known prices, so a line-item price match is a reliable "ours".
function isAccountPrice(priceId: string | undefined): boolean {
  return !!priceId && accountPlanForPriceId(priceId) !== null;
}

function isKnownPrice(priceId: string | undefined): boolean {
  return (
    !!priceId && (premiumPriceIds().has(priceId) || isAccountPrice(priceId))
  );
}

/**
 * Whether a Stripe subscription belongs to Flowershow.
 *
 * The Stripe account is shared, so the webhook sees customer.subscription.*
 * events for other products too. Ownership is decided by, in order:
 *  1. `metadata.platform === 'flowershow'` — set at checkout on new subs, or
 *  2. fallback: any line-item price is a known Flowershow price id — covers
 *     subscriptions created before we started tagging metadata.
 *
 * Accepts the raw Stripe subscription object from a webhook event.
 */
export function isFlowershowSubscription(subscription: any): boolean {
  if (subscription?.metadata?.platform === FLOWERSHOW_PLATFORM) {
    return true;
  }
  const items = subscription?.items?.data ?? [];
  return items.some((item: any) => isKnownPrice(item?.price?.id));
}

/**
 * Whether a Flowershow subscription is an account plan (Pro/Unlimited) or a
 * per-site one: `metadata.kind === 'account'`, else `metadata.siteId` means
 * per-site, else any line-item price is an account price id.
 */
export function getSubscriptionKind(sub: any): 'account' | 'site' {
  if (sub?.metadata?.kind === 'account') return 'account';
  if (sub?.metadata?.siteId) return 'site';
  const items = sub?.items?.data ?? [];
  return items.some((item: any) => isAccountPrice(item?.price?.id))
    ? 'account'
    : 'site';
}
