import type { Plan } from '@prisma/client';
import prisma from '@/server/db';
import { getEntitlements } from './entitlements';

/** Total stored bytes of a site (sum of its blobs). */
export async function getSiteStorageBytes(siteId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COALESCE(SUM(size), 0)::bigint AS total
    FROM "Blob"
    WHERE site_id = ${siteId}
  `;
  return Number(rows[0]?.total ?? 0);
}

/**
 * Bytes used by the user's other Free sites that count towards the shared
 * Free pool (no grandfathered allowance).
 */
export async function getFreePoolBytes(
  userId: string,
  excludeSiteId: string,
): Promise<number> {
  const rows = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COALESCE(SUM(b.size), 0)::bigint AS total
    FROM "Blob" b
    JOIN "Site" s ON s.id = b.site_id
    WHERE s.user_id = ${userId}
      AND s.plan = 'FREE'
      AND s.storage_allowance_bytes IS NULL
      AND s.id <> ${excludeSiteId}
  `;
  return Number(rows[0]?.total ?? 0);
}

export type StorageCheckInput = {
  site: {
    id: string;
    plan: Plan | null;
    storageAllowanceBytes: bigint | null;
  };
  currentSiteBytes: number;
  projectedSiteBytes: number;
  otherFreeSitesBytes: number;
};

export type StorageViolation = {
  scope: 'site' | 'pool';
  limitBytes: number;
  projectedBytes: number;
};

/**
 * Pure limit check. A publish that does not grow the site is always allowed,
 * so over-limit sites can still shrink.
 */
export function checkStorageLimit(
  input: StorageCheckInput,
): StorageViolation | null {
  const { site, currentSiteBytes, projectedSiteBytes, otherFreeSitesBytes } =
    input;
  if (projectedSiteBytes <= currentSiteBytes) return null;

  const { limits } = getEntitlements(site);
  const siteLimit = Math.max(
    limits.siteHardBytes,
    Number(site.storageAllowanceBytes ?? 0),
  );
  if (projectedSiteBytes > siteLimit) {
    return {
      scope: 'site',
      limitBytes: siteLimit,
      projectedBytes: projectedSiteBytes,
    };
  }

  if (
    limits.freePoolHardBytes !== null &&
    site.storageAllowanceBytes === null
  ) {
    const projectedPool = otherFreeSitesBytes + projectedSiteBytes;
    if (projectedPool > limits.freePoolHardBytes) {
      return {
        scope: 'pool',
        limitBytes: limits.freePoolHardBytes,
        projectedBytes: projectedPool,
      };
    }
  }
  return null;
}

/**
 * Advisory storage check: logs one line when a publish would break a limit,
 * never blocks and never throws into the publish path. The shared Free pool
 * (summed over the site owner's other Free sites) is only queried for Free
 * sites without a grandfathered allowance.
 */
export async function noteStorageOverLimit(
  site: {
    id: string;
    userId: string;
    plan: Plan | null;
    storageAllowanceBytes: bigint | null;
  },
  currentSiteBytes: number,
  projectedSiteBytes: number,
): Promise<void> {
  try {
    const usesFreePool =
      getEntitlements(site).limits.freePoolHardBytes !== null &&
      site.storageAllowanceBytes === null;
    const violation = checkStorageLimit({
      site,
      currentSiteBytes,
      projectedSiteBytes,
      otherFreeSitesBytes: usesFreePool
        ? await getFreePoolBytes(site.userId, site.id)
        : 0,
    });
    if (violation) {
      console.warn(
        `[storage-limit] over limit (advisory): site=${site.id} scope=${violation.scope} limitBytes=${violation.limitBytes} projectedBytes=${violation.projectedBytes}`,
      );
    }
  } catch (error) {
    console.error('[storage-limit] check failed', error);
  }
}
