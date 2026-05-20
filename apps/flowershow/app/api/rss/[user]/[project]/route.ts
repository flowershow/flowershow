import { RssParamsSchema } from '@flowershow/api-contract';
import type { NextRequest } from 'next/server';
import type { SiteConfig } from '@/components/types';
import { fetchFile } from '@/lib/content-store';
import { getSiteUrl } from '@/lib/get-site-url';
import { buildRssFeed } from '@/lib/rss';
import { resolveSiteConfig, SITE_CONFIG_DEFAULTS } from '@/lib/site-config';
import prisma from '@/server/db';
import { Prisma } from '@prisma/client';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ user: string; project: string }> },
) {
  const parsedParams = RssParamsSchema.safeParse(await props.params);
  if (!parsedParams.success) {
    return new Response('Not found', { status: 404 });
  }

  const { user, project } = parsedParams.data;

  const site = await prisma.site.findFirst({
    where: {
      OR: [
        {
          user: {
            username: user,
          },
          projectName: project,
        },
        {
          customDomain: project,
        },
      ],
    },
    include: {
      user: true,
      blobs: {
        where: {
          syncStatus: 'SUCCESS',
          OR: [{ path: { endsWith: '.md' } }, { path: { endsWith: '.mdx' } }],
          metadata: {
            not: Prisma.AnyNull,
          },
        },
        select: {
          appPath: true,
          updatedAt: true,
          permalink: true,
          metadata: true,
        },
      },
    },
  });

  if (!site) {
    return new Response('Not found', { status: 404 });
  }

  const dbConfig = (site.configJson ?? null) as SiteConfig | null;

  let fileConfig: SiteConfig | null = null;
  try {
    const raw = await fetchFile({ projectId: site.id, path: 'config.json' });
    if (raw) fileConfig = JSON.parse(raw);
  } catch {
    // missing or invalid config.json — fall back to DB config only
  }

  const siteConfig = resolveSiteConfig(dbConfig, fileConfig);

  if (!(siteConfig.enableRss ?? SITE_CONFIG_DEFAULTS.enableRss)) {
    return new Response('Not found', { status: 404 });
  }

  const siteUrl = getSiteUrl(site);
  const siteTitle = siteConfig.title ?? site.projectName;
  const siteDescription =
    siteConfig.description ?? `${site.projectName} RSS Feed`;

  const xml = buildRssFeed(
    { siteUrl, title: siteTitle, description: siteDescription },
    site.blobs.map((blob) => ({
      ...blob,
      metadata: blob.metadata as Record<string, unknown> | null,
    })),
    new Date(),
  );

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
