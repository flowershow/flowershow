import type { TocStyle } from './toc-style';

export type SiteLayout = 'docs' | 'reading';

export function isSiteLayout(v: unknown): v is SiteLayout {
  return v === 'docs' || v === 'reading';
}

/**
 * The layout for a page: its own `layout` frontmatter wins, then the site
 * config's, else `docs`. Anything that isn't a known layout is ignored.
 */
export function pageLayout(pageValue: unknown, siteValue: unknown): SiteLayout {
  if (isSiteLayout(pageValue)) return pageValue;
  if (isSiteLayout(siteValue)) return siteValue;
  return 'docs';
}

export type LayoutInputs = {
  layout: SiteLayout;
  /** Today's `showSidebar` result: frontmatter or site, then `sidebar.paths` */
  sidebarEnabled: boolean;
  /** Page frontmatter values only, for the keys that beat the layout */
  pageShowsSidebar: boolean | undefined;
  showToc: boolean;
  tocStyle: TocStyle;
  pageTocStyle: TocStyle | undefined;
  tocHeadings: number;
  showGraph: boolean;
  pageShowsGraph: boolean | undefined;
};

export type ResolvedLayout = {
  sidebar: 'column' | 'drawer' | 'none';
  toc: 'none' | 'panel' | 'rail-right' | 'rail-left';
  showGraph: boolean;
  /** The menu button that opens the drawer */
  pageNav: boolean;
  /** The rail has its own column (not tucked under the graph) */
  railColumn: boolean;
  /** The inline Contents block hides from 1024px beside a rail column */
  inlineTocStyle: TocStyle;
};

// A rail with too few headings would be empty, so there is none then
const MIN_RAIL_HEADINGS = 3;

/**
 * Where the sidebar, contents and graph go. A layout only moves things:
 * `sidebarEnabled: false` and `showToc: false` stay off. Page frontmatter
 * keys bring an element back under `reading`; a left rail never sits beside
 * a site sidebar column, so then contents go right, as in `docs`.
 */
export function resolveLayout(i: LayoutInputs): ResolvedLayout {
  const reading = i.layout === 'reading';

  const sidebar: ResolvedLayout['sidebar'] = !i.sidebarEnabled
    ? 'none'
    : reading && i.pageShowsSidebar !== true
      ? 'drawer'
      : 'column';
  const showGraph = reading ? i.pageShowsGraph === true : i.showGraph;

  // Under reading the site-level style is ignored: only the page can ask for a panel
  const tocStyle = reading ? (i.pageTocStyle ?? 'rail') : i.tocStyle;
  const toc: ResolvedLayout['toc'] = !i.showToc
    ? 'none'
    : tocStyle === 'panel'
      ? 'panel'
      : i.tocHeadings < MIN_RAIL_HEADINGS
        ? 'none'
        : reading && sidebar !== 'column' && !showGraph
          ? 'rail-left'
          : 'rail-right';

  // With the graph on, the rail sits under it in the usual right column
  const railColumn =
    toc === 'rail-left' || (toc === 'rail-right' && !showGraph);

  return {
    sidebar,
    toc,
    showGraph,
    pageNav: sidebar === 'drawer',
    railColumn,
    inlineTocStyle: railColumn ? 'rail' : 'panel',
  };
}
