import { RssParamsSchema } from '@flowershow/api-contract';
import type { NextRequest } from 'next/server';
import { fetchFile } from '@/lib/content-store';
import { getSiteUrl } from '@/lib/get-site-url';
import { buildRssFeed } from '@/lib/rss';
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

  if (!site.enableRss) {
    return new Response('Not found', { status: 404 });
  }

  const siteUrl = getSiteUrl(site);

  let siteTitle = site.projectName;
  let siteDescription = `${siteTitle} RSS Feed`;
  try {
    const configJson = await fetchFile({
      projectId: site.id,
      path: 'config.json',
    });
    if (configJson) {
      const config = JSON.parse(configJson) as Record<string, unknown>;
      if (config.title) siteTitle = config.title as string;
      if (config.description) siteDescription = config.description as string;
    }
  } catch {
    // Fall back to defaults if config.json is missing or invalid
  }

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
