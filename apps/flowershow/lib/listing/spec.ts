import * as yaml from 'yaml';
import { dirOf, isFolderIndexPath } from '@/lib/changelog';

export const ALL_LISTING_KEYS = [
  'from',
  'view',
  'sort',
  'limit',
  'pageSize',
  'where',
  'fields',
  'media',
  'ratio',
  'defaultImage',
  'featured',
  'group',
] as const;
export type ListingKey = (typeof ALL_LISTING_KEYS)[number];
export const LISTING_KEYS: readonly ListingKey[] = ALL_LISTING_KEYS;
export type ListingView = 'list' | 'grid' | 'compact' | 'people';
export const LISTING_VIEWS: readonly ListingView[] = [
  'list',
  'grid',
  'compact',
  'people',
];
export type ListingSort = { field: string; direction: 'asc' | 'desc' };
export type ListingFields = {
  eyebrow: string[];
  title: string;
  summary: string | null;
  date: string | null;
  image: string | null;
  authors: string | null;
  meta: string[];
};
export type ListingGroup =
  | { by: 'none' | 'year' | 'month' | 'day' | 'folder' }
  | { by: 'field'; field: string };
export type MediaShape = 'none' | 'thumb' | 'cover';
export type MediaSide = 'left' | 'right';
export const RATIOS = ['16/9', '3/2', '4/3', '1/1', '3/4'] as const;
export type Ratio = (typeof RATIOS)[number];
export type ListingSpec = {
  from: string;
  fromRelative: boolean;
  view: ListingView;
  sort: ListingSort;
  limit: number | null;
  pageSize: number | null;
  where: Record<string, string[]>;
  fields: ListingFields;
  media: MediaShape;
  /** Where a list thumbnail sits (media: thumb left|right); left by default. */
  mediaSide: MediaSide;
  ratio: Ratio;
  /**
   * Image (path or [[wikilink]]) for items without one, resolved against the
   * listing page; `false` (`defaultImage: none`) turns grid monogram tiles off;
   * null (unset) keeps them.
   */
  defaultImage: string | false | null;
  featured: 0 | 1;
  group: ListingGroup;
};
export type ListingSource = 'list' | 'blog' | 'layout';
export type SpecResult =
  | { ok: true; spec: ListingSpec; notes: string[] }
  | {
      ok: false;
      errors: string[];
      /** The folder the block names, when that part parsed: the plugin reports a missing folder alongside the key errors (design 3.8). */
      from?: { from: string; relative: boolean };
    };

export const INDEX_PAGE_SIZE = 20;
const SLOTS = [
  'eyebrow',
  'title',
  'summary',
  'date',
  'image',
  'authors',
  'meta',
] as const;
type Slot = (typeof SLOTS)[number];
const BASE_FIELDS: ListingFields = {
  eyebrow: [],
  title: 'title',
  summary: 'description',
  date: 'date',
  image: 'image',
  authors: 'authors',
  meta: [],
};
export const DEFAULT_FIELDS: Record<ListingView, ListingFields> = {
  list: BASE_FIELDS,
  grid: BASE_FIELDS,
  people: {
    eyebrow: [],
    title: 'title',
    summary: 'bio',
    date: null,
    image: 'avatar',
    authors: null,
    meta: ['role'],
  },
  compact: {
    eyebrow: [],
    title: 'title',
    summary: null,
    date: 'date',
    image: null,
    authors: null,
    meta: [],
  },
};
const DEFAULT_MEDIA: Record<ListingView, MediaShape> = {
  list: 'thumb',
  grid: 'cover',
  people: 'cover',
  compact: 'none',
};
const SLOT_ALIASES: Record<string, Slot> = {
  headline: 'title',
  media: 'image',
  footnote: 'meta',
};
/** List-form names → slot. Anything else in the list goes to meta. */
const LIST_FORM: Record<string, Slot> = {
  title: 'title',
  headline: 'title',
  summary: 'summary',
  description: 'summary',
  date: 'date',
  image: 'image',
  media: 'image',
  authors: 'authors',
  author: 'authors',
  eyebrow: 'eyebrow',
};
const VIEW_ALIASES: Record<string, ListingView> = {
  cards: 'grid',
  card: 'grid',
  table: 'compact',
  archive: 'compact',
  team: 'people',
};

