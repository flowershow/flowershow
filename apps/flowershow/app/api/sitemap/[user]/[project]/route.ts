import { SitemapParamsSchema } from '@flowershow/api-contract';
import { NextRequest } from 'next/server';
import { getSiteUrl } from '@/lib/get-site-url';
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
          syncStatus: 'SUCCESS',
          OR: [{ path: { endsWith: '.md' } }, { path: { endsWith: '.mdx' } }],
        },
        select: {
          appPath: true,
          updatedAt: true,
          permalink: true,
        },
      },
    },
  });

  if (!site) {
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${siteUrl}</loc>
      <lastmod>${site.updatedAt.toISOString()}</lastmod>
    </url>${xmlItems.join('')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
