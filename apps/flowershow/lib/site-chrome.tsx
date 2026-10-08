import { SITE_FOOTER_PATH } from '@flowershow/core';
import type { ReactNode } from 'react';
import { env } from '@/env.mjs';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { generateScopedCss } from '@/lib/generate-scoped-css';
import { processHtmlFragment } from '@/lib/markdown';
import type { SiteLookupResult } from '@/server/api/types';
import { api } from '@/trpc/server';

/** True when the HTML has nothing but whitespace and comments. */
function isBlankHtml(content: string): boolean {
  return !content.replace(/<!--[\s\S]*?(?:-->|$)/g, '').trim();
}

interface SiteChromeOptions {
  site: SiteLookupResult;
  /** Premium feature gating this chrome file. */
  feature: Feature;
  /** Reserved root file, one of `SITE_CHROME_FILES`. */
  path: string;
  /** CSS selector of the wrapper the content renders in (UnoCSS scope). */
  scope: string;
  /** Id of the scoped `<style>` element. */
  styleId: string;
  /** Human-readable name for error logs ("footer"). */
  label: string;
  /** Element overrides for the HTML-to-React conversion. */
  components?: Parameters<typeof processHtmlFragment>[1]['components'];
}

/**
 * Render a reserved site-chrome HTML file (e.g. `_footer.html`, Premium) as
 * an HTML fragment, or return null to keep the default chrome (Free plan, no
 * file, an empty file, no access, or any fetch/render error).
 *
 * The file is HTML, not markdown: it is never parsed as markdown. It goes
 * through the same rehype steps as raw HTML in pages (`processHtmlFragment`),
 * so relative and root-relative links and image URLs resolve from the site
 * root, with the same trust level as raw HTML in a page. Tailwind (UnoCSS)
 * classes used in it are compiled into a scoped `<style id={styleId}>`.
 *
 * Errors thrown while React renders the returned tree are contained by a
 * ChromeErrorBoundary around the component that renders it.
 */
async function loadSiteChromeHtml({
  site,
  feature,
  path,
  scope,
  styleId,
  label,
  components,
}: SiteChromeOptions): Promise<ReactNode | null> {
  if (!isFeatureEnabled(feature, site)) return null;

  try {
    const content = await api.site.getSiteChromeFile
      .query({ siteId: site.id, path })
      .catch(() => null as string | null);
    if (!content || isBlankHtml(content)) return null;

    const siteHostname =
      site.customDomain ?? `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

    const [rendered, scopedCss] = await Promise.all([
      processHtmlFragment(content, {
        filePath: path,
        siteHostname,
        components,
      }),
      generateScopedCss(content, scope),
    ]);

    return (
      <>
        {/* Distinct id: pages already emit #unocss-mdx for their own scoped CSS. */}
        <style
          id={styleId}
          dangerouslySetInnerHTML={{ __html: scopedCss.css }}
        />
        {rendered}
      </>
    );
  } catch (error) {
    // Site chrome renders in the layout, where an uncaught error takes down
    // every page (global-error). Keep the default chrome instead.
    console.error(`Failed to render custom ${label}:`, error);
    return null;
  }
}

/**
 * The site's `_footer.html` (Premium, `Feature.CustomFooter`), or null to keep
 * the default footer. See `loadSiteChromeHtml`.
 */
export function loadCustomFooter({ site }: { site: SiteLookupResult }) {
  return loadSiteChromeHtml({
    site,
    feature: Feature.CustomFooter,
    path: SITE_FOOTER_PATH,
    scope: '.site-footer-custom',
    styleId: 'unocss-footer',
    label: 'footer',
  });
}