const canon = (k: string) => k.toLowerCase().replace(/[-_\s]/g, '');
/** Canonical key for each spelling (case-insensitive); aliases included. */
const KEY_INDEX: Record<string, ListingKey | 'sortDirection'> = {
  ...Object.fromEntries(ALL_LISTING_KEYS.map((k) => [canon(k), k])),
  dir: 'from',
  folder: 'from',
  layout: 'view',
  sortby: 'sort',
  sortdirection: 'sortDirection',
};
const FROM_ALIASES = new Set(['dir', 'folder']);
const KEY_HINTS: Record<string, string> = {
  perpage: 'Use "pageSize".',
  paginate: 'Use "pageSize".',
  pagination: 'Use "pageSize".',
  filter: 'Use "where".',
  filters: 'Use "where".',
  show: 'Use "fields", e.g. "fields: [title, date, description]".',
  slots: 'Use "fields", e.g. "fields: [title, date, description]".',
  max: 'Use "limit".',
  count: 'Use "limit".',
  order: 'Use "sort".',
  orderby: 'Use "sort".',
  type: 'Use "view".',
  hero: 'Use "featured: 1".',
  groupby: 'Use "group".',
  thumbnail: 'Use "media: thumb".',
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const kindOf = (v: unknown) =>
  Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v;
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(
        dp[j]! + 1,
        dp[j - 1]! + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[b.length]!;
}
function unknownKeyMessage(key: string, value: unknown): string {
  const c = canon(key);
  if (c === 'image')
    return `Unknown key "${key}". Use "media: ${typeof value === 'string' && ['none', 'thumb', 'cover'].includes(value) ? value : 'cover'}" (to choose which field holds the image, use "fields: { image: <key> }").`;
  if (KEY_HINTS[c]) return `Unknown key "${key}". ${KEY_HINTS[c]}`;
  const close = LISTING_KEYS.find((k) => editDistance(canon(k), c) <= 2);
  return close
    ? `Unknown key "${key}". Did you mean "${close}"?`
    : `Unknown key "${key}".`;
}
const isNone = (v: unknown) =>
  v === false ||
  v === null ||
  (typeof v === 'string' && v.trim().toLowerCase() === 'none');
const dotted = (k: string, errors: string[]) => {
  if (!k.includes('.')) return false;
  errors.push(`Nested keys like "${k}" are not supported yet.`);
  return true;
};
function positiveInt(v: unknown): number | null {
  const n =
    typeof v === 'number'
      ? v
      : typeof v === 'string' && /^\s*\d+\s*$/.test(v)
        ? Number(v)
        : Number.NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}
function normalizeFrom(
  raw: string,
  rootDir: string | undefined,
  errors: string[],
): { from: string; relative: boolean } | null {
  let from = raw.trim().replace(/\\/g, '/');
  const relative = from.startsWith('./');
  from = from.replace(/^(\.\/)+/, '').replace(/^\/+|\/+$/g, '');
  if (from.split('/').includes('..')) {
    errors.push('"from" cannot contain "..".');
    return null;
  }
  if (/\.mdx?$/i.test(from)) {
    errors.push(
      `"from" must be a folder; "${from}" is a page. Listings show one page per item, e.g. one page per person in "people/".`,
    );
    return null;
  }
  const root = (rootDir ?? '').replace(/^\/+|\/+$/g, '');
  if (!relative && root && (from === root || from.startsWith(`${root}/`)))
    from = from.slice(root.length).replace(/^\/+/, '');
  return { from, relative };
}
const keyList = (v: unknown) =>
  (Array.isArray(v) ? v : String(v).split(','))
    .map((x) => String(x).trim())
    .filter(Boolean);
function checkFieldKey(k: string, errors: string[]): boolean {
  if (dotted(k, errors)) return false;
  if (canon(k) === 'readingtime') {
    errors.push(
      '"readingTime" is computed on the page and is not available in listings yet.',
    );
    return false;
  }
  return true;
}

function parseFields(
  raw: unknown,
  view: ListingView,
  errors: string[],
): ListingFields {
  const d = DEFAULT_FIELDS[view];
  const fields: ListingFields = {
    ...d,
    eyebrow: [...d.eyebrow],
    meta: [...d.meta],
  };
  if (raw == null) return fields;
  if (Array.isArray(raw)) {
    const on: ListingFields = {
      eyebrow: [],
      title: d.title,
      summary: null,
      date: null,
      image: null,
      authors: null,
      meta: [],
    };
    for (const name of keyList(raw)) {
      if (!checkFieldKey(name, errors)) continue;
      const slot = LIST_FORM[name.toLowerCase()];
      if (slot === 'title') continue;
      if (slot === 'eyebrow') continue;
      if (slot && slot !== 'meta')
        on[slot] =
          (d[slot] as string | null) ??
          (slot === 'summary'
            ? 'description'
            : slot === 'image'
              ? 'image'
              : slot === 'authors'
                ? 'authors'
                : 'date');
      else on.meta.push(name);
    }
    if (on.meta.length > 2)
      errors.push(
        `"fields.meta" takes at most 2 fields (got ${on.meta.length}).`,
      );
    return on;
  }
  if (!isPlainObject(raw)) {
    errors.push(
      '"fields" must be "slot: key" lines or a list of field names, e.g. "fields: [title, date, description]".',
    );
    return fields;
  }
  for (const [rawSlot, value] of Object.entries(raw)) {
    const lower = rawSlot.toLowerCase();
    let slot = (SLOTS as readonly string[]).includes(lower)
      ? (lower as Slot)
      : SLOT_ALIASES[lower];
    if (!slot) {
      errors.push(
        `Unknown field slot "${rawSlot}". Slots: ${SLOTS.join(', ')}.`,
      );
      continue;
    }
    if (lower === 'footnote' && value === 'authors') slot = 'authors';
    if (slot === 'meta' || slot === 'eyebrow') {
      const list = isNone(value)
        ? []
        : keyList(value).filter((k) => checkFieldKey(k, errors));
      if (list.length > 2)
        errors.push(
          `"fields.${slot}" takes at most 2 fields (got ${list.length}).`,
        );
      else fields[slot] = list;
    } else if (isNone(value)) {
      if (slot === 'title') errors.push('"fields.title" cannot be none.');
      else fields[slot] = null;
    } else if (checkFieldKey(String(value).trim(), errors))
      fields[slot] = String(value).trim();
  }
  // a key shown in the eyebrow is not repeated in the meta line (design 4.4)
  fields.meta = fields.meta.filter((k) => !fields.eyebrow.includes(k));
  return fields;
}

function parseGroup(
  raw: unknown,
  view: ListingView,
  source: ListingSource,
  errors: string[],
): ListingGroup {
  if (raw == null)
    return view === 'compact' && source === 'layout'
      ? { by: 'year' }
      : { by: 'none' };
  if (isNone(raw)) return { by: 'none' };
  const v = String(raw).trim();
  const lower = v.toLowerCase();
  if (
    lower === 'year' ||
    lower === 'month' ||
    lower === 'day' ||
    lower === 'folder'
  )
    return { by: lower };
  if (dotted(v, errors)) return { by: 'none' };
  return { by: 'field', field: v };
}

export function parseListingSpec(
  input: unknown,
  opts: {
    source: ListingSource;
    defaultFrom?: string | null;
    rootDir?: string;
  },
): SpecResult {
  const errors: string[] = [];
  const notes: string[] = [];
  const raw = input == null ? {} : input;
  if (!isPlainObject(raw))
    return {
      ok: false,
      errors: [
        `List options must be "key: value" lines (got a ${kindOf(raw)}).`,
      ],
    };

  const values: Partial<Record<ListingKey | 'sortDirection', unknown>> = {};
  let fromKey: string | null = null;
  for (const [key, value] of Object.entries(raw)) {
    const k = KEY_INDEX[canon(key)];
    if (!k) {
      errors.push(unknownKeyMessage(key, value));
      continue;
    }
    if (k === 'from') {
      if (fromKey !== null) {
        const alias = FROM_ALIASES.has(canon(key)) ? key : fromKey;
        errors.push(`Use either "from" or "${alias}", not both.`);
        continue;
      }
      fromKey = key;
    }
    values[k] = value;
  }

  let from: string | null = null;
  let fromRelative = false;
  if (values.from != null && values.from !== '') {
    const f = normalizeFrom(String(values.from), opts.rootDir, errors);
    if (f) ({ from, relative: fromRelative } = f);
  } else if (opts.source === 'blog') from = 'blog';
  else if (opts.source === 'layout') {
    if (opts.defaultFrom == null)
      errors.push(
        'Add "list: { from: <folder> }" to the frontmatter: this page is not a folder index and has no folder with the same name.',
      );
    else from = opts.defaultFrom;
  } else
    errors.push('"from" is required: the folder to list, e.g. "from: blog".');

  let view: ListingView = 'list';
  if (values.view != null) {
    const v = String(values.view).trim().toLowerCase();
    const resolved = VIEW_ALIASES[v] ?? v;
    if ((LISTING_VIEWS as readonly string[]).includes(resolved))
      view = resolved as ListingView;
    else if (v === 'magazine')
      errors.push(
        `Unknown view "${String(values.view)}". Use "view: grid" with "featured: 1".`,
      );
    else
      errors.push(
        `Unknown view "${String(values.view)}". Use ${LISTING_VIEWS.join(', ').replace(/, ([^,]*)$/, ' or $1')}.`,
      );
  }

  let sort: ListingSort =
    view === 'people'
      ? { field: 'title', direction: 'asc' }
      : { field: 'date', direction: 'desc' };
  if (values.sort != null) {
    const str = String(values.sort).trim();
    const [first = '', dir, ...rest] = str.split(/\s+/);
    const field = first.replace(/^-/, '');
    const direction = (
      dir ??
      (typeof values.sortDirection === 'string'
        ? values.sortDirection
        : undefined)
    )?.toLowerCase();
    if (!field || rest.length)
      errors.push(`"sort" must look like "date desc" (got "${str}").`);
    else if (!dotted(field, errors)) {
      if (direction && direction !== 'asc' && direction !== 'desc')
        errors.push(
          `Sort direction must be "asc" or "desc" (got "${dir ?? values.sortDirection}").`,
        );
      else
        sort = {
          field,
          direction: first.startsWith('-')
            ? 'desc'
            : ((direction as 'asc' | 'desc') ??
              (field === 'date' ? 'desc' : 'asc')),
        };
    }
  }

  let limit: number | null = null;
  if (values.limit != null) {
    limit = positiveInt(values.limit);
    if (limit === null)
      errors.push(
        `"limit" must be a whole number above 0 (got "${String(values.limit)}").`,
      );
    else if (opts.source === 'layout')
      errors.push(
        `"limit" shows only the first ${limit} items and hides the rest; for ${limit} per page use "pageSize: ${limit}".`,
      );
  }
  let pageSize: number | null =
    opts.source === 'layout' ? INDEX_PAGE_SIZE : null;
  const explicitNone =
    values.pageSize === false ||
    (typeof values.pageSize === 'string' &&
      values.pageSize.trim().toLowerCase() === 'none');
  if (values.pageSize != null && !explicitNone) {
    pageSize = positiveInt(values.pageSize);
    if (pageSize === null)
      errors.push(
        `"pageSize" must be a whole number above 0 or "none" (got "${String(values.pageSize)}").`,
      );
    else if (limit !== null)
      notes.push('"pageSize" is ignored because "limit" is set.');
  }
  if (explicitNone || limit !== null) pageSize = null;

  const where: Record<string, string[]> = {};
  if (values.where != null) {
    if (!isPlainObject(values.where))
      errors.push(
        '"where" must be "field: value" lines, e.g. "where: { tags: featured }".',
      );
    else
      for (const [field, value] of Object.entries(values.where)) {
        if (dotted(field, errors)) continue;
        const list = Array.isArray(value) ? value : [value];
        if (
          list.length &&
          list.every((x) => ['string', 'number', 'boolean'].includes(typeof x))
        )
          where[field] = list.map(String);
        else
          errors.push(
            `"where.${field}" must be a value or a list of values, e.g. "${field}: featured".`,
          );
      }
  }

  const fields = parseFields(values.fields, view, errors);

  let media = DEFAULT_MEDIA[view];
  let mediaSide: MediaSide = 'left';
  if (values.media != null) {
    const [m = '', side, ...rest] = isNone(values.media)
      ? ['none']
      : String(values.media).trim().toLowerCase().split(/\s+/);
    if (m !== 'none' && m !== 'thumb' && m !== 'cover')
      errors.push(
        `"media" must be none, thumb or cover (got "${String(values.media)}").`,
      );
    else if (side != null && m !== 'thumb')
      errors.push(
        `"left" and "right" apply only to "media: thumb" (got "${String(values.media).trim()}").`,
      );
    else if (
      side != null &&
      ((side !== 'left' && side !== 'right') || rest.length)
    )
      errors.push(
        `"media: thumb" takes "left" or "right" (got "${[side, ...rest].join(' ')}").`,
      );
    else {
      media = m;
      if (side === 'left' || side === 'right') mediaSide = side;
    }
  }
  let defaultImage: string | false | null = null;
  if (values.defaultImage != null && isNone(values.defaultImage))
    defaultImage = false;
  else if (values.defaultImage != null) {
    // unquoted [[cover.png]] parses as a nested list
    const v = values.defaultImage;
    const nested =
      Array.isArray(v) &&
      v.length === 1 &&
      Array.isArray(v[0]) &&
      v[0].length === 1 &&
      typeof v[0][0] === 'string'
        ? `[[${v[0][0]}]]`
        : null;
    const str = nested ?? (typeof v === 'string' ? v.trim() : '');
    if (str) defaultImage = str;
    else
      errors.push(
        '"defaultImage" must be an image path or [[wikilink]], e.g. "defaultImage: [[cover.png]]".',
      );
  }
  if (view === 'compact' && (fields.summary || fields.authors)) {
    // One line per item: no summary or author column, even when asked for
    notes.push(
      `"fields.${fields.summary ? 'summary' : 'authors'}"${fields.summary && fields.authors ? ' and "fields.authors"' : ''} ${fields.summary && fields.authors ? 'are' : 'is'} ignored in the compact view.`,
    );
    fields.summary = null;
    fields.authors = null;
  }
  if (view === 'compact' && media !== 'none') {
    if (values.media != null)
      notes.push('"media" is ignored in the compact view.');
    media = 'none';
  }
  if (view === 'grid' && media === 'thumb') {
    notes.push('"media: thumb" is shown as "cover" in the grid view.');
    media = 'cover';
  }
  if (defaultImage && media === 'none')
    notes.push('"defaultImage" is ignored because "media" is none.');
  let ratio: Ratio =
    view === 'people' ? '1/1' : media === 'cover' ? '16/9' : '3/2';
  if (values.ratio != null) {
    const r = String(values.ratio).replace(/\s+/g, '').replace(':', '/');
    if ((RATIOS as readonly string[]).includes(r)) ratio = r as Ratio;
    else
      errors.push(
        `"ratio" must be one of ${RATIOS.join(', ')} (got "${String(values.ratio)}").`,
      );
  }

  const group = parseGroup(values.group, view, opts.source, errors);

  let featured: 0 | 1 = 0;
  if (
    values.featured != null &&
    !isNone(values.featured) &&
    values.featured !== 0 &&
    values.featured !== '0'
  ) {
    if (
      values.featured === true ||
      values.featured === 1 ||
      values.featured === '1'
    ) {
      if (view === 'list' || view === 'grid') featured = 1;
      else notes.push(`"featured" is ignored in the ${view} view.`);
    } else
      errors.push(
        `"featured" must be 0 or 1 (got "${String(values.featured)}").`,
      );
  }

  if (errors.length || from === null)
    return from === null
      ? { ok: false, errors }
      : { ok: false, errors, from: { from, relative: fromRelative } };
  return {
    ok: true,
    spec: {
      from,
      fromRelative,
      view,
      sort,
      limit,
      pageSize,
      where,
      fields,
      media,
      mediaSide,
      ratio,
      defaultImage,
      featured,
      group,
    },
    notes,
  };
}

export function parseListingBlock(
  lang: 'list' | 'blog',
  code: string,
  opts: { rootDir?: string } = {},
): SpecResult {
  // processMarkdown's protectWikiLinkAliases runs over the whole document, fences included,
  // replacing `|` in [[a|b]] with U+E000 (lib/markdown.ts WIKI_ALIAS_DIVIDER).
  const source = code.replace(//g, '|');
  let parsed: unknown;
  try {
    parsed = source.trim() ? yaml.parse(source) : {};
  } catch (error) {
    const message =
      error instanceof Error ? error.message.split('\n')[0] : 'invalid YAML';
    return {
      ok: false,
      errors: [`Could not read the block as YAML: ${message}`],
    };
  }
  return parseListingSpec(parsed, { source: lang, rootDir: opts.rootDir });
}

/** `from` for page-level listings: the index's own folder, or the folder note's sibling folder. */
export function implicitListingFrom(
  blobPath: string,
  files: string[],
): string | null {
  const p = blobPath.replace(/^\/+/, '');
  if (isFolderIndexPath(p)) return dirOf(p);
  const sibling = p.replace(/\.mdx?$/i, '');
  const plain = files.map((f) => f.replace(/^\/+/, ''));
  if (plain.some((f) => f.startsWith(`${sibling}/`))) return sibling;
  // Obsidian folder notes keep their own case: blog.md beside Blog/ (Review Focus 1)
  const lower = `${sibling.toLowerCase()}/`;
  const hit = plain.find((f) => f.toLowerCase().startsWith(lower));
  return hit ? hit.slice(0, sibling.length) : null;
}
