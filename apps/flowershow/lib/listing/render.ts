import type { PhrasingContent, RootContent } from 'mdast';
import { pageWindow } from '@/lib/page-window';
import type { ResolvedAuthor } from './authors';
import { formatListingDate } from './dates';
import type { ListingFieldPart, ListingItem } from './items';
import type { ListingPage } from './paginate';
import { pageHref } from './paginate';
import { LISTING_KEYS, type ListingSpec } from './spec';

export const LISTING_HEADLINE_CLASS = 'list-component-item-headline';
export const LISTING_GROUP_HEADING_CLASS = 'list-component-group-heading';
/** The magazine view's "More posts" and "Recent posts" headings. */
export const LISTING_SECTION_HEADING_CLASS = 'list-component-section-heading';
/** Set so rehype-slug skips listing headings; removed by rehype-listing-headings. */
export const LISTING_HEADING_PLACEHOLDER_ID = 'listing-item-heading';

type Props = Record<string, string>;
const el = (
  tagName: string,
  className: string[],
  children: unknown[],
  props: Props = {},
): RootContent =>
  ({
    type: 'listingElement',
    data: {
      hName: tagName,
      hProperties: { ...(className.length ? { className } : {}), ...props },
    },
    children,
  }) as unknown as RootContent;
const text = (value: string): PhrasingContent => ({ type: 'text', value });

/** How an item is laid out: a list row, or one of the magazine top's slots. */
type ItemRole = 'row' | 'hero' | 'card' | 'brief';

/** next/image `sizes` per view and media shape (design section 6). */
function mediaSizes(
  spec: ListingSpec,
  featured: boolean,
  role: ItemRole,
): string {
  if (role === 'hero') return '(min-width: 1024px) 50vw, 100vw';
  if (role === 'card')
    return '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw';
  if (role === 'brief') return '72px';
  if (featured) return '(min-width: 768px) 58vw, 100vw';
  if (spec.view === 'grid')
    return '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';
  if (spec.view === 'people')
    return spec.media === 'thumb' ? '96px' : '(min-width: 1024px) 25vw, 50vw';
  return spec.media === 'thumb'
    ? '(min-width: 640px) 180px, 104px'
    : '(min-width: 768px) 44rem, 100vw';
}

/** The one component: an MDX JSX element in both pipelines (see lib/markdown.ts remarkMdxJsxToElement). */
const image = (attrs: Record<string, string>): RootContent =>
  ({
    type: 'mdxJsxFlowElement',
    name: 'ListingImage',
    attributes: Object.entries(attrs).map(([name, value]) => ({
      type: 'mdxJsxAttribute',
      name,
      value,
    })),
    children: [],
  }) as unknown as RootContent;

const ICONS = {
  prev: ['m12 19-7-7 7-7', 'M19 12H5'],
  next: ['M5 12h14', 'm12 5 7 7-7 7'],
};
const icon = (dir: 'prev' | 'next') =>
  el(
    'svg',
    [
      'list-component-pagination-button-icon',
      `list-component-pagination-button-icon--${dir}`,
    ],
    ICONS[dir].map((d) => el('path', [], [], { d })),
    {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ariaHidden: 'true',
    },
  );

const partsToNodes = (parts: ListingFieldPart[]) =>
  parts.flatMap((p, i) => [
    ...(i ? [text(', ')] : []),
    p.href ? el('a', [], [text(p.text)], { href: p.href }) : text(p.text),
  ]);

/** First letter or digit of the first two words that have one ("Ann (CEO)" → "AC"). */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .flatMap((w) => w.match(/[\p{L}\p{N}]/u) ?? [])
    .slice(0, 2)
    .map((c) => c.toLocaleUpperCase())
    .join('');
}

/** First letter or digit of a title, for a placeholder tile ('' if none). */
function monogram(title: string): string {
  return title.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() ?? '';
}

function renderAuthors(
  handles: string[],
  authors: Map<string, ResolvedAuthor>,
  /** Every name in a title attribute, for meta lines cut with an ellipsis. */
  withTitle = false,
): RootContent | null {
  if (handles.length === 0) return null;
  const resolved = handles.map(
    (h) => authors.get(h) ?? { key: h, name: h, url: null },
  );
  const avatars = resolved
    .filter((a) => a.avatar)
    .slice(0, 3)
    .map((a) =>
      image({ src: a.avatar!, alt: '', sizes: '20px', variant: 'avatar' }),
    );
  const names = resolved.slice(0, 2).map((a) =>
    a.url
      ? el('a', ['list-component-item-author'], [text(a.name)], {
          href: a.url,
        })
      : el('span', ['list-component-item-author'], [text(a.name)]),
  );
  const more =
    resolved.length > 2
      ? [
          el(
            'span',
            ['list-component-item-authors-more'],
            [
              text(
                `and ${resolved.length - 2} other${resolved.length === 3 ? '' : 's'}`,
              ),
            ],
          ),
        ]
      : [];
  return el(
    'span',
    ['list-component-item-authors'],
    [
      ...(avatars.length
        ? [el('span', ['list-component-item-avatars'], avatars)]
        : []),
      ...names,
      ...more,
    ],
    withTitle ? { title: resolved.map((a) => a.name).join(', ') } : {},
  );
}

