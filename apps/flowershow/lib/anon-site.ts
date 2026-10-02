import { randomUUID } from 'node:crypto';
import type { AnonCreateSiteResponse } from '@flowershow/api-contract';
import { env } from '@/env.mjs';
import {
  ANON_CREATE_LIMIT_PER_HOUR,
  checkAnonCreateLimit,
} from '@/lib/anon-rate-limit';
import {
  ANONYMOUS_USER_ID,
  buildClaimUrl,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import { SITE_CONFIG_DEFAULTS } from '@/lib/site-config';
import { buildSubdomain } from '@/lib/site-subdomain';
import { createSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';

const ANON_SITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AnonCreateResult =
  | { ok: true; site: AnonCreateSiteResponse }
  | {
      ok: false;
      status: 429 | 503;
      error: 'rate_limited' | 'anon_disabled';
      message: string;
    };

/**
 * Create an empty temporary site owned by the anonymous user, plus its claim
 * token. Shared by POST /api/sites/anon (CLI, per-IP limit) and the MCP
 * publish tool (one global bucket, since chat apps call from their own IPs).
 *
 * `bucket` is the hashed rate-limit key stored on the site (cleared on claim);
 * `limit` is how many sites that bucket may create per rolling hour.
 */
export async function createAnonSite({
  bucket,
  limit = ANON_CREATE_LIMIT_PER_HOUR,
  rateLimitedMessage,
}: {
  bucket: string;
  limit?: number;
  rateLimitedMessage: string;
}): Promise<AnonCreateResult> {
  // Kill switch: set ANON_PUBLISH_DISABLED=true (then redeploy; no code change
  // needed) to stop new anonymous sites, e.g. during abuse. Existing sites keep
  // working. Drag-and-drop (/api/sites/publish-anon) is not covered.
  if (env.ANON_PUBLISH_DISABLED === 'true') {
    return {
      ok: false,
      status: 503,
      error: 'anon_disabled',
      message:
        'Publishing without an account is temporarily unavailable. Publish to a Flowershow account instead (`fl login`).',
    };
  }
  if (!(await checkAnonCreateLimit(bucket, new Date(), limit))) {
    return {
      ok: false,
      status: 429,
      error: 'rate_limited',
      message: rateLimitedMessage,
    };
  }

  const projectName = Math.random().toString(36).substring(2, 10);
  const anonymousUserId = randomUUID();
  const expiresAt = new Date(Date.now() + ANON_SITE_TTL_MS);
  const site = await prisma.site.create({
    data: {
      projectName,
      subdomain: buildSubdomain(projectName, 'anon'),
      userId: ANONYMOUS_USER_ID,
      anonymousOwnerId: anonymousUserId,
      anonCreatorIpHash: bucket,
      isTemporary: true,
      expiresAt,
      configJson: SITE_CONFIG_DEFAULTS,
    },
  });
  await createSiteCollection(site.id);

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const claimToken = generateSiteClaimToken(site.id, anonymousUserId);
  return {
    ok: true,
    site: {
      siteId: site.id,
      projectName,
      liveUrl: `${isSecure ? 'https' : 'http'}://${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`,
      claimToken,
      claimUrl: buildClaimUrl(site.id, claimToken),
      expiresAt: expiresAt.toISOString(),
    },
  };
}
