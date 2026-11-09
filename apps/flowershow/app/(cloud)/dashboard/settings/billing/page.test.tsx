import { describe, expect, it, vi } from 'vitest';

const { enabled, query } = vi.hoisted(() => ({
  enabled: vi.fn(),
  query: vi.fn(),
}));
vi.mock('@/lib/account-plans', () => ({
  accountPlansEnabled: () => enabled(),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/trpc/server', () => ({
  api: { stripe: { getAccountPlan: { query } } },
}));
vi.mock('@/components/dashboard/account-billing', () => ({
  default: () => null,
}));

import BillingPage from './page';

describe('account billing page', () => {
  it('returns notFound while account plans are disabled', async () => {
    enabled.mockReturnValue(false);
    await expect(BillingPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(query).not.toHaveBeenCalled();
  });

  it('loads the plan when enabled', async () => {
    enabled.mockReturnValue(true);
    query.mockResolvedValue({ sites: [] });
    await BillingPage();
    expect(query).toHaveBeenCalled();
  });
});
