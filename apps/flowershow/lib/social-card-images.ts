import type { SiteConfig } from '@/components/types';
import { type CardImage, resolveCardImage } from '@/lib/social-preview';
import { api } from '@/trpc/server';

/**
 * The page's and the site's card pictures, resolved the same way by page
 * metadata and the /_og route (so both compute the same `v`). Queries the
 * site's files only when there is an `image` to resolve. Public sites only:
 * protected sites never get a picture.
 */
export async function loadCardImages(a: {
  siteId: string;
  siteUrl: string;
  blob: { path: string; metadata: unknown } | null;
  siteConfig: SiteConfig | null;
}): Promise<{ pageImage: CardImage | null; siteImage: CardImage | null }> {
  const metadata = (a.blob?.metadata ?? null) as { image?: unknown } | null;
  const rawPage = metadata?.image;
  const rawSite = a.siteConfig?.image;
  if (!rawPage && !rawSite) return { pageImage: null, siteImage: null };

  const [files, dimensions] = await Promise.all([
    api.site.getAllBlobPaths
      .query({ siteId: a.siteId })
      .catch(() => [] as string[]),
    api.site.getImageDimensionsMap
      .query({ siteId: a.siteId })
      .catch(() => ({})),
  ]);
  const ctx = {
    siteHostname: new URL(a.siteUrl).host,
    files: files ?? [],
    dimensions: dimensions ?? {},
  };
  return {
    pageImage:
      rawPage && a.blob ? resolveCardImage(rawPage, a.blob.path, ctx) : null,
    siteImage: rawSite ? resolveCardImage(rawSite, 'config.json', ctx) : null,
  };
}
