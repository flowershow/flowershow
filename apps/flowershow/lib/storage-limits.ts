import { Plan as PlanEnum, type Plan } from '@prisma/client';
import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import prisma from '@/server/db';
import { GB, MB, getEntitlements } from './entitlements';

const SUPPORT_EMAIL = 'support@flowershow.app';

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

function formatBytes(bytes: number): string {
  if (bytes < GB) return `${Math.round(bytes / MB)} MB`;
  return `${(bytes / GB).toFixed(1).replace(/\.0$/, '')} GB`;
}

export function storageLimitResponse(
  v: StorageViolation,
  site: { id: string; plan: Plan | null; name?: string },
): NextResponse {
  const isPremium = site.plan === PlanEnum.PREMIUM;
  const upgradeUrl = isPremium
    ? `mailto:${SUPPORT_EMAIL}`
    : `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/site/${site.id}/settings#billing`;

  let message: string;
  if (v.scope === 'pool') {
    message = `Your free sites would use ${formatBytes(v.projectedBytes)} together, over the ${formatBytes(v.limitBytes)} limit for free sites on one account. Remove some large files, or upgrade this site to Premium: ${upgradeUrl}`;
  } else {
    const name = site.name ?? 'this site';
    const base = `This publish would take ${name} to ${formatBytes(v.projectedBytes)} of storage, over the ${formatBytes(v.limitBytes)} limit`;
    message = isPremium
      ? `${base}. Get in touch for more: ${upgradeUrl}`
      : `${base} for Free sites. Remove some large files, or upgrade to Premium for 5 GB per site: ${upgradeUrl}`;
  }

  return NextResponse.json(
    { error: 'storage_limit_exceeded', message, upgradeUrl },
    { status: 413 },
  );
}
