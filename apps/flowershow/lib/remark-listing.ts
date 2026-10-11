import type { Code, Parent, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { dirOf } from '@/lib/changelog';
import { cachedResolveAuthors } from '@/lib/listing/authors';
import { DEFAULT_LOCALE, groupLabel } from '@/lib/listing/dates';
import {
  folderHasPages,
  nearestFolders,
  resolveFolderCase,
  resolveListingImage,
  toListingItem,
} from '@/lib/listing/items';
import { MAX_UNPAGINATED_ITEMS, sliceListing } from '@/lib/listing/paginate';
import { fetchRowsByIds, queryListingIndex } from '@/lib/listing/query';
import { renderListing, renderListingError } from '@/lib/listing/render';
import {
  parseListingBlock,
  parseListingSpec,
  type SpecResult,
} from '@/lib/listing/spec';
import prisma from '@/server/db';

export type ListingRenderContext = {
  page?: number;
  publicUrl?: string;
  locale?: string;
  implicit?: {
    options: unknown;
    defaultFrom: string | null;
    pageTitle?: string;
  };
  paginationClaimed?: boolean;
  today?: string;
};
export type RemarkListingOptions = ListingRenderContext & {
  siteId: string;
  siteHostname: string;
  rootDir?: string;
  filePath: string;
  files: string[];
  permalinks?: Record<string, string>;
};

const BLOCK_HEADING = 'List block has problems';
const LAYOUT_HEADING = 'List settings have problems';
/** Each listing can read a whole folder on a cold cache; bound the cost of one page. */
export const MAX_LISTINGS_PER_PAGE = 10;

export default function remarkListing(options: RemarkListingOptions) {
  return async (tree: Root) => {
    const targets: Array<{ node: Code; index: number; parent: Parent }> = [];
    visit(tree, 'code', (node: Code, index, parent) => {
      if (
        (node.lang === 'list' || node.lang === 'blog') &&
        parent &&
        typeof index === 'number'
      )
        targets.push({ node, index, parent: parent as Parent });
    });
    if (targets.length === 0 && !options.implicit) return;

    let paginationClaimed = options.paginationClaimed === true;
    let listings = 0;
    let heroClaimed = false;
    const currentPath = options.filePath.replace(/^\/+/, '');
    const locale = options.locale ?? DEFAULT_LOCALE;
    const today = options.today ?? new Date().toISOString().slice(0, 10);

    const build = async (
      result: SpecResult,
      heading: string,
      label?: string,
    ): Promise<RootContent> => {
      try {
        if (++listings > MAX_LISTINGS_PER_PAGE)
          return renderListingError(
            [
              `At most ${MAX_LISTINGS_PER_PAGE} lists per page; remove or combine some blocks.`,
            ],
            heading,
          );
        const resolveFrom = (from: string, relative: boolean) =>
          resolveFolderCase(
            relative
              ? [dirOf(currentPath), from].filter(Boolean).join('/')
              : from,
            options.files,
          );
        const missingFolder = (from: string) => {
          if (folderHasPages(from, options.files)) return [];
          const near = nearestFolders(from, options.files);
          return [
            `No folder "${from}" with pages.${near.length ? ` Folders with pages: ${near.join(', ')}.` : ''}`,
          ];
        };
        if (!result.ok)
          return renderListingError(
            [
              ...(result.from
                ? missingFolder(
                    resolveFrom(result.from.from, result.from.relative),
                  )
                : []),
              ...result.errors,
            ],
            heading,
          );
        const parsed = result.spec;
        const spec = {
          ...parsed,
          from: resolveFrom(parsed.from, parsed.fromRelative),
        };
        const folderErrors = missingFolder(spec.from);
        if (folderErrors.length)
          return renderListingError(folderErrors, heading);
        if (spec.pageSize != null) {
          if (paginationClaimed)
            return renderListingError(
              [
                'Only one list per page can paginate; add "limit:" or remove "pageSize:" from this one.',
              ],
              heading,
            );
          paginationClaimed = true;
        }
        const index = await queryListingIndex({
          siteId: options.siteId,
          spec,
          today,
        });
        let positions = index.ids
          .map((_, i) => i)
          .filter((i) => index.paths[i] !== currentPath);
        // The block's own page decides (a `limit` block is always page 1), not the host page's ?page=
        const featuredFirst = spec.featured === 1 && positions.length > 0;
        if (spec.featured === 1 && positions.length) {
          const promoted =
            positions.find((i) => index.featured.includes(i)) ?? positions[0]!;
          positions = [promoted, ...positions.filter((i) => i !== promoted)];
        }
        const slice = sliceListing(positions, spec, options.page ?? 1);
        const notes = slice.capped
          ? [
              ...result.notes,
              `Showing the first ${MAX_UNPAGINATED_ITEMS} of ${slice.total} items; add "limit:" or "pageSize:" to choose.`,
            ]
          : result.notes;
        if (notes.length)
          console.warn(`[listing] ${options.filePath}: ${notes.join(' | ')}`);
        const rows = await fetchRowsByIds(
          prisma as never,
          options.siteId,
          slice.items.map((i) => index.ids[i]!),
        );
        const ctx = {
          siteHostname: options.siteHostname,
          files: options.files,
          permalinks: options.permalinks,
          fields: spec.fields,
          locale,
        };
        // defaultImage: for items without an image, resolved against the listing page
        const fallbackImage =
          spec.defaultImage && spec.media !== 'none'
            ? resolveListingImage(spec.defaultImage, currentPath, ctx)
            : null;
        const posById = new Map(index.ids.map((id, i) => [id, i]));
        const items = rows.map((row) => {
          const own = toListingItem(row, ctx);
          const it =
            fallbackImage && !own.image
              ? { ...own, image: fallbackImage }
              : own;
          const pos = posById.get(row.id) ?? -1;
          return index.groups
            ? {
                ...it,
                group: groupLabel(index.groups[pos] ?? '', spec.group, locale),
              }
            : it;
        });
        const handles = spec.fields.authors
          ? [...new Set(items.flatMap((i) => i.authorHandles))]
          : [];
        const resolved = handles.length
          ? await cachedResolveAuthors({
              siteId: options.siteId,
              handles,
              siteHostname: options.siteHostname,
              files: options.files,
            })
          : [];
        const hero = featuredFirst && slice.page === 1;
        const wasClaimed = heroClaimed;
        if (hero) heroClaimed = true;
        return renderListing({
          spec,
          page: { ...slice, items },
          authors: new Map(handles.map((h, i) => [h, resolved[i]!])),
          publicUrl: options.publicUrl ?? '/',
          locale,
          label,
          notes,
          featuredFirst: hero,
          featuredPriority: hero && !wasClaimed,
        });
      } catch (error) {
        console.error('Error rendering listing:', error);
        return renderListingError(
          [
            'This list could not be loaded right now. Reload the page; if it keeps failing, check the options.',
          ],
          heading,
        );
      }
    };

    // The page-level listing claims pagination first and renders last.
    const implicitNode = options.implicit
      ? await build(
          parseListingSpec(options.implicit.options, {
            source: 'layout',
            defaultFrom: options.implicit.defaultFrom,
            rootDir: options.rootDir,
          }),
          LAYOUT_HEADING,
          options.implicit.pageTitle,
        )
      : null;
    for (const { node, index, parent } of targets) {
      parent.children[index] = (await build(
        parseListingBlock(node.lang as 'list' | 'blog', node.value, {
          rootDir: options.rootDir,
        }),
        BLOCK_HEADING,
      )) as never;
    }
    if (implicitNode) tree.children.push(implicitNode);
  };
}
