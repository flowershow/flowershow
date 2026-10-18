import type { CreateSiteResponse } from '@flowershow/api-contract';
import { NextRequest } from 'next/server';
import { GET as statusGET } from '@/app/api/sites/id/[siteId]/status/route';
import { POST as syncPOST } from '@/app/api/sites/id/[siteId]/sync/route';
import { POST as createSitePOST } from '@/app/api/sites/route';
import { env } from '@/env.mjs';
import { hashIp } from '@/lib/anon-rate-limit';
import { createAnonSite } from '@/lib/anon-site';
import { verifySiteClaimToken } from '@/lib/anonymous-user';
import { claimAnonSite } from '@/lib/claim-anon-site';
import { getSiteUrl } from '@/lib/get-site-url';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';
import { markMcpInternal } from './internal-request';
import {
  type AnonCaller,
  checkAnonCreateLimits,
  checkAnonUpdateLimit,
  MCP_ANON_LIMITS,
  reportGlobalLimitReached,
  signInHint,
} from './limits';
import { ApiError, type PublishCredential, PublishError } from './publish';
import type { McpDeps } from './server';

/**
 * Rate-limit key for anonymous sites created through MCP. Chat apps (claude.ai,
 * ChatGPT) call from their own cloud IPs, so MCP has one global hourly bucket
 * (MCP_ANON_HOURLY_LIMIT) as a backstop, alongside the ANON_PUBLISH_DISABLED
 * kill switch; per-caller and per-IP limits come first (lib/mcp/limits.ts).
 */
export const MCP_ANON_BUCKET = 'mcp:anonymous';
const DEFAULT_MCP_ANON_HOURLY_LIMIT = 100;

/**
 * A request to a REST route handler, called in-process. An anonymous site's
 * claim token travels as the bearer (exactly as the CLI sends it); a user the
 * MCP endpoint has already authenticated travels as an in-process marker
 * (lib/mcp/internal-request.ts), so OAuth access tokens are never forwarded.
 */
