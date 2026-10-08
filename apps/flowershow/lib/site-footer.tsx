import { SITE_FOOTER_PATH } from '@flowershow/core';
import type { Blob } from '@prisma/client';
import type { ReactNode } from 'react';
import type { SiteConfig } from '@/components/types';
import { env } from '@/env.mjs';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { generateScopedCss } from '@/lib/generate-scoped-css';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import { renderPageContent } from '@/lib/render-page-content';
import type { SiteLookupResult } from '@/server/api/types';
import { api } from '@/trpc/server';

const FOOTER_SCOPE = '.site-footer-custom';

/**
 * Render the site's `_footer.md` (Premium) with the same markdown pipeline
 * as pages, or return null to keep the default footer (Free plan, no file,
 * no access, or a fetch error).
 *
 * Always rendered in `md` mode, whatever the site's syntaxMode: MDX renders
 * client-side only, which would mean a layout shift and no footer HTML for
 * crawlers on every page.
 */
export async function loadCustomFooter({
  site,
  siteConfig,
}: {
  site: SiteLookupResult;
  siteConfig: SiteConfig | null;
}): Promise<ReactNode | null> {
  if (!isFeatureEnabled(Feature.CustomFooter, site)) return null;

  const content = await api.site.getSiteFooter
    .query({ siteId: site.id })
    .catch(() => null);
  if (!content?.trim()) return null;

  const [siteFilePaths, permalinksMapping, imageDimensions] = await Promise.all(
    [
      api.site.getAllBlobPaths
        .query({ siteId: site.id })
        .catch(() => [] as string[]),
      api.site.getPermalinksMapping
        .query({ siteId: site.id })
        .catch(() => ({}) as Record<string, string>),
      api.site.getImageDimensionsMap
        .query({ siteId: site.id })
        .catch(() => ({}) as ImageDimensionsMap),
    ],
  );

  const siteHostname =
    site.customDomain ?? `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

  const rendered = await renderPageContent({
    // In md mode renderPageContent only reads `blob.path` (extension check
    // and relative link resolution), so a path-only blob is enough.
    blob: { path: SITE_FOOTER_PATH } as Blob,
    site,
    content,
    renderMode: 'md',
    siteHostname,
    siteFilePaths,
    permalinksMapping,
    imageDimensions,
    showTags: siteConfig?.showTags ?? true,
  });

  const scopedCss = await generateScopedCss(content, FOOTER_SCOPE);

  return (
    <>
      {/* Distinct id: pages already emit #unocss-mdx for their own scoped CSS. */}
      <style
        id="unocss-footer"
        dangerouslySetInnerHTML={{ __html: scopedCss.css }}
      />
      {rendered}
    </>
  );
}
