import { ensureLeadingSlash, normalizeAuthors, safeDate } from '@/lib/utils';
import type { PageMetadata } from '@/server/api/types';

export const CHANGELOG_DIR_NAME = 'changelog';
export const CHANGELOG_PAGE_SIZE = 10;

const FOLDER_INDEX_RE = /(?:^|\/)(?:readme|index)\.mdx?$/i;
const MARKDOWN_RE = /\.mdx?$/i;
const DATE_PREFIX_RE = /^(\d{4}-\d{2}-\d{2})(?:[-_ ]|$)/;

export type ChangelogBlobRow = {
  id: string;
  path: string;
  appPath: string | null;
  permalink: string | null;
  metadata: PageMetadata | null;
};

export type ChangelogEntryMeta = {
  id: string;
  path: string;
  url: string;
  anchor: string;
  title: string;
  date: string | null;
  version?: string;
  description?: string;
  image?: string;
  authors: string[];
};

export function normalizeDir(dir: string): string {
  return dir.replace(/^\/+|\/+$/g, '');
}

export function dirOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(MARKDOWN_RE, '');
}

export function isFolderIndexPath(path: string): boolean {
  return FOLDER_INDEX_RE.test(path);
}

export function isChangelogDirName(dir: string): boolean {
  const last = normalizeDir(dir).split('/').pop() ?? '';
  return last.toLowerCase() === CHANGELOG_DIR_NAME;
}

/** Folder README/index `layout` wins: `changelog` opts in, anything else opts out. */
export function isChangelogDir(
  dir: string,
  folderIndexMetadata?: { layout?: string } | null,
): boolean {
  const layout = folderIndexMetadata?.layout;
  if (layout === 'changelog') return true;
  if (layout) return false;
  return isChangelogDirName(dir);
}

export function entryDateFromPath(path: string): string | null {
  const m = basename(path).match(DATE_PREFIX_RE);
  return m?.[1] && safeDate(m[1]) ? m[1] : null;
}

export function resolveEntryDate(
  metaDate: unknown,
  path: string,
): string | null {
  const d = safeDate(metaDate);
  if (d) return d.toISOString().slice(0, 10);
  return entryDateFromPath(path);
}

export function entryTitleFromPath(path: string): string {
  const words = basename(path)
    .replace(DATE_PREFIX_RE, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : basename(path);
}

export function anchorFromPath(path: string): string {
  return basename(path)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compareEntries(a: ChangelogEntryMeta, b: ChangelogEntryMeta): number {
  if (a.date !== b.date) {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date < b.date ? 1 : -1;
  }
  return a.path < b.path ? 1 : a.path > b.path ? -1 : 0;
}

export function toChangelogEntries(
  rows: ChangelogBlobRow[],
  dir: string,
): ChangelogEntryMeta[] {
  const folder = normalizeDir(dir);
  return rows
    .filter(
      (r) =>
        dirOf(r.path) === folder &&
        MARKDOWN_RE.test(r.path) &&
        !isFolderIndexPath(r.path) &&
        r.metadata?.publish !== false,
    )
    .map((r) => {
      const m = r.metadata ?? ({} as PageMetadata);
      return {
        id: r.id,
        path: r.path,
        url: ensureLeadingSlash(r.permalink || r.appPath || r.path),
        anchor: anchorFromPath(r.path),
        title: m.title || entryTitleFromPath(r.path),
        date: resolveEntryDate(m.date, r.path),
        ...(m.version ? { version: String(m.version) } : {}),
        ...(m.description ? { description: m.description } : {}),
        ...(m.image ? { image: m.image } : {}),
        authors: normalizeAuthors(m.authors),
      };
    })
    .sort(compareEntries);
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; page: number; pageCount: number; total: number } | null {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  if (!Number.isInteger(page) || page < 1 || page > pageCount) return null;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageCount,
    total: items.length,
  };
}

export function neighbours(
  entries: ChangelogEntryMeta[],
  path: string,
): { newer: ChangelogEntryMeta | null; older: ChangelogEntryMeta | null } {
  const i = entries.findIndex((e) => e.path === path);
  if (i === -1) return { newer: null, older: null };
  return { newer: entries[i - 1] ?? null, older: entries[i + 1] ?? null };
}

export function parsePageParam(
  value: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === '') return 1;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}
