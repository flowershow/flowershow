import { RobotsParamsSchema } from '@flowershow/api-contract';
import { NextRequest } from 'next/server';
import { env } from '@/env.mjs';
import { fetchFile } from '@/lib/content-store';
import prisma from '@/server/db';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ hostname: string }> },
) {
  const parsedParams = RobotsParamsSchema.safeParse(await props.params);
  if (!parsedParams.success) {
    return new Response('Not found', { status: 404 });
  }

  const { hostname } = parsedParams.data;

  // Look up site by custom domain first, then by subdomain for *.flowershow.site
  const siteDomain = env.NEXT_PUBLIC_SITE_DOMAIN;
  const subdomain = hostname.endsWith(`.${siteDomain}`)
    ? hostname.slice(0, -(siteDomain.length + 1))
    : null;

  const site = await prisma.site.findFirst({
    where: subdomain ? { subdomain } : { customDomain: hostname },
    select: { id: true },
  });

  if (!site) {
    return new Response('Not found', { status: 404 });
  }

  // Check if the user has published a robots.txt file
  const robotsBlob = await prisma.blob.findFirst({
    where: { siteId: site.id, path: 'robots.txt', syncStatus: 'SUCCESS' },
    select: { path: true },
  });

  if (robotsBlob) {
    try {
      const content = await fetchFile({
        projectId: site.id,
        path: 'robots.txt',
      });
      if (content) {
        return new Response(content, {
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    } catch {
      // Fall through to auto-generated robots.txt
    }
  }

  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  const protocol = isSecure ? 'https' : 'http';

  const robotsTxt = `# ${protocol}://${hostname}
User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${protocol}://${hostname}/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
