# Changelog Rendering (Folder Case, v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any Flowershow site with a `changelog/` folder (or a folder whose README/index has `layout: changelog`) renders a full-entry, paginated changelog timeline at the folder URL, with a dedicated entry-page layout for each entry.

**Architecture:** Everything happens at render time in the Next app (`apps/flowershow`). There are no worker, sync or DB schema changes.
- **Pure helpers** (`lib/changelog.ts`) do detection, sorting and pagination.
- **A cached tRPC procedure** (`site.getChangelogEntries`) lists a folder's entries.
- **The page route** decides whether a request is a changelog index, a changelog entry, or a normal page.
- **Server components** in `components/public/changelog/` render the index and entries. Entry bodies are compiled through the same markdown/MDX pipeline as normal pages, via a new shared `renderPageContent()` extracted from the page route.

**Tech Stack:** Next.js 15.5 (App Router, server components), tRPC, Prisma, Vitest + Testing Library (jsdom), Playwright, Tailwind/CSS layers in `styles/default-theme.css`.

**Spec:** [docs/plans/2026-09-18-changelog-rendering-design.md](2026-09-18-changelog-rendering-design.md). The research behind it is [2026-09-18-changelog-rendering-research.md](2026-09-18-changelog-rendering-research.md), and the approved mockup is https://claude.ai/artifact/4WfPDCR2WtJBV4uNZqou53.

**Tracking:** beads epic `flowershow-v8x` (local stealth-mode beads, run `bd ready`). Each task below lists its bead.

## Global Constraints

- A folder is a changelog folder when its last segment is `changelog` (case-insensitive), OR its `README.md`/`index.md` has `layout: changelog`. Any other explicit `layout` on that README/index opts out.
- Entries are `.md`/`.mdx` files **directly** in the folder, excluding `README.*`/`index.*` and `publish: false`. Subfolders are ignored.
- Sort order: date descending (frontmatter `date`, else the `YYYY-MM-DD` filename prefix), undated last, then path descending.
- Page size: **10**. Pagination via `?page=N`. Out-of-range page → 404.
- Full entries on the index. No clamping, no category badges, no month separators.
- Authors resolve through `people/<handle>.md` via `site.getAuthors`, with **one batched call per page**.
- The theme class contract is exactly: `.changelog`, `.changelog-header`, `.changelog-title`, `.changelog-intro`, `.changelog-entries`, `.changelog-entry`, `.changelog-entry-meta`, `.changelog-entry-date`, `.changelog-entry-version`, `.changelog-entry-authors`, `.changelog-entry-author`, `.changelog-entry-title`, `.changelog-entry-description`, `.changelog-entry-media`, `.changelog-entry-body`, `.changelog-pagination`, `.changelog-single`, `.changelog-entry-nav`.
- Do not use the `<List>` component. Everything is server-rendered.
- A changelog folder with no README/index still renders the index (title "Changelog") instead of 404ing.
- Security (AGENTS.md): every new tRPC procedure calls `assertSiteAccess` exactly as `getListComponentItems` does. No raw SQL string interpolation (use Prisma `findMany`).
- Markdown in docs: never hard-wrap lines.
- Commit after each task on branch `feat/changelog-rendering`. End commit messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
|---|---|
| `apps/flowershow/lib/changelog.ts` (create) | Pure helpers: detection, entry mapping, dates/titles, sorting, pagination, neighbours, page param parsing |
| `apps/flowershow/lib/changelog.test.ts` (create) | Unit tests for the above |
| `apps/flowershow/lib/changelog-context.ts` (create) | `resolveChangelogContext()`: decides index/entry/none for a request (callback-injected I/O) |
| `apps/flowershow/lib/changelog-context.test.ts` (create) | Unit tests for the above |
| `apps/flowershow/server/api/types.ts` (modify) | Widen `PageMetadata.layout`, add `version` |
| `apps/flowershow/server/api/routers/site.ts` (modify) | New `getChangelogEntries` procedure |
| `apps/flowershow/server/api/routers/__tests__/site.test.ts` (modify) | Mock `path.startsWith` / `extension.in`, and tests for the new procedure |
| `apps/flowershow/lib/render-page-content.tsx` (create) | Shared markdown/MDX/canvas compile, extracted verbatim from the page route |
| `apps/flowershow/components/public/changelog/types.ts` (create) | `ChangelogAuthor` type |
| `apps/flowershow/components/public/changelog/changelog-entry.tsx` (create) | Entry component (`variant: 'index' \| 'page'`) |
| `apps/flowershow/components/public/changelog/changelog-pagination.tsx` (create) | Footer pagination |
| `apps/flowershow/components/public/changelog/changelog-entry-nav.tsx` (create) | Prev/next on the entry page |
| `apps/flowershow/components/public/changelog/changelog-index.tsx` (create) | Presentational index (header + list + pagination) |
| `apps/flowershow/components/public/changelog/changelog.test.tsx` (create) | Component tests |
| `apps/flowershow/components/public/changelog/changelog-index-page.tsx` (create) | Async server component: fetch entries, bodies and authors, then render `ChangelogIndex` |
| `apps/flowershow/components/public/changelog/changelog-entry-page.tsx` (create) | Async server component: entry layout plus neighbours |
| `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` (modify) | Wire detection, index and entry rendering, `searchParams` |
| `apps/flowershow/styles/default-theme.css` (modify) | Default changelog styles |
| `apps/flowershow/e2e/fixtures/test-site/changelog/*` and `e2e/fixtures/test-site/releases/*` (create) | E2E fixture content |
| `apps/flowershow/e2e/specs/changelog.spec.ts` (create) | E2E spec |
| `content/flowershow-app/docs/reference/changelog.md` (create) | User docs |
| `content/flowershow-app/docs/reference/theme-class-reference.md` (modify) | Document the classes |
| `content/flowershow-app/changelog/README.mdx` (modify) | Dogfood: drop `<List>` |

---

### Task 0: Environment baseline

**Bead:** none (setup)

