type ChromeFlags = { showNavbar?: unknown; showFooter?: unknown };

export interface PageChrome {
  hideNavbar: boolean;
  hideFooter: boolean;
}

/**
 * Whether a page hides the site navbar and/or footer. The page frontmatter
 * value wins over the site config value, like the other `show*` flags. Only
 * a literal boolean `false` hides anything.
 */
export function resolvePageChrome(
  metadata: ChromeFlags | null | undefined,
  siteConfig: ChromeFlags | null | undefined,
): PageChrome {
  const showNavbar = metadata?.showNavbar ?? siteConfig?.showNavbar;
  const showFooter = metadata?.showFooter ?? siteConfig?.showFooter;
  return {
    hideNavbar: showNavbar === false,
    hideFooter: showFooter === false,
  };
}
