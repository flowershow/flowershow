import {
  matchLinkTarget,
  normalizeFrontmatterTags,
  tagMatches,
} from '@flowershow/core';
import {
  dirOf,
  entryTitleFromPath,
  isFolderIndexPath,
  resolveEntryDate,
  resolveEntryTitle,
} from '@/lib/changelog';
import { resolveContentLink } from '@/lib/resolve-link';
import {
  ensureLeadingSlash,
  extractWikiLinkTarget,
  normalizeAuthors,
  safeDate,
} from '@/lib/utils';
import { formatListingDate } from './dates';
import { isDraft, isUnpublished } from './rules';
import type { ListingFields, ListingSpec } from './spec';

export type ListingRow = {
  id: string;
  path: string;
  appPath: string | null;
  permalink: string | null;
  metadata: Record<string, unknown> | null;
  tags?: { tag: string }[];
};
export type ListingFieldPart = { text: string; href?: string };
export type ListingField = {
  key: string;
  label: string;
  parts: ListingFieldPart[];
};
export type ListingItem = {
  path: string;
  url: string;
  title: string;
  date: string | null;
  dateInEyebrow: boolean;
  summary: string | null;
  image: string | null;
  authorHandles: string[];
  eyebrow: ListingFieldPart[];
  meta: ListingField[];
  group: string | null;
};
export type ItemContext = {
  siteHostname: string;
  files: string[];
  permalinks?: Record<string, string>;
  fields: ListingFields;
  locale: string;
};

export const DATE_FALLBACKS = [
  'date',
  'pubDate',
  'published',
  'publishDate',
  'created',
] as const;
const IMAGE_FALLBACKS: Record<string, string[]> = {
  image: ['image', 'cover', 'heroImage', 'thumbnail', 'avatar'],
  avatar: ['avatar', 'image', 'photo'],
};
const SUMMARY_FALLBACKS: Record<string, string[]> = {
  bio: ['bio', 'description'],
};
const AUTHOR_FALLBACKS: Record<string, string[]> = {
  authors: ['authors', 'author'],
};
const MARKDOWN_RE = /\.mdx?$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const collator = new Intl.Collator('en', {
  sensitivity: 'base',
  numeric: true,
});

/** YAML reads an unquoted Obsidian `[[x]]` as [["x"]]; turn it back into the wiki link. */
function unwrapNested(v: unknown): unknown {
  if (
    Array.isArray(v) &&
    v.length === 1 &&
    Array.isArray(v[0]) &&
    v[0].length === 1 &&
    typeof v[0][0] === 'string'
  )
    return `[[${v[0][0]}]]`;
  if (Array.isArray(v))
    return v.map((x) =>
      Array.isArray(x) && x.length === 1 && typeof x[0] === 'string'
        ? `[[${x[0]}]]`
        : x,
    );
  return v;
}
const stripWiki = (s: string) => extractWikiLinkTarget(s.trim()) ?? s.trim();
const basename = (p: string) =>
  p.slice(p.lastIndexOf('/') + 1).replace(MARKDOWN_RE, '');

export function isListedRow(row: ListingRow, folder: string): boolean {
  if (!row.appPath || !MARKDOWN_RE.test(row.path)) return false;
  if (folder && !row.path.startsWith(`${folder}/`)) return false;
  if (dirOf(row.path) === folder && isFolderIndexPath(row.path)) return false;
  return !isUnpublished(row.metadata) && !isDraft(row.metadata);
}

export function slotDate(
  row: ListingRow,
  dateKey: string | null,
): string | null {
  const m = row.metadata ?? {};
  const toIso = (v: unknown) => {
    const d = safeDate(v);
    return d ? d.toISOString().slice(0, 10) : null;
  };
  if (dateKey && dateKey !== 'date') return toIso(m[dateKey]);
  for (const k of DATE_FALLBACKS) {
    const d = toIso(m[k]);
    if (d) return d;
  }
  try {
    return resolveEntryDate(undefined, row.path);
  } catch {
    return null;
  }
}