- [x] **Step 1: Install dependencies** (there's no `node_modules` in the checkout yet)

Run: `cd /Users/rgrp/src/flowershow/flowershow && pnpm install`
Expected: completes without errors.

- [x] **Step 2: Run the unit test baseline**

Run: `cd apps/flowershow && pnpm test`
Expected: PASS. If there are pre-existing failures, record their names in the bead notes (`bd update flowershow-v8x.4 --append-notes "baseline failures: ..."`) and don't fix them as part of this plan.

- [x] **Step 3: Confirm the branch**

Run: `git branch --show-current`
Expected: `feat/changelog-rendering`

---

### Task 1: Pure changelog helpers

**Bead:** `flowershow-v8x.4` (detection) — mark in progress: `bd update flowershow-v8x.4 --status in_progress`

**Files:**
- Create: `apps/flowershow/lib/changelog.ts`
- Create: `apps/flowershow/lib/changelog.test.ts`
- Modify: `apps/flowershow/server/api/types.ts:126` (the `layout` field) and add `version`

**Interfaces:**
- Produces (used by Tasks 2, 4, 5, 6):
  - `CHANGELOG_PAGE_SIZE = 10`
  - `type ChangelogBlobRow = { id: string; path: string; appPath: string | null; permalink: string | null; metadata: PageMetadata | null }`
  - `type ChangelogEntryMeta = { id: string; path: string; url: string; anchor: string; title: string; date: string | null; version?: string; description?: string; image?: string; authors: string[] }`
  - `normalizeDir(dir: string): string`
  - `dirOf(path: string): string`
  - `isFolderIndexPath(path: string): boolean`
  - `isChangelogDirName(dir: string): boolean`
  - `isChangelogDir(dir: string, folderIndexMetadata?: { layout?: string } | null): boolean`
  - `entryDateFromPath(path: string): string | null`
  - `resolveEntryDate(metaDate: unknown, path: string): string | null`
  - `entryTitleFromPath(path: string): string`
  - `anchorFromPath(path: string): string`
  - `toChangelogEntries(rows: ChangelogBlobRow[], dir: string): ChangelogEntryMeta[]`
  - `paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pageCount: number; total: number } | null`
  - `neighbours(entries: ChangelogEntryMeta[], path: string): { newer: ChangelogEntryMeta | null; older: ChangelogEntryMeta | null }`
  - `parsePageParam(value: string | string[] | undefined): number | null`

- [x] **Step 1: Widen the metadata type**

In `apps/flowershow/server/api/types.ts`, change `layout?: 'plain';` to:

```ts
  layout?: 'plain' | 'changelog' | (string & {});
  version?: string;
```

(`(string & {})` keeps autocomplete for the known values while allowing opt-out values like `default`.)

- [x] **Step 2: Write the failing tests**

Create `apps/flowershow/lib/changelog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  anchorFromPath,
  type ChangelogBlobRow,
  dirOf,
  entryDateFromPath,
  entryTitleFromPath,
  isChangelogDir,
  isChangelogDirName,
  isFolderIndexPath,
  neighbours,
  normalizeDir,
  paginate,
  parsePageParam,
  resolveEntryDate,
  toChangelogEntries,
} from './changelog';

function row(path: string, metadata: Record<string, unknown> | null = {}, extra: Partial<ChangelogBlobRow> = {}): ChangelogBlobRow {
  return {
    id: `id-${path}`,
    path,
    appPath: '/' + path.replace(/\.mdx?$/, '').replace(/\/(README|index)$/i, ''),
    permalink: null,
    metadata: metadata as ChangelogBlobRow['metadata'],
    ...extra,
  };
}

describe('path helpers', () => {
  it('normalizeDir strips leading and trailing slashes', () => {
    expect(normalizeDir('/changelog/')).toBe('changelog');
    expect(normalizeDir('docs/changelog')).toBe('docs/changelog');
    expect(normalizeDir('/')).toBe('');
  });
  it('dirOf returns the parent directory', () => {
    expect(dirOf('changelog/2026-01-01-a.md')).toBe('changelog');
    expect(dirOf('README.md')).toBe('');
  });
  it('isFolderIndexPath matches README and index md/mdx', () => {
    expect(isFolderIndexPath('changelog/README.md')).toBe(true);
    expect(isFolderIndexPath('changelog/index.mdx')).toBe(true);
    expect(isFolderIndexPath('changelog/readme.md')).toBe(true);
    expect(isFolderIndexPath('changelog/2026-01-01-index-page.md')).toBe(false);
  });
});

describe('detection', () => {
  it('recognises a folder named changelog, case-insensitively, at any depth', () => {
    expect(isChangelogDirName('changelog')).toBe(true);
    expect(isChangelogDirName('/Changelog/')).toBe(true);
    expect(isChangelogDirName('docs/changelog')).toBe(true);
    expect(isChangelogDirName('changelogs')).toBe(false);
    expect(isChangelogDirName('blog')).toBe(false);
  });
  it('layout: changelog opts any folder in', () => {
    expect(isChangelogDir('releases', { layout: 'changelog' })).toBe(true);
  });
  it('any other explicit layout opts a changelog folder out', () => {
    expect(isChangelogDir('changelog', { layout: 'default' })).toBe(false);
    expect(isChangelogDir('changelog', { layout: 'plain' })).toBe(false);
  });
  it('no README metadata falls back to the folder name', () => {
    expect(isChangelogDir('changelog', null)).toBe(true);
    expect(isChangelogDir('blog', undefined)).toBe(false);
  });
});

describe('dates and titles', () => {
  it('entryDateFromPath reads a YYYY-MM-DD filename prefix', () => {
    expect(entryDateFromPath('changelog/2026-08-21-monospace-theme.md')).toBe('2026-08-21');
    expect(entryDateFromPath('changelog/monospace-theme.md')).toBeNull();
  });
  it('resolveEntryDate prefers valid frontmatter, falls back to filename', () => {
    expect(resolveEntryDate('2026-08-21T00:00:00.000Z', 'changelog/x.md')).toBe('2026-08-21');
    expect(resolveEntryDate('not a date', 'changelog/2026-01-02-x.md')).toBe('2026-01-02');
    expect(resolveEntryDate(undefined, 'changelog/x.md')).toBeNull();
  });
  it('entryTitleFromPath strips the date prefix and humanises', () => {
    expect(entryTitleFromPath('changelog/2026-08-21-monospace-theme.md')).toBe('Monospace theme');
    expect(entryTitleFromPath('changelog/new_editor.md')).toBe('New editor');
  });
  it('anchorFromPath is a URL-safe filename slug', () => {
    expect(anchorFromPath('changelog/2026-08-21-Monospace Theme.md')).toBe('2026-08-21-monospace-theme');
  });
});

describe('toChangelogEntries', () => {
  const rows = [
    row('changelog/README.md', { title: 'Changelog' }),
    row('changelog/2026-01-10-b.md', { title: 'B', date: '2026-01-10T00:00:00.000Z', authors: ['olayway'], version: '1.1.0' }),
    row('changelog/2026-03-01-c.md', { title: 'C' }),
    row('changelog/undated.md', { title: 'Undated' }),
    row('changelog/2026-02-01-hidden.md', { title: 'Hidden', publish: false }),
    row('changelog/sub/2026-05-01-nested.md', { title: 'Nested' }),
    row('changelog/image.png', null),
    row('blog/2026-04-01-other.md', { title: 'Other' }),
  ];

  it('keeps direct md children only, excludes README, unpublished, nested and other folders', () => {
    const titles = toChangelogEntries(rows, 'changelog').map((e) => e.title);
    expect(titles).toEqual(['C', 'B', 'Undated']);
  });
  it('sorts by date desc with undated last', () => {
    const dates = toChangelogEntries(rows, '/changelog/').map((e) => e.date);
    expect(dates).toEqual(['2026-03-01', '2026-01-10', null]);
  });
  it('maps metadata fields and url', () => {
    const b = toChangelogEntries(rows, 'changelog').find((e) => e.title === 'B')!;
    expect(b).toMatchObject({ id: 'id-changelog/2026-01-10-b.md', url: '/changelog/2026-01-10-b', anchor: '2026-01-10-b', authors: ['olayway'], version: '1.1.0' });
  });
  it('prefers permalink for url and normalises scalar authors', () => {
    const [e] = toChangelogEntries([row('changelog/2026-01-01-a.md', { title: 'A', authors: 'Jane' }, { permalink: '/news/a' })], 'changelog');
    expect(e!.url).toBe('/news/a');
    expect(e!.authors).toEqual(['Jane']);
  });
  it('falls back to a humanised filename title', () => {
    const [e] = toChangelogEntries([row('changelog/2026-01-01-dark-mode.md', {})], 'changelog');
    expect(e!.title).toBe('Dark mode');
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 23 }, (_, i) => i);
  it('slices pages', () => {
    expect(paginate(items, 1, 10)).toEqual({ items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], page: 1, pageCount: 3, total: 23 });
    expect(paginate(items, 3, 10)!.items).toEqual([20, 21, 22]);
  });
  it('returns null out of range', () => {
    expect(paginate(items, 4, 10)).toBeNull();
    expect(paginate(items, 0, 10)).toBeNull();
  });
  it('allows page 1 of an empty list', () => {
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
  });
});

describe('parsePageParam', () => {
  it('parses positive integers and defaults to 1', () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('2')).toBe(2);
    expect(parsePageParam(['3', '4'])).toBe(3);
  });
  it('rejects junk', () => {
    expect(parsePageParam('0')).toBeNull();
    expect(parsePageParam('-1')).toBeNull();
    expect(parsePageParam('abc')).toBeNull();
    expect(parsePageParam('1.5')).toBeNull();
  });
});

describe('neighbours', () => {
  it('returns newer and older entries around a path', () => {
    const entries = toChangelogEntries(
      [row('changelog/2026-01-01-a.md', { title: 'A' }), row('changelog/2026-02-01-b.md', { title: 'B' }), row('changelog/2026-03-01-c.md', { title: 'C' })],
      'changelog',
    );
    const n = neighbours(entries, 'changelog/2026-02-01-b.md');
    expect(n.newer?.title).toBe('C');
    expect(n.older?.title).toBe('A');
    expect(neighbours(entries, 'changelog/2026-03-01-c.md').newer).toBeNull();
    expect(neighbours(entries, 'missing.md')).toEqual({ newer: null, older: null });
  });
});
```

- [x] **Step 3: Run the tests to verify they fail**

Run: `cd apps/flowershow && pnpm vitest run --project=unit lib/changelog.test.ts`
Expected: FAIL with "Failed to resolve import './changelog'".

- [x] **Step 4: Implement `apps/flowershow/lib/changelog.ts`**

```ts
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

export function resolveEntryDate(metaDate: unknown, path: string): string | null {
  const d = safeDate(metaDate);
  if (d) return d.toISOString().slice(0, 10);
  return entryDateFromPath(path);
}

export function entryTitleFromPath(path: string): string {
  const words = basename(path).replace(DATE_PREFIX_RE, '').replace(/[-_]+/g, ' ').trim();
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
  return { items: items.slice(start, start + pageSize), page, pageCount, total: items.length };
}

export function neighbours(
  entries: ChangelogEntryMeta[],
  path: string,
): { newer: ChangelogEntryMeta | null; older: ChangelogEntryMeta | null } {
  const i = entries.findIndex((e) => e.path === path);
  if (i === -1) return { newer: null, older: null };
  return { newer: entries[i - 1] ?? null, older: entries[i + 1] ?? null };
}

export function parsePageParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === '') return 1;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}
```

Before running, check that `normalizeAuthors` and `ensureLeadingSlash` are exported from `lib/utils.ts` (`grep -n "export function normalizeAuthors\|export function ensureLeadingSlash" apps/flowershow/lib/utils.ts`). Both are used by the page route today.

- [x] **Step 5: Run the tests to verify they pass**

Run: `cd apps/flowershow && pnpm vitest run --project=unit lib/changelog.test.ts`
Expected: PASS (all tests).

- [x] **Step 6: Commit**

```bash
git add apps/flowershow/lib/changelog.ts apps/flowershow/lib/changelog.test.ts apps/flowershow/server/api/types.ts
git commit -m "feat(changelog): pure helpers for changelog detection, sorting and pagination"
```

---

### Task 2: `site.getChangelogEntries` tRPC procedure

**Bead:** `flowershow-v8x.5` (index) — set in progress.

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts` (add the procedure right after `getListComponentItems`, around line 1355)
- Modify: `apps/flowershow/server/api/routers/__tests__/site.test.ts` (mock filters and new tests)

**Interfaces:**
- Consumes: `toChangelogEntries`, `normalizeDir`, `ChangelogEntryMeta`, `ChangelogBlobRow` from Task 1.
- Produces: `api.site.getChangelogEntries.query({ siteId: string; dir: string }) → Promise<{ entries: ChangelogEntryMeta[] }>`. The full sorted list is returned, not paginated: pagination and neighbours happen in the caller, and folder sizes are small. `entry.image` is already resolved to a URL.

- [x] **Step 1: Teach the mock DB `path.startsWith` and `extension.in` for `findMany`**

In `createMockDb`'s `blob.findMany` filter in `site.test.ts`, add these after the `w.id?.in` check:

```ts
          if (w.path?.startsWith !== undefined && !b.path.startsWith(w.path.startsWith))
            return false;
          if (w.extension?.in && !w.extension.in.includes(b.extension))
            return false;
```

- [x] **Step 2: Write the failing tests** (append to `site.test.ts`)

```ts
describe('site.getChangelogEntries', () => {
  it('returns sorted direct entries of the folder, excluding README', async () => {
    const blobs = [
      makeBlob({ id: 'r', path: 'changelog/README.md', appPath: '/changelog', metadata: { title: 'Changelog' } }),
      makeBlob({ id: 'a', path: 'changelog/2026-01-01-a.md', appPath: '/changelog/2026-01-01-a', metadata: { title: 'A' } }),
      makeBlob({ id: 'b', path: 'changelog/2026-02-01-b.md', appPath: '/changelog/2026-02-01-b', metadata: { title: 'B', date: '2026-02-01T00:00:00.000Z' } }),
      makeBlob({ id: 'x', path: 'blog/post.md', appPath: '/blog/post', metadata: { title: 'X' } }),
    ];
    const caller = createCaller(createMockDb({ blobs }));
    const result = await caller.site.getChangelogEntries({ siteId: 'site-1', dir: '/changelog' });
    expect(result.entries.map((e) => e.id)).toEqual(['b', 'a']);
    expect(result.entries[0]).toMatchObject({ title: 'B', date: '2026-02-01', url: '/changelog/2026-02-01-b' });
  });

  it('resolves wiki-link images to site URLs', async () => {
    const blobs = [
      makeBlob({ id: 'a', path: 'changelog/2026-01-01-a.md', appPath: '/changelog/2026-01-01-a', metadata: { title: 'A', image: '[[assets/shot.png]]' } }),
      makeBlob({ id: 'img', path: 'assets/shot.png', appPath: null, extension: 'png', metadata: null }),
    ];
    const caller = createCaller(createMockDb({ blobs }));
    const { entries } = await caller.site.getChangelogEntries({ siteId: 'site-1', dir: 'changelog' });
    expect(entries[0]!.image).toContain('assets/shot.png');
    expect(entries[0]!.image).not.toContain('[[');
  });

  it('throws NOT_FOUND for an unknown site', async () => {
    const caller = createCaller(createMockDb({ site: null }));
    await expect(caller.site.getChangelogEntries({ siteId: 'nope', dir: 'changelog' })).rejects.toThrow();
  });
});
```

- [x] **Step 3: Run the tests to verify they fail**

Run: `cd apps/flowershow && pnpm vitest run --project=unit server/api/routers/__tests__/site.test.ts -t getChangelogEntries`
Expected: FAIL (`getChangelogEntries` is not a procedure).

- [x] **Step 4: Implement the procedure** in `site.ts`, directly after `getListComponentItems`:

```ts
  getChangelogEntries: publicProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        dir: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const site = await ctx.db.site.findFirst({
        where: { id: input.siteId },
        include: { user: true },
      });

      if (!site) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Site not found' });
      }

      await assertSiteAccess(site, input.siteId, ctx);

      return await unstable_cache(
        async (input) => {
          const dir = normalizeDir(input.dir);
          const siteHostname =
            site.customDomain ??
            `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

          const siteFiles = (
            await ctx.db.blob.findMany({
              where: { siteId: input.siteId },
              select: { path: true },
            })
          ).map((b) => ({ path: b.path }));

          const rows = await ctx.db.blob.findMany({
            where: {
              siteId: input.siteId,
              path: { startsWith: dir ? `${dir}/` : '' },
              extension: { in: ['md', 'mdx'] },
            },
            select: {
              id: true,
              path: true,
              appPath: true,
              permalink: true,
              metadata: true,
            },
          });

          const entries = toChangelogEntries(
            rows as ChangelogBlobRow[],
            dir,
          ).map((entry) => {
            if (!entry.image) return entry;
            let value = entry.image;
            const wikiTarget = extractWikiLinkTarget(value);
            if (wikiTarget !== null) {
              value = matchLinkTarget(wikiTarget, siteFiles)?.path ?? wikiTarget;
            }
            return { ...entry, image: resolveContentLink({ target: value, siteHostname }) };
          });

          return { entries };
        },
        undefined,
        {
          revalidate: 60,
          tags: [`${site.id}`, `${site.id}-${input.dir}-changelog`],
        },
      )(input);
    }),
```

Add the import at the top of `site.ts`:

```ts
import {
  type ChangelogBlobRow,
  normalizeDir,
  toChangelogEntries,
} from '@/lib/changelog';
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `cd apps/flowershow && pnpm vitest run --project=unit server/api/routers/__tests__/site.test.ts`
Expected: PASS (the new tests and all existing site router tests).

- [x] **Step 6: Commit**

```bash
git add apps/flowershow/server/api/routers/site.ts apps/flowershow/server/api/routers/__tests__/site.test.ts
git commit -m "feat(changelog): add site.getChangelogEntries procedure"
```

---

### Task 3: Extract `renderPageContent()` from the page route (no behaviour change)

**Bead:** `flowershow-v8x.5`

The changelog index must compile up to 10 entry bodies with exactly the same pipeline as a normal page. Today that logic lives inline in `page.tsx`, so this task moves it into one shared function.

**Files:**
- Create: `apps/flowershow/lib/render-page-content.tsx`
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`

**Interfaces:**
- Produces:

```ts
export type RenderPageContentOptions = {
  blob: { id: string; path: string } & Record<string, unknown>; // the blob object passed to MDXClient today
  site: { id: string; rootDir: string | null } & Record<string, unknown>; // the site object passed to MDXClient today
  content: string;
  renderMode: 'md' | 'mdx' | 'auto' | undefined;
  siteHostname: string;
  siteFilePaths: string[];
  permalinksMapping: Record<string, string>;
  imageDimensions: ImageDimensionsMap;
};
export async function renderPageContent(opts: RenderPageContentOptions): Promise<React.JSX.Element>;
```

- [x] **Step 1: Create `lib/render-page-content.tsx`**
  - Move these two helpers **verbatim** from the bottom of `page.tsx`: `fetchReferencedCanvasFiles` and `resolveCanvasFileReferences`.
  - Move the compile branch **verbatim**: the block from `if (!isMarkdown && !isMdx && !isCanvas) {` through the end of the outer `try { … } catch (error: any) { compiledContent = <ErrorMessage title="Error" … /> }` (currently roughly `page.tsx:246-350`). Put it inside `renderPageContent`, which declares `let compiledContent: React.JSX.Element;` and returns it.
  - Inside the function, derive `isMarkdown`, `isMdx` and `isCanvas` from `opts.blob.path` exactly as `page.tsx:236-238` does, and read `renderMode` from `opts.renderMode`. Replace the free variables `pageContent → opts.content`, `site → opts.site`, `blob → opts.blob`, `siteHostname`, `siteFilePaths`, `permalinksMapping` and `imageDimensions` with the `opts.*` fields.
  - Move the imports those lines need (`serialize`, `ErrorMessage`, `MDXClient`, `getMdxOptions`, `processMarkdown`, `protectNonMathDollars`, `protectWikiLinkAliases`, `preprocessMdxForgiving`, `processCanvas`, `api` from `@/trpc/server`, `ImageDimensionsMap`, `PageMetadata`).
  - The HTML redirect (`if (isHtml) redirect(...)`) **stays in `page.tsx`**.

- [x] **Step 2: Replace the moved block in `page.tsx`** with:

```ts
  compiledContent = await renderPageContent({
    blob,
    site,
    content: pageContent ?? '',
    renderMode,
    siteHostname,
    siteFilePaths,
    permalinksMapping,
    imageDimensions,
  });
```

Then delete the now-unused imports from `page.tsx`. Run `pnpm lint` in `apps/flowershow` to find them.

- [x] **Step 3: Verify there's no behaviour change**

Run: `cd apps/flowershow && pnpm test && npx tsc --noEmit -p .`
Expected: all unit tests PASS and there are no type errors. `lib/markdown-pipeline.integration.test.ts` must still pass.

If the local stack is available (`docker compose up -d` + `pnpm dev`), also run `npx playwright test --project=chromium basic-rendering canvas-embed frontmatter`. Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add apps/flowershow/lib/render-page-content.tsx "apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx"
git commit -m "refactor: extract renderPageContent from site page route"
```

---

### Task 4: Changelog presentational components

**Bead:** `flowershow-v8x.5` and `flowershow-v8x.6`

**Files:**
- Create: `apps/flowershow/components/public/changelog/types.ts`
- Create: `apps/flowershow/components/public/changelog/changelog-entry.tsx`
- Create: `apps/flowershow/components/public/changelog/changelog-pagination.tsx`
- Create: `apps/flowershow/components/public/changelog/changelog-entry-nav.tsx`
- Create: `apps/flowershow/components/public/changelog/changelog-index.tsx`
- Test: `apps/flowershow/components/public/changelog/changelog.test.tsx`

**Interfaces:**
- Consumes: `ChangelogEntryMeta` (Task 1).
- Produces:
  - `type ChangelogAuthor = { key: string; name: string; url: string | null; avatar?: string }` (the same shape `site.getAuthors` returns)
  - `ChangelogEntry(props: { entry: ChangelogEntryMeta; authors: ChangelogAuthor[]; variant: 'index' | 'page'; indexUrl?: string; children: React.ReactNode })`
  - `ChangelogPagination(props: { baseUrl: string; page: number; pageCount: number; shown: number; total: number })`
  - `ChangelogEntryNav(props: { newer: ChangelogEntryMeta | null; older: ChangelogEntryMeta | null })`
  - `ChangelogIndex(props: { title: string; intro?: React.ReactNode; children: React.ReactNode; pagination: React.ReactNode })`

- [x] **Step 1: Write the failing tests** in `changelog.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ChangelogEntryMeta } from '@/lib/changelog';
import { ChangelogEntry } from './changelog-entry';
import { ChangelogEntryNav } from './changelog-entry-nav';
import { ChangelogIndex } from './changelog-index';
import { ChangelogPagination } from './changelog-pagination';

afterEach(cleanup);

const entry: ChangelogEntryMeta = {
  id: 'e1',
  path: 'changelog/2026-08-21-monospace-theme.md',
  url: '/changelog/2026-08-21-monospace-theme',
  anchor: '2026-08-21-monospace-theme',
  title: 'Monospace theme is now available',
  date: '2026-08-21',
  version: '2.4.0',
  description: 'Choose the compact Monospace theme.',
  image: 'https://example.com/shot.png',
  authors: ['olayway'],
};
const authors = [{ key: 'b1', name: 'Ola Rubaj', url: '/people/olayway', avatar: 'https://example.com/a.png' }];

describe('ChangelogEntry (index variant)', () => {
  it('renders anchor, date, version, authors, linked title, description, media and body', () => {
    const { container } = render(
      <ol><ChangelogEntry entry={entry} authors={authors} variant="index"><p>Body text</p></ChangelogEntry></ol>,
    );
    const li = container.querySelector('li.changelog-entry')!;
    expect(li.id).toBe('2026-08-21-monospace-theme');
    expect(container.querySelector('.changelog-entry-date time')!.getAttribute('datetime')).toBe('2026-08-21');
    expect(container.querySelector('.changelog-entry-date')!.getAttribute('href')).toBe('#2026-08-21-monospace-theme');
    expect(screen.getByText('Aug 21, 2026')).toBeInTheDocument();
    expect(screen.getByText('2.4.0')).toHaveClass('changelog-entry-version');
    expect(screen.getByText('Ola Rubaj').closest('a')).toHaveAttribute('href', '/people/olayway');
    expect(screen.getByRole('heading', { level: 2, name: entry.title }).querySelector('a')).toHaveAttribute('href', entry.url);
    expect(screen.getByText(entry.description!)).toHaveClass('changelog-entry-description');
    expect(container.querySelector('.changelog-entry-media img')).toHaveAttribute('src', entry.image);
    expect(container.querySelector('.changelog-entry-body')!.textContent).toBe('Body text');
  });

  it('omits optional parts when absent', () => {
    const bare = { ...entry, date: null, version: undefined, description: undefined, image: undefined, authors: [] };
    const { container } = render(<ol><ChangelogEntry entry={bare} authors={[]} variant="index">x</ChangelogEntry></ol>);
    expect(container.querySelector('.changelog-entry-date')).toBeNull();
    expect(container.querySelector('.changelog-entry-version')).toBeNull();
    expect(container.querySelector('.changelog-entry-authors')).toBeNull();
    expect(container.querySelector('.changelog-entry-media')).toBeNull();
  });
});

describe('ChangelogEntry (page variant)', () => {
  it('renders an h1, a back link and no self-link', () => {
    const { container } = render(
      <ChangelogEntry entry={entry} authors={authors} variant="page" indexUrl="/changelog">Body</ChangelogEntry>,
    );
    expect(container.querySelector('article.changelog-single')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: entry.title }).querySelector('a')).toBeNull();
    expect(screen.getByText('← Changelog')).toHaveAttribute('href', '/changelog');
  });
});

