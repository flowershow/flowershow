import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/anonymous-user', () => ({
  ANONYMOUS_USER_ID: 'anon-user',
  verifyOwnershipToken: vi.fn(() => 'anon-owner'),
  verifySiteClaimToken: vi.fn(),
}));

vi.mock('@/lib/site-plans', () => ({
  reconcileAfterSiteChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/server/db', () => ({
  default: { site: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));

import { reconcileAfterSiteChange } from '@/lib/site-plans';
import prisma from '@/server/db';
import { claimAnonSite } from './claim-anon-site';

describe('claimAnonSite account plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.site.findUnique)
      .mockResolvedValueOnce({
        userId: 'anon-user',
        anonymousOwnerId: 'anon-owner',
        isTemporary: true,
        expiresAt: null,
      } as any)
      .mockResolvedValueOnce({
        id: 'site-1',
        projectName: 'p',
        userId: 'user-1',
      } as any);
  });

  it('reconciles the claimed site', async () => {
    vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 1 } as any);

    const result = await claimAnonSite({
      siteId: 'site-1',
      userId: 'user-1',
      ownershipToken: 't',
    });

    expect(result.ok).toBe(true);
    expect(reconcileAfterSiteChange).toHaveBeenCalledWith('user-1', 'site-1');
  });

  it('does not reconcile when the claim loses the race', async () => {
    vi.mocked(prisma.site.updateMany).mockResolvedValue({ count: 0 } as any);

    const result = await claimAnonSite({
      siteId: 'site-1',
      userId: 'user-1',
      ownershipToken: 't',
    });

    expect(result.ok).toBe(false);
    expect(reconcileAfterSiteChange).not.toHaveBeenCalled();
  });
});
