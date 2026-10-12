import { processMarkdown } from '@/lib/markdown';
import type { ListingRenderContext } from '@/lib/remark-listing';
import { type ListingRoute, resolveListingRoute } from './route';

type PageLevelRoute = Extract<
  ListingRoute,
  { kind: 'page' } | { kind: 'virtual' }
>;

const implicitOf = (route: PageLevelRoute, pageTitle?: string) =>
  route.kind === 'virtual'
    ? {
        options: undefined,
        defaultFrom: route.dir,
        pageTitle: pageTitle ?? route.title,
      }
    : { options: route.options, defaultFrom: route.defaultFrom, pageTitle };

/** A page-level listing, always through the .md pipeline (server-rendered whatever the page's renderMode; tech M6). */
export async function renderPageListing(args: {
  site: { id: string; rootDir?: string | null };
  filePath: string;
  siteHostname: string;
  siteFilePaths: string[];
  permalinks: Record<string, string>;
  route: PageLevelRoute;
  page: number;
  publicUrl: string;
  pageTitle?: string;
  locale: string;
  onPaginate?: ListingRenderContext['onPaginate'];
}) {
  return processMarkdown('', {
    filePath: args.filePath,
    files: args.siteFilePaths,
    siteHostname: args.siteHostname,
    siteId: args.site.id,
    rootDir: args.site.rootDir ?? undefined,
    permalinks: args.permalinks,
    listing: {
      implicit: implicitOf(args.route, args.pageTitle),
      page: args.page,
      publicUrl: args.publicUrl,
      locale: args.locale,
      onPaginate: args.onPaginate,
    },
  });
}

/** Only then does `?page=N` change the content, so only then is it its own canonical. */
export function listingPaginatesByPage(route: ListingRoute): boolean {
  if (route.kind === 'virtual') return true;
  return route.kind === 'page' && route.pageSize != null;
}

/**
 * The route as SitePage will see it, for generateMetadata: an auto listing
 * depends on the body (a README with its own block is not one), so the body is
 * loaded only in that case.
 */
export async function resolveMetadataListingRoute(
  args: Omit<Parameters<typeof resolveListingRoute>[0], 'content'>,
  loadContent: () => Promise<string | null>,
): Promise<ListingRoute> {
  const route = resolveListingRoute({ ...args, content: '' });
  if (route.kind !== 'page' || route.source !== 'auto') return route;
  return resolveListingRoute({ ...args, content: (await loadContent()) ?? '' });
}
