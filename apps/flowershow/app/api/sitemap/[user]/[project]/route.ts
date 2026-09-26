import { SitemapParamsSchema } from '@flowershow/api-contract';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { getSiteUrl } from '@/lib/get-site-url';
import { hasSiteAccess } from '@/lib/site-access';
import prisma from '@/server/db';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ user: string; project: string }> },
) {
  const parsedParams = SitemapParamsSchema.safeParse(await props.params);
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
          OR: [{ path: { endsWith: '.md' } }, { path: { endsWith: '.mdx' } }],
          metadata: { not: Prisma.AnyNull },
        },
        select: {
          appPath: true,
          updatedAt: true,
          permalink: true,
        },
      },
      // Only the `/tags` index is included in the sitemap (not per-tag pages) —
      // enough to make the tag overview indexable without flooding the sitemap.
      _count: { select: { tags: true } },
    },
  });

  if (!site) {
    return new Response('Not found', { status: 404 });
  }

  if (
    !(await hasSiteAccess(site, site.id, {
      session: null,
      headers: request.headers,
    }))
  ) {
    return new Response('Not found', { status: 404 });
  }

  const siteUrl = getSiteUrl(site);

  // Create XML sitemap
  const xmlItems = site.blobs.map((blob) => {
    if (blob.appPath === '/') return '';
    const permalink = (blob.permalink ?? blob.appPath)?.replace(/^\//, '');
    return `<url>
      <loc>${siteUrl}/${permalink}</loc>
      <lastmod>${blob.updatedAt.toISOString()}</lastmod>
    </url>`;
  });

  // The `/tags` index, only when the site actually has tags and the tags
  // feature is enabled (showTags defaults to on). Uses DB config only — the
  // /tags pages themselves also resolve file config, but the dashboard toggle
  // is the primary control and keeps this route free of a blob fetch.
  const showTags =
    ((site.configJson ?? {}) as { showTags?: boolean }).showTags ?? true;
  const tagsIndexItem =
    showTags && site._count.tags > 0
      ? `<url>
      <loc>${siteUrl}/tags</loc>
      <lastmod>${site.updatedAt.toISOString()}</lastmod>
    </url>`
      : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${siteUrl}</loc>
      <lastmod>${site.updatedAt.toISOString()}</lastmod>
    </url>${xmlItems.join('')}${tagsIndexItem}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
