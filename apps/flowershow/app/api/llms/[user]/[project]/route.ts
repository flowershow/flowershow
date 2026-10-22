import { LlmsTxtParamsSchema } from '@flowershow/api-contract';
import { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';
import type { SiteConfig } from '@/components/types';
import { isAnonymousSite } from '@/lib/anon-site-safety';
import { fetchFile } from '@/lib/content-store';
import { getSiteUrl } from '@/lib/get-site-url';
import { buildLlmsTxt, llmsTxtDescription } from '@/lib/llms-txt';
import { hasSiteAccess } from '@/lib/site-access';
import { resolveSiteConfig, resolveSiteName } from '@/lib/site-config';
import { isSiteOwnHost, redirectToSiteOwnHost } from '@/lib/site-host';
import prisma from '@/server/db';

const LLMS_TXT_PATH = 'llms.txt';

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'Cache-Control': 'no-store' },
  });

/**
 * /llms.txt for a site (middleware rewrites it here from the site's own host).
 * A published llms.txt wins; otherwise it's generated when `enableLlmsTxt` is
 * on. Never generated for anonymous or password-protected sites.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ user: string; project: string }> },
) {
  const parsedParams = LlmsTxtParamsSchema.safeParse(await props.params);
  if (!parsedParams.success) return notFound();

  const { user, project } = parsedParams.data;

  const site = await prisma.site.findFirst({
    where: {
      OR: [
        { user: { username: user }, projectName: project },
        { customDomain: project },
      ],
    },
    select: {
      id: true,
      userId: true,
      privacyMode: true,
      tokenVersion: true,
      projectName: true,
      subdomain: true,
      customDomain: true,
      configJson: true,
      isTemporary: true,
      expiresAt: true,
      user: { select: { username: true } },
    },
  });

  if (!site) return notFound();

  if (!isSiteOwnHost(request.headers.get('host'), site)) {
    return redirectToSiteOwnHost(site, '/llms.txt');
  }

  // Expired anonymous sites stop being served before the cleanup cron runs.
  if (site.isTemporary && site.expiresAt && site.expiresAt <= new Date()) {
    return notFound();
  }

  if (
    !(await hasSiteAccess(site, site.id, {
      session: null,
      headers: request.headers,
    }))
  ) {
    return notFound();
  }

  const isPrivate = site.privacyMode === 'PASSWORD';
  const anonymous = isAnonymousSite(site);
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    // Password sites: never in a shared cache. Public: short edge cache, so a
    // republish shows up within minutes.
    'Cache-Control': isPrivate
      ? 'private, no-store'
      : 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
    ...(anonymous ? { 'X-Robots-Tag': 'noindex' } : {}),
  };

  // A published llms.txt always wins (same rule as robots.txt).
  const published = await prisma.blob.findUnique({
    where: { siteId_path: { siteId: site.id, path: LLMS_TXT_PATH } },
    select: { id: true },
  });
  if (published) {
    try {
      const content = await fetchFile({
        projectId: site.id,
        path: LLMS_TXT_PATH,
      });
      if (content) return new Response(content, { headers });
    } catch {
      // Fall through to the generated file (or a 404).
    }
  }

  if (anonymous || isPrivate) return notFound();

  let fileConfig: SiteConfig | null = null;
  try {
    const raw = await fetchFile({ projectId: site.id, path: 'config.json' });
    if (raw) fileConfig = JSON.parse(raw);
  } catch {
    // missing or invalid config.json — fall back to DB config only
  }
  const siteConfig = resolveSiteConfig(
    (site.configJson ?? null) as SiteConfig | null,
    fileConfig,
    { siteId: site.id },
  );
  if (siteConfig.enableLlmsTxt !== true) return notFound();

  const blobs = await prisma.blob.findMany({
    where: {
      siteId: site.id,
      OR: [{ path: { endsWith: '.md' } }, { path: { endsWith: '.mdx' } }],
      metadata: { not: Prisma.AnyNull },
    },
    select: { path: true, metadata: true },
  });
  const pages = blobs.map((b) => ({
    path: b.path,
    metadata: b.metadata as Record<string, unknown> | null,
  }));

  const body = buildLlmsTxt({
    siteName: resolveSiteName(siteConfig, site.projectName),
    siteUrl: getSiteUrl(site),
    description: llmsTxtDescription(siteConfig.description, pages),
    pages,
    contentHide: siteConfig.contentHide,
  });

  return new Response(body, { headers });
}
