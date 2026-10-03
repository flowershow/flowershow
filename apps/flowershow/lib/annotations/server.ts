import type { AnnotationSettings } from '@flowershow/api-contract';
import { Prisma, type PrismaClient } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import type { SiteConfig } from '@/components/types';
import { fetchFile } from '@/lib/content-store';
import { getSiteUrl } from '@/lib/get-site-url';
import { siteAccessSelect } from '@/lib/site-access';
import { resolveSiteConfig } from '@/lib/site-config';
import type { PageInfo } from './dto';

export const annotationSiteSelect = Prisma.validator<Prisma.SiteSelect>()({
  ...siteAccessSelect,
  configJson: true,
  isTemporary: true,
  anonymousOwnerId: true,
  projectName: true,
  customDomain: true,
  subdomain: true,
  user: { select: { username: true } },
});

export type AnnotationSite = Prisma.SiteGetPayload<{
  select: typeof annotationSiteSelect;
}>;
type SiteForUrl = Pick<
  AnnotationSite,
  'projectName' | 'customDomain' | 'subdomain' | 'user'
>;

async function readResolvedSiteConfig(
  siteId: string,
  configJson: Prisma.JsonValue | null,
): Promise<SiteConfig> {
  let fileConfig: SiteConfig | null = null;
  try {
    const raw = await fetchFile({ projectId: siteId, path: 'config.json' });
    if (raw) fileConfig = JSON.parse(raw) as SiteConfig;
  } catch {
    // missing or invalid config.json: fall back to the dashboard config
  }
  return resolveSiteConfig(
    (configJson ?? null) as SiteConfig | null,
    fileConfig,
  );
}

/**
 * Dashboard config merged with config.json (file wins), as the page renderer
 * sees it. Cached like the page's `site.getConfig` (60 s, tags `siteId` and
 * `${siteId}-config`), so a visitor read or write doesn't fetch config.json
 * from R2 every time. Pass `fresh` right after changing the config.
 */
export function loadResolvedSiteConfig(
  site: { id: string; configJson: Prisma.JsonValue | null },
  opts: { fresh?: boolean } = {},
): Promise<SiteConfig> {
  const read = () => readResolvedSiteConfig(site.id, site.configJson ?? null);
  if (opts.fresh) return read();
  return unstable_cache(read, ['annotations-site-config', site.id], {
    revalidate: 60,
    tags: [site.id, `${site.id}-config`],
  })();
}

export function pageUrl(
  site: SiteForUrl,
  appPath: string | null,
): string | null {
  return appPath == null ? null : `${getSiteUrl(site)}${appPath}`;
}

/** Current sha and public URL of each path that still exists. */
export async function loadCurrentPages(
  db: Pick<PrismaClient, 'blob'>,
  site: SiteForUrl & { id: string },
  paths: string[],
): Promise<Map<string, PageInfo>> {
  if (paths.length === 0) return new Map();
  const blobs = await db.blob.findMany({
    where: { siteId: site.id, path: { in: [...new Set(paths)] } },
    select: { path: true, sha: true, appPath: true },
  });
  return new Map(
    blobs.map((blob) => [
      blob.path,
      { sha: blob.sha, url: pageUrl(site, blob.appPath) },
    ]),
  );
}

export async function annotationSettingsFor(
  db: Pick<PrismaClient, 'annotation'>,
  site: { id: string; configJson: Prisma.JsonValue | null },
  opts: { fresh?: boolean } = {},
): Promise<AnnotationSettings> {
  const [config, openAnnotations] = await Promise.all([
    loadResolvedSiteConfig(site, opts),
    db.annotation.count({ where: { siteId: site.id, status: 'open' } }),
  ]);
  return { annotationsEnabled: config.annotations === true, openAnnotations };
}

/** Coarse device class for analytics only; the User-Agent itself is never stored. */
export function deviceFromUserAgent(
  userAgent: string | null,
): 'mobile' | 'desktop' {
  return userAgent && /Mobi|Android|iPhone|iPad/i.test(userAgent)
    ? 'mobile'
    : 'desktop';
}