type ItemCtx = {
  authors: Map<string, ResolvedAuthor>;
  featured: boolean;
  /** This hero is the page's first: fetch its image at high priority. */
  priority: boolean;
  showMedia: boolean;
  /** Some items have an image: the others get a placeholder tile (grid, list, magazine cards). */
  placeholder: boolean;
  locale: string;
  role: ItemRole;
};

function renderMedia(
  item: ListingItem,
  spec: ListingSpec,
  ctx: ItemCtx,
): RootContent | null {
  if (!ctx.showMedia) return null;
  if (item.image) {
    const eager = ctx.featured || ctx.role === 'hero';
    return el(
      'div',
      ['list-component-item-media'],
      [
        el(
          'a',
          ['list-component-item-media-link'],
          [
            image({
              src: item.image,
              alt: '',
              sizes: mediaSizes(spec, ctx.featured, ctx.role),
              variant: 'media',
              ...(eager
                ? {
                    loading: 'eager',
                    ...(ctx.priority ? { fetchPriority: 'high' } : {}),
                  }
                : {}),
            }),
          ],
          { href: item.url, tabIndex: '-1', ariaHidden: 'true' },
        ),
      ],
    );
  }
  if (spec.view === 'people')
    return el(
      'div',
      ['list-component-item-media', 'list-component-item-media--placeholder'],
      [
        el(
          'span',
          ['list-component-item-initials'],
          [text(initials(item.title))],
        ),
      ],
      { ariaHidden: 'true' },
    );
  // Heroes are text-only without an image; "More posts" briefs just lose their thumbnail
  if (ctx.placeholder && !ctx.featured && ctx.role !== 'brief') {
    // A tile with the title's first letter keeps rows and columns aligned
    // without looking like a broken image; decorative, so aria-hidden
    const letter = monogram(item.title);
    return el(
      'div',
      ['list-component-item-media', 'list-component-item-media--placeholder'],
      letter
        ? [el('span', ['list-component-item-monogram'], [text(letter)])]
        : [],
      { ariaHidden: 'true' },
    );
  }
  // defaultImage: none, or no item has an image: no media block
  return null;
}

function renderItem(
  item: ListingItem,
  spec: ListingSpec,
  ctx: ItemCtx,
): RootContent {
  const children: RootContent[] = [];
  const media = renderMedia(item, spec, ctx);
  if (media) children.push(media);
  const content: RootContent[] = [];
  if (item.eyebrow.length)
    content.push(
      el(
        'div',
        ['list-component-item-eyebrow'],
        item.eyebrow.map((p) => el('span', [], partsToNodes([p]))),
      ),
    );
  content.push(
    el(
      'h3',
      [LISTING_HEADLINE_CLASS],
      [
        el('a', ['list-component-item-headline-link'], [text(item.title)], {
          href: item.url,
        }),
      ],
      { id: LISTING_HEADING_PLACEHOLDER_ID, dataTocIgnore: '' },
    ),
  );
  if (item.summary)
    content.push(
      el('p', ['list-component-item-summary'], [text(item.summary)]),
    );
  const meta: RootContent[] = [];
  if (item.date && !item.dateInEyebrow)
    meta.push(
      el(
        'time',
        ['list-component-item-date'],
        [text(formatListingDate(item.date, ctx.locale))],
        { dateTime: item.date },
      ),
    );
  const by = renderAuthors(
    item.authorHandles,
    ctx.authors,
    ctx.role === 'brief',
  );
  if (by) meta.push(by);
  for (const f of item.meta)
    meta.push(
      el('span', ['list-component-item-meta-value'], partsToNodes(f.parts), {
        dataField: f.key,
      }),
    );
  if (meta.length) content.push(el('div', ['list-component-item-meta'], meta));
  children.push(el('div', ['list-component-item-content'], content));
  return el(
    'article',
    [
      'list-component-item',
      ...(ctx.featured ? ['list-component-item--featured'] : []),
      ...(ctx.role === 'card' || ctx.role === 'brief'
        ? [`list-component-item--${ctx.role}`]
        : []),
    ],
    children,
  );
}