function fieldMatches(value: unknown, expected: string[]): boolean {
  if (Array.isArray(value)) return value.some((v) => fieldMatches(v, expected));
  if (value == null || typeof value === 'object') return false;
  return expected.includes(stripWiki(String(value)));
}

export function matchesWhere(
  row: ListingRow,
  where: Record<string, string[]>,
  dateKey: string | null,
  today: string,
): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === 'tags') {
      const tags = row.tags
        ? row.tags.map((t) => t.tag)
        : normalizeFrontmatterTags(row.metadata?.tags);
      return expected.some((e) => tagMatches(tags, e));
    }
    if (
      field === 'date' &&
      expected.length === 1 &&
      (expected[0] === 'upcoming' || expected[0] === 'past')
    ) {
      const d = slotDate(row, dateKey);
      return (
        d !== null && (expected[0] === 'upcoming' ? d >= today : d < today)
      );
    }
    return fieldMatches(row.metadata?.[field], expected);
  });
}

export function itemTitle(row: ListingRow): string {
  const raw = row.metadata?.title;
  const title =
    raw == null || typeof raw === 'object' ? '' : String(raw).trim();
  if (isFolderIndexPath(row.path)) {
    if (!title || title.toLowerCase() === basename(row.path).toLowerCase())
      return entryTitleFromPath(dirOf(row.path) || row.path);
    return title;
  }
  return resolveEntryTitle(title, row.path);
}

export function groupKey(
  row: ListingRow,
  spec: Pick<ListingSpec, 'from' | 'group' | 'fields'>,
): string | null {
  const g = spec.group;
  if (g.by === 'none') return null;
  if (g.by === 'folder') {
    const rel = spec.from ? row.path.slice(spec.from.length + 1) : row.path;
    return rel.includes('/') ? rel.slice(0, rel.indexOf('/')) : '';
  }
  if (g.by === 'field') {
    const v = unwrapNested(row.metadata?.[g.field]);
    const first = Array.isArray(v) ? v[0] : v;
    if (first == null || first === '' || typeof first === 'object') return '';
    return typeof first === 'boolean'
      ? first
        ? 'Yes'
        : 'No'
      : stripWiki(String(first));
  }
  const d = slotDate(row, spec.fields.date);
  if (!d) return '';
  return g.by === 'year' ? d.slice(0, 4) : g.by === 'month' ? d.slice(0, 7) : d;
}

type SortValue =
  | { kind: 0; n: number }
  | { kind: 1; t: number }
  | { kind: 2; s: string }
  | null;
function scalarSortValue(v: unknown): SortValue {
  if (v == null || v === '') return null;
  if (typeof v === 'number')
    return Number.isFinite(v) ? { kind: 0, n: v } : null;
  if (typeof v === 'boolean') return { kind: 0, n: v ? 1 : 0 };
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { kind: 0, n: Number(s) };
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? safeDate(s) : null;
  return d ? { kind: 1, t: d.getTime() } : { kind: 2, s };
}
function sortValue(
  row: ListingRow,
  field: string,
  fields: ListingFields,
): SortValue {
  if (field === 'title') return { kind: 2, s: itemTitle(row) };
  if (field === 'path') return { kind: 2, s: row.path };
  if (field === 'date') {
    const d = slotDate(row, fields.date);
    return d ? { kind: 1, t: Date.parse(`${d}T00:00:00Z`) } : null;
  }
  const v = row.metadata?.[field];
  return scalarSortValue(Array.isArray(v) ? v[0] : v);
}
function compareValues(
  a: Exclude<SortValue, null>,
  b: Exclude<SortValue, null>,
): number {
  if (a.kind !== b.kind) return a.kind - b.kind;
  if (a.kind === 0) return a.n - (b as { n: number }).n;
  if (a.kind === 1) return a.t - (b as { t: number }).t;
  return collator.compare(a.s, (b as { s: string }).s);
}
const byPath = (a: ListingRow, b: ListingRow) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

