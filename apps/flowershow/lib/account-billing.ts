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

// Stub: Task 7 fills in consolidation of per-site subscriptions.
export async function consolidateSiteSubscriptions(_account: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}): Promise<{ consolidated: string[]; creditedCents: number }> {
  return { consolidated: [], creditedCents: 0 };
}