function internalRequest(
  method: 'GET' | 'POST',
  path: string,
  credential: PublishCredential,
  body?: unknown,
) {
  const request = new NextRequest(
    `https://${env.NEXT_PUBLIC_HOME_DOMAIN}${path}`,
    {
      method,
      headers: {
        ...('claimToken' in credential && {
          authorization: `Bearer ${credential.claimToken}`,
        }),
        ...(body !== undefined && { 'content-type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    },
  );
  return markMcpInternal(
    request,
    'userId' in credential ? { userId: credential.userId } : {},
  );
}

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error,
      data?.message ?? `HTTP ${res.status}`,
    );
  }
  return data as T;
}

/**
 * Production dependencies for the MCP tools. Sync and status call the
 * existing route handlers in-process, so MCP gets exactly the same auth
 * (claim-token or account-token), limits and expiry checks as the CLI.
 * `caller` identifies an anonymous caller for the per-caller limits.
 */
export function realMcpDeps(caller?: AnonCaller): McpDeps {
  return {
    async createAnonSite() {
      if (caller && (await checkAnonCreateLimits(caller))) {
        throw new PublishError(
          `You have published too many new anonymous sites in the last hour. To change a site published earlier in this conversation, call publish with its siteId and claimToken; otherwise try again later. ${signInHint()}`,
        );
      }
      // 0 disables anonymous publishing through MCP; unset or invalid uses the default.
      const configured = Number.parseInt(env.MCP_ANON_HOURLY_LIMIT ?? '', 10);
      const limit = Number.isNaN(configured)
        ? DEFAULT_MCP_ANON_HOURLY_LIMIT
        : configured;
      const result = await createAnonSite({
        bucket: hashIp(MCP_ANON_BUCKET),
        limit,
        rateLimitedMessage: `Too many anonymous sites have been published recently. Try again later. ${signInHint()}`,
      });
      if (!result.ok) {
        if (result.status === 429) {
          if (limit > 0) {
            await reportGlobalLimitReached(limit).catch((err) =>
              console.error('MCP limit alert failed:', err),
            );
          }
          throw new PublishError(result.message);
        }
        throw new ApiError(result.status, result.error, result.message);
      }
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: result.site.siteId,
        event: 'anon_site_created',
        properties: { site_id: result.site.siteId, source: 'mcp' },
      });
      await posthog.shutdown();
      return result.site;
    },

    async createUserSite(userId, name) {
      // Never overwrite: on a name clash, try "name-2", "name-3", ...
      for (let attempt = 1; attempt <= 6; attempt++) {
        const projectName =
          attempt === 1
            ? name
            : attempt < 6
              ? `${name}-${attempt}`
              : `${name}-${Math.random().toString(36).slice(2, 6)}`;
        const res = await createSitePOST(
          internalRequest('POST', '/api/sites', { userId }, { projectName }),
        );
        if (res.status === 409) continue;
        const { site } = await json<CreateSiteResponse>(res);
        return { siteId: site.id, liveUrl: site.url };
      }
      throw new ApiError(
        409,
        'site_exists',
        'A site with that name already exists.',
      );
    },

    async sync(siteId, files, credential) {
      // Per-site limit on anonymous publishes. Only for a claim token that is
      // genuinely for this site, so nobody can use up another site's budget.
      if (
        'claimToken' in credential &&
        verifySiteClaimToken(credential.claimToken)?.siteId === siteId &&
        !(await checkAnonUpdateLimit(siteId))
      ) {
        throw new PublishError(
          `This site has been published more than ${MCP_ANON_LIMITS.perSiteUpdates} times in the last hour. Try again later. ${signInHint()}`,
        );
      }
      const res = await syncPOST(
        internalRequest(
          'POST',
          `/api/sites/id/${encodeURIComponent(siteId)}/sync`,
          credential,
          {
            files,
          },
        ),
        { params: Promise.resolve({ siteId }) },
      );
      return json(res);
    },

    async upload(url, bytes, contentType, publishId) {
      const res = await fetch(url, {
        method: 'PUT',
        body: new Blob([new Uint8Array(bytes)]),
        headers: {
          'content-type': contentType,
          ...(publishId && { 'x-amz-meta-publish-id': publishId }),
        },
      });
      if (!res.ok)
        throw new ApiError(res.status, 'upload_failed', 'Upload failed');
    },

    async status(siteId, credential) {
      const res = await statusGET(
        internalRequest(
          'GET',
          `/api/sites/id/${encodeURIComponent(siteId)}/status`,
          credential,
        ),
        { params: Promise.resolve({ siteId }) },
      );
      return json(res);
    },

    async siteUrl(siteId) {
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: {
          projectName: true,
          customDomain: true,
          subdomain: true,
          user: { select: { username: true } },
        },
      });
      if (!site) throw new ApiError(404, 'not_found', 'Site not found');
      return getSiteUrl(site);
    },

    async listSites(userId) {
      const sites = await prisma.site.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          projectName: true,
          customDomain: true,
          subdomain: true,
          user: { select: { username: true } },
          publishes: {
            orderBy: { startedAt: 'desc' },
            take: 1,
            select: { startedAt: true },
          },
        },
      });
      return sites.map((s) => ({
        siteId: s.id,
        name: s.projectName,
        url: getSiteUrl(s),
        lastPublishedAt: s.publishes[0]?.startedAt.toISOString() ?? null,
      }));
    },

    async claimSite(userId, siteId, claimToken) {
      // Check the token is for this site before touching the database.
      const claim = verifySiteClaimToken(claimToken);
      if (!claim || claim.siteId !== siteId) {
        throw new ApiError(
          403,
          'forbidden',
          'This claimToken is not valid for this site.',
        );
      }
      const result = await claimAnonSite({ siteId, userId, claimToken });
      if (!result.ok) {
        const message =
          result.status === 409
            ? 'This site has already been added to a Flowershow account. If it is yours, find it with list-sites.'
            : result.status === 410
              ? 'This anonymous site has expired and can no longer be kept. Publish again to create a new site.'
              : result.status === 404
                ? 'Site not found.'
                : 'This claimToken is not valid for this site.';
        throw new ApiError(result.status, 'claim_failed', message);
      }
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: userId,
        event: 'anon_claim_completed',
        properties: { site_id: siteId, claim_method: 'mcp' },
      });
      await posthog.shutdown();
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: {
          id: true,
          projectName: true,
          customDomain: true,
          subdomain: true,
          user: { select: { username: true } },
        },
      });
      if (!site) throw new ApiError(404, 'not_found', 'Site not found.');
      return { siteId: site.id, name: site.projectName, url: getSiteUrl(site) };
    },

    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