function compareGroupKeys(
  a: string,
  b: string,
  spec: Pick<ListingSpec, 'group' | 'sort'>,
): number {
  if (a === b) return 0;
  if (a === '') return 1; // Undated / Other last
  if (b === '') return -1;
  const timeGroup =
    spec.group.by === 'year' ||
    spec.group.by === 'month' ||
    spec.group.by === 'day';
  if (timeGroup) {
    const dir = spec.sort.field === 'date' ? spec.sort.direction : 'desc';
    return (a < b ? -1 : 1) * (dir === 'desc' ? -1 : 1);
  }
  return collator.compare(a, b);
}

export function selectListingRows(
  rows: ListingRow[],
  spec: Pick<ListingSpec, 'from' | 'where' | 'sort' | 'fields' | 'group'>,
  today: string,
): ListingRow[] {
  const { field, direction } = spec.sort;
  const sign = direction === 'desc' ? -1 : 1;
  return rows
    .filter(
      (r) =>
        isListedRow(r, spec.from) &&
        matchesWhere(r, spec.where, spec.fields.date, today),
    )
    .map((r) => ({
      r,
      v: sortValue(r, field, spec.fields),
      g: groupKey(r, spec),
    }))
    .sort((a, b) => {
      if (a.g !== null && b.g !== null) {
        const gc = compareGroupKeys(a.g, b.g, spec);
        if (gc) return gc;
      }
      if (a.v && b.v) {
        const c = compareValues(a.v, b.v);
        if (c) return sign * c;
        return field === 'date'
          ? sign * byPath(a.r, b.r)
          : collator.compare(itemTitle(a.r), itemTitle(b.r)) ||
              byPath(a.r, b.r);
      }
      if (a.v) return -1;
      if (b.v) return 1;
      return (
        collator.compare(itemTitle(a.r), itemTitle(b.r)) || byPath(a.r, b.r)
      );
    })
    .map(({ r }) => r);
}

const plainPaths = (files: string[]) => files.map((f) => f.replace(/^\/+/, ''));

export function resolveFolderCase(from: string, files: string[]): string {
  if (!from) return from;
  const plain = plainPaths(files);
  if (plain.some((p) => p.startsWith(`${from}/`))) return from;
  const lower = `${from.toLowerCase()}/`;
  const hit = plain.find((p) => p.toLowerCase().startsWith(lower));
  return hit ? hit.slice(0, from.length) : from;
}

export function folderHasPages(folder: string, files: string[]): boolean {
  const pages = plainPaths(files).filter((p) => MARKDOWN_RE.test(p));
  return folder === ''
    ? pages.length > 0
    : pages.some((p) => p.startsWith(`${folder}/`));
}

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

/** The folders (with pages) closest to a mistyped `from`, for the error card. */
export function nearestFolders(from: string, files: string[], n = 3): string[] {
  const dirs = new Set<string>();
  for (const p of plainPaths(files))
    if (MARKDOWN_RE.test(p)) {
      const parts = p.split('/').slice(0, -1);
      for (let i = 1; i <= parts.length; i++)
        dirs.add(parts.slice(0, i).join('/'));
    }
  return [...dirs]
    .map((d) => ({
      d,
      score: editDistance(from.toLowerCase(), d.toLowerCase()),
    }))
    .sort((a, b) => a.score - b.score || collator.compare(a.d, b.d))
    .slice(0, n)
    .map((x) => x.d);
}

function resolveTarget(
  value: string,
  originPath: string,
  ctx: ItemContext,
): string {
  const wiki = extractWikiLinkTarget(value);
  const match =
    wiki === null
      ? null
      : matchLinkTarget(
          wiki,
          ctx.files.map((path) => ({ path })),
        );
  const target =
    wiki === null ? value : match ? ensureLeadingSlash(match.path) : wiki;
  return resolveContentLink({
    target,
    originFilePath: ensureLeadingSlash(originPath),
    siteHostname: ctx.siteHostname,
    permalinks: ctx.permalinks,
  });
}

