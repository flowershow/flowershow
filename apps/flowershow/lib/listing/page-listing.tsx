import { dirOf } from '@/lib/changelog';
import { resolveFolderCase } from '@/lib/listing/items';
import { queryListingIndex } from '@/lib/listing/query';
import { processMarkdown } from '@/lib/markdown';
import { type ListingRoute, resolveListingRoute } from './route';
import { parseListingSpec } from './spec';

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
    },
  });
}

/** For `noindex`: is `page` past the last page of this page-level listing? Mirrors remark-listing's folder resolution and self-exclusion. */
export async function isListingPageOutOfRange(args: {
  siteId: string;
  rootDir?: string | null;
  filePath: string;
  siteFilePaths: string[];
  route: ListingRoute;
  page: number;
  today?: string;
}): Promise<boolean> {
  if (args.page <= 1 || args.route.kind === 'none') return false;
  const implicit = implicitOf(args.route);
  const parsed = parseListingSpec(implicit.options, {
    source: 'layout',
    defaultFrom: implicit.defaultFrom,
    rootDir: args.rootDir ?? undefined,
  });
  if (!parsed.ok || parsed.spec.pageSize == null) return false;
  const pageSize = parsed.spec.pageSize;
  const currentPath = args.filePath.replace(/^\/+/, '');
  const joined = parsed.spec.fromRelative
    ? [dirOf(currentPath), parsed.spec.from].filter(Boolean).join('/')
    : parsed.spec.from;
  const spec = {
    ...parsed.spec,
    from: resolveFolderCase(joined, args.siteFilePaths),
  };
  try {
    const index = await queryListingIndex({
      siteId: args.siteId,
      spec,
      today: args.today ?? new Date().toISOString().slice(0, 10),
    });
    const count = index.paths.filter((p) => p !== currentPath).length;
    return args.page > Math.max(1, Math.ceil(count / pageSize));
  } catch {
    return false;
  }
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