describe('ChangelogPagination', () => {
  it('links to older and newer pages', () => {
    render(<ChangelogPagination baseUrl="/changelog" page={2} pageCount={3} shown={10} total={23} />);
    expect(screen.getByText('Older updates →')).toHaveAttribute('href', '/changelog?page=3');
    expect(screen.getByText('← Newer updates')).toHaveAttribute('href', '/changelog');
    expect(screen.getByText('Page 2 of 3 · 23 updates')).toBeInTheDocument();
  });
  it('renders nothing when there is a single page', () => {
    const { container } = render(<ChangelogPagination baseUrl="/changelog" page={1} pageCount={1} shown={3} total={3} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ChangelogEntryNav', () => {
  it('shows previous (older) and next (newer) links', () => {
    render(<ChangelogEntryNav older={{ ...entry, title: 'Older one', url: '/changelog/old' }} newer={{ ...entry, title: 'Newer one', url: '/changelog/new' }} />);
    expect(screen.getByText('Older one').closest('a')).toHaveAttribute('href', '/changelog/old');
    expect(screen.getByText('Newer one').closest('a')).toHaveAttribute('href', '/changelog/new');
  });
});

describe('ChangelogIndex', () => {
  it('renders the title, intro, entries list and pagination slot', () => {
    const { container } = render(
      <ChangelogIndex title="Changelog" intro={<p>Intro</p>} pagination={<nav>pager</nav>}>
        <li>one</li>
      </ChangelogIndex>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Changelog' })).toHaveClass('changelog-title');
    expect(container.querySelector('.changelog-intro')!.textContent).toBe('Intro');
    expect(container.querySelector('ol.changelog-entries li')!.textContent).toBe('one');
    expect(screen.getByText('pager')).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `cd apps/flowershow && pnpm vitest run --project=unit components/public/changelog`
Expected: FAIL (modules not found).

- [x] **Step 3: Implement the components**

`types.ts`:

```ts
export type ChangelogAuthor = {
  key: string;
  name: string;
  url: string | null;
  avatar?: string;
};
```

`changelog-entry.tsx`:

```tsx
import Link from 'next/link';
import type { ChangelogEntryMeta } from '@/lib/changelog';
import type { ChangelogAuthor } from './types';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

function Authors({ authors }: { authors: ChangelogAuthor[] }) {
  if (authors.length === 0) return null;
  return (
    <div className="changelog-entry-authors">
      {authors.map((a) => {
        const inner = (
          <>
            {a.avatar && (
              // Plain <img>: avatars come from arbitrary user domains.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.avatar} alt="" width={22} height={22} className="changelog-entry-author-avatar" />
            )}
            <span>{a.name}</span>
          </>
        );
        return a.url ? (
          <Link key={a.key} href={a.url} className="changelog-entry-author">{inner}</Link>
        ) : (
          <span key={a.key} className="changelog-entry-author">{inner}</span>
        );
      })}
    </div>
  );
}

interface Props extends React.PropsWithChildren {
  entry: ChangelogEntryMeta;
  authors: ChangelogAuthor[];
  variant: 'index' | 'page';
  indexUrl?: string;
}

export function ChangelogEntry({ entry, authors, variant, indexUrl, children }: Props) {
  const isIndex = variant === 'index';
  const time = entry.date && <time dateTime={entry.date}>{formatDate(entry.date)}</time>;
  const meta = (
    <>
      {time &&
        (isIndex ? (
          <a className="changelog-entry-date" href={`#${entry.anchor}`}>{time}</a>
        ) : (
          <span className="changelog-entry-date">{time}</span>
        ))}
      {entry.version && <span className="changelog-entry-version">{entry.version}</span>}
      <Authors authors={authors} />
    </>
  );
  const content = (
    <>
      {entry.description && <p className="changelog-entry-description">{entry.description}</p>}
      {entry.image && (
        <figure className="changelog-entry-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.image} alt="" />
        </figure>
      )}
      <div className="changelog-entry-body rendered-mdx">{children}</div>
    </>
  );

  if (isIndex) {
    return (
      <li className="changelog-entry" id={entry.anchor}>
        <div className="changelog-entry-meta">
          <div className="changelog-entry-meta-inner">{meta}</div>
        </div>
        <div className="changelog-entry-content">
          <h2 className="changelog-entry-title">
            <Link href={entry.url}>{entry.title}</Link>
          </h2>
          {content}
        </div>
      </li>
    );
  }

  return (
    <article className="changelog-single">
      {indexUrl && (
        <Link className="changelog-back" href={indexUrl}>← Changelog</Link>
      )}
      <div className="changelog-entry-meta">{meta}</div>
      <h1 className="changelog-entry-title">{entry.title}</h1>
      {content}
    </article>
  );
}
```

`changelog-pagination.tsx`:

```tsx
import Link from 'next/link';

interface Props {
  baseUrl: string;
  page: number;
  pageCount: number;
  shown: number;
  total: number;
}

export function ChangelogPagination({ baseUrl, page, pageCount, total }: Props) {
  if (pageCount <= 1) return null;
  const href = (p: number) => (p === 1 ? baseUrl : `${baseUrl}?page=${p}`);
  return (
    <nav className="changelog-pagination" aria-label="Changelog pages">
      <div className="changelog-pagination-inner">
        {page > 1 ? <Link href={href(page - 1)}>← Newer updates</Link> : <span />}
        <span className="changelog-pagination-count">{`Page ${page} of ${pageCount} · ${total} updates`}</span>
        {page < pageCount ? <Link href={href(page + 1)}>Older updates →</Link> : <span />}
      </div>
    </nav>
  );
}
```

`changelog-entry-nav.tsx`:

```tsx
import Link from 'next/link';
import type { ChangelogEntryMeta } from '@/lib/changelog';

export function ChangelogEntryNav({
  newer,
  older,
}: {
  newer: ChangelogEntryMeta | null;
  older: ChangelogEntryMeta | null;
}) {
  if (!newer && !older) return null;
  return (
    <nav className="changelog-entry-nav" aria-label="More updates">
      {older ? (
        <Link className="changelog-entry-nav-older" href={older.url}>
          <small>← Previous</small>
          <span>{older.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {newer ? (
        <Link className="changelog-entry-nav-newer" href={newer.url}>
          <small>Next →</small>
          <span>{newer.title}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
```

`changelog-index.tsx`:

```tsx
interface Props extends React.PropsWithChildren {
  title: string;
  intro?: React.ReactNode;
  pagination: React.ReactNode;
}

export function ChangelogIndex({ title, intro, pagination, children }: Props) {
  return (
    <div className="changelog">
      <header className="changelog-header">
        <div>
          <h1 className="changelog-title">{title}</h1>
          {intro && <div className="changelog-intro rendered-mdx">{intro}</div>}
        </div>
      </header>
      <ol className="changelog-entries">{children}</ol>
      {pagination}
    </div>
  );
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `cd apps/flowershow && pnpm vitest run --project=unit components/public/changelog`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/flowershow/components/public/changelog
git commit -m "feat(changelog): entry, index, pagination and nav components"
```

---

### Task 5: Request-level changelog context

**Bead:** `flowershow-v8x.4`

**Files:**
- Create: `apps/flowershow/lib/changelog-context.ts`
- Test: `apps/flowershow/lib/changelog-context.test.ts`

**Interfaces:**
- Consumes: `dirOf`, `isFolderIndexPath`, `isChangelogDir`, `isChangelogDirName`, `normalizeDir` (Task 1).
- Produces:

```ts
export type ChangelogContext = { kind: 'index' | 'entry'; dir: string } | null;
export async function resolveChangelogContext(args: {
  slug: string;                                  // decoded request slug, e.g. "/changelog"
  blob: { path: string; metadata: { layout?: string } | null } | null; // null when getBlob found nothing
  siteFilePaths: string[];                       // may have leading slashes
  getFolderIndexMetadata: (dir: string) => Promise<{ layout?: string } | null>;
}): Promise<ChangelogContext>;
```

- [x] **Step 1: Write the failing tests** in `changelog-context.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { resolveChangelogContext } from './changelog-context';

const files = ['/changelog/2026-01-01-a.md', '/changelog/README.md', '/releases/2026-01-01-r.md', '/releases/README.md', '/blog/post.md'];

describe('resolveChangelogContext', () => {
  it('folder README in changelog/ → index', async () => {
    const ctx = await resolveChangelogContext({ slug: '/changelog', blob: { path: 'changelog/README.md', metadata: {} }, siteFilePaths: files, getFolderIndexMetadata: vi.fn() });
    expect(ctx).toEqual({ kind: 'index', dir: 'changelog' });
  });
  it('folder README opting out → null', async () => {
    const ctx = await resolveChangelogContext({ slug: '/changelog', blob: { path: 'changelog/README.md', metadata: { layout: 'default' } }, siteFilePaths: files, getFolderIndexMetadata: vi.fn() });
    expect(ctx).toBeNull();
  });
  it('any folder README with layout: changelog → index', async () => {
    const ctx = await resolveChangelogContext({ slug: '/releases', blob: { path: 'releases/README.md', metadata: { layout: 'changelog' } }, siteFilePaths: files, getFolderIndexMetadata: vi.fn() });
    expect(ctx).toEqual({ kind: 'index', dir: 'releases' });
  });
  it('no blob, changelog folder with markdown files → index (README-less)', async () => {
    const ctx = await resolveChangelogContext({ slug: '/changelog', blob: null, siteFilePaths: ['/changelog/2026-01-01-a.md'], getFolderIndexMetadata: vi.fn() });
    expect(ctx).toEqual({ kind: 'index', dir: 'changelog' });
  });
  it('no blob, non-changelog or empty folder → null', async () => {
    expect(await resolveChangelogContext({ slug: '/blog', blob: null, siteFilePaths: files, getFolderIndexMetadata: vi.fn() })).toBeNull();
    expect(await resolveChangelogContext({ slug: '/changelog', blob: null, siteFilePaths: ['/other.md'], getFolderIndexMetadata: vi.fn() })).toBeNull();
  });
  it('file inside changelog/ → entry, consulting the folder index', async () => {
    const getMeta = vi.fn().mockResolvedValue(null);
    const ctx = await resolveChangelogContext({ slug: '/changelog/2026-01-01-a', blob: { path: 'changelog/2026-01-01-a.md', metadata: {} }, siteFilePaths: files, getFolderIndexMetadata: getMeta });
    expect(ctx).toEqual({ kind: 'entry', dir: 'changelog' });
    expect(getMeta).toHaveBeenCalledWith('changelog');
  });
  it('file inside an opted-in folder → entry', async () => {
    const ctx = await resolveChangelogContext({ slug: '/releases/2026-01-01-r', blob: { path: 'releases/2026-01-01-r.md', metadata: {} }, siteFilePaths: files, getFolderIndexMetadata: vi.fn().mockResolvedValue({ layout: 'changelog' }) });
    expect(ctx).toEqual({ kind: 'entry', dir: 'releases' });
  });
  it("an entry's own explicit layout wins", async () => {
    const ctx = await resolveChangelogContext({ slug: '/changelog/x', blob: { path: 'changelog/x.md', metadata: { layout: 'plain' } }, siteFilePaths: files, getFolderIndexMetadata: vi.fn() });
    expect(ctx).toBeNull();
  });
  it('non-markdown blobs are never changelog pages', async () => {
    const ctx = await resolveChangelogContext({ slug: '/changelog/board', blob: { path: 'changelog/board.canvas', metadata: null }, siteFilePaths: files, getFolderIndexMetadata: vi.fn() });
    expect(ctx).toBeNull();
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `cd apps/flowershow && pnpm vitest run --project=unit lib/changelog-context.test.ts`
Expected: FAIL (module not found).

- [x] **Step 3: Implement `lib/changelog-context.ts`**

```ts
import {
  dirOf,
  isChangelogDir,
  isChangelogDirName,
  isFolderIndexPath,
  normalizeDir,
} from '@/lib/changelog';

export type ChangelogContext = { kind: 'index' | 'entry'; dir: string } | null;

export async function resolveChangelogContext({
  slug,
  blob,
  siteFilePaths,
  getFolderIndexMetadata,
}: {
  slug: string;
  blob: { path: string; metadata: { layout?: string } | null } | null;
  siteFilePaths: string[];
  getFolderIndexMetadata: (dir: string) => Promise<{ layout?: string } | null>;
}): Promise<ChangelogContext> {
  if (!blob) {
    const dir = normalizeDir(slug);
    if (!dir || !isChangelogDirName(dir)) return null;
    const hasEntries = siteFilePaths.some((p) => {
      const path = p.replace(/^\//, '');
      return dirOf(path) === dir && /\.mdx?$/i.test(path);
    });
    return hasEntries ? { kind: 'index', dir } : null;
  }

  if (!/\.mdx?$/i.test(blob.path)) return null;
  const dir = dirOf(blob.path);

  if (isFolderIndexPath(blob.path)) {
    return isChangelogDir(dir, blob.metadata) ? { kind: 'index', dir } : null;
  }

  if (blob.metadata?.layout) return null;
  if (!dir) return null;
  const folderMeta = await getFolderIndexMetadata(dir);
  return isChangelogDir(dir, folderMeta) ? { kind: 'entry', dir } : null;
}
```

- [x] **Step 4: Run to verify it passes**

Run: `cd apps/flowershow && pnpm vitest run --project=unit lib/changelog-context.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/flowershow/lib/changelog-context.ts apps/flowershow/lib/changelog-context.test.ts
git commit -m "feat(changelog): resolve changelog index/entry context for a request"
```

---

### Task 6: Wire changelog rendering into the page route

**Bead:** `flowershow-v8x.5` and `flowershow-v8x.6`. Close both at the end of this task if E2E (Task 8) passes. Otherwise leave them open with notes.

**Files:**
- Create: `apps/flowershow/components/public/changelog/changelog-index-page.tsx`
- Create: `apps/flowershow/components/public/changelog/changelog-entry-page.tsx`
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`

**Interfaces:**
- Consumes: Tasks 1–5 (`renderPageContent`, `getChangelogEntries`, `resolveChangelogContext`, the components, `paginate`, `neighbours`, `parsePageParam`, `CHANGELOG_PAGE_SIZE`).
- Produces: `ChangelogIndexPage` and `ChangelogEntryPage` async server components (below).

- [x] **Step 1: Create `changelog-index-page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import { CHANGELOG_PAGE_SIZE, paginate } from '@/lib/changelog';
import { renderPageContent } from '@/lib/render-page-content';
import { ensureLeadingSlash } from '@/lib/utils';
import { api } from '@/trpc/server';
import { ChangelogEntry } from './changelog-entry';
import { ChangelogIndex } from './changelog-index';
import { ChangelogPagination } from './changelog-pagination';
import type { ChangelogAuthor } from './types';

interface Props {
  site: { id: string; rootDir: string | null } & Record<string, unknown>;
  dir: string;
  page: number;
  title: string;
  intro?: React.ReactNode;
  renderMode: 'md' | 'mdx' | 'auto' | undefined;
  siteHostname: string;
  siteFilePaths: string[];
  permalinksMapping: Record<string, string>;
  imageDimensions: ImageDimensionsMap;
}

export async function ChangelogIndexPage(props: Props) {
  const { entries } = await api.site.getChangelogEntries.query({ siteId: props.site.id, dir: props.dir });
  const pageData = paginate(entries, props.page, CHANGELOG_PAGE_SIZE);
  if (!pageData) notFound();

  // One batched author lookup for the whole page; getAuthors preserves input order.
  const handles = [...new Set(pageData.items.flatMap((e) => e.authors))];
  const resolved: ChangelogAuthor[] = handles.length
    ? await api.site.getAuthors.query({ siteId: props.site.id, authors: handles })
    : [];
  const byHandle = new Map(handles.map((h, i) => [h, resolved[i]!]));

  const bodies = await Promise.all(
    pageData.items.map(async (entry) => {
      const content = await api.site.getBlobContent.query({ id: entry.id }).catch(() => '');
      return renderPageContent({
        blob: { id: entry.id, path: entry.path },
        site: props.site,
        content: content ?? '',
        renderMode: props.renderMode,
        siteHostname: props.siteHostname,
        siteFilePaths: props.siteFilePaths,
        permalinksMapping: props.permalinksMapping,
        imageDimensions: props.imageDimensions,
      });
    }),
  );

  const baseUrl = ensureLeadingSlash(props.dir);
  return (
    <ChangelogIndex
      title={props.title}
      intro={props.intro}
      pagination={
        <ChangelogPagination
          baseUrl={baseUrl}
          page={pageData.page}
          pageCount={pageData.pageCount}
          shown={pageData.items.length}
          total={pageData.total}
        />
      }
    >
      {pageData.items.map((entry, i) => (
        <ChangelogEntry
          key={entry.id}
          entry={entry}
          variant="index"
          authors={entry.authors.map((h) => byHandle.get(h)).filter((a): a is ChangelogAuthor => !!a)}
        >
          {bodies[i]}
        </ChangelogEntry>
      ))}
    </ChangelogIndex>
  );
}
```

Note: `renderPageContent`'s `blob` option is typed loosely. If `MDXClient` needs more blob fields than `id`/`path`, fetch the full blob with `api.site.getBlobByPath.query({ siteId, path: entry.path })` and pass that. Check `components/public/mdx-client.tsx` props first.

Also check that `ensureLeadingSlash` in `lib/utils.ts` produces `/changelog` from `changelog`. If the site uses a `rootDir`, verify that blob paths are relative to it (they are for `editLink`, which prefixes `normalizedRootDir`), so `dir` maps straight onto the URL path.

- [x] **Step 2: Create `changelog-entry-page.tsx`**

```tsx
import { neighbours } from '@/lib/changelog';
import { ensureLeadingSlash } from '@/lib/utils';
import { api } from '@/trpc/server';
import { ChangelogEntry } from './changelog-entry';
import { ChangelogEntryNav } from './changelog-entry-nav';
import type { ChangelogAuthor } from './types';

interface Props extends React.PropsWithChildren {
  siteId: string;
  dir: string;
  blobPath: string;
  authors?: ChangelogAuthor[];
}

export async function ChangelogEntryPage({ siteId, dir, blobPath, authors, children }: Props) {
  const { entries } = await api.site.getChangelogEntries.query({ siteId, dir });
  const entry = entries.find((e) => e.path === blobPath);
  if (!entry) return <>{children}</>; // e.g. publish:false edge cases: fall back to the plain body
  const { newer, older } = neighbours(entries, blobPath);
  return (
    <>
      <ChangelogEntry entry={entry} authors={authors ?? []} variant="page" indexUrl={ensureLeadingSlash(dir)}>
        {children}
      </ChangelogEntry>
      <ChangelogEntryNav newer={newer} older={older} />
    </>
  );
}
```

- [x] **Step 3: Modify `page.tsx`**
  1. Add `searchParams` to the page props:
     ```ts
     export default async function SitePage(props: {
       params: Promise<RouteParams>;
       searchParams: Promise<Record<string, string | string[] | undefined>>;
     }) {
     ```
  2. Change the blob lookup so a missing blob doesn't 404 immediately:
     ```ts
     const blob = await api.site.getBlob
       .query({ siteId: site.id, slug: decodedSlug })
       .catch(() => null);
     ```
  3. Right after that, resolve the context:
     ```ts
     const changelog = await resolveChangelogContext({
       slug: decodedSlug,
       blob: blob ? { path: blob.path, metadata: blob.metadata as PageMetadata | null } : null,
       siteFilePaths,
       getFolderIndexMetadata: async (dir) => {
         const candidates = ['index.md', 'index.mdx', 'README.md', 'README.mdx'].map((f) => `${dir}/${f}`);
         const match = candidates.find((c) => siteFilePaths.some((p) => p.replace(/^\//, '') === c));
         if (!match) return null;
         const idx = await api.site.getBlobByPath.query({ siteId: site.id, path: match }).catch(() => null);
         return (idx?.metadata as PageMetadata | null) ?? null;
       },
     });
     ```
  4. The README-less index: if `!blob` and `changelog?.kind === 'index'`, return early:
     ```tsx
     if (!blob) {
       if (changelog?.kind !== 'index') notFound();
       const page = parsePageParam((await props.searchParams).page);
       if (page === null) notFound();
       return (
         <div className="layout-inner">
           <div className="layout-inner-center">
             <main className="page-main">
               <ChangelogIndexPage
                 site={site}
                 dir={changelog.dir}
                 page={page}
                 title="Changelog"
                 renderMode={siteConfig?.syntaxMode}
                 siteHostname={siteHostname}
                 siteFilePaths={siteFilePaths}
                 permalinksMapping={permalinksMapping}
                 imageDimensions={imageDimensions}
               />
             </main>
           </div>
         </div>
       );
     }
     ```
  5. For `changelog?.kind === 'index'` with a README blob, force `showToc` to `false` and replace the `<BlogLayout>…</BlogLayout>` element inside `<main className="page-main">` with the block below. The README body is the intro, and its title (fallback "Changelog") is the index title.
     ```tsx
     <ChangelogIndexPage
       site={site}
       dir={changelog.dir}
       page={changelogPage}
       title={metadata?.title || 'Changelog'}
       intro={pageContent?.trim() ? compiledContent : undefined}
       renderMode={renderMode}
       siteHostname={siteHostname}
       siteFilePaths={siteFilePaths}
       permalinksMapping={permalinksMapping}
       imageDimensions={imageDimensions}
     />
     ```
     Compute `changelogPage` near the top of this branch: `const changelogPage = parsePageParam((await props.searchParams).page); if (changelog?.kind === 'index' && changelogPage === null) notFound();`
     Also skip the hero for changelog pages (`showHero && !changelog`).
  6. For `changelog?.kind === 'entry'`, replace `<BlogLayout …>` with:
     ```tsx
     <ChangelogEntryPage siteId={site.id} dir={changelog.dir} blobPath={blob.path} authors={authors}>
       <div className="rendered-mdx" id="mdxpage">{compiledContent}</div>
     </ChangelogEntryPage>
     ```
  7. Otherwise leave the existing `BlogLayout` untouched.
  8. In `generateMetadata`, mirror the README-less case. Change the `getBlob` `.catch` so that when the slug's last segment is `changelog` (use `isChangelogDirName(decodedSlug)`), it returns `null` instead of calling `notFound()`. The title then falls back to `buildPageTitle('Changelog', siteName)` when `blob` is null and `isChangelogDirName(decodedSlug)`.
  9. Add the imports: `resolveChangelogContext`, `parsePageParam`, `isChangelogDirName`, `ChangelogIndexPage` and `ChangelogEntryPage`.

- [x] **Step 4: Type-check, lint and unit test**

Run: `cd apps/flowershow && npx tsc --noEmit -p . && pnpm lint && pnpm test`
Expected: no type errors, no lint errors, all tests PASS.

- [ ] **Step 5: Manual smoke test** _(BLOCKED 2026-09-18: Docker isn't installed and there's no apps/flowershow/.env. Covered partly by a new unit test, changelog-index-page.test.tsx.)_ (needs the local stack: `docker compose up -d` at repo root, then `pnpm dev` in `apps/flowershow`)

Publish the e2e test site (Task 8 seeds it), or use a local site containing `content/flowershow-app/changelog`. Then open `/changelog`, `/changelog?page=2`, `/changelog?page=99` (expect 404) and one entry page. Compare with the mockup.

- [x] **Step 6: Commit**

```bash
git add apps/flowershow/components/public/changelog "apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx"
git commit -m "feat(changelog): render changelog index and entry pages in site route"
```

---

### Task 7: Default theme styles

**Bead:** `flowershow-v8x.7`

**Files:**
- Modify: `apps/flowershow/styles/default-theme.css` (add a new section after the "Page layout" section, near line 1660, inside the same `@layer components` block)

- [x] **Step 1: Add the styles** (these translate the approved mockup into existing tokens)

```css
  /* ────────────────────────────────────────────────────
   Changelog (stable theme contract: .changelog-*)
   ──────────────────────────────────────────────────── */
  .changelog {
    max-width: 60rem;
    margin: 0 auto;
  }
  .changelog-header,
  .changelog-entry,
  .changelog-pagination {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0 3rem;

    @media (min-width: 768px) {
      grid-template-columns: 11rem minmax(0, 1fr);
    }
  }
  .changelog-header {
    margin-bottom: 3.5rem;
    font-family: var(--font-heading);

    > div {
      @media (min-width: 768px) {
        grid-column: 2;
      }
    }
  }
  .changelog-title {
    font-size: var(--font-size-5xl);
    font-weight: var(--font-weight-semibold);
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--color-foreground-900);
    text-wrap: balance;
  }
  .changelog-intro {
    margin-top: 0.75rem;
    max-width: 38rem;
    font-family: var(--font-body);
  }
  .changelog-entries {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .changelog-entry {
    padding-block: 3rem;
    border-top: 1px solid var(--color-foreground-100);
    scroll-margin-top: 5rem;

    &:first-child {
      border-top: 0;
      padding-top: 0;
    }
  }
  .changelog-entry-meta {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    line-height: 1.5;
  }
  .changelog-entry-meta-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.9rem;

    @media (min-width: 768px) {
      position: sticky;
      top: 5rem;
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 0;
    }
  }
  .changelog-entry-date {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: var(--font-weight-medium);
    font-variant-numeric: tabular-nums;
    color: var(--color-foreground-900);
    text-decoration: none;

    &::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 9999px;
      background: var(--color-accent);
      flex: none;
    }
  }
  .changelog-entry-version {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: var(--font-size-xs);
    background: var(--color-code-bg);
    border-radius: var(--radius);
    padding: 0.05rem 0.5rem;
  }
  .changelog-entry-authors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
  }
  .changelog-entry-author {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-foreground-600);
    text-decoration: none;

    img {
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      object-fit: cover;
    }
  }
  a.changelog-entry-author:hover span {
    text-decoration: underline;
    text-decoration-color: var(--color-accent);
    text-underline-offset: 3px;
  }
  .changelog-entry-content {
    min-width: 0;
  }
  .changelog-entry-title {
    font-family: var(--font-heading);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-semibold);
    line-height: 1.25;
    letter-spacing: -0.015em;
    color: var(--color-foreground-900);
    margin: 0 0 0.6rem;
    text-wrap: balance;

    a {
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
      text-decoration-color: var(--color-accent);
      text-underline-offset: 4px;
    }
  }
  .changelog-entry-description {
    font-size: var(--font-size-lg);
    font-style: italic;
    color: var(--color-foreground-700);
    margin: 0 0 1.25rem;
  }
  .changelog-entry-media {
    margin: 0 0 1.5rem;
    border: 1px solid var(--color-foreground-100);
    border-radius: var(--radius);
    overflow: hidden;

    img {
      display: block;
      width: 100%;
      height: auto;
    }
  }
  .changelog-entry-body {
    max-width: 40rem;
  }
  .changelog-pagination {
    border-top: 1px solid var(--color-foreground-100);
    padding-top: 2rem;
    font-family: var(--font-heading);
  }
  .changelog-pagination-inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;

    @media (min-width: 768px) {
      grid-column: 2;
    }
    a {
      font-weight: var(--font-weight-medium);
      color: var(--color-foreground-900);
      text-decoration: none;
    }
  }
  .changelog-pagination-count {
    color: var(--color-foreground-400);
    font-variant-numeric: tabular-nums;
  }
  .changelog-single {
    max-width: 44rem;
    margin: 0 auto;

    .changelog-entry-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .changelog-entry-title {
      font-size: var(--font-size-5xl);
      line-height: 1.15;
    }
  }
  .changelog-back {
    display: inline-block;
    margin-bottom: 2rem;
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    color: var(--color-foreground-400);
    text-decoration: none;
  }
  .changelog-entry-nav {
    max-width: 44rem;
    margin: 3.5rem auto 0;
    padding-top: 2rem;
    border-top: 1px solid var(--color-foreground-100);
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    font-family: var(--font-heading);

    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
    a {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--color-foreground-100);
      border-radius: var(--radius);
      text-decoration: none;
    }
    a:hover {
      border-color: var(--color-accent);
    }
    small {
      color: var(--color-foreground-400);
    }
    span {
      color: var(--color-foreground-900);
      font-weight: var(--font-weight-medium);
    }
    .changelog-entry-nav-newer {
      @media (min-width: 640px) {
        text-align: right;
      }
    }
  }
```

- [x] **Step 2: Visual check** (local stack). Open `/changelog` in light and dark mode at 1280px and 390px widths, and compare with the mockup. Adjust spacing values only if something is visibly broken. The contract (class names) must not change. _(Done 2026-09-18 via a static render of the real components with the compiled CSS, because the app stack was unavailable. Fixed two issues found: `.rendered-mdx`'s page `min-h-[55vh]` spaced entries a screen apart, so there's now an override; and the 1-column grid needed `minmax(0, 1fr)`. The version pill uses `--color-foreground-50` because `--color-code-bg` doesn't switch in dark mode.)_

- [x] **Step 3: Commit**

```bash
git add apps/flowershow/styles/default-theme.css
git commit -m "feat(changelog): default theme styles for changelog pages"
```

---

### Task 8: E2E fixture and spec

**Bead:** `flowershow-v8x.5`, `flowershow-v8x.6`

**Files:**
- Create: `apps/flowershow/e2e/fixtures/test-site/changelog/README.md`
- Create: 12 entries `apps/flowershow/e2e/fixtures/test-site/changelog/2026-01-DD-entry-N.md` (N = 1..12, DD = 01..12). Entry 12 is the newest.
- Create: `apps/flowershow/e2e/fixtures/test-site/releases/README.md` (opt-in via layout) plus `releases/2026-02-01-release-one.md`
- Create: `apps/flowershow/e2e/specs/changelog.spec.ts`

- [x] **Step 1: Create the fixtures**

`changelog/README.md`:

```md
---
title: Test Changelog
---

Updates to the test site.
```

Create each entry `changelog/2026-01-DD-entry-N.md` with a small shell loop, run from `apps/flowershow/e2e/fixtures/test-site`:

```bash
for n in $(seq 1 12); do d=$(printf "%02d" $n); cat > "changelog/2026-01-$d-entry-$n.md" <<EOF
---
title: Entry $n
date: 2026-01-$d
description: Description for entry $n.
authors:
  - alice
---

Body of entry $n.
EOF
done
```

`releases/README.md`:

```md
---
title: Releases
layout: changelog
---
```

`releases/2026-02-01-release-one.md`:

```md
---
title: Release one
---

First release.
```

Check `e2e/setup.ts` to see whether fixture files are globbed automatically or listed explicitly. If they're listed, add the new files. Also check whether a `people/alice.md` exists in the fixture (the blog spec uses `alice`). If it doesn't, the author renders as the raw handle, which the spec below allows.

- [x] **Step 2: Write the spec** `e2e/specs/changelog.spec.ts`:

```ts
import { expect, test } from '../helpers/fixtures';

test('Changelog folder renders as a timeline', async ({ page, basePath }) => {
  await page.goto(`${basePath}/changelog`);

  await test.step('header from README', async () => {
    await expect(page.locator('.changelog-title')).toHaveText('Test Changelog');
    await expect(page.locator('.changelog-intro')).toContainText('Updates to the test site.');
  });

  await test.step('first page shows 10 full entries, newest first', async () => {
    const entries = page.locator('.changelog-entry');
    await expect(entries).toHaveCount(10);
    await expect(entries.nth(0).locator('.changelog-entry-title')).toHaveText('Entry 12');
    await expect(entries.nth(0).locator('.changelog-entry-body')).toContainText('Body of entry 12.');
    await expect(entries.nth(0)).toHaveAttribute('id', '2026-01-12-entry-12');
  });

  await test.step('pagination to page 2', async () => {
    await page.getByText('Older updates →').click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(page.locator('.changelog-entry')).toHaveCount(2);
    await expect(page.locator('.changelog-entry-title').first()).toHaveText('Entry 2');
  });
});

test('Out-of-range changelog page is a 404', async ({ page, basePath }) => {
  const res = await page.goto(`${basePath}/changelog?page=99`);
  expect(res?.status()).toBe(404);
});

test('Changelog entry page', async ({ page, basePath }) => {
  await page.goto(`${basePath}/changelog/2026-01-05-entry-5`);
  await expect(page.locator('.changelog-single h1')).toHaveText('Entry 5');
  await expect(page.locator('.changelog-back')).toHaveAttribute('href', /\/changelog$/);
  await expect(page.locator('.changelog-entry-nav')).toContainText('Entry 4');
  await expect(page.locator('.changelog-entry-nav')).toContainText('Entry 6');
});

test('layout: changelog opts another folder in', async ({ page, basePath }) => {
  await page.goto(`${basePath}/releases`);
  await expect(page.locator('.changelog-title')).toHaveText('Releases');
  await expect(page.locator('.changelog-entry')).toHaveCount(1);
});
```

- [ ] **Step 3: Run the E2E tests** (needs the local stack) _(BLOCKED 2026-09-18: Docker isn't installed and there's no .env. The spec type-checks and `playwright test --list changelog` lists all 4 tests.)_

Run: `cd apps/flowershow && npx playwright test --project=chromium changelog`
Expected: PASS.

If the stack can't run in this environment, note it in bead `flowershow-v8x.5` (`bd update flowershow-v8x.5 --append-notes "E2E not run: <reason>"`), leave the bead open, and continue.

Also re-run `blog` and `basic-rendering`, which must still pass. Adding the `changelog/` folder must not change the existing blog list counts.

- [x] **Step 4: Commit**

```bash
git add apps/flowershow/e2e
git commit -m "test(changelog): e2e fixture and spec for changelog folder rendering"
```

- [ ] **Step 5: Close beads** once Tasks 6–8 are green: `bd close flowershow-v8x.4 flowershow-v8x.5 flowershow-v8x.6`

---

### Task 9: Docs and theme class reference

**Bead:** `flowershow-v8x.10` (docs); also covers the documentation part of `flowershow-v8x.7`

**Files:**
- Create: `content/flowershow-app/docs/reference/changelog.md`
- Modify: `content/flowershow-app/docs/reference/theme-class-reference.md`

- [x] **Step 1: Write the user docs** in `docs/reference/changelog.md`. Follow the style of neighbouring reference pages such as `list-component.md` and `page-authors.md`, and read one first. Cover:
  - making a `changelog/` folder with `YYYY-MM-DD-slug.md` entries
  - frontmatter: `title`, `date`, `description`, `image`, `authors`, `version`
  - authors via `people/`
  - the optional `README.md` intro
  - pagination (10 per page)
  - `layout: changelog` to opt another folder in, and any other `layout` to opt out
  - a note that single-file `CHANGELOG.md` support is coming

  Don't hard-wrap lines.

- [x] **Step 2: Add a "Changelog" section to `theme-class-reference.md`** _(The reference is GENERATED: added a `changelog` group and classifier to `scripts/theme-class-reference.mjs` and ran `pnpm docs:theme-classes`. Without this, root `pnpm lint`/`pnpm test` fail with "Unclassified theme class: .changelog".)_, following the file's existing table format. List every class in the Global Constraints contract, plus the helper classes `.changelog-entry-meta-inner`, `.changelog-entry-content`, `.changelog-pagination-inner`, `.changelog-pagination-count`, `.changelog-back`, `.changelog-entry-nav-older` and `.changelog-entry-nav-newer`, each with a one-line description.

- [x] **Step 3: If the docs sidebar/nav is config-driven, add the page** (check `content/flowershow-app/config.json` for how reference pages are listed). If `docs/plans` or the repo has a sitemap regeneration step (see commit `ed3af38b chore(docs): regenerate docs sitemap`), run it.

- [x] **Step 4: Commit**

```bash
git add content/flowershow-app/docs
git commit -m "docs: changelog rendering reference and theme classes"
```

---

### Task 10: Dogfood on flowershow.app and check the official themes

**Bead:** `flowershow-v8x.9` (dogfood) and `flowershow-v8x.7` (themes)

**Files:**
- Modify: `content/flowershow-app/changelog/README.mdx`
- Possibly modify: `../themes/<theme>/theme.css` (separate repo at `/Users/rgrp/src/flowershow/themes`)

- [ ] **Step 1: Drop `<List>` from the product changelog**

Replace the body of `content/flowershow-app/changelog/README.mdx` so it keeps the frontmatter (`title: Changelog`, `description: …`), drops `syntaxMode: mdx` and the `<List …/>` line, and keeps the one-line intro "This page tracks what we ship in Flowershow." Rename the file to `README.md` with `git mv`, since it no longer needs MDX.

- [ ] **Step 2: Private dogfood publish.** This runs against **production** Flowershow, which only has the new renderer after deploy, so do it after the branch is deployed to a preview or merged. Until then, verify locally with `pnpm dev`. The command is:

Run: `fl content/flowershow-app --name changelog-dogfood-private` (check `fl --help` for the private/visibility flag, and use it).
Expected: a private site URL. Open `/changelog` and compare it with the mockup.

- [ ] **Step 3: Theme check.** For each official theme (leaf, letterpress, lessflowery, monospace, superstack, material-draft), set `"theme": "<name>"` in a local test site's `config.json`, then view `/changelog` and one entry page. Only where something is visibly broken (unreadable, overlapping, wrong font inheritance), add minimal overrides in that theme's `theme.css` using the documented classes. Commit theme changes in the themes repo on its own branch, and **do not push without asking**.

- [ ] **Step 4: Commit the dogfood change**

```bash
git add content/flowershow-app/changelog
git commit -m "content: use built-in changelog rendering for flowershow.app changelog"
```

- [ ] **Step 5: Close beads** when done: `bd close flowershow-v8x.7 flowershow-v8x.9`. Then check that `flowershow-v8x.8` (RSS) is still open for a follow-up: the existing site RSS (`lib/rss.ts`) already includes any dated page, so decide there whether a changelog-specific feed is needed.

---

## Hand-off rules for unattended runs

- Always start with `bd ready` and `git log --oneline -10` on `feat/changelog-rendering`, then pick the lowest-numbered unfinished task above.
- Never push, open PRs, publish public sites, or touch production without asking Rufus.
- If a step needs the local Docker stack and it isn't running, try `docker compose up -d` once. If that fails, record it in bead notes and move to the next task that doesn't need it.
- Record progress in beads notes (`bd update <id> --append-notes "..."`) at the end of each session.
