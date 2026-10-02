import { NextRequest } from 'next/server';
import { GET as statusGET } from '@/app/api/sites/id/[siteId]/status/route';
import { POST as syncPOST } from '@/app/api/sites/id/[siteId]/sync/route';
import { env } from '@/env.mjs';
import { hashIp } from '@/lib/anon-rate-limit';
import { createAnonSite } from '@/lib/anon-site';
import { getSiteUrl } from '@/lib/get-site-url';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';
import { ApiError } from './publish';
import type { McpDeps } from './server';

/**
 * Rate-limit key for anonymous sites created through MCP. Chat apps (claude.ai,
 * ChatGPT) call from their own cloud IPs, so per-IP limits would make all
 * their users share one small bucket; MCP gets one global hourly bucket
 * instead (MCP_ANON_HOURLY_LIMIT), alongside the ANON_PUBLISH_DISABLED kill switch.
 */
export const MCP_ANON_BUCKET = 'mcp:anonymous';
const DEFAULT_MCP_ANON_HOURLY_LIMIT = 100;

function internalRequest(
  method: 'GET' | 'POST',
  path: string,
  bearer: string,
  body?: unknown,
) {
  return new NextRequest(`https://${env.NEXT_PUBLIC_HOME_DOMAIN}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${bearer}`,
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
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
 */
export function realMcpDeps(): McpDeps {
  return {
    async createAnonSite() {
      const limit =
        Number(env.MCP_ANON_HOURLY_LIMIT) || DEFAULT_MCP_ANON_HOURLY_LIMIT;
      const result = await createAnonSite({
        bucket: hashIp(MCP_ANON_BUCKET),
        limit,
        rateLimitedMessage:
          'Too many anonymous sites have been published recently. Try again later.',
      });
      if (!result.ok) {
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

    async sync(siteId, files, bearer) {
      const res = await syncPOST(
        internalRequest('POST', `/api/sites/id/${siteId}/sync`, bearer, {
          files,
        }),
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

    async status(siteId, bearer) {
      const res = await statusGET(
        internalRequest('GET', `/api/sites/id/${siteId}/status`, bearer),
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
        },
      });
      return sites.map((s) => ({
        siteId: s.id,
        name: s.projectName,
        url: getSiteUrl(s),
      }));
    },

    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
