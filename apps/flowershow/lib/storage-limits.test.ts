import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: { $queryRaw: vi.fn() } }));

import { GB, MB } from './entitlements';
import prisma from '@/server/db';
import { checkStorageLimit, noteStorageOverLimit } from './storage-limits';

const free = (storageAllowanceBytes: bigint | null = null) => ({
  id: 's1',
  plan: 'FREE' as const,
  storageAllowanceBytes,
});
const premium = {
  id: 's1',
  plan: 'PREMIUM' as const,
  storageAllowanceBytes: null,
};

describe('checkStorageLimit', () => {
  it('allows a Free site under its limit', () => {
    expect(
      checkStorageLimit({
        site: free(),
        currentSiteBytes: 50 * MB,
        projectedSiteBytes: 150 * MB,
        otherFreeSitesBytes: 0,
      }),
    ).toBeNull();
  });

  it('rejects a Free site over 200 MB', () => {
    expect(
      checkStorageLimit({
        site: free(),
        currentSiteBytes: 50 * MB,
        projectedSiteBytes: 201 * MB,
        otherFreeSitesBytes: 0,
      }),
    ).toEqual({
      scope: 'site',
      limitBytes: 200 * MB,
      projectedBytes: 201 * MB,
    });
  });

  it('honours a grandfathered allowance', () => {
    expect(
      checkStorageLimit({
        site: free(BigInt(1320 * MB)),
        currentSiteBytes: 1200 * MB,
        projectedSiteBytes: 1300 * MB,
        otherFreeSitesBytes: 0,
      }),
    ).toBeNull();
  });

  it('allows a non-growing publish even when over the limit', () => {
    expect(
      checkStorageLimit({
        site: free(),
        currentSiteBytes: 1200 * MB,
        projectedSiteBytes: 1199 * MB,
        otherFreeSitesBytes: 0,
      }),
    ).toBeNull();
  });

  it('rejects when the Free pool would exceed 1 GB', () => {
    expect(
      checkStorageLimit({
        site: free(),
        currentSiteBytes: 100 * MB,
        projectedSiteBytes: 150 * MB,
        otherFreeSitesBytes: 900 * MB,
      }),
    ).toEqual({ scope: 'pool', limitBytes: GB, projectedBytes: 1050 * MB });
  });

  it('allows a projected size of exactly 200 MB on Free', () => {
    expect(
      checkStorageLimit({
        site: free(),
        currentSiteBytes: 50 * MB,
        projectedSiteBytes: 200 * MB,
        otherFreeSitesBytes: 0,
      }),
    ).toBeNull();
  });

  it('allows a Free pool of exactly 1 GB', () => {
    expect(
      checkStorageLimit({
        site: free(),
        currentSiteBytes: 100 * MB,
        projectedSiteBytes: 150 * MB,
        otherFreeSitesBytes: GB - 150 * MB,
      }),
    ).toBeNull();
  });

  it('skips the pool check for grandfathered sites', () => {
    expect(
      checkStorageLimit({
        site: free(BigInt(1320 * MB)),
        currentSiteBytes: 1200 * MB,
        projectedSiteBytes: 1300 * MB,
        otherFreeSitesBytes: 900 * MB,
      }),
    ).toBeNull();
  });

  it('ignores the pool for Premium', () => {
    expect(
      checkStorageLimit({
        site: premium,
        currentSiteBytes: 8 * GB,
        projectedSiteBytes: 9 * GB,
        otherFreeSitesBytes: 5 * GB,
      }),
    ).toBeNull();
  });

  it('rejects a Premium site over 10 GB', () => {
    expect(
      checkStorageLimit({
        site: premium,
        currentSiteBytes: 9 * GB,
        projectedSiteBytes: 11 * GB,
        otherFreeSitesBytes: 0,
      }),
    ).toEqual({ scope: 'site', limitBytes: 10 * GB, projectedBytes: 11 * GB });
  });
});

describe('noteStorageOverLimit', () => {
  const queryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;
  const site = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    userId: 'owner',
    plan: 'FREE' as const,
    storageAllowanceBytes: null,
    projectName: 'notes',
    ...over,
  });

  beforeEach(() => {
    queryRaw.mockReset();
    queryRaw.mockResolvedValue([{ total: BigInt(0) }]);
  });

  it('queries the Free pool for a Free site without allowance', async () => {
    await noteStorageOverLimit(site(), 10 * MB, 20 * MB);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('does not query the pool for Premium or grandfathered sites', async () => {
    await noteStorageOverLimit(site({ plan: 'PREMIUM' }), 10 * MB, 20 * MB);
    await noteStorageOverLimit(
      site({ storageAllowanceBytes: BigInt(1320 * MB) }),
      10 * MB,
      20 * MB,
    );
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('warns once, without throwing, when over the site limit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      noteStorageOverLimit(site(), 50 * MB, 250 * MB),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain('s1');
    expect(line).toContain('site');
    warn.mockRestore();
  });

  it('warns when the shared pool would overflow', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    queryRaw.mockResolvedValue([{ total: BigInt(950 * MB) }]);
    await noteStorageOverLimit(site(), 10 * MB, 100 * MB);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('pool');
    warn.mockRestore();
  });

  it('does not warn under the limit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await noteStorageOverLimit(site(), 10 * MB, 20 * MB);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('swallows errors from the pool query', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    queryRaw.mockRejectedValue(new Error('db down'));
    await expect(
      noteStorageOverLimit(site(), 10 * MB, 20 * MB),
    ).resolves.toBeUndefined();
    err.mockRestore();
  });
});
