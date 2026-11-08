import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({
  default: { user: { updateMany: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock('@/lib/stripe', () => ({
  FLOWERSHOW_PLATFORM: 'flowershow',
  stripe: { customers: { create: vi.fn() } },
}));

import { getOrCreateStripeCustomer } from '@/lib/account-billing';
import { stripe } from '@/lib/stripe';
import prisma from '@/server/db';

const mockCreate = vi.mocked(stripe.customers.create);
const mockUpdateMany = vi.mocked(prisma.user.updateMany);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

const USER = { id: 'user-1', email: 'ada@example.com', stripeCustomerId: null };

beforeEach(() => vi.clearAllMocks());

describe('getOrCreateStripeCustomer', () => {
  it('reuses an existing customer id without calling Stripe', async () => {
    const id = await getOrCreateStripeCustomer({
      ...USER,
      stripeCustomerId: 'cus_existing',
    });
    expect(id).toBe('cus_existing');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates a customer with platform and userId metadata and saves it', async () => {
    mockCreate.mockResolvedValue({ id: 'cus_new' } as any);
    mockUpdateMany.mockResolvedValue({ count: 1 } as any);

    const id = await getOrCreateStripeCustomer(USER);

    expect(id).toBe('cus_new');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { platform: 'flowershow', userId: 'user-1' },
      }),
    );
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', stripeCustomerId: null },
      data: { stripeCustomerId: 'cus_new' },
    });
  });

  it('returns the stored id when a concurrent checkout won the race', async () => {
    mockCreate.mockResolvedValue({ id: 'cus_loser' } as any);
    mockUpdateMany.mockResolvedValue({ count: 0 } as any);
    mockFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_winner' } as any);

    expect(await getOrCreateStripeCustomer(USER)).toBe('cus_winner');
  });
});
