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

/** next/image `sizes` per view and media shape (design section 6). */
function mediaSizes(spec: ListingSpec, featured: boolean): string {
  if (featured) return '(min-width: 768px) 58vw, 100vw';
  if (spec.view === 'grid')
    return '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';
  if (spec.view === 'people')
    return spec.media === 'thumb' ? '96px' : '(min-width: 1024px) 25vw, 50vw';
  return spec.media === 'thumb'
    ? '(min-width: 640px) 160px, 88px'
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

function renderAuthors(
  handles: string[],
  authors: Map<string, ResolvedAuthor>,
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
  );
}

type ItemCtx = {
  authors: Map<string, ResolvedAuthor>;
  featured: boolean;
  showMedia: boolean;
  locale: string;
};

function renderMedia(
  item: ListingItem,
  spec: ListingSpec,
  ctx: ItemCtx,
): RootContent | null {
  if (!ctx.showMedia) return null;
  if (item.image) {
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
              sizes: mediaSizes(spec, ctx.featured),
              variant: 'media',
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
  // No image and no defaultImage: no media block (no placeholder box)
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
  const by = renderAuthors(item.authorHandles, ctx.authors);
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
};

export function renderListing({
  spec,
  page,
  authors,
  publicUrl,
  locale,
  label,
  notes = [],
  featuredFirst = false,
}: RenderListingInput): RootContent {
  const empty = el('p', ['list-component-empty'], [text('Nothing here yet.')]);
  if (page.total === 0 && notes.length === 0) return empty;
  const anyImage = page.items.some((i) => i.image);
  const showMedia =
    spec.media !== 'none' && (anyImage || spec.view === 'people');
  const children: RootContent[] = [];
  if (page.items.length === 0) children.push(empty);
  let lastGroup: string | null = null;
  page.items.forEach((it, i) => {
    const featured = featuredFirst && i === 0;
    if (!featured && it.group !== null && it.group !== lastGroup) {
      children.push(
        el('h2', [LISTING_GROUP_HEADING_CLASS], [text(it.group)], {
          id: LISTING_HEADING_PLACEHOLDER_ID,
          dataTocIgnore: '',
        }),
      );
      lastGroup = it.group;
    }
    children.push(
      renderItem(it, spec, {
        authors,
        featured,
        showMedia,
        locale,
      }),
    );
  });
  if (page.paginated && page.pageCount > 1)
    children.push(renderPagination(page, spec, publicUrl));
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