/** An image value (path or [[wikilink]]) resolved like an item image, from `originPath`; null if it is not an image. */
export function resolveListingImage(
  value: string,
  originPath: string,
  ctx: ItemContext,
): string | null {
  return imageSrc(resolveTarget(value, originPath, ctx), ctx.siteHostname);
}

/** Only real images: external http(s) URLs, or site assets with an image extension (tech minor 9). */
function imageSrc(resolved: string, siteHostname: string): string | null {
  if (!/^https?:\/\//i.test(resolved)) return null;
  try {
    const u = new URL(resolved);
    if (u.host !== siteHostname) return resolved;
    return IMAGE_EXT_RE.test(decodeURIComponent(u.pathname)) ? resolved : null;
  } catch {
    return null;
  }
}

const firstString = (m: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const v = unwrapNested(m[k]);
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
};

function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : key;
}

const WIKI_RE = /^\[\[([^|\]]+?)(?:\|([^\]]+))?\]\]$/;
function fieldParts(value: unknown, ctx: ItemContext): ListingFieldPart[] {
  const v0 = unwrapNested(value);
  const list = Array.isArray(v0) ? v0 : [v0];
  return list.flatMap((v): ListingFieldPart[] => {
    if (v == null || v === '') return [];
    if (typeof v === 'boolean') return [{ text: v ? 'Yes' : 'No' }];
    if (typeof v === 'number')
      return Number.isFinite(v) ? [{ text: String(v) }] : [];
    if (typeof v !== 'string') return [];
    const wiki = v.trim().match(WIKI_RE);
    if (!wiki) return [{ text: v }];
    const target = wiki[1]!.trim();
    const match = matchLinkTarget(
      target,
      ctx.files.map((path) => ({ path })),
    );
    const text = (wiki[2] ?? target).trim();
    return match
      ? [
          {
            text,
            href: resolveContentLink({
              target: ensureLeadingSlash(match.path),
              siteHostname: ctx.siteHostname,
              permalinks: ctx.permalinks,
            }),
          },
        ]
      : [{ text }];
  });
}

export function toListingItem(row: ListingRow, ctx: ItemContext): ListingItem {
  const m = row.metadata ?? {};
  const f = ctx.fields;
  const title =
    f.title === 'title'
      ? itemTitle(row)
      : (firstString(m, [f.title]) ?? itemTitle(row));
  const date = f.date ? slotDate(row, f.date) : null;
  const dateKeys = new Set(['date', ...(f.date ? [f.date] : [])]);
  const dateInEyebrow = f.eyebrow.some((k) => dateKeys.has(k));
  const eyebrow = f.eyebrow.flatMap((k) =>
    dateKeys.has(k)
      ? date
        ? [{ text: formatListingDate(date, ctx.locale) }]
        : []
      : fieldParts(m[k], ctx),
  );
  const imageKeys = f.image ? (IMAGE_FALLBACKS[f.image] ?? [f.image]) : [];
  const rawImage = firstString(m, imageKeys);
  const authorKeys = f.authors
    ? (AUTHOR_FALLBACKS[f.authors] ?? [f.authors])
    : [];
  const authorsRaw = authorKeys
    .map((k) => unwrapNested(m[k]))
    .find((v) => normalizeAuthors(v).length > 0);
  return {
    path: row.path,
    url: `/${(row.permalink || row.appPath || row.path).replace(/^\/+/, '')}`,
    title,
    date,
    dateInEyebrow,
    summary: f.summary
      ? firstString(m, SUMMARY_FALLBACKS[f.summary] ?? [f.summary])
      : null,
    image: rawImage
      ? imageSrc(resolveTarget(rawImage, row.path, ctx), ctx.siteHostname)
      : null,
    authorHandles: normalizeAuthors(authorsRaw).map(stripWiki),
    eyebrow,
    meta: f.meta
      .map((key) => ({
        key,
        label: humanize(key),
        parts: fieldParts(m[key], ctx),
      }))
      .filter((x) => x.parts.length > 0),
    group: null,
  };
}