function renderPagination(
  page: ListingPage<ListingItem>,
  spec: ListingSpec,
  publicUrl: string,
): RootContent {
  const dated = spec.sort.field === 'date' && spec.sort.direction === 'desc';
  const labels = dated
    ? { prev: 'Newer', next: 'Older' }
    : { prev: 'Previous', next: 'Next' };
  const end = (dir: 'prev' | 'next', target: number, enabled: boolean) => {
    const cls = [
      'list-component-pagination-button',
      `list-component-pagination-button--${dir}`,
    ];
    const kids =
      dir === 'prev'
        ? [icon('prev'), text(labels.prev)]
        : [text(labels.next), icon('next')];
    return enabled
      ? el('a', cls, kids, { href: pageHref(publicUrl, target), rel: dir })
      : el('span', [...cls, 'is-disabled'], kids, { ariaDisabled: 'true' });
  };
  const current = Math.min(page.page, page.pageCount);
  return el(
    'nav',
    ['list-component-pagination'],
    [
      el(
        'div',
        ['list-component-pagination-nav'],
        [end('prev', page.page - 1, page.page > 1)],
      ),
      el(
        'div',
        ['list-component-pagination-pages'],
        pageWindow(current, page.pageCount).map((entry) =>
          entry === 'ellipsis'
            ? el('span', ['list-component-pagination-ellipsis'], [text('…')])
            : el(
                'a',
                [
                  'list-component-pagination-page-button',
                  entry === page.page
                    ? 'list-component-pagination-page-button--current'
                    : 'list-component-pagination-page-button--other',
                ],
                [text(String(entry))],
                {
                  href: pageHref(publicUrl, entry),
                  ...(entry === page.page ? { ariaCurrent: 'page' } : {}),
                },
              ),
        ),
      ),
      el(
        'div',
        ['list-component-pagination-nav', 'list-component-pagination-nav--end'],
        [end('next', page.page + 1, page.page < page.pageCount)],
      ),
    ],
    { ariaLabel: 'Pages' },
  );
}

export type RenderListingInput = {
  spec: ListingSpec;
  page: ListingPage<ListingItem>;
  authors: Map<string, ResolvedAuthor>;
  publicUrl: string;
  locale: string;
  label?: string;
  notes?: string[];
  featuredFirst?: boolean;
  /** The featured hero is the page's first, so its image gets fetchPriority high. */
  featuredPriority?: boolean;
  /**
   * Share (0–1) of the whole listing's items that have an image, across all
   * pages; defaults to the share on this page.
   */
  imageShare?: number;
};

/** Placeholder tiles only where most items have a picture: at least this share. */
export const PLACEHOLDER_MIN_IMAGE_SHARE = 0.5;

export type MagazineLayout = 'solo' | 'pair' | 'trio' | 'lead-more' | 'full';
/** At most this many items in the magazine's "More posts" column. */
export const MAGAZINE_MORE_MAX = 5;

/**
 * How the magazine's top section uses the first `n` items of page 1: the hero,
 * then `side` cards (the left column), then `more` briefs (the right column).
 * Small sets get a layout of their own instead of half-empty columns.
 */
export function magazineSlots(n: number): {
  layout: MagazineLayout;
  side: number;
  more: number;
} | null {
  if (n <= 0) return null;
  if (n === 1) return { layout: 'solo', side: 0, more: 0 };
  if (n === 2) return { layout: 'pair', side: 1, more: 0 };
  if (n === 3) return { layout: 'trio', side: 2, more: 0 };
  // one card beside a hero and one brief would leave two thin columns
  if (n === 4) return { layout: 'lead-more', side: 0, more: 3 };
  return { layout: 'full', side: 2, more: Math.min(n - 3, MAGAZINE_MORE_MAX) };
}

