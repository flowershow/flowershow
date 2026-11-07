import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: { $queryRaw: vi.fn() } }));
vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_CLOUD_DOMAIN: 'cloud.example.com' },
}));

import { GB, MB } from './entitlements';
import prisma from '@/server/db';
import {
  checkStorageLimit,
  enforceStorageLimit,
  storageLimitResponse,
} from './storage-limits';

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

describe('storageLimitResponse', () => {
  it('returns 413 with upgrade copy for a Free site violation', async () => {
    const res = storageLimitResponse(
      { scope: 'site', limitBytes: 200 * MB, projectedBytes: 250 * MB },
      { id: 's1', plan: 'FREE', name: 'docs' },
    );
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.message).toContain('200 MB');
    expect(body.message).toContain('250 MB');
    expect(body.message).toContain('docs');
    expect(body.message).toContain('Premium');
    expect(body.message).toContain(
      'https://cloud.example.com/site/s1/settings#billing',
    );
  });

  it('describes the pool limit', async () => {
    const res = storageLimitResponse(
      { scope: 'pool', limitBytes: GB, projectedBytes: 1.5 * GB },
      { id: 's1', plan: 'FREE' },
    );
    expect(res.status).toBe(413);
    expect((await res.json()).message).toContain('1 GB');
  });

  it('sends Premium sites to support', async () => {
    const res = storageLimitResponse(
      { scope: 'site', limitBytes: 10 * GB, projectedBytes: 11 * GB },
      { id: 's1', plan: 'PREMIUM' },
    );
    const { message } = await res.json();
    expect(message).toContain('10 GB limit');
    expect(message).toContain('mailto:support@flowershow.app');
    expect(message).toContain('this site');
  });
});

describe('enforceStorageLimit', () => {
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
    expect(await enforceStorageLimit(site(), 10 * MB, 20 * MB)).toBeNull();
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('does not query the pool for Premium or grandfathered sites', async () => {
    await enforceStorageLimit(site({ plan: 'PREMIUM' }), 10 * MB, 20 * MB);
    await enforceStorageLimit(
      site({ storageAllowanceBytes: BigInt(1320 * MB) }),
      10 * MB,
      20 * MB,
    );
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('returns a 413 naming the site when over the site limit', async () => {
    const res = await enforceStorageLimit(site(), 50 * MB, 250 * MB);
    expect(res?.status).toBe(413);
    const body = await res?.json();
    expect(body.error).toBe('storage_limit_exceeded');
    expect(body.message).toContain('notes');
  });

  it('returns a 413 when the shared pool would overflow', async () => {
    queryRaw.mockResolvedValue([{ total: BigInt(950 * MB) }]);
    const res = await enforceStorageLimit(site(), 10 * MB, 100 * MB);
    expect(res?.status).toBe(413);
  });
});
