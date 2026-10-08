import type { PageChrome } from '@/lib/page-chrome';

/**
 * Hidden marker a page renders to hide the site navbar and/or footer, which
 * live in the parent layout and never see page frontmatter. CSS `:has()`
 * rules in default-theme.css react to its data attributes. The marker is part
 * of the page's first HTML flush (no Suspense boundary between layout and
 * page), so there is no flash, and it mounts/unmounts with the page on client
 * navigation.
 */
export function PageChromeMarker({ hideNavbar, hideFooter }: PageChrome) {
  if (!hideNavbar && !hideFooter) return null;
  return (
    <span
      hidden
      data-page-chrome=""
      data-hide-navbar={hideNavbar ? '' : undefined}
      data-hide-footer={hideFooter ? '' : undefined}
    />
  );
}
