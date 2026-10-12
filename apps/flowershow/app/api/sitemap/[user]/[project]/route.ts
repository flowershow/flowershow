import { SitemapParamsSchema } from '@flowershow/api-contract';
import { NextRequest } from 'next/server';
import { getSiteUrl } from '@/lib/get-site-url';
import { notDraftSql } from '@/lib/listing/draft-sql';
import { listingDirSlug, virtualListingDirs } from '@/lib/listing/route';
import { escapeXml } from '@/lib/rss';
import { hasSiteAccess } from '@/lib/site-access';
import { isSiteOwnHost, redirectToSiteOwnHost } from '@/lib/site-host';
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
      // Only the `/tags` index is included in the sitemap (not per-tag pages) —
      // enough to make the tag overview indexable without flooding the sitemap.
      _count: { select: { tags: true } },
    },
  });

  if (!site) {
    return new Response('Not found', { status: 404 });
  }

  // Serve the sitemap only on the site's own host(s). Middleware rewrites
  // /sitemap.xml here from the site's own host; other hosts are redirected.
  if (!isSiteOwnHost(request.headers.get('host'), site)) {
    return redirectToSiteOwnHost(site, '/sitemap.xml');
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
  const loc = (url: string) => `<loc>${escapeXml(url)}</loc>`;

  // Markdown pages. `listed`: processed (metadata present) and not a draft.
  // `draft: true` pages stay reachable by URL but are not advertised; the
  // filter runs in SQL so no page metadata is loaded. Unlisted rows are kept
  // only so a draft or unprocessed page at a folder's URL still claims it.
  const rows = await prisma.$queryRaw<
    {
      path: string;
      app_path: string | null;
      permalink: string | null;
      updated_at: Date;
      listed: boolean;
    }[]
  >`
    SELECT "path", "app_path", "permalink", "updated_at",
      ("metadata" IS NOT NULL AND "metadata" <> 'null'::jsonb AND ${notDraftSql()}) AS "listed"
    FROM "Blob"
    WHERE "site_id" = ${site.id}
      AND ("path" LIKE '%.md' OR "path" LIKE '%.mdx')
  `;
  const listedRows = rows.filter((r) => r.listed);
  const xmlItems = listedRows.map((blob) => {
    if (blob.app_path === '/') return '';
    const permalink = (blob.permalink ?? blob.app_path)?.replace(/^\//, '');
    return `<url>
      ${loc(`${siteUrl}/${permalink}`)}
      <lastmod>${blob.updated_at.toISOString()}</lastmod>
    </url>`;
  });

  // Generated listing pages of README-less blog/ and posts/ folders: no Blob
  // of their own, so add them when no page claims the URL and the folder has
  // at least one listed page (lastmod: its newest).
  const claimed = new Set(
    rows.flatMap((r) => [r.app_path, r.permalink]).filter(Boolean),
  );
  const listingItems = virtualListingDirs(rows.map((r) => r.path)).flatMap(
    (dir) => {
      const slug = listingDirSlug(dir);
      if (claimed.has(slug)) return [];
      const inDir = listedRows.filter((r) => r.path.startsWith(`${dir}/`));
      if (inDir.length === 0) return [];
      const lastmod = new Date(
        Math.max(...inDir.map((r) => r.updated_at.getTime())),
      );
      return [
        `<url>
      ${loc(`${siteUrl}${slug}`)}
      <lastmod>${lastmod.toISOString()}</lastmod>
    </url>`,
      ];
    },
  );

  // The `/tags` index, only when the site actually has tags and the tags
  // feature is enabled (showTags defaults to on). Uses DB config only — the
  // /tags pages themselves also resolve file config, but the dashboard toggle
  // is the primary control and keeps this route free of a blob fetch.
  const showTags =
    ((site.configJson ?? {}) as { showTags?: boolean }).showTags ?? true;
  const tagsIndexItem =
    showTags && site._count.tags > 0
      ? `<url>
      ${loc(`${siteUrl}/tags`)}
      <lastmod>${site.updatedAt.toISOString()}</lastmod>
    </url>`
      : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      ${loc(siteUrl)}
      <lastmod>${site.updatedAt.toISOString()}</lastmod>
    </url>${xmlItems.join('')}${listingItems.join('')}${tagsIndexItem}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
