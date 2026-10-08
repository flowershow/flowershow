import { SITE_FOOTER_PATH } from '@flowershow/core';
import type { ReactNode } from 'react';
import { env } from '@/env.mjs';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { generateScopedCss } from '@/lib/generate-scoped-css';
import { processHtmlFragment } from '@/lib/markdown';
import type { SiteLookupResult } from '@/server/api/types';
import { api } from '@/trpc/server';

const FOOTER_SCOPE = '.site-footer-custom';

/** True when the HTML has nothing but whitespace and comments. */
function isBlankFooter(content: string): boolean {
  return !content.replace(/<!--[\s\S]*?(?:-->|$)/g, '').trim();
}

/**
 * Render the site's `_footer.html` (Premium) as an HTML fragment, or return
 * null to keep the default footer (Free plan, no file, an empty file, no
 * access, or any fetch/render error).
 *
 * The file is HTML, not markdown: it is never parsed as markdown. It goes
 * through the same rehype steps as raw HTML in pages (`processHtmlFragment`),
 * so relative and root-relative links and image URLs resolve from the site
 * root, with the same trust level as raw HTML in a page. Tailwind (UnoCSS)
 * classes used in it are compiled into a scoped `<style id="unocss-footer">`.
 *
 * Errors thrown while React renders the returned tree are contained by the
 * FooterErrorBoundary in `Footer`.
 */
export async function loadCustomFooter({
  site,
}: {
  site: SiteLookupResult;
}): Promise<ReactNode | null> {
  if (!isFeatureEnabled(Feature.CustomFooter, site)) return null;

  try {
    const content = await api.site.getSiteFooter
      .query({ siteId: site.id })
      .catch(() => null as string | null);
    if (!content || isBlankFooter(content)) return null;

    const siteHostname =
      site.customDomain ?? `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

    const [rendered, scopedCss] = await Promise.all([
      processHtmlFragment(content, {
        filePath: SITE_FOOTER_PATH,
        siteHostname,
      }),
      generateScopedCss(content, FOOTER_SCOPE),
    ]);

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
