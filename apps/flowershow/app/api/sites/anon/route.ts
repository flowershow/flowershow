import { randomUUID } from 'node:crypto';
import type { AnonCreateSiteResponse } from '@flowershow/api-contract';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env.mjs';
import { checkAnonCreateLimit, hashIp } from '@/lib/anon-rate-limit';
import {
  ANONYMOUS_USER_ID,
  buildClaimUrl,
  generateSiteClaimToken,
} from '@/lib/anonymous-user';
import { getClientIp } from '@/lib/rate-limit';
import PostHogClient from '@/lib/server-posthog';
import { SITE_CONFIG_DEFAULTS } from '@/lib/site-config';
import { buildSubdomain } from '@/lib/site-subdomain';
import { createSiteCollection } from '@/lib/typesense';
import prisma from '@/server/db';

const ANON_SITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/sites/anon
 * Create an empty temporary site for agent/CLI publishing without an account.
 * Files are then uploaded via POST /api/sites/id/:siteId/sync with
 * `Authorization: Bearer <claimToken>`. The site expires in 7 days unless claimed.
 */
export async function POST(request: NextRequest) {
  // Kill switch: set ANON_PUBLISH_DISABLED=true (then redeploy; no code change
  // needed) to stop new anonymous sites, e.g. during abuse. Existing sites keep
  // working. Drag-and-drop (/api/sites/publish-anon) is not covered.
  if (env.ANON_PUBLISH_DISABLED === 'true') {
    return NextResponse.json(
      {
        error: 'anon_disabled',
        message:
          'Publishing without an account is temporarily unavailable. Run `fl login` to publish to your account.',
      },
      { status: 503 },
    );
  }
  const posthog = PostHogClient();
  try {
    const ipHash = hashIp(getClientIp(request.headers));
    if (!(await checkAnonCreateLimit(ipHash))) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message:
            'Too many anonymous sites from this network. Try again later, or run `fl login`.',
        },
        { status: 429 },
      );
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
        anonCreatorIpHash: ipHash,
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
    const response: AnonCreateSiteResponse = {
      siteId: site.id,
      projectName,
      liveUrl: `${isSecure ? 'https' : 'http'}://${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`,
      claimToken,
      claimUrl: buildClaimUrl(site.id, claimToken),
      expiresAt: expiresAt.toISOString(),
    };

    posthog.capture({
      distinctId: site.id,
      event: 'anon_site_created',
      properties: {
        site_id: site.id,
        source: request.headers.get('x-flowershow-cli-version') ? 'cli' : 'api',
      },
    });
    await posthog.shutdown();
    return NextResponse.json(response);
  } catch (error) {
    console.error('Anon site create error:', error);
    posthog.captureException(error, 'system', {
      route: 'POST /api/sites/anon',
    });
    await posthog.shutdown();
    return NextResponse.json(
      {
        error: 'internal',
        message: 'Failed to create site. Please try again.',
      },
      { status: 500 },
    );
  }
}
