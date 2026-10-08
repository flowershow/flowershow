import { SITE_FOOTER_PATH } from '@flowershow/core';
import type { Blob } from '@prisma/client';
import matter from 'gray-matter';
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

/** True when the markdown has nothing but (optional) frontmatter. */
function isBlankFooter(content: string): boolean {
  try {
    return !matter(content).content.trim();
  } catch {
    // Malformed frontmatter: let the render pipeline deal with it.
    return !content.trim();
  }
}

/**
 * Render the site's `_footer.md` (Premium) with the same markdown pipeline
 * as pages, or return null to keep the default footer (Free plan, no file,
 * a file with only frontmatter, no access, or any fetch/render error).
 * Frontmatter in `_footer.md` is ignored (including `publish: false`).
 *
 * Always rendered in `md` mode, whatever the site's syntaxMode: MDX renders
 * client-side only, which would mean a layout shift and no footer HTML for
 * crawlers on every page.
 *
 * `siteConfig` may be a promise so the layout can start this in parallel
 * with its own config fetch; it is only needed after the footer is fetched.
 * Errors thrown while React renders the returned tree are contained by the
 * FooterErrorBoundary in `Footer`.
 */
export async function loadCustomFooter({
  site,
  siteConfig,
}: {
  site: SiteLookupResult;
  siteConfig: SiteConfig | null | Promise<SiteConfig | null>;
}): Promise<ReactNode | null> {
  if (!isFeatureEnabled(Feature.CustomFooter, site)) return null;

  try {
    // The link-resolution inputs are cached and shared with page rendering,
    // so fetch them alongside the footer rather than after it.
    const [content, siteFilePaths, permalinksMapping, imageDimensions] =
      await Promise.all([
        api.site.getSiteFooter
          .query({ siteId: site.id })
          .catch(() => null as string | null),
        api.site.getAllBlobPaths
          .query({ siteId: site.id })
          .catch(() => [] as string[]),
        api.site.getPermalinksMapping
          .query({ siteId: site.id })
          .catch(() => ({}) as Record<string, string>),
        api.site.getImageDimensionsMap
          .query({ siteId: site.id })
          .catch(() => ({}) as ImageDimensionsMap),
      ]);
    if (!content || isBlankFooter(content)) return null;

    const resolvedConfig = await siteConfig;
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
      showTags: resolvedConfig?.showTags ?? true,
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
  } catch (error) {
    // The footer renders in the layout, where an uncaught error takes down
    // every page (global-error). Keep the default footer instead.
    console.error('Failed to render custom footer:', error);
    return null;
  }
}