export function renderListing({
  spec,
  page,
  authors,
  publicUrl,
  locale,
  label,
  notes = [],
  featuredFirst = false,
  featuredPriority = false,
  imageShare,
}: RenderListingInput): RootContent {
  const empty = el('p', ['list-component-empty'], [text('Nothing here yet.')]);
  if (page.total === 0 && notes.length === 0) return empty;
  const share =
    imageShare ??
    page.items.filter((i) => i.image).length / Math.max(1, page.items.length);
  const showMedia =
    spec.media !== 'none' && (share > 0 || spec.view === 'people');
  // Items without an image get a placeholder tile so rows and columns stay
  // aligned: in a grid whenever any card has one (monogram tiles), in lists and
  // the magazine only when most items do (a tile on most rows would be noise)
  const placeholder =
    showMedia &&
    spec.defaultImage !== false &&
    (spec.view === 'grid' ||
      ((spec.view === 'magazine' ||
        (spec.view === 'list' && spec.media === 'thumb')) &&
        share >= PLACEHOLDER_MIN_IMAGE_SHARE));
  const base = { authors, showMedia, placeholder, locale };
  const children: RootContent[] = [];
  if (page.items.length === 0) children.push(empty);

  // magazine: page 1 opens with the hero, side cards and "More posts"
  const slots =
    spec.view === 'magazine' && page.page === 1
      ? magazineSlots(page.items.length)
      : null;
  let rest = page.items;
  if (slots) {
    const [hero, ...others] = page.items;
    const side = others.slice(0, slots.side);
    const more = others.slice(slots.side, slots.side + slots.more);
    rest = others.slice(slots.side + slots.more);
    const top: RootContent[] = [
      renderItem(hero!, spec, {
        ...base,
        featured: true,
        priority: featuredPriority,
        role: 'hero',
      }),
    ];
    if (side.length)
      top.push(
        el(
          'div',
          ['list-component-magazine-side'],
          side.map((it) =>
            renderItem(it, spec, {
              ...base,
              featured: false,
              priority: false,
              role: 'card',
            }),
          ),
        ),
      );
    if (more.length)
      top.push(
        el(
          'div',
          ['list-component-magazine-more'],
          [
            ...(spec.headings.more ? [sectionHeading(spec.headings.more)] : []),
            ...more.map((it) =>
              renderItem(it, spec, {
                ...base,
                featured: false,
                priority: false,
                role: 'brief',
              }),
            ),
          ],
        ),
      );
    children.push(
      el('div', ['list-component-magazine-top'], top, {
        dataLayout: slots.layout,
      }),
    );
  }

  const rows: RootContent[] =
    slots && rest.length && spec.headings.recent
      ? [sectionHeading(spec.headings.recent)]
      : [];
  let lastGroup: string | null = null;
  rest.forEach((it, i) => {
    // the magazine's hero is in the top section; its rows are never heroes
    const featured = featuredFirst && i === 0 && spec.view !== 'magazine';
    if (!featured && it.group !== null && it.group !== lastGroup) {
      rows.push(
        el('h2', [LISTING_GROUP_HEADING_CLASS], [text(it.group)], {
          id: LISTING_HEADING_PLACEHOLDER_ID,
          dataTocIgnore: '',
        }),
      );
      lastGroup = it.group;
    }
    rows.push(
      renderItem(it, spec, {
        ...base,
        featured,
        priority: featured && featuredPriority,
        role: 'row',
      }),
    );
  });
  if (spec.view === 'magazine') {
    if (rows.length)
      children.push(el('div', ['list-component-magazine-rest'], rows));
  } else children.push(...rows);
  if (page.paginated && page.pageCount > 1)
    children.push(renderPagination(page, spec, publicUrl));
  // Root classes, spelled out so Tailwind's content scan keeps their rules:
  // list-component--list list-component--grid list-component--compact
  // list-component--people list-component--magazine
  return el(
    'section',
    ['list-component', `list-component--${spec.view}`, 'not-prose'],
    children,
    {
      dataView: spec.view,
      dataMedia: showMedia ? spec.media : 'none',
      ...(showMedia && spec.media === 'thumb'
        ? { dataMediaSide: spec.mediaSide }
        : {}),
      dataRatio: spec.ratio.replace('/', '-'),
      ...(label ? { ariaLabel: label } : {}),
      ...(notes.length ? { dataListingNotes: notes.join(' | ') } : {}),
    },
  );
}

const sectionHeading = (title: string) =>
  el('h2', [LISTING_SECTION_HEADING_CLASS], [text(title)], {
    id: LISTING_HEADING_PLACEHOLDER_ID,
    dataTocIgnore: '',
  });

export function renderListingError(
  errors: string[],
  heading: string,
): RootContent {
  return el(
    'div',
    ['list-component-error', 'list-component-error--block'],
    [
      el('p', ['list-component-error-title'], [text(heading)]),
      el(
        'ul',
        ['list-component-error-list'],
        errors.map((e) => el('li', [], [text(e)])),
      ),
      el(
        'p',
        ['list-component-error-keys'],
        [text(`Keys: ${LISTING_KEYS.join(', ')}.`)],
      ),
    ],
  );
}
