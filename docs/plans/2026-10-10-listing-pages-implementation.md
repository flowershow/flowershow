# Listing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship ```` ```list ````/```` ```blog ```` blocks and `layout: list` folder pages that render a server-side, paginated, themeable listing from frontmatter in both `.md` and `.mdx`, plus two small fixes to the legacy `<List />`.

**Architecture:** One async remark plugin (`lib/remark-listing.ts`) registered in both pipelines finds the fences (and, for `layout: list` pages, appends an implicit one), parses options (`lib/listing/spec.ts`), queries the folder once via Prisma behind `unstable_cache` (`lib/listing/query.ts`), resolves authors in one batched query (`lib/listing/authors.ts`), slices the page (`lib/listing/paginate.ts`) and replaces the fence with generic mdast nodes carrying `data.hName`/`hProperties` (`lib/listing/render.ts`), the technique `lib/remark-changelog.ts` uses. Images are the one component (`ListingImage`, `next/image`), emitted as an MDX JSX element exactly like `ObsidianBasesViews`. A tiny rehype step strips item-heading ids so items never reach slugs, autolinks or the ToC.

**Tech Stack:** Next.js 15 (app router), unified/remark/rehype, next-mdx-remote-client, Prisma 5, `yaml`, vitest (jsdom, `--project=unit`), Playwright, Biome + ESLint, pnpm + turbo.

**Spec:** `docs/plans/2026-10-10-listing-pages-design.md` (on `origin/main`), especially section 8 "v1" and "Changes after review". Background: `docs/plans/2026-10-10-listing-pages-consolidation.md`. Executors read the design alongside this plan; where this plan deviates it says so and why (see "Design deviations" at the end).

All paths below are relative to `apps/flowershow/` unless they start with `content/`, `scripts/`, `docs/` or a repo name.

## Global Constraints

- Works identically in `.md` (`processMarkdown`) and `.mdx` (`getMdxOptions`); every renderer change gets a parity test.
- Exactly seven option keys: `from`, `view`, `sort`, `limit`, `pageSize`, `show`, `where`. Silent aliases: `dir`, `folder` (for `from`). Nothing else.
- Views: `list` (default), `cards`, `compact`.
- Defaults: `sort: date desc`; `show: [image, date, title, description, authors]` (`compact`: `[date, title]`); `pageSize: 20` on `layout: list` pages, none for inline blocks; ```` ```blog ```` means `from: blog`.
- Item rules: under `from` at any depth; `.md`/`.mdx` with an `appPath`; not the listed folder's own `README`/`index` (any case); nested indexes are items; not the page containing the list; not `publish: false`; not `draft: true`.
- Page N is `?page=N` on the page's public URL; page 1 is the bare URL; other params dropped; `?page=abc|0|-1` render page 1; one paginated listing per page; at most 10 listings per page (the rest get an error card).
- `limit` with an explicit `pageSize` renders the list (using `limit`) with an inline note (`p.list-component-note`), not an error card.
- Every `hProperties` value emitted by the renderer is a string (md/mdx parity).
- Emitted classes: the existing `.list-component-*` family unchanged plus additive modifiers/classes listed in design section 6. No existing CSS rule in `styles/default-theme.css` is modified.
- Empty state text: `Nothing here yet.` Error card heading: `List block has problems` (blocks) / `List settings have problems` (`layout: list`). Key footer: `Keys: from, view, sort, limit, pageSize, show, where.`
- Item headings: no `id`, no `.heading-link`, `data-toc-ignore`, never in the ToC.
- No client JavaScript for `.md` pages; no tRPC round trip; no skeleton.
- Legacy `<List />` output is unchanged except the two Deliverable A fixes.
- Repo rules (`AGENTS.md`): update the README of any package whose documented behaviour changes (`e2e/README.md` here); changelog entry with a ~1440px `.webp` screenshot; security checklist before finishing; never hard-wrap Markdown.

## Review Focus

1. **Obsidian-capitalised folders.** A vault with `Blog/` and a ```` ```blog ```` block (implicit `from: blog`) should list `Blog/`, not show "Nothing here yet.". Pinned in Task B4 (`resolveFolderCase`), Task B10 and the e2e `case.md` page (Task B18).
2. **Malformed item frontmatter.** `title: 1984`, `date: TBD`, `authors: {name: x}`, `image: [a, b]`, `description: 42`, `tags: featured` (scalar) must render a sensible item and never throw. Pinned in Task B4 (`toListingItem`) and Task B8 (render).
3. **Spaces and non-ASCII in paths.** `blog/2026/nested post ü.md` must link to its stored `appPath` (encoded by ingestion as `encodeSlug(filePathToSlug(path))`) and its image `src` must be URL-encoded. Pinned in Task B4, the encoded seed (Task B17) and an e2e click-through (Task B18).
4. **Junk and huge `?page` values.** `?page=2&utm_source=x` must produce links without `utm_source`; `?page=99999999999999999999` must render the empty state plus strip, not throw. Pinned in Task B6.
5. **Blocks not at top level.** A ```` ```list ```` inside a callout, blockquote or list item, and a `~~~blog` tilde fence, must render. Pinned in Task B10.

## Execution phases

Hand each phase to a separate agent, in order. Task IDs (A1, B1, …) are stable references used throughout this plan; **execution order is the order of this list**, not the numeric order (for example B11 runs in Phase 2, B12 in Phase 3).

| Phase | Tasks, in order | Entry criteria | Exit criteria |
| --- | --- | --- | --- |
| **1. PR A: legacy fixes** | A1, A2, A3 | Worktree `/Users/rgrp/src/flowershow/flowershow-listings` created on `fix/legacy-list-publish-ellipsis` off a fresh `origin/main`; `pnpm install`; `prisma generate`; type-error baseline recorded | PR A open; `Unit Tests`, `Lint`, `E2E Tests` green in CI; bead updated |
| **2. PR B core** | B1, B2, B3, B4, B5, B6, B7 (two commits), B8, B9, B10, B11, B13, B14 | Phase 1 exit; in the same worktree `git switch -c feat/listing-pages fix/legacy-list-publish-ellipsis` (or off `origin/main` if A has merged) | All listed unit tests and the parity test (`lib/markdown-listing.test.tsx`) pass; `pnpm lint` and `pnpm test` green; no new type errors; every task committed; nothing pushed yet is fine |
| **3. PR B presentation** | B16, B12, B15, B24, B25, B26 (draft PR), B17, B18, B19 | Phase 2 exit | Storybook project passes; mockup PNGs committed under `docs/pr-assets/listings/`; draft PR open with source + screenshots in the body; CI `E2E Tests` green including the `listings` project; CI time noted; opt-in screenshot workflow triggered once |
| **4. PR B finish** | B20, B21, B22, B23 | Phase 3 exit (draft PR green) | Security notes in the PR body; reference docs, `llms.txt`, legacy banner and changelog entry committed (frontmatter parses); all local and CI gates green; PR marked ready; issues commented; follow-up beads filed |
| **5. Cross-repo and docs PR** | C1 (themes), D1 (skills), E1 (guides docs PR) | PR B ready for review (C1, E1) and deployed (D1 opens only once the docs URL resolves; C1 merges only after B deploys) | Three PRs open with screenshots/notes; E1 merged the same day as B |

### Environment (this machine)

- **No Docker, colima or podman, and none will be installed.** Local verification is: unit tests (vitest `--project=unit`, after `prisma generate`), the md/mdx parity test, `tsc`, lint/format, and Storybook (`--project=storybook`, `build-storybook`). The CI workflow `.github/workflows/e2e.yml` is the e2e gate; never try to run `pnpm dev`, `scripts/dev-up.sh`, the e2e seed or Playwright e2e specs locally.
- There is no `apps/flowershow/.env`; unit tests do not need one (`vitest.setup.ts` mocks `@/env.mjs`; `SKIP_ENV_VALIDATION` is set by `vitest.config.ts`).
- Playwright's Chromium download (`npx playwright install chromium`) is allowed: Storybook's vitest project and the screenshot script need it.

---

## How to work in this repo

- The main checkout at `/Users/rgrp/src/flowershow/flowershow` is on an unrelated branch. Never switch it or edit in it. Use one worktree for this whole plan:
  - Phase 1: `git -C /Users/rgrp/src/flowershow/flowershow fetch origin && git -C /Users/rgrp/src/flowershow/flowershow worktree add /Users/rgrp/src/flowershow/flowershow-listings -b fix/legacy-list-publish-ellipsis origin/main`
  - Phase 2: `cd /Users/rgrp/src/flowershow/flowershow-listings && git switch -c feat/listing-pages fix/legacy-list-publish-ellipsis` (if A is merged: `git fetch origin && git switch -c feat/listing-pages origin/main`). Rebase onto `origin/main` once A merges; B imports `lib/page-window.ts` from A.
  - Phase 5 (E1): `git switch -c docs/listing-guides origin/main` (or off `feat/listing-pages` while B is open). Switch only with a clean `git status`.
  - Then, after every branch creation that changes dependencies: `pnpm install` at the worktree root, then `cd apps/flowershow && npx prisma generate` (direct `npx vitest run` does not run it; `pnpm test` does).
- Unit tests: `cd /Users/rgrp/src/flowershow/flowershow-listings/apps/flowershow && npx vitest run --project=unit <path>` (the `test:unit` script starts watch mode; use `vitest run`). Full suite: `pnpm test` at the worktree root (also runs `scripts/theme-class-reference.test.mjs`).
- Storybook: `npx vitest run --project=storybook <story files>`; `pnpm storybook` to look; `pnpm build-storybook` to build `deploy/storybook/out`.
- Lint/format: `pnpm lint` at the worktree root (runs `docs:theme-classes:check` then ESLint) and `npx biome format --write <files>`.
- Types: record a baseline before starting: `cd apps/flowershow && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -1`. After each task the error count must not grow. e2e specs: `npx tsc --noEmit -p e2e/tsconfig.json`.
- e2e: CI only (see "Environment"). Push and use `gh pr checks --watch` / `gh run watch`.
- Commit after every task. End every commit message with `Claude-Session: https://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q`; end PR descriptions with `https://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q`.
- Tracking: beads is the primary tracker (`bd -C /Users/rgrp/src/flowershow/flowershow ...`). Before starting, `bd show flowershow-sgw`; create child beads `listing: legacy List fixes` (A), `listing: v1 engine` (B) and `listing: guides` (E) with `--external-ref` to the PRs once opened.

## File structure

Deliverable A (small PR):

| File | Responsibility |
| --- | --- |
| Create `lib/page-window.ts` (+ `.test.ts`) | Pure: which page numbers and ellipses a pagination strip shows. Shared by legacy and new pagination. |
| Modify `components/public/mdx/list-pagination.tsx` (+ new `list-pagination.test.tsx`) | Legacy strip uses `pageWindow` (one ellipsis per gap). |
| Modify `server/api/routers/site.ts` (`getListComponentItems` SQL) + `server/api/routers/__tests__/site.test.ts` | Exclude `publish: false`. |

Deliverable B (main PR):

| File | Responsibility |
| --- | --- |
| Create `lib/listing/spec.ts` (+ test) | Parse/validate block YAML, `list:` frontmatter, the `blog` preset → `ListingSpec` or error messages; folder-note default. Pure. |
| Create `lib/listing/rules.ts` (+ test) | `isDraft`, `isUnpublished`. Pure; shared with RSS. |
| Create `lib/listing/query.ts` (+ test) | Item rules, `where`, sort (pure `selectListingRows`), folder fetch, cached `queryListingRows`, `resolveFolderCase`, `toListingItem` (title/date/description/image/fields). |
| Create `lib/listing/authors.ts` (+ test) | `resolveAuthors` batched + anchored (used by tRPC `getAuthors`); `cachedResolveAuthors` (used by the plugin). |
| Create `lib/listing/paginate.ts` (+ test) | `sliceListing`, `pageHref`, `pageFromSearchParam`, `listingCanonical`. Pure. |
| Create `lib/listing/render.ts` (+ test) | `ListingSpec` + page of items → mdast (section 6 HTML), error card, pagination. Pure. |
| Create `lib/remark-listing.ts` (+ test) | The plugin: find fences, implicit listing, one-paginated rule, 10-listings cap, notes, error isolation. |
| Create `lib/rehype-listing-headings.ts` (+ test) | Strip placeholder ids from item headings after `rehype-slug`. |
| Create `components/public/mdx/listing-image.tsx` (+ test) | `next/image` leaf for thumbnails and avatars. |
| Create `lib/markdown-listing.test.tsx` | Pipeline parity: same block through `processMarkdown` and MDX. |
| Modify `lib/markdown.ts` | Register plugin + rehype step in both chains; `listingimage` in `rehypeToReact` map; autolink `test`. |
| Modify `components/public/mdx/mdx-components-factory.tsx` | Register `ListingImage`. |
| Modify `components/public/table-of-contents.tsx` | Exclude `[data-toc-ignore]`. |
| Modify `lib/render-page-content.tsx`, `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` | Pass `listing` context; self-canonical for `layout: list` page > 1. |
| Modify `server/api/types.ts` | `draft?`, `list?` on `PageMetadata`. |
| Modify `lib/rss.ts` (+ test) | Skip drafts. |
| Modify `server/api/routers/site.ts` (+ test) | `getAuthors` delegates to `resolveAuthors`. |
| Modify `styles/default-theme.css`, `scripts/theme-class-reference.mjs`, regenerate `content/flowershow-app/docs/reference/theme-class-reference.md` | New modifier rules, classes, custom properties. |
| Create `e2e/fixtures/listings-demo/**` | Demo/fixture site (≈45 files). |
| Modify `e2e/helpers/seed.ts`, `playwright.config.ts`, `e2e/README.md` | Seed the demo as its own site + `listings` project. |
| Create `e2e/specs/listings.spec.ts`, `e2e/specs/listings-screenshots.spec.ts` | e2e (CI) + gated screenshot capture. |
| Modify `.github/workflows/e2e.yml` (repo root) | `workflow_dispatch` opt-in that captures listing screenshots and uploads them as an artifact. |
| Create `stories/Listing.stories.tsx`, `stories/__fixtures__/listing.tsx`, `stories/__fixtures__/listing-assets/*` | Storybook mockup (primary visual review) on the real renderer with real changelog content. |
| Create `scripts/capture-listing-stories.mjs`; `docs/pr-assets/listings/*.png` (repo root) | First-fold screenshots of the stories for the PR body (droppable before merge). |
| Docs under `content/flowershow-app/` | New `docs/reference/listings.md`, legacy banner on `list-component.md`, `llms.txt`, changelog entry. |

Deliverable E (docs PR, flowershow repo): guide rewrites, `custom-collection-cards` tutorial removal + redirects, docs card, sitemap.

Deliverable C (repo `flowershow/themes`): `.is-disabled` audit. Deliverable D (repo `flowershow/skills`): `SKILL.md` snippet.

All app paths above are relative to `apps/flowershow/`.

---

# Phase 1: PR A, legacy `<List />` fixes (separate small PR)

Branch `fix/legacy-list-publish-ellipsis` in the worktree `/Users/rgrp/src/flowershow/flowershow-listings`. No user-visible change other than: `publish: false` pages no longer appear in `<List />`, and the page strip shows one `...` per gap.

### Task A1: `pageWindow` helper and collapsed legacy ellipsis

**Files:**
- Create: `lib/page-window.ts`, `lib/page-window.test.ts`
- Create: `components/public/mdx/list-pagination.test.tsx`
- Modify: `components/public/mdx/list-pagination.tsx:48-77`

**Interfaces:**
- Produces: `export type PageWindowEntry = number | 'ellipsis'; export function pageWindow(current: number, pageCount: number, radius?: number): PageWindowEntry[]` (used by Task B7).

- [ ] **Step 1: Write the failing helper test** (`lib/page-window.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { pageWindow } from './page-window';

describe('pageWindow', () => {
  it('shows nothing for zero pages and a single page for one', () => {
    expect(pageWindow(1, 0)).toEqual([]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
  it('shows every page when there is no gap', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('collapses each gap into exactly one ellipsis', () => {
    expect(pageWindow(1, 12)).toEqual([1, 2, 3, 'ellipsis', 12]);
    expect(pageWindow(6, 12)).toEqual([1, 'ellipsis', 4, 5, 6, 7, 8, 'ellipsis', 12]);
    expect(pageWindow(12, 12)).toEqual([1, 'ellipsis', 10, 11, 12]);
  });
  it('fills a one-page gap with the page instead of an ellipsis', () => {
    expect(pageWindow(5, 12)).toEqual([1, 2, 3, 4, 5, 6, 7, 'ellipsis', 12]);
  });
  it('clamps out-of-range and non-integer current pages', () => {
    expect(pageWindow(99, 12)).toEqual(pageWindow(12, 12));
    expect(pageWindow(0, 12)).toEqual(pageWindow(1, 12));
    expect(pageWindow(Number.NaN, 3)).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** (`Cannot find module './page-window'`)

Run: `npx vitest run --project=unit lib/page-window.test.ts`

- [ ] **Step 3: Implement** (`lib/page-window.ts`)

```ts
export type PageWindowEntry = number | 'ellipsis';

/**
 * Page numbers a pagination strip shows: the first, the last and the current
 * page ±radius. A gap of exactly one page shows that page; a longer gap
 * collapses into a single 'ellipsis'.
 */
export function pageWindow(
  current: number,
  pageCount: number,
  radius = 2,
): PageWindowEntry[] {
  if (pageCount < 1) return [];
  const c = Math.min(Math.max(1, Math.trunc(current) || 1), pageCount);
  const shown = new Set<number>([1, pageCount]);
  for (let p = c - radius; p <= c + radius; p++) {
    if (p >= 1 && p <= pageCount) shown.add(p);
  }
  const out: PageWindowEntry[] = [];
  let prev = 0;
  for (const p of [...shown].sort((a, b) => a - b)) {
    if (p - prev === 2) out.push(prev + 1);
    else if (p - prev > 2) out.push('ellipsis');
    out.push(p);
    prev = p;
  }
  return out;
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Write the failing component test** (`components/public/mdx/list-pagination.test.tsx`; mocks copied from `list.test.tsx`)

```tsx
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ListComponentPagination from './list-pagination';

const mockUseSearchParams = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/blog',
  useSearchParams: () => mockUseSearchParams(),
}));

afterEach(cleanup);

describe('ListComponentPagination', () => {
  it('renders one ellipsis per gap, not one per hidden page', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('page=6'));
    const { container } = render(<ListComponentPagination totalPages={12} />);
    expect(container.querySelectorAll('.list-component-pagination-ellipsis')).toHaveLength(2);
    const pages = [...container.querySelectorAll('.list-component-pagination-page-button')].map((b) => b.textContent);
    expect(pages).toEqual(['1', '4', '5', '6', '7', '8', '12']);
  });
  it('renders no ellipsis when all pages fit', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    const { container } = render(<ListComponentPagination totalPages={4} />);
    expect(container.querySelectorAll('.list-component-pagination-ellipsis')).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Run it, expect FAIL** (today's code renders 5 ellipsis spans, one each for pages 2, 3, 9, 10, 11)

Run: `npx vitest run --project=unit components/public/mdx/list-pagination.test.tsx`

- [ ] **Step 7: Replace the `Array.from(...).map(...)` block in `list-pagination.tsx`** (keep classes, `...` text and buttons identical)

```tsx
import { pageWindow } from '@/lib/page-window';
// ...
      <div className="list-component-pagination-pages">
        {pageWindow(currentPage, totalPages).map((entry, i) =>
          entry === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="list-component-pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={entry}
              onClick={() => goToPage(entry)}
              aria-current={currentPage === entry ? 'page' : undefined}
              className={`list-component-pagination-page-button ${
                currentPage === entry
                  ? 'list-component-pagination-page-button--current'
                  : 'list-component-pagination-page-button--other'
              }`}
            >
              {entry}
            </button>
          ),
        )}
      </div>
```

- [ ] **Step 8: Run both tests and the existing `list.test.tsx`, expect PASS**

Run: `npx vitest run --project=unit lib/page-window.test.ts components/public/mdx/`

- [ ] **Step 9: Commit**

```bash
git add lib/page-window.ts lib/page-window.test.ts components/public/mdx/list-pagination.tsx components/public/mdx/list-pagination.test.tsx
git commit -m "fix(list): collapse hidden pagination pages into one ellipsis per gap"
```

### Task A2: exclude `publish: false` from `getListComponentItems`

**Files:**
- Modify: `server/api/routers/site.ts:1416-1428` (the `$queryRaw` in `getListComponentItems`)
- Test: `server/api/routers/__tests__/site.test.ts:742` (`describe('site.getListComponentItems')`)

Note for the reviewer: the worker deletes `publish: false` files at ingestion (`apps/cloudflare-worker/src/queue-consumer.js:198`), so this only bites legacy rows and the window before the delete event lands. It is defence in depth, matching `toChangelogEntries` and `filterRssBlobs`.

- [ ] **Step 1: Add the failing test** inside the existing `describe('site.getListComponentItems')`

```ts
  it('excludes pages with publish: false in SQL', async () => {
    const db = createMockDb({ blobs: [] }) as ReturnType<typeof createMockDb> & { $queryRaw: ReturnType<typeof vi.fn> };
    db.$queryRaw = vi.fn(async () => []);
    const caller = createCaller(db);
    await caller.site.getListComponentItems({ siteId: 'site-1', dir: '/blog', slots: {} });
    const [strings] = db.$queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    expect(strings.join('?').replace(/\s+/g, ' ')).toContain(`("metadata"->>'publish') IS DISTINCT FROM 'false'`);
  });
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run --project=unit server/api/routers/__tests__/site.test.ts -t getListComponentItems`

- [ ] **Step 3: Add one line to the SQL** after `AND "app_path" IS NOT NULL`

```sql
                AND ("metadata"->>'publish') IS DISTINCT FROM 'false'
```

- [ ] **Step 4: Run, expect PASS**; also run the whole file to confirm nothing else broke.

- [ ] **Step 5: Commit** `fix(list): never list publish: false pages in <List />`

### Task A3: verify and open PR A

- [ ] **Step 1:** `pnpm lint && pnpm test` at the worktree root. Expected: green.
- [ ] **Step 2:** `cd apps/flowershow && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -1` (no new errors vs baseline). There is no local e2e on this machine: after pushing, the CI `E2E Tests` job is the gate, and `blog.spec.ts` must pass unchanged (`gh pr checks --watch`).
- [ ] **Step 3:** Note for the reviewer, in the PR body: with `?page=abc` the legacy `currentPage` is `NaN`, so no button gets `--current` (pre-existing; `pageWindow` clamps the strip but this PR does not change `currentPage` parsing).
- [ ] **Step 3b:** Security checklist (`AGENTS.md`): SQL change is a constant predicate, no new input. Note it in the PR.
- [ ] **Step 4:** `git push -u origin fix/legacy-list-publish-ellipsis && gh pr create --title "fix(list): hide publish: false pages and collapse pagination ellipsis" --body "<summary; refs #1120 #924; changelog bullets ship in the listings entry (PR B) under Fixes>\n\nhttps://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q"`
- [ ] **Step 5:** `bd -C /Users/rgrp/src/flowershow/flowershow create "listing: legacy List fixes" --external-ref <PR url>` (or update the bead created at start).

Changelog: AGENTS.md says fixes are bullets in the most related entry. The related entry is the one PR B creates (Task B22); it carries both bullets under **Fixes**. If PR B slips by more than a few days after A merges, add the two bullets to the newest changelog entry instead.

---

# Deliverable B: list blocks and `layout: list` (main PR)

Branch `feat/listing-pages` in the worktree `/Users/rgrp/src/flowershow/flowershow-listings`.

# Phase 2: PR B core (engine, pipelines, unit and parity tests)

### Task B1: metadata types

**Files:**
- Modify: `server/api/types.ts:123-170` (`PageMetadata`)

- [ ] **Step 1:** Add, next to `layout`:

```ts
  /** `true` keeps the page reachable by URL but out of listings and RSS. */
  draft?: boolean;
  /** Options for `layout: list` (same keys as a ```list block). Untrusted. */
  list?: unknown;
```

- [ ] **Step 2:** `npx tsc --noEmit -p tsconfig.json | tail -1`; error count unchanged from baseline.
- [ ] **Step 3: Commit** `chore(types): add draft and list to PageMetadata`

### Task B2: option parsing (`spec.ts`)

**Files:**
- Create: `lib/listing/spec.ts`, `lib/listing/spec.test.ts`

**Interfaces:**
- Consumes: `isFolderIndexPath`, `dirOf` from `@/lib/changelog`.
- Produces:

```ts
export const LISTING_KEYS = ['from', 'view', 'sort', 'limit', 'pageSize', 'show', 'where'] as const;
export type ListingView = 'list' | 'cards' | 'compact';
export type ListingSort = { field: string; direction: 'asc' | 'desc' };
export type ListingSpec = {
  from: string;                 // no leading/trailing slash, rootDir stripped, '' = site root
  view: ListingView;
  sort: ListingSort;
  limit: number | null;
  pageSize: number | null;      // null = not paginated
  show: string[];
  where: Record<string, string>;
};
export type ListingSource = 'list' | 'blog' | 'layout';
/** `notes`: non-blocking problems shown above the rendered list (e.g. `limit` with `pageSize`). */
export type SpecResult = { ok: true; spec: ListingSpec; notes: string[] } | { ok: false; errors: string[] };
export const DEFAULT_SHOW: string[];          // ['image','date','title','description','authors']
export const COMPACT_DEFAULT_SHOW: string[];  // ['date','title']
export const INDEX_PAGE_SIZE = 20;
export function parseListingSpec(input: unknown, opts: { source: ListingSource; defaultFrom?: string | null; rootDir?: string }): SpecResult;
export function parseListingBlock(lang: 'list' | 'blog', code: string, opts?: { rootDir?: string }): SpecResult;
export function implicitListingFrom(blobPath: string, files: string[]): string | null;
```

- [ ] **Step 1: Write the failing tests** (`lib/listing/spec.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { implicitListingFrom, parseListingBlock, parseListingSpec } from './spec';

const ok = (r: ReturnType<typeof parseListingSpec>) => {
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.spec;
};
const errs = (r: ReturnType<typeof parseListingSpec>) => (r.ok ? [] : r.errors);

describe('parseListingBlock', () => {
  it('an empty ```blog block is the blog preset with blog defaults', () => {
    expect(ok(parseListingBlock('blog', ''))).toEqual({
      from: 'blog', view: 'list', sort: { field: 'date', direction: 'desc' },
      limit: null, pageSize: null, show: ['image', 'date', 'title', 'description', 'authors'], where: {},
    });
  });
  it('```list requires from', () => {
    expect(errs(parseListingBlock('list', ''))).toEqual(['"from" is required: the folder to list, e.g. "from: blog".']);
  });
  it('accepts dir and folder as silent aliases', () => {
    expect(ok(parseListingBlock('list', 'dir: /blog/')).from).toBe('blog');
    expect(ok(parseListingBlock('list', 'folder: notes/2026')).from).toBe('notes/2026');
  });
  it('rejects from together with an alias', () => {
    expect(errs(parseListingBlock('list', 'from: a\ndir: b'))).toEqual(['Use either "from" or "dir", not both.']);
  });
  it('reports YAML that is not a map', () => {
    expect(errs(parseListingBlock('list', '- a\n- b'))[0]).toMatch(/must be "key: value" lines/);
    expect(errs(parseListingBlock('list', 'from: [unclosed'))[0]).toMatch(/^Could not read the block as YAML/);
  });
  it('undoes the wiki-alias divider that protectWikiLinkAliases puts inside fences', () => {
    expect(ok(parseListingBlock('list', 'from: p\nwhere:\n  guests: "[[ada\uE000Ada]]"')).where).toEqual({ guests: '[[ada|Ada]]' });
  });
  it('produces the design 3.8 messages', () => {
    expect(errs(parseListingBlock('list', 'dir: blog\npagesize: 5\nlayout: cards'))).toEqual([
      'Unknown key "pagesize". Did you mean "pageSize"?',
      'Unknown key "layout". Use "view: cards".',
    ]);
  });
  it('suggests close keys and hints common guesses', () => {
    expect(errs(parseListingBlock('blog', 'limt: 3'))).toEqual(['Unknown key "limt". Did you mean "limit"?']);
    expect(errs(parseListingBlock('blog', 'filter: x'))).toEqual(['Unknown key "filter". Use "where".']);
    expect(errs(parseListingBlock('blog', 'zzz: 1'))).toEqual(['Unknown key "zzz".']);
  });
});

describe('parseListingSpec values', () => {
  const blog = (o: unknown) => parseListingSpec(o, { source: 'blog' });
  it('view', () => {
    expect(ok(blog({ view: 'Cards' })).view).toBe('cards');
    expect(errs(blog({ view: 'grid' }))).toEqual(['Unknown view "grid". Use list, cards or compact.']);
  });
  it('sort direction defaults per field', () => {
    expect(ok(blog({ sort: 'title' })).sort).toEqual({ field: 'title', direction: 'asc' });
    expect(ok(blog({ sort: 'date' })).sort).toEqual({ field: 'date', direction: 'desc' });
    expect(ok(blog({ sort: 'weight DESC' })).sort).toEqual({ field: 'weight', direction: 'desc' });
    expect(errs(blog({ sort: 'date sideways' }))).toEqual(['Sort direction must be "asc" or "desc" (got "sideways").']);
  });
  it('limit and pageSize are lenient on type', () => {
    expect(ok(blog({ limit: '3' })).limit).toBe(3);
    expect(ok(blog({ pageSize: '5' })).pageSize).toBe(5);
    expect(ok(blog({ pageSize: 'none' })).pageSize).toBeNull();
    expect(errs(blog({ limit: 0 }))).toEqual(['"limit" must be a whole number above 0 (got "0").']);
    expect(errs(blog({ pageSize: 'lots' }))).toEqual(['"pageSize" must be a whole number above 0 or "none" (got "lots").']);
  });
  it('limit with an explicit pageSize still renders, with a note', () => {
    const r = blog({ limit: 3, pageSize: 5 });
    expect(r.ok && r.spec).toMatchObject({ limit: 3, pageSize: null });
    expect(r.ok && r.notes).toEqual(['"pageSize" is ignored because "limit" is set; remove one of them.']);
    expect(blog({ limit: 3 }).ok && (blog({ limit: 3 }) as { notes: string[] }).notes).toEqual([]);
  });
  it('pageSize defaults to 20 for layout: list and none for blocks; limit disables it', () => {
    expect(ok(parseListingSpec({}, { source: 'layout', defaultFrom: 'blog' })).pageSize).toBe(20);
    expect(ok(parseListingSpec({ limit: 3 }, { source: 'layout', defaultFrom: 'blog' })).pageSize).toBeNull();
    expect(ok(blog({})).pageSize).toBeNull();
  });
  it('show accepts a list or a comma string; compact has its own default', () => {
    expect(ok(blog({ show: 'title, status' })).show).toEqual(['title', 'status']);
    expect(ok(blog({ view: 'compact' })).show).toEqual(['date', 'title']);
    expect(errs(blog({ show: [] }))).toEqual(['"show" needs at least one field.']);
  });
  it('where takes scalars only and stringifies them', () => {
    expect(ok(blog({ where: { year: 2026, featured: true } })).where).toEqual({ year: '2026', featured: 'true' });
    expect(errs(blog({ where: { tags: ['a', 'b'] } }))).toEqual(['"where.tags" must be a single value, e.g. "tags: featured".']);
    expect(errs(blog({ where: 'tags = x' }))).toEqual(['"where" must be "field: value" lines, e.g. "where: { tags: featured }".']);
  });
  it('from: strips slashes and rootDir, rejects ..', () => {
    expect(ok(parseListingSpec({ from: '/Public/blog/' }, { source: 'list', rootDir: 'Public' })).from).toBe('blog');
    expect(ok(parseListingSpec({ from: 'blog' }, { source: 'list', rootDir: '/Public/' })).from).toBe('blog');
    expect(ok(parseListingSpec({ from: '/' }, { source: 'list' })).from).toBe('');
    expect(errs(parseListingSpec({ from: '../x' }, { source: 'list' }))).toEqual(['"from" cannot contain "..".']);
  });
  it('layout: list without a folder gives the add-from hint', () => {
    expect(errs(parseListingSpec({}, { source: 'layout', defaultFrom: null }))).toEqual([
      'Add "list: { from: <folder> }" to the frontmatter: this page is not a folder index and has no folder with the same name.',
    ]);
  });
  it('a non-map list: frontmatter value is reported', () => {
    expect(errs(parseListingSpec('blog', { source: 'layout', defaultFrom: 'x' }))[0]).toMatch(/must be "key: value" lines \(got a string\)/);
  });
  it('collects every error, not just the first', () => {
    expect(errs(blog({ view: 'grid', limit: -1, nope: 1 }))).toHaveLength(3);
  });
});

describe('implicitListingFrom', () => {
  const files = ['/blog/README.md', '/blog/a.md', '/podcast.md', '/podcast/ep-1.md', '/about.md'];
  it('a folder index lists its own folder', () => {
    expect(implicitListingFrom('blog/README.md', files)).toBe('blog');
    expect(implicitListingFrom('README.md', files)).toBe('');
  });
  it('a folder note lists the sibling folder of the same name', () => {
    expect(implicitListingFrom('podcast.md', files)).toBe('podcast');
  });
  it('otherwise null', () => {
    expect(implicitListingFrom('about.md', files)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (`Cannot find module './spec'`)

Run: `npx vitest run --project=unit lib/listing/spec.test.ts`

- [ ] **Step 3: Implement** (`lib/listing/spec.ts`)

```ts
import * as yaml from 'yaml';
import { dirOf, isFolderIndexPath } from '@/lib/changelog';

export const LISTING_KEYS = ['from', 'view', 'sort', 'limit', 'pageSize', 'show', 'where'] as const;
export type ListingKey = (typeof LISTING_KEYS)[number];
export type ListingView = 'list' | 'cards' | 'compact';
export const LISTING_VIEWS: readonly ListingView[] = ['list', 'cards', 'compact'];
export type ListingSort = { field: string; direction: 'asc' | 'desc' };
export type ListingSpec = {
  from: string;
  view: ListingView;
  sort: ListingSort;
  limit: number | null;
  pageSize: number | null;
  show: string[];
  where: Record<string, string>;
};
export type ListingSource = 'list' | 'blog' | 'layout';
export type SpecResult = { ok: true; spec: ListingSpec; notes: string[] } | { ok: false; errors: string[] };

export const DEFAULT_SHOW = ['image', 'date', 'title', 'description', 'authors'];
export const COMPACT_DEFAULT_SHOW = ['date', 'title'];
export const INDEX_PAGE_SIZE = 20;

const ALIASES = ['dir', 'folder'] as const;
const KEY_HINTS: Record<string, (value: unknown) => string> = {
  layout: (v) => `Use "view: ${typeof v === 'string' ? v : 'cards'}".`,
  type: (v) => `Use "view: ${typeof v === 'string' ? v : 'cards'}".`,
  order: () => 'Use "sort".',
  orderby: () => 'Use "sort".',
  sortby: () => 'Use "sort".',
  filter: () => 'Use "where".',
  filters: () => 'Use "where".',
  fields: () => 'Use "show".',
  max: () => 'Use "limit".',
  count: () => 'Use "limit".',
  perpage: () => 'Use "pageSize".',
  paginate: () => 'Use "pageSize".',
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function kindOf(v: unknown): string {
  if (Array.isArray(v)) return 'list';
  return v === null ? 'null' : typeof v;
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

function unknownKeyMessage(key: string, value: unknown): string {
  const lower = key.toLowerCase();
  const sameCase = LISTING_KEYS.find((k) => k.toLowerCase() === lower);
  if (sameCase) return `Unknown key "${key}". Did you mean "${sameCase}"?`;
  const hint = KEY_HINTS[lower.replace(/[-_\s]/g, '')];
  if (hint) return `Unknown key "${key}". ${hint(value)}`;
  const close = LISTING_KEYS.find((k) => editDistance(k.toLowerCase(), lower) <= 2);
  if (close) return `Unknown key "${key}". Did you mean "${close}"?`;
  return `Unknown key "${key}".`;
}

function normalizeFrom(raw: string, rootDir: string | undefined, errors: string[]): string | null {
  const from = raw.trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+|\/+$/g, '');
  if (from.split('/').includes('..')) {
    errors.push('"from" cannot contain "..".');
    return null;
  }
  const root = (rootDir ?? '').replace(/^\/+|\/+$/g, '');
  if (root && (from === root || from.startsWith(`${root}/`))) return from.slice(root.length).replace(/^\/+/, '');
  return from;
}

function positiveInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : Number.NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseListingSpec(
  input: unknown,
  opts: { source: ListingSource; defaultFrom?: string | null; rootDir?: string },
): SpecResult {
  const errors: string[] = [];
  const notes: string[] = [];
  const raw = input == null ? {} : input;
  if (!isPlainObject(raw)) {
    return { ok: false, errors: [`List options must be "key: value" lines (got a ${kindOf(raw)}).`] };
  }

  const values: Partial<Record<ListingKey, unknown>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if ((LISTING_KEYS as readonly string[]).includes(key)) values[key as ListingKey] = value;
    else if ((ALIASES as readonly string[]).includes(key)) {
      if ('from' in raw) errors.push(`Use either "from" or "${key}", not both.`);
      else values.from = value;
    } else errors.push(unknownKeyMessage(key, value));
  }

  let from: string | null = null;
  if (values.from != null && values.from !== '') {
    from = normalizeFrom(String(values.from), opts.rootDir, errors);
  } else if (opts.source === 'blog') from = 'blog';
  else if (opts.source === 'layout') {
    if (opts.defaultFrom == null) {
      errors.push('Add "list: { from: <folder> }" to the frontmatter: this page is not a folder index and has no folder with the same name.');
    } else from = opts.defaultFrom;
  } else errors.push('"from" is required: the folder to list, e.g. "from: blog".');

  let view: ListingView = 'list';
  if (values.view != null) {
    const v = String(values.view).trim().toLowerCase();
    if ((LISTING_VIEWS as readonly string[]).includes(v)) view = v as ListingView;
    else errors.push(`Unknown view "${String(values.view)}". Use list, cards or compact.`);
  }

  let sort: ListingSort = { field: 'date', direction: 'desc' };
  if (values.sort != null) {
    const [field = '', dir, ...rest] = String(values.sort).trim().split(/\s+/);
    const direction = dir?.toLowerCase();
    if (!field || rest.length) errors.push(`"sort" must look like "date desc" (got "${String(values.sort)}").`);
    else if (direction && direction !== 'asc' && direction !== 'desc') errors.push(`Sort direction must be "asc" or "desc" (got "${dir}").`);
    else sort = { field, direction: (direction as 'asc' | 'desc') ?? (field === 'date' ? 'desc' : 'asc') };
  }

  let limit: number | null = null;
  if (values.limit != null) {
    limit = positiveInt(values.limit);
    if (limit === null) errors.push(`"limit" must be a whole number above 0 (got "${String(values.limit)}").`);
  }

  let pageSize: number | null = opts.source === 'layout' ? INDEX_PAGE_SIZE : null;
  const explicitNone = values.pageSize === false || (typeof values.pageSize === 'string' && values.pageSize.trim().toLowerCase() === 'none');
  if (values.pageSize != null && !explicitNone) {
    pageSize = positiveInt(values.pageSize);
    if (pageSize === null) errors.push(`"pageSize" must be a whole number above 0 or "none" (got "${String(values.pageSize)}").`);
    else if (limit !== null) notes.push('"pageSize" is ignored because "limit" is set; remove one of them.');
  }
  if (explicitNone || limit !== null) pageSize = null;

  let show = view === 'compact' ? COMPACT_DEFAULT_SHOW : DEFAULT_SHOW;
  if (values.show != null) {
    const list = Array.isArray(values.show) ? values.show : String(values.show).split(',');
    show = list.map((s) => String(s).trim()).filter(Boolean);
    if (show.length === 0) errors.push('"show" needs at least one field.');
  }

  const where: Record<string, string> = {};
  if (values.where != null) {
    if (!isPlainObject(values.where)) errors.push('"where" must be "field: value" lines, e.g. "where: { tags: featured }".');
    else
      for (const [field, value] of Object.entries(values.where)) {
        if (['string', 'number', 'boolean'].includes(typeof value)) where[field] = String(value);
        else errors.push(`"where.${field}" must be a single value, e.g. "${field}: featured".`);
      }
  }

  if (errors.length || from === null) return { ok: false, errors };
  return { ok: true, spec: { from, view, sort, limit, pageSize, show: [...show], where }, notes };
}

export function parseListingBlock(lang: 'list' | 'blog', code: string, opts: { rootDir?: string } = {}): SpecResult {
  // processMarkdown's protectWikiLinkAliases runs over the whole document, fences
  // included, replacing `|` in [[a|b]] with U+E000 (lib/markdown.ts WIKI_ALIAS_DIVIDER).
  const source = code.replace(/\uE000/g, '|');
  let parsed: unknown;
  try {
    parsed = source.trim() ? yaml.parse(source) : {};
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : 'invalid YAML';
    return { ok: false, errors: [`Could not read the block as YAML: ${message}`] };
  }
  return parseListingSpec(parsed, { source: lang, rootDir: opts.rootDir });
}

/** `from` for `layout: list`: the index's own folder, or the folder note's sibling folder. */
export function implicitListingFrom(blobPath: string, files: string[]): string | null {
  const p = blobPath.replace(/^\/+/, '');
  if (isFolderIndexPath(p)) return dirOf(p);
  const sibling = p.replace(/\.mdx?$/i, '');
  return files.some((f) => f.replace(/^\/+/, '').startsWith(`${sibling}/`)) ? sibling : null;
}
```

- [ ] **Step 4: Run, expect PASS.** (Deviation 13, revised: `limit` + `pageSize` renders the list with an inline note instead of an error card.) If a message differs, fix the implementation, not the test: these strings are the AI-facing contract and are copied into the docs (Task B21).
- [ ] **Step 5: Commit** `feat(listing): parse and validate list block options`

### Task B3: draft rule and RSS

**Files:**
- Create: `lib/listing/rules.ts`, `lib/listing/rules.test.ts`
- Modify: `lib/rss.ts:25-30`, `lib/rss.test.ts` (inside `describe('filterRssBlobs')`)

**Interfaces:** Produces `isDraft(m: Record<string, unknown> | null | undefined): boolean`, `isUnpublished(m): boolean`.

- [ ] **Step 1: Failing tests**

```ts
// lib/listing/rules.test.ts
import { describe, expect, it } from 'vitest';
import { isDraft, isUnpublished } from './rules';

describe('rules', () => {
  it('isDraft accepts true and "true" only', () => {
    expect(isDraft({ draft: true })).toBe(true);
    expect(isDraft({ draft: 'True ' })).toBe(true);
    expect(isDraft({ draft: false })).toBe(false);
    expect(isDraft({ draft: 'yes' })).toBe(false);
    expect(isDraft(null)).toBe(false);
  });
  it('isUnpublished mirrors the page route (publish === false)', () => {
    expect(isUnpublished({ publish: false })).toBe(true);
    expect(isUnpublished({ publish: 'false' })).toBe(false);
    expect(isUnpublished({})).toBe(false);
  });
});
```

```ts
// add to lib/rss.test.ts, describe('filterRssBlobs')
  it('excludes drafts', () => {
    const blobs = [
      makeBlob({ metadata: { title: 'A', date: '2025-06-01', draft: true } }),
      makeBlob({ metadata: { title: 'B', date: '2025-06-02' } }),
    ];
    expect(filterRssBlobs(blobs).map((b) => (b.metadata as { title: string }).title)).toEqual(['B']);
  });
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/rules.test.ts lib/rss.test.ts`
- [ ] **Step 3: Implement**

```ts
// lib/listing/rules.ts
type Meta = Record<string, unknown> | null | undefined;

/** `draft: true`: reachable by URL, but never listed or in the feed. */
export function isDraft(m: Meta): boolean {
  const d = m?.draft;
  return d === true || (typeof d === 'string' && d.trim().toLowerCase() === 'true');
}

/** Same rule as the page route's 404 (`metadata.publish === false`). */
export function isUnpublished(m: Meta): boolean {
  return m?.publish === false;
}
```

```ts
// lib/rss.ts
import { isDraft } from '@/lib/listing/rules';
export function filterRssBlobs(blobs: RssBlob[]): RssBlob[] {
  return blobs.filter((blob) => {
    const metadata = blob.metadata;
    return metadata?.publish !== false && !isDraft(metadata) && metadata?.date;
  });
}
```

- [ ] **Step 4: Run, expect PASS** (whole `lib/rss.test.ts`).
- [ ] **Step 5: Commit** `feat(listing): add draft rule; RSS skips draft: true`

### Task B4: item selection, sort and item mapping (`query.ts`, pure parts)

**Files:**
- Create: `lib/listing/query.ts`, `lib/listing/query.test.ts`

**Interfaces:**
- Consumes: `ListingSpec` (B2), `isDraft`/`isUnpublished` (B3), `dirOf`, `isFolderIndexPath`, `entryTitleFromPath`, `resolveEntryTitle`, `resolveEntryDate` (`@/lib/changelog`), `normalizeAuthors`, `extractWikiLinkTarget`, `ensureLeadingSlash`, `safeDate` (`@/lib/utils`), `matchLinkTarget`, `normalizeFrontmatterTags`, `tagMatches` (`@flowershow/core`), `resolveContentLink` (`@/lib/resolve-link`).
- Produces:

```ts
export type ListingRow = { id: string; path: string; appPath: string | null; permalink: string | null; metadata: Record<string, unknown> | null; tags?: { tag: string }[] };
export type ListingFieldPart = { text: string; href?: string };
export type ListingField = { key: string; label: string; parts: ListingFieldPart[] };
export type ListingItem = { path: string; url: string; title: string; date: string | null; description: string | null; image: string | null; authorHandles: string[]; tags: string[]; fields: ListingField[] };
export type ItemContext = { siteHostname: string; files: string[]; permalinks?: Record<string, string>; show: string[] };
export function isListedRow(row: ListingRow, folder: string): boolean;
export function matchesWhere(row: ListingRow, where: Record<string, string>): boolean;
export function itemTitle(row: ListingRow): string;
export function itemDate(row: ListingRow): string | null;
export function selectListingRows(rows: ListingRow[], spec: Pick<ListingSpec, 'from' | 'where' | 'sort'>): ListingRow[];
export function resolveFolderCase(from: string, files: string[]): string;
export function toListingItem(row: ListingRow, ctx: ItemContext): ListingItem;
export const BUILTIN_FIELDS: readonly string[]; // image,date,title,description,authors,tags
```

- [ ] **Step 1: Failing tests** (`lib/listing/query.test.ts`)

```ts
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }));
import { itemTitle, resolveFolderCase, selectListingRows, toListingItem, type ListingRow } from './query';

const row = (path: string, metadata: Record<string, unknown> | null = {}, extra: Partial<ListingRow> = {}): ListingRow => ({
  id: path, path, appPath: '/' + path.replace(/\.mdx?$/, '').replace(/\/(README|index)$/i, ''), permalink: null, metadata, ...extra,
});
const dateDesc = { field: 'date', direction: 'desc' as const };
const paths = (rows: ListingRow[]) => rows.map((r) => r.path);

describe('selectListingRows: which pages are items (4.3)', () => {
  const rows = [
    row('blog/README.md'), row('blog/readme.MD'), row('blog/a.md', { date: '2026-01-02' }),
    row('blog/sub/index.md', { date: '2026-01-03' }), row('blog/draft.md', { draft: true, date: '2026-02-01' }),
    row('blog/hidden.md', { publish: false, date: '2026-02-02' }), row('blog/pic.png', null, { appPath: null }),
    row('blog/b.mdx', { date: '2026-01-01' }), row('blogger/x.md', { date: '2026-03-01' }),
  ];
  it('keeps nested indexes, drops own index (any case), drafts, unpublished and non-pages', () => {
    expect(paths(selectListingRows(rows, { from: 'blog', where: {}, sort: dateDesc }))).toEqual(['blog/sub/index.md', 'blog/a.md', 'blog/b.mdx']);
  });
  it('from "" lists the whole site except the root index', () => {
    expect(paths(selectListingRows([row('README.md'), row('a.md')], { from: '', where: {}, sort: dateDesc }))).toEqual(['a.md']);
  });
});

describe('sort (4.5)', () => {
  it('date desc: dated newest first, ties by path desc, undated after by title', () => {
    const rows = [row('b/x.md', { title: 'Zed' }), row('b/2026-05-01-y.md'), row('b/a.md', { date: '2026-05-01' }), row('b/c.md', { title: 'Alpha' }), row('b/d.md', { date: '2026-06-01' })];
    // 'b/a.md' > 'b/2026-05-01-y.md', so path desc puts a.md first among the 2026-05-01 tie
    expect(paths(selectListingRows(rows, { from: 'b', where: {}, sort: dateDesc }))).toEqual(['b/d.md', 'b/a.md', 'b/2026-05-01-y.md', 'b/c.md', 'b/x.md']);
  });
  it('custom field: numbers numerically, missing last in both directions', () => {
    const rows = [row('p/a.md', { weight: 10 }), row('p/b.md', { weight: '9' }), row('p/c.md', {}), row('p/d.md', { weight: 100 })];
    expect(paths(selectListingRows(rows, { from: 'p', where: {}, sort: { field: 'weight', direction: 'asc' } }))).toEqual(['p/b.md', 'p/a.md', 'p/d.md', 'p/c.md']);
    expect(paths(selectListingRows(rows, { from: 'p', where: {}, sort: { field: 'weight', direction: 'desc' } }))).toEqual(['p/d.md', 'p/a.md', 'p/b.md', 'p/c.md']);
  });
  it('title sort is locale-aware and numeric', () => {
    const rows = [row('p/1.md', { title: 'item 10' }), row('p/2.md', { title: 'Item 9' }), row('p/3.md', { title: 'élan' })];
    expect(selectListingRows(rows, { from: 'p', where: {}, sort: { field: 'title', direction: 'asc' } }).map(itemTitle)).toEqual(['élan', 'Item 9', 'item 10']);
  });
  it('never throws on a non-date date', () => {
    expect(() => selectListingRows([row('p/a.md', { date: 'TBD' }), row('p/b.md', { date: { x: 1 } })], { from: 'p', where: {}, sort: dateDesc })).not.toThrow();
  });
});

describe('where (4.6)', () => {
  const rows = [
    row('p/a.md', { type: 'episode', year: 2026, guests: ['Ada', '[[Grace]]'] }),
    row('p/b.md', { type: 'trailer', year: '2025' }),
    row('p/c.md', { type: 'episode' }, { tags: [{ tag: 'featured/2026' }] }),
  ];
  const sel = (where: Record<string, string>) => paths(selectListingRows(rows, { from: 'p', where, sort: { field: 'path', direction: 'asc' } }));
  it('scalar equality, loose on type', () => {
    expect(sel({ type: 'episode' })).toEqual(['p/a.md', 'p/c.md']);
    expect(sel({ year: '2026' })).toEqual(['p/a.md']);
  });
  it('list contains, wiki brackets ignored', () => {
    expect(sel({ guests: 'Ada' })).toEqual(['p/a.md']);
    expect(sel({ guests: 'Grace' })).toEqual(['p/a.md']);
  });
  it('tags use the Tag rows and the nested-tag rule', () => {
    expect(sel({ tags: 'featured' })).toEqual(['p/c.md']);
  });
  it('several keys are AND', () => {
    expect(sel({ type: 'episode', year: '2026' })).toEqual(['p/a.md']);
  });
});

describe('itemTitle (4.4)', () => {
  it('uses frontmatter, coerces numbers, derives from file names and nested folders', () => {
    expect(itemTitle(row('b/x.md', { title: 1984 }))).toBe('1984');
    expect(itemTitle(row('b/2026-09-01-filename-only-post.md', { title: '2026-09-01-filename-only-post', computed: ['title'] }))).toBe('Filename only post');
    expect(itemTitle(row('projects/alpha/index.md', { title: 'index', computed: ['title'] }))).toBe('Alpha');
    expect(itemTitle(row('projects/beta/README.md', { title: 'README' }))).toBe('Beta');
    expect(itemTitle(row('projects/alpha/index.md', { title: 'Project Alpha' }))).toBe('Project Alpha');
  });
});

describe('resolveFolderCase (Review Focus 1)', () => {
  const files = ['/Blog/a.md', '/Projects/x/index.md'];
  it('keeps an exact folder, falls back to a case-insensitive match', () => {
    expect(resolveFolderCase('blog', files)).toBe('Blog');
    expect(resolveFolderCase('Projects/x', files)).toBe('Projects/x');
    expect(resolveFolderCase('missing', files)).toBe('missing');
    expect(resolveFolderCase('', files)).toBe('');
  });
});

describe('toListingItem (4.4, Review Focus 2 and 3)', () => {
  const ctx = {
    siteHostname: 'demo.flowershow.site',
    files: ['/blog/assets/cover.jpg', '/blog/2026/pic ü.png', '/people/ada.md', '/assets/sapiens.jpg'],
    show: ['image', 'date', 'title', 'description', 'authors', 'tags', 'status', 'guests', 'episode'],
  };
  it('maps the standard fields', () => {
    const item = toListingItem(row('blog/a.md', { title: 'A', date: '2026-09-18', description: 'D', image: 'assets/cover.jpg', authors: 'ada', tags: ['x'] }, { permalink: '/a-post' }), ctx);
    expect(item).toMatchObject({ url: '/a-post', title: 'A', date: '2026-09-18', description: 'D', authorHandles: ['ada'], tags: ['x'] });
    expect(item.image).toBe('http://demo.flowershow.site/blog/assets/cover.jpg');
  });
  it('resolves wiki-link, absolute and external images; falls back to avatar and cover', () => {
    expect(toListingItem(row('x/a.md', { image: '[[sapiens.jpg]]' }), ctx).image).toBe('http://demo.flowershow.site/assets/sapiens.jpg');
    expect(toListingItem(row('x/a.md', { image: '/blog/assets/cover.jpg' }), ctx).image).toBe('http://demo.flowershow.site/blog/assets/cover.jpg');
    expect(toListingItem(row('x/a.md', { image: 'https://cdn.example.com/a.png' }), ctx).image).toBe('https://cdn.example.com/a.png');
    expect(toListingItem(row('people/ada.md', { avatar: 'https://x.org/ada.png' }), ctx).image).toBe('https://x.org/ada.png');
    expect(toListingItem(row('x/a.md', { cover: 'https://x.org/c.png' }), ctx).image).toBe('https://x.org/c.png');
  });
  it('encodes spaces and non-ASCII in image URLs', () => {
    expect(toListingItem(row('blog/2026/nested post ü.md', { image: 'pic ü.png' }), ctx).image).toBe(`http://demo.flowershow.site/blog/2026/${encodeURIComponent('pic ü.png')}`);
  });
  it('keeps the stored appPath as the URL and forces a leading slash', () => {
    expect(toListingItem(row('blog/2026/nested post ü.md', {}, { appPath: '/blog/2026/nested+post+%C3%BC' }), ctx).url).toBe('/blog/2026/nested+post+%C3%BC');
    expect(toListingItem(row('x/a.md', {}, { permalink: 'javascript:alert(1)' }), ctx).url).toBe('/javascript:alert(1)');
    // ingestion's normalizePermalink already strips leading slashes; never emit a protocol-relative href anyway
    expect(toListingItem(row('x/a.md', {}, { permalink: '//evil.com/x' }), ctx).url).toBe('/evil.com/x');
  });
  it('never throws on malformed frontmatter', () => {
    const item = toListingItem(row('x/a.md', { title: 1984, date: 'TBD', authors: { name: 'x' }, image: ['a', 'b'], description: 42, tags: 'featured', status: { nested: true } }), ctx);
    expect(item).toMatchObject({ title: '1984', date: null, authorHandles: [], image: null, description: '42', tags: ['featured'] });
    expect(item.fields).toEqual([]);
  });
  it('renders custom fields as labelled parts, resolving wiki links', () => {
    const item = toListingItem(row('x/a.md', { status: 'In progress', guests: ['[[ada|Ada Lovelace]]', 'Grace Hopper'], episode: 3 }), ctx);
    expect(item.fields).toEqual([
      { key: 'status', label: 'Status', parts: [{ text: 'In progress' }] },
      { key: 'guests', label: 'Guests', parts: [{ text: 'Ada Lovelace', href: '/people/ada' }, { text: 'Grace Hopper' }] },
      { key: 'episode', label: 'Episode', parts: [{ text: '3' }] },
    ]);
  });
});
```

Note: check `resolveContentLink`'s scheme in tests: it uses `http` unless `NEXT_PUBLIC_VERCEL_ENV` is `production`/`preview`; the unit env has neither, so `http://` is right. The worker stores `appPath` as `encodeSlug(filePathToSlug(path))` (`apps/cloudflare-worker/src/queue-consumer.js:125`); the unit test above pins that the stored value is passed through unchanged, and Task B17 makes the listings e2e site store the same encoded shape.

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/query.test.ts`
- [ ] **Step 3: Implement the pure parts** (`lib/listing/query.ts`; Task B5 appends the Prisma/cache part to the same file)

```ts
import { matchLinkTarget, normalizeFrontmatterTags, tagMatches } from '@flowershow/core';
import { dirOf, entryTitleFromPath, isFolderIndexPath, resolveEntryDate, resolveEntryTitle } from '@/lib/changelog';
import { resolveContentLink } from '@/lib/resolve-link';
import { ensureLeadingSlash, extractWikiLinkTarget, normalizeAuthors, safeDate } from '@/lib/utils';
import { isDraft, isUnpublished } from './rules';
import type { ListingSpec } from './spec';

export type ListingRow = { id: string; path: string; appPath: string | null; permalink: string | null; metadata: Record<string, unknown> | null; tags?: { tag: string }[] };
export type ListingFieldPart = { text: string; href?: string };
export type ListingField = { key: string; label: string; parts: ListingFieldPart[] };
export type ListingItem = { path: string; url: string; title: string; date: string | null; description: string | null; image: string | null; authorHandles: string[]; tags: string[]; fields: ListingField[] };
export type ItemContext = { siteHostname: string; files: string[]; permalinks?: Record<string, string>; show: string[] };

export const BUILTIN_FIELDS = ['image', 'date', 'title', 'description', 'authors', 'tags'] as const;
const MARKDOWN_RE = /\.mdx?$/i;
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function isListedRow(row: ListingRow, folder: string): boolean {
  if (!row.appPath || !MARKDOWN_RE.test(row.path)) return false;
  if (folder && !row.path.startsWith(`${folder}/`)) return false;
  if (dirOf(row.path) === folder && isFolderIndexPath(row.path)) return false;
  return !isUnpublished(row.metadata) && !isDraft(row.metadata);
}

const stripWiki = (s: string) => extractWikiLinkTarget(s.trim()) ?? s.trim();

function fieldMatches(value: unknown, expected: string): boolean {
  if (Array.isArray(value)) return value.some((v) => fieldMatches(v, expected));
  if (value == null || typeof value === 'object') return false;
  return stripWiki(String(value)) === expected;
}

export function matchesWhere(row: ListingRow, where: Record<string, string>): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === 'tags') {
      const tags = row.tags ? row.tags.map((t) => t.tag) : normalizeFrontmatterTags(row.metadata?.tags);
      return tagMatches(tags, expected);
    }
    return fieldMatches(row.metadata?.[field], expected);
  });
}

const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1).replace(MARKDOWN_RE, '');

export function itemTitle(row: ListingRow): string {
  const raw = row.metadata?.title;
  const title = raw == null || typeof raw === 'object' ? '' : String(raw).trim();
  if (isFolderIndexPath(row.path)) {
    if (!title || title.toLowerCase() === basename(row.path).toLowerCase()) return entryTitleFromPath(dirOf(row.path) || row.path);
    return title;
  }
  return resolveEntryTitle(title, row.path);
}

export function itemDate(row: ListingRow): string | null {
  try {
    return resolveEntryDate(row.metadata?.date, row.path);
  } catch {
    return null;
  }
}

type SortValue = { kind: 0; n: number } | { kind: 1; t: number } | { kind: 2; s: string } | null;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function scalarSortValue(v: unknown): SortValue {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? { kind: 0, n: v } : null;
  if (typeof v === 'boolean') return { kind: 0, n: v ? 1 : 0 };
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { kind: 0, n: Number(s) };
  const d = ISO_DATE_RE.test(s) ? safeDate(s) : null;
  return d ? { kind: 1, t: d.getTime() } : { kind: 2, s };
}

function sortValue(row: ListingRow, field: string): SortValue {
  if (field === 'title') return { kind: 2, s: itemTitle(row) };
  if (field === 'path') return { kind: 2, s: row.path };
  if (field === 'date') {
    const d = itemDate(row);
    return d ? { kind: 1, t: Date.parse(`${d}T00:00:00Z`) } : null;
  }
  const v = row.metadata?.[field];
  return scalarSortValue(Array.isArray(v) ? v[0] : v);
}

function compareValues(a: Exclude<SortValue, null>, b: Exclude<SortValue, null>): number {
  if (a.kind !== b.kind) return a.kind - b.kind;
  if (a.kind === 0) return a.n - (b as { n: number }).n;
  if (a.kind === 1) return a.t - (b as { t: number }).t;
  return collator.compare(a.s, (b as { s: string }).s);
}

const byPath = (a: ListingRow, b: ListingRow) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

export function selectListingRows(rows: ListingRow[], spec: Pick<ListingSpec, 'from' | 'where' | 'sort'>): ListingRow[] {
  const { field, direction } = spec.sort;
  const sign = direction === 'desc' ? -1 : 1;
  return rows
    .filter((r) => isListedRow(r, spec.from) && matchesWhere(r, spec.where))
    .map((r) => ({ r, v: sortValue(r, field) }))
    .sort((a, b) => {
      if (a.v && b.v) {
        const c = compareValues(a.v, b.v);
        if (c) return sign * c;
        return field === 'date' ? sign * byPath(a.r, b.r) : collator.compare(itemTitle(a.r), itemTitle(b.r)) || byPath(a.r, b.r);
      }
      if (a.v) return -1;
      if (b.v) return 1;
      return collator.compare(itemTitle(a.r), itemTitle(b.r)) || byPath(a.r, b.r);
    })
    .map(({ r }) => r);
}

/** Exact folder if it has files; else the first case-insensitive match (Obsidian `Blog/` vs `from: blog`). */
export function resolveFolderCase(from: string, files: string[]): string {
  if (!from) return from;
  const plain = files.map((f) => f.replace(/^\/+/, ''));
  if (plain.some((p) => p.startsWith(`${from}/`))) return from;
  const lower = `${from.toLowerCase()}/`;
  const hit = plain.find((p) => p.toLowerCase().startsWith(lower));
  return hit ? hit.slice(0, from.length) : from;
}

function resolveTarget(value: string, originPath: string, ctx: ItemContext): string {
  const wiki = extractWikiLinkTarget(value);
  if (wiki === null) return resolveContentLink({ target: value, originFilePath: ensureLeadingSlash(originPath), siteHostname: ctx.siteHostname, permalinks: ctx.permalinks });
  const match = matchLinkTarget(wiki, ctx.files.map((path) => ({ path })));
  return resolveContentLink({ target: match ? ensureLeadingSlash(match.path) : wiki, originFilePath: ensureLeadingSlash(originPath), siteHostname: ctx.siteHostname, permalinks: ctx.permalinks });
}

function itemImage(row: ListingRow, ctx: ItemContext): string | null {
  const m = row.metadata ?? {};
  const raw = [m.image, m.avatar, m.cover].find((v): v is string => typeof v === 'string' && v.trim() !== '');
  return raw ? resolveTarget(raw.trim(), row.path, ctx) : null;
}

function humanize(key: string): string {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim().toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : key;
}

const WIKI_RE = /^\[\[([^|\]]+?)(?:\|([^\]]+))?\]\]$/;

function fieldParts(value: unknown, ctx: ItemContext): ListingFieldPart[] {
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((v): ListingFieldPart[] => {
    if (v == null || v === '') return [];
    if (typeof v === 'boolean') return [{ text: v ? 'Yes' : 'No' }];
    if (typeof v === 'number') return Number.isFinite(v) ? [{ text: String(v) }] : [];
    if (typeof v !== 'string') return [];
    const wiki = v.trim().match(WIKI_RE);
    if (!wiki) return [{ text: v }];
    const target = wiki[1]!.trim();
    const match = matchLinkTarget(target, ctx.files.map((path) => ({ path })));
    const text = (wiki[2] ?? target).trim();
    return match ? [{ text, href: resolveContentLink({ target: ensureLeadingSlash(match.path), siteHostname: ctx.siteHostname, permalinks: ctx.permalinks }) }] : [{ text }];
  });
}

export function toListingItem(row: ListingRow, ctx: ItemContext): ListingItem {
  const m = row.metadata ?? {};
  const description = m.description == null || typeof m.description === 'object' ? '' : String(m.description).trim();
  const fields = ctx.show
    .filter((key) => !(BUILTIN_FIELDS as readonly string[]).includes(key))
    .map((key) => ({ key, label: humanize(key), parts: fieldParts(m[key], ctx) }))
    .filter((f) => f.parts.length > 0);
  return {
    path: row.path,
    url: `/${(row.permalink || row.appPath || row.path).replace(/^\/+/, '')}`,
    title: itemTitle(row),
    date: itemDate(row),
    description: description || null,
    image: itemImage(row, ctx),
    authorHandles: normalizeAuthors(m.authors).map(stripWiki),
    tags: normalizeFrontmatterTags(m.tags),
    fields,
  };
}
```

Check while implementing: `normalizeFrontmatterTags('featured')` must return `['featured']` (read `packages/core/src/tags.ts:45`); if it only accepts lists, wrap scalars first. Check `resolveEntryDate` with an object `date` (it calls `safeDate`, which `new Date({})` → NaN → null; the try/catch is belt and braces).

- [ ] **Step 4: Run, expect PASS.** Adjust implementation (not expectations) for anything but the encoding detail noted above.
- [ ] **Step 5: Commit** `feat(listing): select, filter, sort and map folder items`

### Task B5: folder fetch and cache

**Files:**
- Modify: `lib/listing/query.ts` (append), `lib/listing/query.test.ts` (append)

**Interfaces:**
- Produces: `export type ListingDb = { blob: { findMany: (args: any) => Promise<unknown[]> } }; export function fetchFolderRows(db: ListingDb, args: { siteId: string; folder: string; withTags: boolean }): Promise<ListingRow[]>; export function queryListingRows(args: { siteId: string; spec: Pick<ListingSpec, 'from' | 'where' | 'sort'> }, db?: ListingDb): Promise<ListingRow[]>`.

- [ ] **Step 1: Failing tests**

```ts
import { fetchFolderRows, queryListingRows } from './query';

describe('fetchFolderRows / queryListingRows', () => {
  it('queries one folder, selects only metadata columns, never bodies', async () => {
    const findMany = vi.fn(async () => []);
    await fetchFolderRows({ blob: { findMany } }, { siteId: 's', folder: 'blog', withTags: false });
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 's', appPath: { not: null }, extension: { in: ['md', 'mdx'] }, path: { startsWith: 'blog/' } },
      select: { id: true, path: true, appPath: true, permalink: true, metadata: true },
    });
  });
  it('selects tags only when where.tags is used, and has no path filter for the root', async () => {
    const findMany = vi.fn(async () => []);
    await queryListingRows({ siteId: 's', spec: { from: '', where: { tags: 'x' }, sort: { field: 'date', direction: 'desc' } } }, { blob: { findMany } });
    const args = (findMany.mock.calls[0] as any[])[0];
    expect(args.where.path).toBeUndefined();
    expect(args.select.tags).toEqual({ select: { tag: true } });
  });
  it('returns selected and sorted rows', async () => {
    const findMany = vi.fn(async () => [
      { id: '1', path: 'b/old.md', appPath: '/b/old', permalink: null, metadata: { date: '2020-01-01' } },
      { id: '2', path: 'b/new.md', appPath: '/b/new', permalink: null, metadata: { date: '2026-01-01' } },
    ]);
    const rows = await queryListingRows({ siteId: 's', spec: { from: 'b', where: {}, sort: { field: 'date', direction: 'desc' } } }, { blob: { findMany } });
    expect(rows.map((r) => r.path)).toEqual(['b/new.md', 'b/old.md']);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** (append; add `import { unstable_cache } from 'next/cache'; import prisma from '@/server/db';` at the top)

```ts
export type ListingDb = { blob: { findMany: (args: any) => Promise<unknown[]> } };

export async function fetchFolderRows(db: ListingDb, { siteId, folder, withTags }: { siteId: string; folder: string; withTags: boolean }): Promise<ListingRow[]> {
  return (await db.blob.findMany({
    where: { siteId, appPath: { not: null }, extension: { in: ['md', 'mdx'] }, ...(folder ? { path: { startsWith: `${folder}/` } } : {}) },
    select: { id: true, path: true, appPath: true, permalink: true, metadata: true, ...(withTags ? { tags: { select: { tag: true } } } : {}) },
  })) as ListingRow[];
}

/**
 * The folder's items, filtered and sorted, cached per site/folder/where/sort
 * and invalidated by the site tag on publish (`revalidateTag(site.id)`).
 * Self-exclusion and page slicing happen after the cache, so every page of a
 * listing and every page embedding the same block share one entry. Returns
 * plain JSON (stored metadata), as unstable_cache requires.
 */
export async function queryListingRows({ siteId, spec }: { siteId: string; spec: Pick<ListingSpec, 'from' | 'where' | 'sort'> }, db: ListingDb = prisma as unknown as ListingDb): Promise<ListingRow[]> {
  const whereKey = JSON.stringify(Object.entries(spec.where).sort(([a], [b]) => (a < b ? -1 : 1)));
  const sortKey = `${spec.sort.field} ${spec.sort.direction}`;
  return unstable_cache(
    async (sid: string, from: string, whereJson: string, sortStr: string) => {
      const where = Object.fromEntries(JSON.parse(whereJson) as [string, string][]);
      const [field, direction] = sortStr.split(' ') as [string, 'asc' | 'desc'];
      const rows = await fetchFolderRows(db, { siteId: sid, folder: from, withTags: 'tags' in where });
      return selectListingRows(rows, { from, where, sort: { field, direction } });
    },
    ['listing-rows'],
    { revalidate: 60, tags: [siteId] },
  )(siteId, spec.from, whereKey, sortKey);
}
```

Note: a `sort` field containing a space is impossible (spec parser splits on whitespace), so `sortStr.split(' ')` is safe.

- [ ] **Step 4: Run, expect PASS** (whole `lib/listing/query.test.ts`).
- [ ] **Step 5: Commit** `feat(listing): cached folder query`

### Task B6: pagination helpers

**Files:**
- Create: `lib/listing/paginate.ts`, `lib/listing/paginate.test.ts`

**Interfaces:**
- Consumes: `parsePageParam` (`@/lib/changelog`), `ListingSpec`.
- Produces: `export type ListingPage<T> = { items: T[]; page: number; pageCount: number; total: number; paginated: boolean }; export function sliceListing<T>(items: T[], spec: Pick<ListingSpec, 'limit' | 'pageSize'>, page: number): ListingPage<T>; export function pageHref(publicUrl: string, page: number): string; export function pageFromSearchParam(value: string | string[] | undefined): number; export function listingCanonical(url: string, layout: unknown, pageParam: string | string[] | undefined): string`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { listingCanonical, pageFromSearchParam, pageHref, sliceListing } from './paginate';

const items = Array.from({ length: 45 }, (_, i) => i + 1);

describe('sliceListing', () => {
  it('limit wins and never paginates', () => {
    expect(sliceListing(items, { limit: 3, pageSize: null }, 5)).toEqual({ items: [1, 2, 3], page: 1, pageCount: 1, total: 45, paginated: false });
  });
  it('no pageSize shows everything', () => {
    expect(sliceListing(items, { limit: null, pageSize: null }, 2).items).toHaveLength(45);
  });
  it('slices the requested page', () => {
    expect(sliceListing(items, { limit: null, pageSize: 20 }, 3)).toEqual({ items: [41, 42, 43, 44, 45], page: 3, pageCount: 3, total: 45, paginated: true });
  });
  it('out of range and huge pages are empty, not errors (Review Focus 4)', () => {
    expect(sliceListing(items, { limit: null, pageSize: 20 }, 4).items).toEqual([]);
    expect(sliceListing(items, { limit: null, pageSize: 20 }, Number('99999999999999999999')).items).toEqual([]);
  });
  it('an empty folder still has one page', () => {
    expect(sliceListing([], { limit: null, pageSize: 20 }, 1).pageCount).toBe(1);
  });
});

describe('pageFromSearchParam', () => {
  it('bad values mean page 1', () => {
    for (const v of [undefined, '', 'abc', '0', '-1', '2.5']) expect(pageFromSearchParam(v)).toBe(1);
    expect(pageFromSearchParam('3')).toBe(3);
    expect(pageFromSearchParam(['4', '5'])).toBe(4);
  });
});

describe('pageHref', () => {
  it('page 1 is the bare URL; other params and fragments are dropped', () => {
    expect(pageHref('/blog', 1)).toBe('/blog');
    expect(pageHref('/blog', 2)).toBe('/blog?page=2');
    expect(pageHref('/blog?utm_source=x#top', 3)).toBe('/blog?page=3');
    expect(pageHref('/', 2)).toBe('/?page=2');
  });
});

describe('listingCanonical', () => {
  it('self-canonical only for layout: list pages beyond page 1', () => {
    expect(listingCanonical('https://s.site/blog', 'list', '2')).toBe('https://s.site/blog?page=2');
    expect(listingCanonical('https://s.site/blog', 'list', '1')).toBe('https://s.site/blog');
    expect(listingCanonical('https://s.site/blog', 'list', 'abc')).toBe('https://s.site/blog');
    expect(listingCanonical('https://s.site/blog', undefined, '2')).toBe('https://s.site/blog');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**

```ts
import { parsePageParam } from '@/lib/changelog';
import type { ListingSpec } from './spec';

export type ListingPage<T> = { items: T[]; page: number; pageCount: number; total: number; paginated: boolean };

export function sliceListing<T>(items: T[], spec: Pick<ListingSpec, 'limit' | 'pageSize'>, page: number): ListingPage<T> {
  if (spec.limit != null) return { items: items.slice(0, spec.limit), page: 1, pageCount: 1, total: items.length, paginated: false };
  if (spec.pageSize == null) return { items, page: 1, pageCount: 1, total: items.length, paginated: false };
  const pageCount = Math.max(1, Math.ceil(items.length / spec.pageSize));
  const p = Number.isSafeInteger(page) && page >= 1 ? page : page >= 1 ? pageCount + 1 : 1;
  const start = (p - 1) * spec.pageSize;
  return { items: items.slice(start, start + spec.pageSize), page: p, pageCount, total: items.length, paginated: true };
}

export function pageFromSearchParam(value: string | string[] | undefined): number {
  return parsePageParam(value) ?? 1;
}

export function pageHref(publicUrl: string, page: number): string {
  const base = publicUrl.split(/[?#]/)[0] || '/';
  return page <= 1 ? base : `${base}?page=${page}`;
}

/** `generateMetadata` cannot see inline blocks, so only `layout: list` pages get a self-canonical. */
export function listingCanonical(url: string, layout: unknown, pageParam: string | string[] | undefined): string {
  const page = layout === 'list' ? pageFromSearchParam(pageParam) : 1;
  return page > 1 ? pageHref(url, page) : url;
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(listing): pagination helpers`

### Task B7: author resolution (two commits: engine, then the `getAuthors` delegation)

**Files:**
- Create: `lib/listing/authors.ts`, `lib/listing/authors.test.ts`
- Modify: `server/api/routers/site.ts:1895-1975` (body of the `unstable_cache` callback in `getAuthors`)
- Test: `server/api/routers/__tests__/site.test.ts` (new `describe('site.getAuthors')`)

**Interfaces:**
- Produces: `export type ResolvedAuthor = { key: string; name: string; url: string | null; avatar?: string }; export function authorPathMatches(handle: string, path: string): boolean; export function pickAuthorBlob<T extends { path: string }>(handle: string, candidates: T[]): T | undefined; export function resolveAuthors(db: ListingDb, args: { siteId: string; handles: string[]; siteHostname: string; files: string[] }): Promise<ResolvedAuthor[]>` (same order and length as `handles`); `export function cachedResolveAuthors(args: { siteId: string; handles: string[]; siteHostname: string }, db?: ListingDb): Promise<ResolvedAuthor[]>` (what the plugin calls: `unstable_cache` keyed by site + sorted handles, tagged `siteId`, revalidate 60, like legacy `getAuthors`).

- [ ] **Step 1: Failing tests** (`lib/listing/authors.test.ts`)

```ts
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }));
import { authorPathMatches, cachedResolveAuthors, pickAuthorBlob, resolveAuthors } from './authors';

describe('authorPathMatches (anchored)', () => {
  it('matches exact and /-anchored suffixes only', () => {
    expect(authorPathMatches('jane', 'jane.md')).toBe(true);
    expect(authorPathMatches('jane', 'people/jane.mdx')).toBe(true);
    expect(authorPathMatches('jane', 'people/mary-jane.md')).toBe(false);
    expect(authorPathMatches('people/jane', 'site/people/jane.md')).toBe(true);
  });
});

describe('pickAuthorBlob', () => {
  it('prefers people/ or authors/, then the shortest path', () => {
    const c = [{ path: 'notes/deep/jane.md' }, { path: 'jane.md' }, { path: 'team/authors/jane.md' }, { path: 'people/jane.md' }];
    expect(pickAuthorBlob('jane', c)?.path).toBe('people/jane.md');
    expect(pickAuthorBlob('jane', [{ path: 'notes/deep/jane.md' }, { path: 'x/jane.md' }])?.path).toBe('x/jane.md');
  });
});

describe('resolveAuthors', () => {
  it('one query for all handles, input order kept, unresolved as plain names', async () => {
    const findMany = vi.fn(async () => [
      { id: 'b1', path: 'people/ada.md', appPath: '/people/ada', permalink: null, metadata: { title: 'Ada Lovelace', avatar: '[[ada.jpg]]' } },
      { id: 'b2', path: 'people/mary-ada.md', appPath: '/people/mary-ada', permalink: null, metadata: { title: 'Mary' } },
    ]);
    const out = await resolveAuthors({ blob: { findMany } }, { siteId: 's', handles: ['nobody', '[[ada]]', 'ada'], siteHostname: 'h.site', files: ['people/assets/ada.jpg'] });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(out).toEqual([
      { key: 'nobody', name: 'nobody', url: null },
      { key: 'b1', name: 'Ada Lovelace', url: '/people/ada', avatar: 'http://h.site/people/assets/ada.jpg' },
      { key: 'b1', name: 'Ada Lovelace', url: '/people/ada', avatar: 'http://h.site/people/assets/ada.jpg' },
    ]);
  });
  it('cachedResolveAuthors loads site paths itself and maps back to input order', async () => {
    const findMany = vi.fn(async (args: any) =>
      args.select.metadata ? [{ id: 'b1', path: 'people/ada.md', appPath: '/people/ada', permalink: null, metadata: { title: 'Ada' } }] : [{ path: 'people/ada.md' }],
    );
    const out = await cachedResolveAuthors({ siteId: 's', handles: ['zed', 'ada'], siteHostname: 'h' }, { blob: { findMany } });
    expect(out.map((a) => a.name)).toEqual(['zed', 'Ada']);
    expect(findMany).toHaveBeenCalledTimes(2);
  });
  it('does not query for an empty list', async () => {
    const findMany = vi.fn();
    expect(await resolveAuthors({ blob: { findMany } }, { siteId: 's', handles: [], siteHostname: 'h', files: [] })).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** (`lib/listing/authors.ts`)

```ts
import { matchLinkTarget } from '@flowershow/core';
import { unstable_cache } from 'next/cache';
import { resolveContentLink } from '@/lib/resolve-link';
import prisma from '@/server/db';
import { ensureLeadingSlash, extractWikiLinkTarget } from '@/lib/utils';
import type { ListingDb } from './query';

export type ResolvedAuthor = { key: string; name: string; url: string | null; avatar?: string };
type AuthorBlob = { id: string; path: string; appPath: string | null; permalink: string | null; metadata: Record<string, unknown> | null };

const clean = (h: string) => (extractWikiLinkTarget(h.trim()) ?? h.trim()).replace(/^\/+/, '').replace(/\.mdx?$/i, '');

export function authorPathMatches(handle: string, path: string): boolean {
  const h = clean(handle);
  return [`${h}.md`, `${h}.mdx`].some((f) => path === f || path.endsWith(`/${f}`));
}

export function pickAuthorBlob<T extends { path: string }>(handle: string, candidates: T[]): T | undefined {
  const rank = (p: string) => (/(^|\/)(people|authors)\//.test(p) ? 0 : 1);
  return candidates
    .filter((c) => authorPathMatches(handle, c.path))
    .sort((a, b) => rank(a.path) - rank(b.path) || a.path.length - b.path.length || (a.path < b.path ? -1 : 1))[0];
}

export async function resolveAuthors(db: ListingDb, { siteId, handles, siteHostname, files }: { siteId: string; handles: string[]; siteHostname: string; files: string[] }): Promise<ResolvedAuthor[]> {
  const unique = [...new Set(handles.map(clean).filter(Boolean))];
  if (unique.length === 0) return handles.map((h) => ({ key: h, name: clean(h) || h, url: null }));
  const blobs = (await db.blob.findMany({
    where: { siteId, OR: unique.flatMap((h) => [{ path: `${h}.md` }, { path: `${h}.mdx` }, { path: { endsWith: `/${h}.md` } }, { path: { endsWith: `/${h}.mdx` } }]) },
    select: { id: true, path: true, appPath: true, permalink: true, metadata: true },
  })) as AuthorBlob[];
  const siteFiles = files.map((p) => ({ path: p.replace(/^\/+/, '') }));
  return handles.map((handle) => {
    const blob = pickAuthorBlob(handle, blobs);
    if (!blob) return { key: handle, name: clean(handle) || handle, url: null };
    const m = blob.metadata ?? {};
    const title = m.title == null || typeof m.title === 'object' ? '' : String(m.title).trim();
    let avatar: string | undefined;
    if (typeof m.avatar === 'string' && m.avatar.trim()) {
      const wiki = extractWikiLinkTarget(m.avatar.trim());
      const target = wiki !== null ? (matchLinkTarget(wiki, siteFiles)?.path ?? wiki) : m.avatar.trim();
      avatar = resolveContentLink({ target, siteHostname });
    }
    return { key: blob.id, name: title || clean(handle), url: ensureLeadingSlash(blob.permalink || blob.appPath || ''), ...(avatar ? { avatar } : {}) };
  });
}
```

Append the cached wrapper the plugin uses (the tRPC procedure keeps calling `resolveAuthors` inside its own cache):

```ts
export async function cachedResolveAuthors(
  args: { siteId: string; handles: string[]; siteHostname: string },
  db: ListingDb = prisma as unknown as ListingDb,
): Promise<ResolvedAuthor[]> {
  const unique = [...new Set(args.handles)].sort();
  const resolved = await unstable_cache(
    async (siteId: string, handlesJson: string, siteHostname: string) => {
      const handles = JSON.parse(handlesJson) as string[];
      const files = ((await db.blob.findMany({ where: { siteId }, select: { path: true } })) as { path: string }[]).map((b) => b.path);
      return resolveAuthors(db, { siteId, handles, siteHostname, files });
    },
    ['listing-authors'],
    { revalidate: 60, tags: [args.siteId] },
  )(args.siteId, JSON.stringify(unique), args.siteHostname);
  const byHandle = new Map(unique.map((h, i) => [h, resolved[i]!]));
  return args.handles.map((h) => byHandle.get(h)!);
}
```

Avatar resolution deliberately keeps the legacy `getAuthors` semantics (no `originFilePath`, i.e. relative to the site root) so the author header on every post renders exactly as before.

- [ ] **Step 4: Run, expect PASS**, then commit on its own: `feat(listing): batched, anchored, cached author resolution`.

**Second commit (revertable alone).** Steps 5 to 9 change the author header on every post of every site, not just listings. Keep them in a single commit and call it out in the PR body.

- [ ] **Step 5: Failing router test** (append to `site.test.ts`; `createMockDb` routes `blob.findMany` by `where`: read it first and, if it cannot answer an `OR` of `endsWith`, override `db.blob.findMany` with `vi.fn` as the `$queryRaw` test does)

```ts
describe('site.getAuthors', () => {
  it('uses anchored matching (jane does not resolve mary-jane.md)', async () => {
    const db = createMockDb({ blobs: [] }) as any;
    db.blob.findMany = vi.fn(async (args: any) =>
      args.select?.metadata
        ? [{ id: 'b-mj', path: 'people/mary-jane.md', appPath: '/people/mary-jane', permalink: null, metadata: { title: 'Mary Jane' } }]
        : [{ path: 'people/mary-jane.md' }],
    );
    const caller = createCaller(db);
    expect(await caller.site.getAuthors({ siteId: 'site-1', authors: ['jane'] })).toEqual([{ key: 'jane', name: 'jane', url: null }]);
  });
});
```

- [ ] **Step 6: Run, expect FAIL** (legacy `endsWith('jane.md')` matches).
- [ ] **Step 7: Replace the cached body of `getAuthors`** with a delegation (keep input schema, site lookup, `assertSiteAccess`, cache key and tags):

```ts
          async (input) => {
            const siteHostname = site.customDomain ?? `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;
            const files = (await ctx.db.blob.findMany({ where: { siteId: input.siteId }, select: { path: true } })).map((b) => b.path);
            return resolveAuthors(ctx.db as unknown as ListingDb, { siteId: input.siteId, handles: input.authors, siteHostname, files });
          },
```

with `import { resolveAuthors } from '@/lib/listing/authors'; import type { ListingDb } from '@/lib/listing/query';`. The return type `Array<{ key; name; url; avatar? }>` already matches `ResolvedAuthor`.

- [ ] **Step 8: Run** `npx vitest run --project=unit lib/listing server/api/routers/__tests__/site.test.ts components/public/changelog`; expect PASS, including the existing PASSWORD-site `getAuthors` test and `changelog-index-page.test.tsx`.
- [ ] **Step 9: Commit** `refactor(site): getAuthors delegates to resolveAuthors (anchored author matching)`. Nothing else goes in this commit.

### Task B8: renderer, `list` view, empty state, error card, pagination

**Files:**
- Create: `lib/listing/render.ts`, `lib/listing/render.test.ts`

**Interfaces:**
- Consumes: `ListingSpec`, `LISTING_KEYS` (B2), `ListingItem` (B4), `ListingPage`, `pageHref` (B6), `ResolvedAuthor` (B7), `pageWindow` (A1), `formatChangelogDate` (`@/lib/changelog`), `tagToHref` (`@flowershow/core`).
- Produces:

```ts
export const LISTING_HEADLINE_CLASS = 'list-component-item-headline';
export const LISTING_HEADING_PLACEHOLDER_ID = 'listing-item-heading';
export type RenderListingInput = { spec: ListingSpec; page: ListingPage<ListingItem>; authors: Map<string, ResolvedAuthor>; publicUrl: string; label: string; showTags?: boolean; notes?: string[] };
export function renderListing(input: RenderListingInput): RootContent;
export function renderListingError(errors: string[], heading: string): RootContent;
```

Invariants: no block element inside `<p>`, no `<a>` inside `<a>` (both keep `rehype-raw` from restructuring the tree in `.md`); items are direct children of the `<section>`, pagination is the last child; **every `hProperties` value is a string** (`tabIndex: '-1'`, `dataTocIgnore: ''`, `ariaHidden: 'true'`), because `rehype-raw` stringifies them in `.md` while MDX would render a boolean/number differently, which breaks parity.

- [ ] **Step 1: Failing tests** (render through `remark-rehype` + `rehype-stringify`, like `remark-changelog.test.tsx`)

```ts
import type { Root } from 'mdast';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import type { ListingItem } from './query';
import { renderListing, renderListingError, type RenderListingInput } from './render';
import type { ListingSpec } from './spec';

// ListingImage is an MDX JSX element; give it a visible stand-in for plain remark-rehype.
const handlers = { mdxJsxFlowElement: (_s: any, node: any) => ({ type: 'element', tagName: 'listing-image', properties: Object.fromEntries(node.attributes.map((a: any) => [a.name, a.value])), children: [] }) };

async function html(node: any) {
  const tree: Root = { type: 'root', children: [node] };
  const processor = unified().use(remarkRehype, { handlers } as any).use(rehypeStringify);
  const out = processor.stringify((await processor.run(tree)) as any);
  return new DOMParser().parseFromString(String(out), 'text/html').body;
}

const spec = (o: Partial<ListingSpec> = {}): ListingSpec => ({ from: 'blog', view: 'list', sort: { field: 'date', direction: 'desc' }, limit: null, pageSize: 20, show: ['image', 'date', 'title', 'description', 'authors'], where: {}, ...o });
const item = (o: Partial<ListingItem> = {}): ListingItem => ({ path: 'blog/a.md', url: '/blog/a', title: 'A post', date: '2026-09-18', description: 'Summary', image: 'http://h/a.jpg', authorHandles: ['ada', 'guest'], tags: ['featured'], fields: [], ...o });
const authors = new Map([['ada', { key: 'b1', name: 'Ada Lovelace', url: '/people/ada', avatar: 'http://h/ada.jpg' }], ['guest', { key: 'guest', name: 'Guest Writer', url: null }]]);
const input = (o: Partial<RenderListingInput> = {}): RenderListingInput => ({ spec: spec(), page: { items: [item()], page: 1, pageCount: 1, total: 1, paginated: true }, authors, publicUrl: '/blog', label: 'Blog', ...o });

describe('renderListing: list view (design section 6)', () => {
  it('emits the documented item DOM', async () => {
    const body = await html(renderListing(input()));
    const root = body.querySelector('section.list-component.list-component--list.not-prose[data-view="list"][aria-label="Blog"]')!;
    expect(root).not.toBeNull();
    const art = root.querySelector(':scope > article.list-component-item')!;
    expect(art.querySelector('.list-component-item-media > a.list-component-item-media-link[href="/blog/a"][tabindex="-1"][aria-hidden="true"] > listing-image[src="http://h/a.jpg"][variant="media"]')).not.toBeNull();
    expect(art.querySelector('.list-component-item-content > .list-component-item-eyebrow > time.list-component-item-date[datetime="2026-09-18"]')!.textContent).toBe('Sep 18, 2026');
    const h3 = art.querySelector('h3.list-component-item-headline[data-toc-ignore]')!;
    expect(h3.id).toBe('listing-item-heading');
    expect(h3.getAttribute('data-toc-ignore')).toBe('');
    expect(h3.querySelector('a.list-component-item-headline-link[href="/blog/a"]')!.textContent).toBe('A post');
    expect(art.querySelector('p.list-component-item-summary')!.textContent).toBe('Summary');
    const foot = art.querySelector('div.list-component-item-footnote.list-component-item-authors')!;
    expect(foot.querySelector('a.list-component-item-author[href="/people/ada"] > listing-image[variant="avatar"][src="http://h/ada.jpg"]')).not.toBeNull();
    expect(foot.querySelector('a.list-component-item-author')!.textContent).toBe('Ada Lovelace');
    expect(foot.querySelector('span.list-component-item-author')!.textContent).toBe('Guest Writer');
    expect(art.querySelector('.list-component-item-tags')).toBeNull(); // tags not in show
  });
  it('renders tags and labelled custom fields when shown', async () => {
    const body = await html(renderListing(input({ spec: spec({ show: ['title', 'status', 'tags'] }), page: { items: [item({ fields: [{ key: 'status', label: 'Status', parts: [{ text: 'In progress' }] }, { key: 'guests', label: 'Guests', parts: [{ text: 'Ada', href: '/people/ada' }, { text: 'Grace' }] }] })], page: 1, pageCount: 1, total: 1, paginated: false } })));
    expect(body.querySelector('dl.list-component-item-fields > div.list-component-item-field[data-field="status"] > dt')!.textContent).toBe('Status');
    expect(body.querySelector('[data-field="status"] > dd')!.textContent).toBe('In progress');
    expect(body.querySelector('[data-field="guests"] > dd')!.innerHTML).toBe('<a href="/people/ada">Ada</a>, Grace');
    expect(body.querySelector('ul.list-component-item-tags > li > a.tag-pill[href="/tags/featured"]')!.textContent).toBe('#featured');
    expect(body.querySelector('.list-component-item-media')).toBeNull(); // image not in show
  });
  it('reserves the media column only when some item on the page has an image', async () => {
    const withOne = await html(renderListing(input({ page: { items: [item(), item({ url: '/b', image: null })], page: 1, pageCount: 1, total: 2, paginated: false } })));
    expect(withOne.querySelectorAll('.list-component-item-media--empty')).toHaveLength(1);
    const none = await html(renderListing(input({ page: { items: [item({ image: null })], page: 1, pageCount: 1, total: 1, paginated: false } })));
    expect(none.querySelector('.list-component-item-media')).toBeNull();
  });
  it('escapes frontmatter text', async () => {
    const body = await html(renderListing(input({ page: { items: [item({ title: '<img src=x onerror=alert(1)>' })], page: 1, pageCount: 1, total: 1, paginated: false } })));
    expect(body.querySelector('img')).toBeNull();
    expect(body.querySelector('.list-component-item-headline-link')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('renderListing: empty and pagination (4.8)', () => {
  it('an empty folder is a paragraph, not a section', async () => {
    const body = await html(renderListing(input({ page: { items: [], page: 1, pageCount: 1, total: 0, paginated: true } })));
    expect(body.querySelector('section')).toBeNull();
    expect(body.querySelector('p.list-component-empty')!.textContent).toBe('Nothing here yet.');
  });
  it('an out-of-range page keeps the strip', async () => {
    const body = await html(renderListing(input({ page: { items: [], page: 9, pageCount: 3, total: 45, paginated: true } })));
    expect(body.querySelector('section > p.list-component-empty')).not.toBeNull();
    expect(body.querySelector('section > nav.list-component-pagination:last-child')).not.toBeNull();
  });
  it('page 1 of 12: disabled Newer span, numbered strip, Older link', async () => {
    const body = await html(renderListing(input({ page: { items: [item()], page: 1, pageCount: 12, total: 240, paginated: true } })));
    const nav = body.querySelector('section > nav.list-component-pagination[aria-label="Pages"]:last-child')!;
    const prev = nav.querySelector('.list-component-pagination-nav > .list-component-pagination-button--prev')!;
    expect(prev.tagName).toBe('SPAN');
    expect(prev.classList.contains('is-disabled')).toBe(true);
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(prev.textContent).toBe('Newer');
    expect(prev.querySelector('svg.list-component-pagination-button-icon.list-component-pagination-button-icon--prev[viewBox="0 0 24 24"]')).not.toBeNull();
    const strip = [...nav.querySelectorAll('.list-component-pagination-pages > *')].map((e) => e.textContent);
    expect(strip).toEqual(['1', '2', '3', '…', '12']);
    expect(nav.querySelector('.list-component-pagination-page-button--current[aria-current="page"]')!.getAttribute('href')).toBe('/blog');
    const next = nav.querySelector('.list-component-pagination-nav--end > a.list-component-pagination-button--next[rel="next"]')!;
    expect(next.getAttribute('href')).toBe('/blog?page=2');
    expect(next.textContent).toBe('Older');
  });
  it('the last page links back with rel=prev and disables Older', async () => {
    const body = await html(renderListing(input({ page: { items: [item()], page: 2, pageCount: 2, total: 21, paginated: true } })));
    expect(body.querySelector('a.list-component-pagination-button--prev[rel="prev"]')!.getAttribute('href')).toBe('/blog');
    expect(body.querySelector('span.list-component-pagination-button--next.is-disabled')).not.toBeNull();
  });
  it('non-date sorts say Previous/Next; single pages and unpaginated lists have no nav', async () => {
    const titled = await html(renderListing(input({ spec: spec({ sort: { field: 'title', direction: 'asc' } }), page: { items: [item()], page: 1, pageCount: 2, total: 21, paginated: true } })));
    expect(titled.querySelector('.list-component-pagination-button--next')!.textContent).toBe('Next');
    expect((await html(renderListing(input()))).querySelector('nav')).toBeNull();
  });
});

describe('notes', () => {
  it('renders the list with a note as the first child', async () => {
    const body = await html(renderListing(input({ notes: ['"pageSize" is ignored because "limit" is set; remove one of them.'] })));
    const first = body.querySelector('section.list-component > :first-child')!;
    expect(first.matches('p.list-component-note')).toBe(true);
    expect(first.textContent).toContain('"pageSize" is ignored');
    expect(body.querySelectorAll('section > article')).toHaveLength(1);
  });
  it('an empty folder with a note still shows the note', async () => {
    const body = await html(renderListing(input({ notes: ['n'], page: { items: [], page: 1, pageCount: 1, total: 0, paginated: false } })));
    expect(body.querySelector('section > p.list-component-note')).not.toBeNull();
    expect(body.querySelector('section > p.list-component-empty')).not.toBeNull();
  });
});

describe('renderListingError', () => {
  it('lists every problem and the keys', async () => {
    const body = await html(renderListingError(['Unknown key "pagesize". Did you mean "pageSize"?', 'Unknown key "layout". Use "view: cards".'], 'List block has problems'));
    const card = body.querySelector('div.list-component-error.list-component-error--block')!;
    expect(card.querySelector('.list-component-error-title')!.textContent).toBe('List block has problems');
    expect([...card.querySelectorAll('li')].map((l) => l.textContent)).toHaveLength(2);
    expect(card.querySelector('.list-component-error-keys')!.textContent).toBe('Keys: from, view, sort, limit, pageSize, show, where.');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/render.test.ts`
- [ ] **Step 3: Implement** (`lib/listing/render.ts`)

```ts
import { tagToHref } from '@flowershow/core';
import type { PhrasingContent, RootContent } from 'mdast';
import { formatChangelogDate } from '@/lib/changelog';
import { pageWindow } from '@/lib/page-window';
import type { ResolvedAuthor } from './authors';
import type { ListingPage } from './paginate';
import { pageHref } from './paginate';
import type { ListingItem } from './query';
import { LISTING_KEYS, type ListingSpec, type ListingView } from './spec';

export const LISTING_HEADLINE_CLASS = 'list-component-item-headline';
/** Set so rehype-slug skips item headings; removed by rehype-listing-headings. */
export const LISTING_HEADING_PLACEHOLDER_ID = 'listing-item-heading';

type Props = Record<string, unknown>;
const el = (tagName: string, className: string[], children: unknown[], props: Props = {}): RootContent =>
  ({ type: 'listingElement', data: { hName: tagName, hProperties: { ...(className.length ? { className } : {}), ...props } }, children }) as unknown as RootContent;
const text = (value: string): PhrasingContent => ({ type: 'text', value });

const SIZES: Record<ListingView, string> = {
  list: '(min-width: 1024px) 16rem, 100vw',
  cards: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  compact: '8rem',
};

/** The one component: an MDX JSX element in both pipelines (see lib/markdown.ts remarkMdxJsxToElement). */
const image = (attrs: Record<string, string>): RootContent =>
  ({ type: 'mdxJsxFlowElement', name: 'ListingImage', attributes: Object.entries(attrs).map(([name, value]) => ({ type: 'mdxJsxAttribute', name, value })), children: [] }) as unknown as RootContent;

const ICONS = { prev: ['m12 19-7-7 7-7', 'M19 12H5'], next: ['M5 12h14', 'm12 5 7 7-7 7'] };
const icon = (dir: 'prev' | 'next') =>
  el('svg', ['list-component-pagination-button-icon', `list-component-pagination-button-icon--${dir}`], ICONS[dir].map((d) => el('path', [], [], { d })), { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', ariaHidden: 'true' });

function renderAuthors(handles: string[], authors: Map<string, ResolvedAuthor>): RootContent | null {
  if (handles.length === 0) return null;
  return el('div', ['list-component-item-footnote', 'list-component-item-authors'], handles.map((h) => {
    const a = authors.get(h) ?? { key: h, name: h, url: null };
    const avatar = a.avatar ? [image({ src: a.avatar, alt: '', sizes: '24px', variant: 'avatar' })] : [];
    return a.url ? el('a', ['list-component-item-author'], [...avatar, text(a.name)], { href: a.url }) : el('span', ['list-component-item-author'], [...avatar, text(a.name)]);
  }));
}

function renderItem(item: ListingItem, spec: ListingSpec, ctx: { authors: Map<string, ResolvedAuthor>; reserveMedia: boolean; showTags: boolean }): RootContent {
  const show = new Set(spec.show);
  const children: RootContent[] = [];
  if (show.has('image')) {
    if (item.image) children.push(el('div', ['list-component-item-media'], [el('a', ['list-component-item-media-link'], [image({ src: item.image, alt: '', sizes: SIZES[spec.view], variant: 'media' })], { href: item.url, tabIndex: '-1', ariaHidden: 'true' })]));
    else if (ctx.reserveMedia) children.push(el('div', ['list-component-item-media', 'list-component-item-media--empty'], [], { ariaHidden: 'true' }));
  }
  const content: RootContent[] = [];
  if (show.has('date') && item.date) content.push(el('div', ['list-component-item-eyebrow'], [el('time', ['list-component-item-date'], [text(formatChangelogDate(item.date))], { dateTime: item.date })]));
  if (show.has('title')) content.push(el('h3', [LISTING_HEADLINE_CLASS], [el('a', ['list-component-item-headline-link'], [text(item.title)], { href: item.url })], { id: LISTING_HEADING_PLACEHOLDER_ID, dataTocIgnore: '' }));
  if (show.has('description') && item.description) content.push(el('p', ['list-component-item-summary'], [text(item.description)]));
  if (item.fields.length) {
    content.push(el('dl', ['list-component-item-fields'], item.fields.map((f) => el('div', ['list-component-item-field'], [
      el('dt', [], [text(f.label)]),
      el('dd', [], f.parts.flatMap((p, i) => [...(i ? [text(', ')] : []), p.href ? el('a', [], [text(p.text)], { href: p.href }) : text(p.text)])),
    ], { dataField: f.key }))));
  }
  if (show.has('tags') && item.tags.length) {
    content.push(el('ul', ['list-component-item-tags'], item.tags.map((t) => el('li', [], [ctx.showTags ? el('a', ['tag-pill'], [text(`#${t}`)], { href: tagToHref(t) }) : el('span', ['tag-pill'], [text(`#${t}`)])]))));
  }
  if (show.has('authors')) {
    const authorsNode = renderAuthors(item.authorHandles, ctx.authors);
    if (authorsNode) content.push(authorsNode);
  }
  children.push(el('div', ['list-component-item-content'], content));
  return el('article', ['list-component-item'], children);
}

function renderPagination(page: ListingPage<ListingItem>, spec: ListingSpec, publicUrl: string): RootContent {
  const dated = spec.sort.field === 'date' && spec.sort.direction === 'desc';
  const labels = dated ? { prev: 'Newer', next: 'Older' } : { prev: 'Previous', next: 'Next' };
  const end = (dir: 'prev' | 'next', target: number, enabled: boolean) => {
    const cls = ['list-component-pagination-button', `list-component-pagination-button--${dir}`];
    const kids = dir === 'prev' ? [icon('prev'), text(labels.prev)] : [text(labels.next), icon('next')];
    return enabled ? el('a', cls, kids, { href: pageHref(publicUrl, target), rel: dir }) : el('span', [...cls, 'is-disabled'], kids, { ariaDisabled: 'true' });
  };
  const current = Math.min(page.page, page.pageCount);
  return el('nav', ['list-component-pagination'], [
    el('div', ['list-component-pagination-nav'], [end('prev', page.page - 1, page.page > 1)]),
    el('div', ['list-component-pagination-pages'], pageWindow(current, page.pageCount).map((entry) =>
      entry === 'ellipsis'
        ? el('span', ['list-component-pagination-ellipsis'], [text('…')])
        : el('a', ['list-component-pagination-page-button', entry === page.page ? 'list-component-pagination-page-button--current' : 'list-component-pagination-page-button--other'], [text(String(entry))], { href: pageHref(publicUrl, entry), ...(entry === page.page ? { ariaCurrent: 'page' } : {}) }),
    )),
    el('div', ['list-component-pagination-nav', 'list-component-pagination-nav--end'], [end('next', page.page + 1, page.page < page.pageCount)]),
  ], { ariaLabel: 'Pages' });
}

export type RenderListingInput = { spec: ListingSpec; page: ListingPage<ListingItem>; authors: Map<string, ResolvedAuthor>; publicUrl: string; label: string; showTags?: boolean; notes?: string[] };

export function renderListing({ spec, page, authors, publicUrl, label, showTags = true, notes = [] }: RenderListingInput): RootContent {
  const empty = el('p', ['list-component-empty'], [text('Nothing here yet.')]);
  if (page.total === 0 && notes.length === 0) return empty;
  const reserveMedia = spec.view === 'list' && spec.show.includes('image') && page.items.some((i) => i.image);
  const children: RootContent[] = notes.map((n) => el('p', ['list-component-note'], [text(n)]));
  children.push(...(page.items.length ? page.items.map((i) => renderItem(i, spec, { authors, reserveMedia, showTags })) : [empty]));
  if (page.paginated && page.pageCount > 1) children.push(renderPagination(page, spec, publicUrl));
  return el('section', ['list-component', `list-component--${spec.view}`, 'not-prose'], children, { dataView: spec.view, ariaLabel: label });
}

export function renderListingError(errors: string[], heading: string): RootContent {
  return el('div', ['list-component-error', 'list-component-error--block'], [
    el('p', ['list-component-error-title'], [text(heading)]),
    el('ul', ['list-component-error-list'], errors.map((e) => el('li', [], [text(e)]))),
    el('p', ['list-component-error-keys'], [text(`Keys: ${LISTING_KEYS.join(', ')}.`)]),
  ]);
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(listing): render list view, empty state, error card and pagination`

### Task B9: `cards` and `compact` views

**Files:**
- Modify: `lib/listing/render.test.ts` (append); `lib/listing/render.ts` only if a test fails

The view logic is already generic (modifier class, `SIZES`, show defaults from B2). This task pins the per-view contract so a later refactor cannot silently change it. If the PR grows too large, `compact` is the first thing to cut (design 4.9): remove it from `LISTING_VIEWS` and drop these tests.

- [ ] **Step 1: Tests**

```ts
describe('views', () => {
  it('cards: modifier, card sizes, same item structure', async () => {
    const body = await html(renderListing(input({ spec: spec({ view: 'cards' }) })));
    expect(body.querySelector('section.list-component--cards[data-view="cards"] > article.list-component-item')).not.toBeNull();
    expect(body.querySelector('listing-image[variant="media"]')!.getAttribute('sizes')).toBe('(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw');
    expect(body.querySelector('.list-component-item-media--empty')).toBeNull();
  });
  it('compact: date and title by default (show comes from the spec), explicit description honoured', async () => {
    const compact = spec({ view: 'compact', show: ['date', 'title'] });
    const body = await html(renderListing(input({ spec: compact })));
    expect(body.querySelector('section.list-component--compact .list-component-item-date')).not.toBeNull();
    expect(body.querySelector('.list-component-item-media')).toBeNull();
    expect(body.querySelector('.list-component-item-summary')).toBeNull();
    const withSummary = await html(renderListing(input({ spec: { ...compact, show: ['date', 'title', 'description'] } })));
    expect(withSummary.querySelector('.list-component-item-summary')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect PASS** (or fix `render.ts`).
- [ ] **Step 3: Commit** `test(listing): pin cards and compact view output`

### Task B10: the remark plugin

**Files:**
- Create: `lib/remark-listing.ts`, `lib/remark-listing.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:

```ts
export type ListingRenderContext = { page?: number; publicUrl?: string; pageTitle?: string; implicit?: { options: unknown; defaultFrom: string | null } };
export type RemarkListingOptions = ListingRenderContext & { siteId: string; siteHostname: string; rootDir?: string; filePath: string; files: string[]; permalinks?: Record<string, string>; showTags?: boolean };
export default function remarkListing(options: RemarkListingOptions): (tree: Root) => Promise<void>;
```

- [ ] **Step 1: Failing tests** (mock the data layer; parse with `remark-parse` + `remark-gfm` + `@r4ai/remark-callout` so nested cases are real)

```ts
import remarkCallout from '@r4ai/remark-callout';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryListingRows = vi.fn();
const cachedResolveAuthors = vi.fn(async (a: { handles: string[] }) => a.handles.map((h) => ({ key: h, name: h.toUpperCase(), url: `/people/${h}` })));
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('@/lib/listing/query', async (orig) => ({ ...(await orig<typeof import('@/lib/listing/query')>()), queryListingRows: (...a: unknown[]) => queryListingRows(...a) }));
vi.mock('@/lib/listing/authors', () => ({ cachedResolveAuthors: (a: { handles: string[] }) => cachedResolveAuthors(a) }));
import remarkListing, { type RemarkListingOptions } from './remark-listing';

const rows = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}`, path: `blog/p${String(i).padStart(2, '0')}.md`, appPath: `/blog/p${i}`, permalink: null, metadata: { title: `Post ${i}`, authors: ['ada'] } }));
const base: RemarkListingOptions = { siteId: 's', siteHostname: 'h', filePath: 'README.md', files: ['/blog/p00.md'], publicUrl: '/' };

async function run(md: string, opts: Partial<RemarkListingOptions> = {}) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkCallout).use(remarkListing, { ...base, ...opts });
  return processor.run(processor.parse(md)) as Promise<any>;
}
const classes = (tree: any) => JSON.stringify(tree).match(/"list-component(?:-error|-empty)?"/g) ?? [];

beforeEach(() => {
  queryListingRows.mockReset().mockResolvedValue(rows);
  cachedResolveAuthors.mockClear();
});

describe('remarkListing', () => {
  it('replaces ```blog and ```list fences, leaves other code alone', async () => {
    const tree = await run('```blog\nlimit: 3\n```\n\n```js\nx\n```\n\n```list\nfrom: blog\nlimit: 1\n```');
    expect(tree.children.map((n: any) => n.data?.hProperties?.className?.[0] ?? n.type)).toEqual(['list-component', 'code', 'list-component']);
    expect(queryListingRows).toHaveBeenCalledWith({ siteId: 's', spec: expect.objectContaining({ from: 'blog' }) });
  });
  it('renders blocks nested in callouts, blockquotes and list items, and ~~~ fences (Review Focus 5)', async () => {
    const tree = await run('> [!note]\n> ```blog\n> limit: 1\n> ```\n\n> ```blog\n> limit: 1\n> ```\n\n- item\n\n  ```blog\n  limit: 1\n  ```\n\n~~~blog\nlimit: 1\n~~~');
    expect(classes(tree).filter((c) => c === '"list-component"')).toHaveLength(4);
  });
  it('excludes the current page and resolves authors once per block', async () => {
    const tree = await run('```blog\nlimit: 2\n```', { filePath: 'blog/p00.md' });
    expect(JSON.stringify(tree)).not.toContain('Post 0"');
    expect(cachedResolveAuthors).toHaveBeenCalledTimes(1);
  });
  it('an invalid block becomes an error card and the rest still renders', async () => {
    const tree = await run('```list\ndir: blog\npagesize: 5\n```\n\nafter\n\n```blog\nlimit: 1\n```');
    expect(tree.children[0].data.hProperties.className).toContain('list-component-error');
    expect(tree.children[1].type).toBe('paragraph');
    expect(tree.children[2].data.hProperties.className).toContain('list-component');
  });
  it('a data failure only replaces its own block', async () => {
    queryListingRows.mockRejectedValueOnce(new Error('db down'));
    const tree = await run('```blog\n```\n\n```blog\nlimit: 1\n```');
    expect(tree.children[0].data.hProperties.className).toContain('list-component-error');
    expect(JSON.stringify(tree.children[0])).not.toContain('db down');
    expect(tree.children[1].data.hProperties.className).toContain('list-component');
  });
  it('only one listing per page paginates; the implicit listing claims it first', async () => {
    const tree = await run('```blog\npageSize: 5\n```', { implicit: { options: {}, defaultFrom: 'blog' }, pageTitle: 'Blog' });
    expect(tree.children[0].data.hProperties.className).toContain('list-component-error');
    expect(JSON.stringify(tree.children[0])).toContain('Only one list per page can paginate');
    const last = tree.children.at(-1);
    expect(last.data.hProperties.ariaLabel).toBe('Blog');
  });
  it('layout: list appends the implicit listing, paginated at 20 by default', async () => {
    const tree = await run('Intro paragraph.', { implicit: { options: undefined, defaultFrom: 'blog' }, page: 2, publicUrl: '/blog', pageTitle: 'Blog' });
    expect(tree.children[0].type).toBe('paragraph');
    const section = tree.children[1];
    expect(section.children.filter((c: any) => c.data?.hName === 'article')).toHaveLength(5);
    expect(JSON.stringify(section)).toContain('"href":"/blog"');
  });
  it('layout: list errors use the settings heading', async () => {
    const tree = await run('', { implicit: { options: { veiw: 'cards' }, defaultFrom: 'blog' } });
    expect(JSON.stringify(tree)).toContain('List settings have problems');
  });
  it('caps a page at 10 listings; the rest get an error card without querying', async () => {
    const md = Array.from({ length: 11 }, () => '```blog\nlimit: 1\n```').join('\n\n');
    const tree = await run(md);
    expect(queryListingRows).toHaveBeenCalledTimes(10);
    expect(JSON.stringify(tree.children[10])).toContain('At most 10 lists per page');
  });
  it('limit with pageSize renders with a note (not an error card)', async () => {
    const tree = await run('```blog\nlimit: 2\npageSize: 5\n```');
    expect(tree.children[0].data.hProperties.className).toContain('list-component');
    expect(JSON.stringify(tree.children[0])).toContain('list-component-note');
  });
  it('resolves an Obsidian-capitalised folder for ```blog (Review Focus 1)', async () => {
    await run('```blog\nlimit: 1\n```', { files: ['/Blog/a.md'] });
    expect(queryListingRows).toHaveBeenCalledWith({ siteId: 's', spec: expect.objectContaining({ from: 'Blog' }) });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/remark-listing.test.ts`
- [ ] **Step 3: Implement** (`lib/remark-listing.ts`)

```ts
import type { Code, Parent, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { entryTitleFromPath } from '@/lib/changelog';
import { cachedResolveAuthors } from '@/lib/listing/authors';
import { sliceListing } from '@/lib/listing/paginate';
import { queryListingRows, resolveFolderCase, toListingItem } from '@/lib/listing/query';
import { renderListing, renderListingError } from '@/lib/listing/render';
import { parseListingBlock, parseListingSpec, type SpecResult } from '@/lib/listing/spec';

export type ListingRenderContext = { page?: number; publicUrl?: string; pageTitle?: string; implicit?: { options: unknown; defaultFrom: string | null } };
export type RemarkListingOptions = ListingRenderContext & { siteId: string; siteHostname: string; rootDir?: string; filePath: string; files: string[]; permalinks?: Record<string, string>; showTags?: boolean };

const BLOCK_HEADING = 'List block has problems';
const LAYOUT_HEADING = 'List settings have problems';
/** Each listing can read a whole folder on a cold cache; bound the cost of one page. */
export const MAX_LISTINGS_PER_PAGE = 10;

export default function remarkListing(options: RemarkListingOptions) {
  return async (tree: Root) => {
    const targets: Array<{ node: Code; index: number; parent: Parent }> = [];
    visit(tree, 'code', (node: Code, index, parent) => {
      if ((node.lang === 'list' || node.lang === 'blog') && parent && typeof index === 'number') targets.push({ node, index, parent: parent as Parent });
    });
    if (targets.length === 0 && !options.implicit) return;

    let paginationClaimed = false;
    let listings = 0;
    const currentPath = options.filePath.replace(/^\/+/, '');

    const build = async (result: SpecResult, heading: string, label?: string): Promise<RootContent> => {
      try {
        if (++listings > MAX_LISTINGS_PER_PAGE) return renderListingError([`At most ${MAX_LISTINGS_PER_PAGE} lists per page; remove or combine some blocks.`], heading);
        if (!result.ok) return renderListingError(result.errors, heading);
        const spec = { ...result.spec, from: resolveFolderCase(result.spec.from, options.files) };
        if (spec.pageSize != null) {
          if (paginationClaimed) return renderListingError(['Only one list per page can paginate; add "limit:" or remove "pageSize:" from this one.'], heading);
          paginationClaimed = true;
        }
        const rows = (await queryListingRows({ siteId: options.siteId, spec })).filter((r) => r.path !== currentPath);
        const slice = sliceListing(rows, spec, options.page ?? 1);
        const ctx = { siteHostname: options.siteHostname, files: options.files, permalinks: options.permalinks, show: spec.show };
        const items = slice.items.map((r) => toListingItem(r, ctx));
        const handles = spec.show.includes('authors') ? [...new Set(items.flatMap((i) => i.authorHandles))] : [];
        const resolved = handles.length ? await cachedResolveAuthors({ siteId: options.siteId, handles, siteHostname: options.siteHostname }) : [];
        return renderListing({
          spec,
          page: { ...slice, items },
          authors: new Map(handles.map((h, i) => [h, resolved[i]!])),
          publicUrl: options.publicUrl ?? '/',
          label: label || entryTitleFromPath(spec.from || 'pages'),
          showTags: options.showTags !== false,
          notes: result.notes,
        });
      } catch (error) {
        console.error('Error rendering listing:', error);
        return renderListingError(['This list could not be loaded right now. Reload the page; if it keeps failing, check the options.'], heading);
      }
    };

    // The implicit (layout: list) listing is the page's primary one: it claims pagination first, renders last.
    const implicitNode = options.implicit
      ? await build(parseListingSpec(options.implicit.options, { source: 'layout', defaultFrom: options.implicit.defaultFrom, rootDir: options.rootDir }), LAYOUT_HEADING, options.pageTitle)
      : null;
    for (const { node, index, parent } of targets) {
      parent.children[index] = (await build(parseListingBlock(node.lang as 'list' | 'blog', node.value, { rootDir: options.rootDir }), BLOCK_HEADING)) as never;
    }
    if (implicitNode) tree.children.push(implicitNode);
  };
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(listing): remark plugin for list blocks and layout: list`

### Task B11: `ListingImage` component

**Files:**
- Create: `components/public/mdx/listing-image.tsx`, `components/public/mdx/listing-image.test.tsx`

**Interfaces:** Produces `export type ListingImageProps = { src?: string; alt?: string; sizes?: string; variant?: string }; export default function ListingImage(props: ListingImageProps): JSX.Element | null`.

Note: `next.config.mjs` sets `images.unoptimized` outside production, so locally and in CI `next/image` renders no `srcset`. The test checks the props we pass; the e2e test checks `sizes` and `loading`.

- [ ] **Step 1: Failing test**

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/image', () => ({ default: (p: any) => <img data-fill={String(!!p.fill)} data-sizes={p.sizes} data-loading={p.loading} data-w={p.width} className={p.className} src={p.src} alt={p.alt} /> }));
import ListingImage from './listing-image';

describe('ListingImage', () => {
  it('media: next/image fill with the given sizes, lazy, not zoomable', () => {
    const { container } = render(<ListingImage src="http://h/a.jpg" sizes="(min-width: 1024px) 16rem, 100vw" variant="media" />);
    const img = container.querySelector('img.list-component-item-media-img')!;
    expect(img.getAttribute('data-fill')).toBe('true');
    expect(img.getAttribute('data-sizes')).toBe('(min-width: 1024px) 16rem, 100vw');
    expect(img.getAttribute('data-loading')).toBe('lazy');
    expect(img.getAttribute('alt')).toBe('');
    expect(container.querySelector('[data-zoomable], .zoomable-image')).toBeNull();
  });
  it('avatar: fixed 24px', () => {
    const { container } = render(<ListingImage src="http://h/ada.jpg" variant="avatar" />);
    expect(container.querySelector('img.list-component-item-author-avatar')!.getAttribute('data-w')).toBe('24');
  });
  it('renders nothing without a src', () => {
    expect(render(<ListingImage />).container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement**

```tsx
import Image from 'next/image';

export type ListingImageProps = { src?: string; alt?: string; sizes?: string; variant?: string };

/** Listing thumbnails and author avatars (lib/listing/render.ts). Never zoomable. */
export default function ListingImage({ src, alt = '', sizes, variant = 'media' }: ListingImageProps) {
  if (!src) return null;
  if (variant === 'avatar') {
    return <Image className="list-component-item-author-avatar" src={src} alt={alt} width={24} height={24} sizes="24px" loading="lazy" />;
  }
  return <Image className="list-component-item-media-img" src={src} alt={alt} fill sizes={sizes ?? '100vw'} loading="lazy" style={{ objectFit: 'cover' }} />;
}
```

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(listing): ListingImage component`

### Task B13: register in both pipelines

**Files:**
- Modify: `lib/markdown.ts` (`MarkdownOptions`, `processMarkdown`, `getMdxOptions`)
- Modify: `components/public/mdx/mdx-components-factory.tsx`

- [ ] **Step 1:** `MarkdownOptions` gains `listing?: ListingRenderContext;` (import type from `./remark-listing`). In `processMarkdown`, directly after the `remarkObsidianBases` `.use(...)` and before `.use(remarkMdxJsxToElement)`:

```ts
    // ```list / ```blog blocks and layout: list (needs a site to query)
    .use(options.siteId ? remarkListing : () => undefined, {
      siteId: options.siteId!,
      siteHostname,
      rootDir: options.rootDir,
      filePath,
      files,
      permalinks,
      showTags: options.showTags,
      ...options.listing,
    })
```

In the `rehypeToReact` components map add `listingimage: ListingImage` (import from `@/components/public/mdx/listing-image`). `remarkMdxJsxToElement` already lowercases `ListingImage` to `listingimage`, the same path `ObsidianBasesViews` takes.

- [ ] **Step 2:** `getMdxOptions` gains a `listing?: ListingRenderContext` parameter. In `remarkPlugins`, after `[remarkObsidianBases, …]` and before the changelog entry:

```ts
        ...(siteId
          ? [[remarkListing, { siteId, siteHostname, rootDir, filePath, files, permalinks, showTags, ...listing }] as Pluggable]
          : []),
```

(`rehypeListingHeadings` is registered by Task B12 in Phase 3; until then item headings carry the placeholder id, identically in both pipelines.)

- [ ] **Step 3:** `mdx-components-factory.tsx`: `import ListingImage from './listing-image';` and add `ListingImage,` to the `components` object (no error boundary needed: it is a leaf with string props).
- [ ] **Step 4:** Run the existing pipeline suites, expect PASS (no behaviour change without fences): `npx vitest run --project=unit lib/markdown lib/remark-changelog.test.tsx lib/rehype-to-react.test.tsx`
- [ ] **Step 5: Commit** `feat(listing): register listing plugin in md and mdx pipelines`

### Task B14: pipeline parity (md vs mdx)

**Files:**
- Create: `lib/markdown-listing.test.tsx`

Production paths: `.md` = `processMarkdown` (server). `.mdx` = `serialize` from `next-mdx-remote-client/serialize` on the server, then `hydrate` from `next-mdx-remote-client/csr` with `mdxComponentsFactory` components in `components/public/mdx-client-renderer.tsx`. The test mirrors both, including the source preprocessing `renderPageContent` applies (`protectNonMathDollars(protectWikiLinkAliases(...))` for MDX; `processMarkdown` does it internally). `evaluate` from `/rsc` is only a fallback if `hydrate` cannot run under jsdom; never fall back to string-matching the compiled source.

- [ ] **Step 1: Write the test**

```tsx
import { hydrate } from 'next-mdx-remote-client/csr';
import { serialize } from 'next-mdx-remote-client/serialize';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }));
vi.mock('@/trpc/react', () => ({ api: {} })); // pulled in by the legacy List via the factory
vi.mock('@/components/public/mdx/mdx-client-components', () => ({ Mermaid: () => null, ObsidianBasesViews: () => null, PdfViewer: () => null, CustomHtml: () => null, FlatUiTable: () => null, LineChart: () => null, Plotly: () => null, PlotlyBarChart: () => null, PlotlyLineChart: () => null, Vega: () => null }));
vi.mock('@/components/public/mdx/listing-image', () => ({ default: (p: Record<string, string>) => <span data-testid="listing-image" data-src={p.src} data-variant={p.variant} data-sizes={p.sizes} /> }));
vi.mock('@/lib/listing/query', async (orig) => ({
  ...(await orig<typeof import('@/lib/listing/query')>()),
  queryListingRows: async () => [
    { id: '1', path: 'blog/intro.md', appPath: '/blog/intro', permalink: null, metadata: { title: 'Intro', date: '2026-09-18', description: 'First', image: 'https://x.org/a.jpg', authors: ['ada'], guests: ['[[people/ada|Ada Lovelace]]'] } },
    { id: '2', path: 'blog/two.md', appPath: '/blog/two', permalink: null, metadata: { title: 'Two', date: '2026-09-17' } },
  ],
}));
vi.mock('@/lib/listing/authors', () => ({ cachedResolveAuthors: async () => [{ key: 'b', name: 'Ada Lovelace', url: '/people/ada', avatar: 'https://x.org/ada.jpg' }] }));

import { mdxComponentsFactory } from '@/components/public/mdx/mdx-components-factory';
import { getMdxOptions, processMarkdown, protectNonMathDollars, protectWikiLinkAliases } from './markdown';

// `pageSize: 1` gives 2 pages (pagination + SVG icons); `show` exercises labelled fields with a wiki alias.
const SRC = '## Intro\n\n```blog\npageSize: 1\nshow: [image, date, title, description, guests, authors]\n```\n\n## Outro\n';
const opts = { filePath: 'README.md', files: ['/blog/intro.md', '/people/ada.md'], siteHostname: 'h.site', siteId: 's', listing: { page: 1, publicUrl: '/' } };

async function md() {
  return renderToStaticMarkup(await processMarkdown(SRC, opts));
}
async function mdx() {
  const result = await serialize({ source: protectNonMathDollars(protectWikiLinkAliases(SRC)), options: getMdxOptions(opts) as any });
  if ('error' in result) throw result.error;
  const components = mdxComponentsFactory({ blob: { path: 'README.md' } as any, site: { id: 's', subdomain: 'h', customDomain: null } as any });
  const { content, error } = hydrate({ ...result, components });
  if (error) throw error;
  return renderToStaticMarkup(content);
}
const section = (html: string) => new DOMParser().parseFromString(html, 'text/html').querySelector('section.list-component')!;
/** Attribute order may differ between pipelines; nothing else may. */
function canonical(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    const attrs = [...node.attributes].map((a) => [a.name, a.value] as const).sort(([a], [b]) => (a < b ? -1 : 1));
    for (const [n] of attrs) node.removeAttribute(n);
    for (const [n, v] of attrs) node.setAttribute(n, v);
  }
  return clone.outerHTML.replace(/>\s+</g, '><').trim();
}

describe('list blocks: .md and .mdx render the same listing', () => {
  it('same HTML for the listing section', async () => {
    expect(canonical(section(await md()))).toBe(canonical(section(await mdx())));
  });
  for (const [name, render] of [['md', md], ['mdx', mdx]] as const) {
    it(`${name}: ListingImage resolves to the component (media and avatar)`, async () => {
      const s = section(await render());
      expect(s.querySelector('[data-testid="listing-image"][data-variant="media"][data-src="https://x.org/a.jpg"]')).not.toBeNull();
      expect(s.querySelector('[data-testid="listing-image"][data-variant="avatar"]')).not.toBeNull();
      expect(s.querySelector('listingimage, ListingImage')).toBeNull();
    });
    it(`${name}: pagination svg keeps its viewBox; string props survive`, async () => {
      const s = section(await render());
      expect(s.querySelector('svg[viewBox="0 0 24 24"]')).not.toBeNull();
      expect(s.querySelector('a.list-component-item-media-link')!.getAttribute('tabindex')).toBe('-1');
      expect(s.querySelector('h3')!.getAttribute('data-toc-ignore')).toBe('');
    });
    it(`${name}: wiki aliases inside frontmatter fields render as links`, async () => {
      expect(section(await render()).querySelector('[data-field="guests"] a[href="/people/ada"]')!.textContent).toBe('Ada Lovelace');
    });
  }
});
```

- [ ] **Step 2: Run**: `npx vitest run --project=unit lib/markdown-listing.test.tsx`. Expected: PASS. Likely failure modes and fixes:
  - `viewBox` lowercased in `.md`: emit the icon via `hastscript` in a tiny rehype step instead, or switch the icon to a text arrow in a `<span class="list-component-pagination-button-icon …">`; update the B8 test accordingly and note it in the PR.
  - MDX throws "Expected component `ListingImage` to be defined": the factory registration from B13 is missing.
  - A value differs only in type (`data-toc-ignore="true"` vs `""`): a non-string `hProperties` value slipped into `render.ts`; fix the renderer (Task B8 invariant), never the comparison.
- [ ] **Step 3: Commit** `test(listing): md/mdx parity through the production serialize+hydrate path`

# Phase 3: PR B presentation (CSS, headings, route, Storybook mockup, draft PR, fixture, e2e)

### Task B16: CSS and theme class reference

**Files:**
- Modify: `styles/default-theme.css` (insert after the `.list-component-item-footnote` rule, before `/* List component skeleton */`, around line 1620)
- Modify: `scripts/theme-class-reference.mjs:45` (listings `dom` string)
- Regenerate: `content/flowershow-app/docs/reference/theme-class-reference.md`

- [ ] **Step 1: Add the rules** (all new selectors; the unmodified `.list-component*` rules above stay byte-identical, so legacy `<List />` and themes see no change):

```css
  /* ────────────────────────────────────────────────────
   List blocks and `layout: list` (lib/listing/render.ts)
   Modifier rules only; override with the --list-* custom properties:
     --list-gap, --list-item-spacing, --list-rule-color, --list-media-width,
     --list-media-aspect, --list-media-radius, --list-card-min,
     --list-card-radius, --list-card-border, --list-summary-lines,
     --list-title-size, --list-date-column
   ──────────────────────────────────────────────────── */
  .list-component--list {
    gap: var(--list-gap, 0);
  }
  .list-component-note {
    grid-column: 1 / -1;
    margin: 0 0 1rem;
    font-size: var(--font-size-sm);
    color: var(--color-foreground-500);
  }
  .list-component--list .list-component-item {
    padding-block: var(--list-item-spacing, 2rem);
    border-color: var(--list-rule-color, var(--color-foreground-100));
  }
  .list-component--list .list-component-item-media {
    aspect-ratio: var(--list-media-aspect, 3 / 2);
    @media (min-width: 1024px) {
      width: var(--list-media-width, 16rem);
    }
  }
  .list-component-item-media--empty {
    @media (max-width: 1023px) {
      display: none;
    }
  }
  .list-component--list .list-component-item-media-img,
  .list-component--cards .list-component-item-media-img {
    border-radius: var(--list-media-radius, var(--radius-xl));
  }
  :is(.list-component--list, .list-component--cards, .list-component--compact) .list-component-item-headline {
    font-size: var(--list-title-size, var(--font-size-lg));
  }
  :is(.list-component--list, .list-component--cards) .list-component-item-summary {
    -webkit-line-clamp: var(--list-summary-lines, 2);
  }

  .list-component--cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--list-card-min, 16rem)), 1fr));
    gap: var(--list-gap, 1.5rem);
  }
  .list-component--cards > .list-component-pagination,
  .list-component--cards > .list-component-empty {
    grid-column: 1 / -1;
  }
  .list-component--cards .list-component-item {
    flex-direction: column;
    gap: 0;
    padding: 0;
    overflow: hidden;
    border: var(--list-card-border, 1px solid var(--color-foreground-100));
    border-radius: var(--list-card-radius, var(--radius-lg));
  }
  .list-component--cards .list-component-item-media {
    width: 100%;
    aspect-ratio: var(--list-media-aspect, 3 / 2);
  }
  .list-component--cards .list-component-item-media-img {
    border-radius: 0;
  }
  .list-component--cards .list-component-item-content {
    padding: 1rem 1.25rem 1.25rem;
  }
  /* Whole card clickable; inner links stay clickable above the overlay. */
  .list-component--cards .list-component-item-headline-link::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
  }
  .list-component--cards :is(.list-component-item-author, .tag-pill, .list-component-item-field a) {
    position: relative;
    z-index: 2;
  }

  .list-component--compact .list-component-item {
    display: grid;
    grid-template-columns: var(--list-date-column, 8rem) minmax(0, 1fr);
    gap: 0 1rem;
    padding-block: 0.5rem;
    border-bottom-width: 0;
  }
  .list-component--compact .list-component-item-content {
    display: contents;
  }
  .list-component--compact .list-component-item-content > * {
    grid-column: 2;
    margin: 0;
  }
  .list-component--compact .list-component-item-content > .list-component-item-eyebrow {
    grid-column: 1;
  }
  .list-component--compact .list-component-item-headline {
    font-size: var(--font-size-base);
  }

  .list-component-item-authors {
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .list-component-item-author {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: inherit;
    text-decoration: none;
  }
  /* No theme sizes avatars; intrinsic-size images would be very visible. */
  .list-component-item-author-avatar {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 9999px;
    object-fit: cover;
  }
  .list-component-item-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin: 0 0 0.5rem;
    font-size: var(--font-size-sm);
    color: var(--color-foreground-600);
  }
  .list-component-item-field {
    display: flex;
    gap: 0.25rem;
    > dt {
      font-weight: var(--font-weight-semibold);
    }
    > dt::after {
      content: ":";
    }
    > dd {
      margin: 0;
    }
  }
  .list-component-item-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0 0 0.5rem;
    padding: 0;
    list-style: none;
  }
  a.list-component-pagination-button,
  a.list-component-pagination-page-button {
    text-decoration: none;
  }
  /* <a>/<span> cannot match :disabled; mirrors the :disabled rule above. */
  .list-component-pagination-button.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .list-component-error--block {
    padding: 1rem 1.25rem;
    border: 1px solid var(--color-foreground-200);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
  }
  .list-component-error-title {
    font-weight: var(--font-weight-semibold);
  }
  .list-component-error-list {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
    list-style: disc;
  }
  .list-component-error-keys {
    color: var(--color-foreground-500);
  }
```

Check while adding: that every `--color-foreground-*`, `--radius-*` and `--font-*` token used exists in the file (`grep -n -- '--color-foreground-500\|--radius-lg' styles/default-theme.css`); swap in the nearest existing token if not.

- [ ] **Step 2: Update the listings `dom` tree** in `scripts/theme-class-reference.mjs:45` to:

```
section.list-component[.list-component--list | --cards | --compact][data-view]   (div for legacy <List />)
├─ p.list-component-note (optional, non-blocking option problems)
├─ article.list-component-item / .list-component-skeleton-item (legacy only)
│  ├─ *-media[.list-component-item-media--empty]
│  │  └─ a.list-component-item-media-link > img.list-component-item-media-img
│  └─ *-content
│     ├─ .list-component-item-eyebrow > time.list-component-item-date
│     ├─ .list-component-item-headline > a.list-component-item-headline-link
│     ├─ .list-component-item-summary
│     ├─ dl.list-component-item-fields > .list-component-item-field[data-field]
│     ├─ ul.list-component-item-tags > li > .tag-pill
│     └─ .list-component-item-footnote.list-component-item-authors > .list-component-item-author > img.list-component-item-author-avatar
└─ nav.list-component-pagination
   ├─ .list-component-pagination-nav > .list-component-pagination-button[.is-disabled]
   └─ .list-component-pagination-pages
.list-component-empty (no matching pages)
.list-component-error[.list-component-error--block] (items failed to load / invalid block)
```

(encoded with `\n` like the existing string).

- [ ] **Step 3:** `pnpm docs:theme-classes` (root) to regenerate the reference; `pnpm docs:theme-classes:check` and `node --test scripts/theme-class-reference.test.mjs` pass.
- [ ] **Step 4:** Visual check happens in the Storybook mockup (Task B24): all three views, light, dark and mobile.
- [ ] **Step 5: Commit** `feat(listing): default styles, custom properties and class reference`

### Task B12: heading hygiene (rehype step, autolink test, ToC selector)

**Files:**
- Create: `lib/rehype-listing-headings.ts`, `lib/rehype-listing-headings.test.ts`
- Modify: `lib/markdown.ts:395-415` (`isChangelogTitle` neighbour + `rehypeAutolinkHeadingsConfig.test`)
- Modify: `components/public/table-of-contents.tsx:59-63`; create `components/public/table-of-contents.test.ts`

**Why a placeholder id:** removing ids after `rehype-slug` alone is not enough; the slugger would still count item titles, so a real `## Intro` after an item titled "Intro" would become `#intro-1`. `render.ts` sets `id="listing-item-heading"` so `rehype-slug` skips item headings entirely (it only fills missing ids), and this step deletes it.

- [ ] **Step 1: Failing tests**

```ts
// lib/rehype-listing-headings.test.ts
import { fromHtml } from 'hast-util-from-html';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import rehypeListingHeadings from './rehype-listing-headings';

describe('rehypeListingHeadings', () => {
  it('strips placeholder ids and does not shift real heading slugs', async () => {
    const p = unified().use(rehypeSlug).use(rehypeListingHeadings).use(rehypeStringify);
    const tree = fromHtml('<h3 class="list-component-item-headline" id="listing-item-heading">Intro</h3><h2>Intro</h2>', { fragment: true });
    expect(String(p.stringify((await p.run(tree)) as any))).toBe('<h3 class="list-component-item-headline">Intro</h3><h2 id="intro">Intro</h2>');
  });
});
```

```ts
// components/public/table-of-contents.test.ts
import { describe, expect, it } from 'vitest';
import { TOC_HEADING_SELECTOR } from './table-of-contents';

describe('TOC_HEADING_SELECTOR', () => {
  it('skips headings marked data-toc-ignore', () => {
    document.body.innerHTML = '<div id="mdxpage"><h2 id="a">A</h2><h3 data-toc-ignore="">Item</h3><h3 id="b">B</h3></div>';
    expect([...document.querySelectorAll(TOC_HEADING_SELECTOR)].map((h) => h.textContent)).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/rehype-listing-headings.test.ts components/public/table-of-contents.test.ts`
- [ ] **Step 3: Implement**

```ts
// lib/rehype-listing-headings.ts
import { visit } from 'unist-util-visit';
import { LISTING_HEADING_PLACEHOLDER_ID, LISTING_HEADLINE_CLASS } from './listing/render';

/** Runs after rehype-slug: listing item headings get no id, so no anchor, no slug collisions. */
export default function rehypeListingHeadings() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      const cls = node.properties?.className;
      if (Array.isArray(cls) && cls.includes(LISTING_HEADLINE_CLASS) && node.properties.id === LISTING_HEADING_PLACEHOLDER_ID) delete node.properties.id;
    });
  };
}
```

`table-of-contents.tsx`: add and use

```ts
export const TOC_HEADING_SELECTOR = ['h2', 'h3', 'h4', 'h5', 'h6'].map((h) => `#mdxpage ${h}:not([data-toc-ignore])`).join(', ');
// ...
        document.querySelectorAll(TOC_HEADING_SELECTOR);
```

`lib/markdown.ts`: next to `isChangelogTitle` add

```ts
function isListingHeadline(element: any): boolean {
  const className = element.properties?.className;
  return Array.isArray(className) && className.includes('list-component-item-headline');
}
```

and add `!isListingHeadline(element) &&` to `rehypeAutolinkHeadingsConfig.test`. Register the step in both chains (Task B13 did not, because this task owns it): in `processMarkdown` add `.use(rehypeListingHeadings)` directly after `.use(rehypeSlug)`; in `getMdxOptions().mdxOptions.rehypePlugins` add `rehypeListingHeadings,` directly after `rehypeSlug,`.

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Extend the parity test from Task B14** (`lib/markdown-listing.test.tsx`), inside the `for (const [name, render] …)` loop:

```tsx
    it(`${name}: item headings have no id, no .heading-link, and do not shift real slugs`, async () => {
      const doc = new DOMParser().parseFromString(await render(), 'text/html');
      const s = doc.querySelector('section.list-component')!;
      expect(s.querySelectorAll('.heading-link')).toHaveLength(0);
      expect(s.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')).toHaveLength(0);
      expect(s.querySelector('h3[data-toc-ignore]')).not.toBeNull();
      expect(doc.querySelector('h2#intro')).not.toBeNull(); // the post titled "Intro" must not make this #intro-1
    });
```

Run `npx vitest run --project=unit lib/markdown-listing.test.tsx lib/rehype-listing-headings.test.ts components/public/table-of-contents.test.ts`; expect PASS (the section-equality case keeps passing too).
- [ ] **Step 6: Commit** `feat(listing): keep listing item headings out of slugs, anchors and the ToC`

### Task B15: route wiring and canonical

**Files:**
- Modify: `lib/render-page-content.tsx` (options type + pass-through)
- Modify: `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx:75-221` (`generateMetadata`) and `:455-468` (`renderPageContent` call)

- [ ] **Step 1:** `RenderPageContentOptions` gains `listing?: ListingRenderContext;` destructure it and pass `listing` to both `processMarkdown({... , listing})` and `getMdxOptions({... , listing})`. The changelog index's call (`components/public/changelog/changelog-index-page.tsx:57`) passes nothing: blocks inside entries still render (page 1, unpaginated unless they ask).
- [ ] **Step 2:** In `SitePage`, before `renderPageContent`:

```ts
  const searchParams = await props.searchParams;
  const listing: ListingRenderContext = {
    page: pageFromSearchParam(searchParams.page),
    publicUrl: ensureLeadingSlash(blob.permalink || blob.appPath || blob.path),
    pageTitle: metadata?.title,
    implicit: metadata?.layout === 'list'
      ? { options: metadata?.list, defaultFrom: implicitListingFrom(blob.path, siteFilePaths) }
      : undefined,
  };
```

and pass `listing` into `renderPageContent`. Imports: `pageFromSearchParam` from `@/lib/listing/paginate`, `implicitListingFrom` from `@/lib/listing/spec`, type `ListingRenderContext` from `@/lib/remark-listing`.
- [ ] **Step 3:** `generateMetadata` signature gains `searchParams: Promise<Record<string, string | string[] | undefined>>`; replace `canonical: url,` with `canonical: listingCanonical(url, metadata?.layout, (await props.searchParams)?.page),`.
- [ ] **Step 4:** Verify precedence: `layout: list` on `changelog/README.md` must not take the changelog path. `isChangelogDir` already returns false for any other `layout` (`lib/changelog.ts:isChangelogDir`); add a test to `lib/changelog-context.test.ts`: `resolveChangelogContext` for slug `/changelog` with folder index metadata `{ layout: 'list' }` returns `null`.
- [ ] **Step 5:** `npx vitest run --project=unit lib/changelog-context.test.ts lib/listing` and `npx tsc --noEmit -p tsconfig.json | tail -1` (no new errors).
- [ ] **Step 6: Commit** `feat(listing): wire listing context and self-canonical into the page route`

### Task B24: Storybook mockup (primary visual review)

**Files:**
- Create: `stories/Listing.stories.tsx` (beside `stories/List.stories.tsx`, the legacy "before")
- Create: `stories/__fixtures__/listing.tsx` (render helper + realistic content)
- Create: `stories/__fixtures__/listing-assets/*` (copied images, see Step 1)

**Interfaces:**
- Consumes: `renderListing`, `renderListingError` (B8), `parseListingBlock` (B2), `sliceListing` (B6), `ListingItem` type (B4), `ResolvedAuthor` type (B7), `ListingImage` (B11), `styles/default-theme.css` (B16).
- Must not import `lib/listing/query.ts`, `lib/listing/authors.ts` or `lib/remark-listing.ts` at runtime: they pull in Prisma and `next/cache`. Use `import type` only; build `ListingItem` objects directly.

Why: the reviewer approves the look here, with no database, before e2e, docs and themes are written. Every story parses its spec from the exact Markdown shown in the PR, so the source and the picture cannot drift apart.

- [ ] **Step 1: Copy real assets** (run from the worktree root):

```bash
cd /Users/rgrp/src/flowershow/flowershow-listings
D=apps/flowershow/stories/__fixtures__/listing-assets; mkdir -p $D
for f in annotations breadcrumbs file-types publish-with-ai publish-without-an-account publish-from-claude-and-chatgpt social-preview-cards customize-your-site markdown-mermaid-bases-pdf; do cp content/flowershow-app/assets/changelog-$f.webp $D/; done
cp content/flowershow-app/people/rufuspollock.jpeg content/flowershow-app/people/olayway.jpeg content/flowershow-app/people/abeelha.jpg $D/
du -sh $D   # expect well under 1 MB
```

- [ ] **Step 2: Fixture helper** (`stories/__fixtures__/listing.tsx`)

```tsx
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root, RootContent } from 'mdast';
import * as runtime from 'react/jsx-runtime';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import ListingImage from '@/components/public/mdx/listing-image';
import type { ResolvedAuthor } from '@/lib/listing/authors';
import { sliceListing } from '@/lib/listing/paginate';
import type { ListingItem } from '@/lib/listing/query';
import { renderListing, renderListingError } from '@/lib/listing/render';
import { parseListingBlock } from '@/lib/listing/spec';
import annotations from './listing-assets/changelog-annotations.webp';
import breadcrumbs from './listing-assets/changelog-breadcrumbs.webp';
import customize from './listing-assets/changelog-customize-your-site.webp';
import fileTypes from './listing-assets/changelog-file-types.webp';
import mermaid from './listing-assets/changelog-markdown-mermaid-bases-pdf.webp';
import claude from './listing-assets/changelog-publish-from-claude-and-chatgpt.webp';
import ai from './listing-assets/changelog-publish-with-ai.webp';
import anon from './listing-assets/changelog-publish-without-an-account.webp';
import social from './listing-assets/changelog-social-preview-cards.webp';
import abeelha from './listing-assets/abeelha.jpg';
import ola from './listing-assets/olayway.jpeg';
import rufus from './listing-assets/rufuspollock.jpeg';

const src = (m: string | { src: string }) => (typeof m === 'string' ? m : m.src);

export const authors = new Map<string, ResolvedAuthor>([
  ['rufuspollock', { key: 'rufuspollock', name: 'Rufus Pollock', url: '/people/rufuspollock', avatar: src(rufus) }],
  ['olayway', { key: 'olayway', name: 'Ola Rubaj', url: '/people/olayway', avatar: src(ola) }],
  ['guest', { key: 'guest', name: 'Guest Writer', url: null }],
]);

const post = (slug: string, title: string, date: string, description: string, image: unknown, handles: string[], tags: string[] = []): ListingItem => ({
  path: `blog/${date}-${slug}.md`, url: `/blog/${date}-${slug}`, title, date, description, image: image ? src(image as string) : null, authorHandles: handles, tags, fields: [],
});

/** Real flowershow.app changelog entries (content/flowershow-app/changelog), newest first. */
export const realPosts: ListingItem[] = [
  post('mermaid-bases-pdf-in-markdown', 'Mermaid, Obsidian Bases and PDF embeds now work in plain Markdown', '2026-10-10', 'Mermaid diagrams, Obsidian Bases, the PDF viewer and code-block copy buttons now work in .md pages. You no longer need to switch to MDX.', mermaid, ['rufuspollock'], ['featured']),
  post('custom-footer', 'Customize your site even more', '2026-10-08', 'Premium sites can replace the default footer and navbar with their own HTML, any page can hide the navbar or footer, and brand fonts, tag colors and list cards are easier to style.', customize, ['rufuspollock']),
  post('reading-time', 'Show reading time in the page header', '2026-10-06', 'Pages can show an estimated reading time, like "8 min read", next to the authors and date.', null, ['olayway']),
  post('breadcrumbs', 'Show breadcrumbs above the page title', '2026-10-06', 'Pages now show a breadcrumb trail like "Guides › Install" above the title, on desktop and mobile.', breadcrumbs, ['olayway']),
  post('annotations', 'Get feedback on drafts with annotations', '2026-10-05', 'Turn on annotations and anyone with the link can select text on your page and leave a note, no account needed. Then your AI agent pulls the open notes, revises your pages and resolves them.', annotations, ['rufuspollock', 'olayway'], ['featured']),
  post('social-preview-cards', 'Every page gets its own social preview', '2026-10-05', "Every page on your site now gets a generated social preview card with its title, description and site name, and a short description is computed when you haven't written one.", social, ['rufuspollock']),
  post('publish-from-claude-and-chatgpt', 'Publish from Claude and ChatGPT (beta)', '2026-10-03', 'Add the Flowershow connector to Claude or ChatGPT, ask it to publish, and get a live link. Nothing to install, no account needed.', claude, ['rufuspollock'], ['featured']),
  post('publish-without-an-account', 'Publish without an account', '2026-09-30', 'Run fl --anon to put a folder online with no signup, then claim it to keep it.', anon, ['rufuspollock', 'guest']),
  post('publish-with-ai', 'Publish with AI', '2026-09-30', 'Go from your AI session to a live website. A new Publish with AI page, an updated Flowershow skill, per-agent install guides and a safer fl CLI.', ai, ['rufuspollock']),
  post('more-than-markdown', 'Publish HTML, not just Markdown', '2026-09-30', 'HTML pages publish as-is with their CSS, JavaScript and data, side by side with Markdown. New guides cover what you can publish and how.', fileTypes, ['rufuspollock']),
];

/** realPosts first, then older generated posts so pagination has 12 pages at 20 per page. */
export const manyPosts = (n: number): ListingItem[] => [
  ...realPosts,
  ...Array.from({ length: Math.max(0, n - realPosts.length) }, (_, i) => post(`older-${i}`, `Older update ${i + 1}`, `2026-0${1 + (i % 8)}-1${i % 9}`, 'An older entry, kept to show pagination.', null, ['olayway'])),
];

export const projects: ListingItem[] = [
  { path: 'projects/flowershow/index.md', url: '/projects/flowershow', title: 'Flowershow', date: null, description: 'Turn Markdown into a website in seconds.', image: src(ai), authorHandles: [], tags: [], fields: [{ key: 'status', label: 'Status', parts: [{ text: 'In progress' }] }] },
  { path: 'projects/annotations/index.md', url: '/projects/annotations', title: 'Annotations', date: null, description: 'Select text on any page and leave a note.', image: src(annotations), authorHandles: [], tags: [], fields: [{ key: 'status', label: 'Status', parts: [{ text: 'Shipped' }] }] },
  { path: 'projects/connector.md', url: '/projects/connector', title: 'Claude and ChatGPT connector', date: null, description: 'Publish from a chat with no install.', image: src(claude), authorHandles: [], tags: [], fields: [{ key: 'status', label: 'Status', parts: [{ text: 'Beta' }] }] },
  { path: 'projects/themes.md', url: '/projects/themes', title: 'Themes', date: null, description: 'Six official themes on one stable class contract.', image: null, authorHandles: [], tags: [], fields: [{ key: 'status', label: 'Status', parts: [{ text: 'Paused' }] }] },
];

export const people: ListingItem[] = [
  { path: 'people/abeelha.md', url: '/people/abeelha', title: 'Abeelha', date: null, description: null, image: src(abeelha), authorHandles: [], tags: [], fields: [{ key: 'role', label: 'Role', parts: [{ text: 'Engineer' }] }] },
  { path: 'people/olayway.md', url: '/people/olayway', title: 'Ola Rubaj', date: null, description: null, image: src(ola), authorHandles: [], tags: [], fields: [{ key: 'role', label: 'Role', parts: [{ text: 'Engineer' }] }] },
  { path: 'people/rufuspollock.md', url: '/people/rufuspollock', title: 'Rufus Pollock', date: null, description: null, image: src(rufus), authorHandles: [], tags: [], fields: [{ key: 'role', label: 'Role', parts: [{ text: 'Founder' }] }] },
];

/** Same mdast → hast → React path as processMarkdown, minus the data layer (remarkMdxJsxToElement inlined). */
function toReact(node: RootContent) {
  const tree: Root = { type: 'root', children: [node] };
  visit(tree, 'mdxJsxFlowElement', (n: any) => {
    n.data = { hName: n.name.toLowerCase(), hProperties: Object.fromEntries(n.attributes.map((a: any) => [a.name, a.value])) };
  });
  const hast = unified().use(remarkRehype).runSync(tree);
  return toJsxRuntime(hast as any, { Fragment: runtime.Fragment, jsx: runtime.jsx, jsxs: runtime.jsxs, components: { listingimage: ListingImage } } as any);
}

/** Pull the first ```list / ```blog fence out of the Markdown shown in the PR. */
function fence(markdown: string): { lang: 'list' | 'blog'; code: string } {
  const m = markdown.match(/^(?:```|~~~)(list|blog)\n([\s\S]*?)^(?:```|~~~)/m);
  if (!m) throw new Error('story source has no ```list or ```blog fence');
  return { lang: m[1] as 'list' | 'blog', code: m[2]! };
}

export function ListingFromMarkdown({ markdown, items, page = 1, publicUrl = '/blog', label = 'Blog', implicit = false }: { markdown: string; items: ListingItem[]; page?: number; publicUrl?: string; label?: string; implicit?: boolean }) {
  const { lang, code } = implicit ? { lang: 'list' as const, code: '' } : fence(markdown);
  const result = implicit ? { ok: true as const, spec: { from: 'blog', view: 'list' as const, sort: { field: 'date', direction: 'desc' as const }, limit: null, pageSize: 20, show: ['image', 'date', 'title', 'description', 'authors'], where: {} }, notes: [] } : parseListingBlock(lang, code);
  if (!result.ok) return toReact(renderListingError(result.errors, 'List block has problems'));
  return toReact(renderListing({ spec: result.spec, page: sliceListing(items, result.spec, page), authors, publicUrl, label, notes: result.notes }));
}
```

For `implicit` stories (`layout: list`), the spec above is exactly what `parseListingSpec({}, { source: 'layout', defaultFrom: 'blog' })` returns; if you prefer, call that instead (it is pure).

- [ ] **Step 3: Stories** (`stories/Listing.stories.tsx`)

```tsx
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import { ListingFromMarkdown, manyPosts, people, projects, realPosts } from '@/stories/__fixtures__/listing';
import '@/styles/default-theme.css';

/** Page-like shell so prose widths and backgrounds match a site page; sets data-theme for dark stories. */
const withPage: Decorator = (Story, ctx) => {
  const theme = (ctx.parameters.theme as string) ?? 'light';
  const themeCss = ctx.parameters.themeCss as string | undefined;
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const link = themeCss ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: themeCss }) : null;
    if (link) document.head.appendChild(link);
    return () => link?.remove();
  }, [theme, themeCss]);
  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <main className="page-main" style={{ maxWidth: '56rem', margin: '0 auto' }}>
        <div className="rendered-mdx" id="mdxpage">
          <Story />
        </div>
      </main>
    </div>
  );
};

const meta: Meta<typeof ListingFromMarkdown> = {
  title: 'Other/Listing',
  component: ListingFromMarkdown,
  decorators: [withPage],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof ListingFromMarkdown>;

export const BlogIndexPage1: Story = { args: { implicit: true, markdown: '---\ntitle: Blog\nlayout: list\n---\n', items: manyPosts(240), page: 1 } };
export const BlogIndexPage2: Story = { args: { implicit: true, markdown: '---\ntitle: Blog\nlayout: list\n---\n', items: manyPosts(28), page: 2 } };
export const BlogIndexMiddlePage: Story = { args: { implicit: true, markdown: '---\ntitle: Blog\nlayout: list\n---\n', items: manyPosts(240), page: 6 } };
export const LatestThree: Story = { args: { markdown: '## Latest posts\n\n```blog\nlimit: 3\n```\n', items: realPosts, publicUrl: '/' } };
export const ImagelessBlog: Story = { args: { markdown: '```blog\nshow: [date, title, description, authors]\n```\n', items: realPosts.slice(0, 5) } };
export const ProjectsCards: Story = { args: { markdown: '```list\nfrom: projects\nview: cards\nsort: title\nshow: [image, title, description, status]\n```\n', items: projects, label: 'Projects', publicUrl: '/projects' } };
export const PeopleCards: Story = { args: { markdown: '```list\nfrom: people\nview: cards\nsort: title\nshow: [image, title, role]\n```\n', items: people, label: 'People', publicUrl: '/people' } };
export const FeaturedCompact: Story = { args: { markdown: '```blog\nwhere:\n  tags: featured\nview: compact\n```\n', items: realPosts.filter((p) => p.tags.includes('featured')), publicUrl: '/' } };
export const CompactArchivePaginated: Story = { args: { markdown: '```list\nfrom: blog\nview: compact\npageSize: 10\n```\n', items: manyPosts(120), page: 1, publicUrl: '/archive' } };
export const LimitAndPageSizeNote: Story = { args: { markdown: '```blog\nlimit: 3\npageSize: 5\n```\n', items: realPosts, publicUrl: '/' } };
export const ErrorCard: Story = { args: { markdown: '```list\ndir: blog\npagesize: 5\nlayout: cards\n```\n', items: [] } };
export const EmptyFolder: Story = { args: { markdown: '```list\nfrom: notes\n```\n', items: [] } };
export const DarkMode: Story = { ...BlogIndexPage1, parameters: { theme: 'dark' } };
export const DarkCards: Story = { ...ProjectsCards, parameters: { theme: 'dark' } };
export const Mobile: Story = { ...BlogIndexPage1, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const ThemedLetterpress: Story = { ...BlogIndexPage1, parameters: { themeCss: 'https://cdn.jsdelivr.net/gh/flowershow/themes/letterpress/theme.css' } };
```

Notes: `sliceListing` with `limit` returns the first N of the array, so `FeaturedCompact`/`LatestThree` pass pre-sorted, pre-filtered items (sorting/filtering is tested in B4, not here). In `.storybook` there is no `staticDirs`; Vite resolves the imported images to URLs, and `next/image` (via `@storybook/nextjs-vite`) renders them. `ThemedLetterpress` needs network; it is for the PR's "theme contract holds" shot. For Deliverable C, override `themeCss` with `http://localhost:8080/<theme>/theme.css` served from the themes worktree.

- [ ] **Step 4: Run in Storybook's vitest project** (renders every story in headless Chromium; catches import and render errors):

```bash
cd /Users/rgrp/src/flowershow/flowershow-listings/apps/flowershow
npx playwright install chromium   # once per machine; downloads a browser, no Docker
npx vitest run --project=storybook stories/Listing.stories.tsx stories/List.stories.tsx
```

Expected: all stories pass (a11y is `todo`, so violations are reported, not failing; fix any reported on our markup, e.g. contrast of `.list-component-note`).

- [ ] **Step 5: Look at it**: `pnpm storybook` (port 6006) and open Other/Listing; compare with Other/List (legacy). Check: no empty media gutter in `ImagelessBlog`, avatars 24px and round, cards equal height and whole-card clickable, compact date column aligned, one ellipsis per gap in `BlogIndexMiddlePage`, disabled ends visibly disabled, dark mode readable, mobile without horizontal scroll, note readable but quiet. Fix CSS (Task B16) until right.
- [ ] **Step 6: Commit** `feat(listing): Storybook mockup with realistic content`

### Task B25: capture mockup screenshots for the PR

**Files:**
- Create: `apps/flowershow/scripts/capture-listing-stories.mjs`
- Create: `docs/pr-assets/listings/*.png` (repo root; committed on the PR branch, droppable before merge)

- [ ] **Step 1: Capture script**

```js
// Usage: node scripts/capture-listing-stories.mjs [baseUrl] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:6007';
const out = process.argv[3] ?? '../../docs/pr-assets/listings';
mkdirSync(out, { recursive: true });

const shots = [
  ['before-legacy-list', 'other-list--with-pagination'],
  ['list-view', 'other-listing--blog-index-page-1'],
  ['list-view-page-2', 'other-listing--blog-index-page-2'],
  ['pagination-ellipsis', 'other-listing--blog-index-middle-page', 'nav.list-component-pagination'],
  ['latest-three', 'other-listing--latest-three'],
  ['imageless', 'other-listing--imageless-blog'],
  ['cards-projects', 'other-listing--projects-cards'],
  ['cards-people', 'other-listing--people-cards'],
  ['compact-featured', 'other-listing--featured-compact'],
  ['compact-archive', 'other-listing--compact-archive-paginated'],
  ['limit-note', 'other-listing--limit-and-page-size-note'],
  ['error-card', 'other-listing--error-card', '.list-component-error'],
  ['dark-list', 'other-listing--dark-mode'],
  ['dark-cards', 'other-listing--dark-cards'],
  ['themed-letterpress', 'other-listing--themed-letterpress'],
];

const browser = await chromium.launch();
for (const [name, id, selector, viewport = { width: 1440, height: 900 }] of [...shots, ['mobile', 'other-listing--blog-index-page-1', undefined, { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const target = selector ? page.locator(selector).first() : page;
  await target.screenshot({ path: `${out}/${name}.png` }); // first fold for pages, element crop for components
  await page.close();
}
await browser.close();
console.log(`wrote ${shots.length + 1} screenshots to ${out}`);
```

Check the story ids once in the built `index.json` (`deploy/storybook/out/index.json`) and correct any that differ.

- [ ] **Step 2: Build, serve, capture**

```bash
cd /Users/rgrp/src/flowershow/flowershow-listings/apps/flowershow
pnpm build-storybook                                    # -> deploy/storybook/out
python3 -m http.server 6007 -d deploy/storybook/out &   # no extra install
node scripts/capture-listing-stories.mjs http://localhost:6007 ../../docs/pr-assets/listings
kill %1
```

- [ ] **Step 3: Review every PNG** with the Read tool against the Step 5 checklist of B24; fix and re-capture until right. Keep the set under ~3 MB (`du -sh docs/pr-assets/listings`); if larger, convert to WebP with `sharp` and reference the `.webp` files.
- [ ] **Step 4: Commit** `docs(pr): listing mockup screenshots (drop before merge)` with `git add docs/pr-assets/listings apps/flowershow/scripts/capture-listing-stories.mjs`. Make sure `deploy/storybook/out` is not staged (`git status`).

### Task B26: open PR B as a draft

Entry: B1 to B16, B24 and B25 committed; `pnpm lint`, `pnpm test`, the parity test and the Storybook project pass locally.

- [ ] **Step 1:** `git push -u origin feat/listing-pages`
- [ ] **Step 2:** `gh pr create --draft --title "feat: list blocks and layout: list (listing pages v1)" --body-file <file>`, where the body (write it to the scratchpad first) has:
  - Summary and link to `docs/plans/2026-10-10-listing-pages-design.md`.
  - "Mockup": for each screenshot, the Markdown source in a fenced block directly above the image, image via `https://raw.githubusercontent.com/flowershow/flowershow/feat/listing-pages/docs/pr-assets/listings/<name>.png`. Start with the before/after pair (`before-legacy-list.png` with its `<List dir="/blog" pageSize={10} />` MDX source vs `list-view.png` with its `layout: list` frontmatter). State: "Screenshots live in `docs/pr-assets/listings/` on this branch so they render here; they can be dropped before merge."
  - "How to try it": `pnpm storybook` → Other/Listing; real pages are exercised by the CI e2e job (`listings` project).
  - "Separately revertable": the `getAuthors` delegation commit (`refactor(site): getAuthors delegates…`), and what it changes (anchored author matching on every post).
  - "Depends on": PR A.
  - "Still to come in this PR": fixture + e2e, CI screenshot opt-in, docs, changelog.
  - Design deviations (copy the section at the end of this plan).
  - End with `https://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q`.
- [ ] **Step 3:** Post the PR link to the coordinator; keep pushing to the same branch for the rest of Phase 3 and Phase 4.

### Task B17: demo/fixture site (`e2e/fixtures/listings-demo`)

**Files:**
- Create: `e2e/fixtures/listings-demo/**`
- Modify: `e2e/helpers/seed.ts` (new site, dir + appPath-encoding parameters, cache revalidation), `playwright.config.ts` (new `listings` project), `e2e/README.md` (seven projects; the `listings` site)

No local e2e on this machine (no Docker): everything in this task and B18 is verified by the CI `E2E Tests` job on the pushed branch. Locally: `npx tsc --noEmit -p e2e/tsconfig.json` and `npx biome format` on the changed files.

The demo is a standalone site (its `blog/` is at the root so ```` ```blog ```` works literally). It is seeded as its own e2e site and can also be published as-is with `fl` for a live preview.

- [ ] **Step 1: Write the hand-authored pages**

`config.json`:

```json
{ "title": "Listings demo", "description": "Flowershow list blocks and layout: list", "showToc": true, "showSidebar": false, "enableRss": true, "nav": { "title": "Listings demo", "links": [{ "href": "/blog", "name": "Blog" }, { "href": "/projects", "name": "Projects" }, { "href": "/people", "name": "People" }, { "href": "/archive", "name": "Archive" }] } }
```

`README.md` (home, "latest 3"):

````markdown
---
title: Jane Smith
description: I write about compilers and gardening.
---

I write about compilers and gardening.

## Latest posts

```blog
limit: 3
```

[All posts →](/blog)

## Featured

```blog
where:
  tags: featured
view: compact
```
````

`blog/README.md`:

```markdown
---
title: Blog
layout: list
---

Notes on building things, roughly weekly.
```

`projects/README.md`:

```markdown
---
title: Projects
layout: list
list:
  view: cards
  sort: title
  show: [image, title, description, status]
---
```

`projects/alpha/index.md` (`title: Project Alpha`, `description: A short summary of the project.`, `image: "[[alpha-cover.jpg]]"`, `status: In progress`) with `projects/alpha/alpha-cover.jpg`; `projects/beta/README.md` (no frontmatter title, no H1, `status: Shipped`, `description: Shipped last spring.`); `projects/gamma.md` (`title: Gamma`, `status: Paused`, no image).

`people.md`:

````markdown
---
title: People
---

```list
from: people
view: cards
sort: title
show: [image, title, role]
```
````

`people/ada.md` (`title: Ada Lovelace`, `role: Mathematician`, `avatar: "[[ada.jpg]]"`), `people/grace.md` (`title: Grace Hopper`, `role: Rear admiral`, `avatar: "[[grace.webp]]"`), images under `people/assets/`.

`podcast.md` (folder note, no README in `podcast/`):

```markdown
---
title: Podcast
layout: list
list:
  where:
    type: episode
  show: [date, title, description, duration, guests]
  pageSize: 25
---
```

`podcast/ep-1.md` (`type: episode`, `date: 2026-06-01`, `duration: 42 min`, `guests: ["[[ada|Ada Lovelace]]"]`), `podcast/ep-2.md` (`type: episode`, `date: 2026-07-01`, `guests: [Grace Hopper]`), `podcast/trailer.md` (`type: trailer`).

`archive.md`: ```` ```list ```` with `from: blog`, `view: compact`, `pageSize: 3` (10 pages, ellipsis visible).

`errors.md`: the design 3.8 block (`dir: blog`, `pagesize: 5`, `layout: cards`), then a paragraph, then ```` ```blog ```` `limit: 2`.

`two-paginated.md`: two ```` ```blog ```` blocks, both `pageSize: 5`.

`case.md`: ```` ```list ```` `from: BLOG`, `limit: 2`.

`nested.md`: a ```` ```blog ```` `limit: 1` inside `> [!note]`, and a `~~~blog` fence with `limit: 1`.

`mdx-page.mdx`: frontmatter `title: MDX page`, body ```` ```blog ```` `limit: 3`.

- [ ] **Step 2: Generate the 25 posts** with a one-off script kept outside the repo (every file in the fixture folder is uploaded by the seed, so the generator must not live there). Run from the worktree root:

```bash
cd /Users/rgrp/src/flowershow/flowershow-listings
SCRATCH=/private/tmp/claude-501/-Users-rgrp-src-flowershow/d2c4795e-404c-4108-baa6-af3d8c88e424/scratchpad
mkdir -p apps/flowershow/e2e/fixtures/listings-demo/blog/assets apps/flowershow/e2e/fixtures/listings-demo/blog/2026 apps/flowershow/e2e/fixtures/listings-demo/people/assets apps/flowershow/e2e/fixtures/listings-demo/projects/alpha
A=apps/flowershow/e2e/fixtures/test-site/assets
D=apps/flowershow/e2e/fixtures/listings-demo
cp $A/sapiens.jpg $D/blog/assets/sapiens.jpg
cp $A/dune.webp $D/blog/assets/dune.webp
cp $A/small-image.jpg $D/blog/assets/small-image.jpg
cp $A/small-image.jpg $D/people/assets/ada.jpg
cp $A/dune.webp $D/people/assets/grace.webp
cp $A/sapiens.jpg $D/projects/alpha/alpha-cover.jpg
cat > "$SCRATCH/gen-posts.mjs" <<'EOF'
import fs from 'node:fs';
const dir = process.argv[2];
const topics = ['Compilers', 'Tomatoes', 'Parsers', 'Compost', 'Type systems', 'Seed saving', 'Linkers', 'Pruning'];
const images = ['', '"[[sapiens.jpg]]"', 'assets/dune.webp', '/blog/assets/small-image.jpg'];
const authors = [['ada'], ['grace'], ['ada', 'grace']];
for (let i = 1; i <= 25; i++) {
  const date = new Date(Date.UTC(2026, 2, 2 + 7 * (i - 1))).toISOString().slice(0, 10);
  const nn = String(i).padStart(2, '0');
  const fm = [
    `title: "Post ${nn}: ${topics[i % topics.length]}"`,
    `date: ${date}`,
    `description: Week ${i} notes on ${topics[i % topics.length].toLowerCase()}, with a long enough description to show the two-line clamp working on narrow screens and wide ones alike.`,
    images[i % 4] ? `image: ${images[i % 4]}` : null,
    // post 20 is on page 1 of /blog (page 1 = filename-only, nested ü, posts 25..08), so the e2e can see the unresolved author there
    i === 20 ? 'authors: [nobody]' : i === 8 ? 'authors: "[[ada]]"' : `authors: [${authors[i % 3].join(', ')}]`,
    [3, 10, 17].includes(i) ? 'tags: [featured]' : null,
  ].filter(Boolean);
  fs.writeFileSync(`${dir}/post-${nn}.md`, `---\n${fm.join('\n')}\n---\n\nBody of post ${i}.\n`);
}
EOF
node "$SCRATCH/gen-posts.mjs" $D/blog
```

(`$SCRATCH` = the session scratchpad.) Then hand-write:
- `blog/2026-09-01-filename-only-post.md`: no frontmatter, body `Just a body, no heading.` (title "Filename only post", date 2026-09-01: the newest item).
- `blog/2026/nested post ü.md`: `title: Nested post ü`, `date: 2026-08-20`, `image: assets/dune.webp` resolved relative to `blog/2026/` (copy `dune.webp` to `blog/2026/assets/`).
- `blog/odd-frontmatter.md`: `title: 1984`, `date: TBD`, `authors: [{name: x}]`, `image: [a, b]`, `tags: featured` (scalar). Undated, so it sorts last.
- `blog/draft-post.md`: `title: Draft post`, `date: 2026-09-05`, `draft: true`.
- `blog/unpublished.md`: `title: Unpublished post`, `publish: false` (the seed skips it, as the worker deletes such files; kept to document the rule).

Listed in `/blog`: 25 + 3 = 28 items, so 20 on page 1 and 8 on page 2.

- [ ] **Step 3: Seed it as its own site.** In `e2e/helpers/seed.ts`:

```ts
const LISTINGS_SITE_DIR = path.resolve(__dirname, '../fixtures/listings-demo');
export const LISTINGS_SITE = { id: 'e2e-listings-site-id', projectName: 'e2e-listings' };
export const LISTINGS_SITE_SUBDOMAIN = `${LISTINGS_SITE.projectName}-${TEST_USER.username}`;
export const LISTINGS_SITE_BASE_URL = `http://${LISTINGS_SITE_SUBDOMAIN}.${process.env.NEXT_PUBLIC_SITE_DOMAIN || 'localhost:3000'}`;
```

Give `uploadFixturesForSite` a fourth parameter `opts: { dir?: string; encodeAppPath?: boolean } = {}`; use `opts.dir ?? TEST_SITE_DIR` in place of `TEST_SITE_DIR`, and compute

```ts
    const slug = filePathToSlug(filePath);
    const appPath = ['md', 'mdx', 'canvas'].includes(ext) ? (opts.encodeAppPath ? encodeSlug(slug) : slug) : null;
```

(`encodeSlug` from `@flowershow/core`). This matches the worker (`computeAppPath` in `apps/cloudflare-worker/src/queue-consumer.js:125`) for the listings site only, so the existing sites and specs (e.g. `docs/some graph.canvas`) are untouched. In `seed()`, upsert the site (copy the free-site block with `LISTINGS_SITE`, `enableRss: true`, no `configJson`), then `await uploadFixturesForSite(LISTINGS_SITE.id, db, s3, { dir: LISTINGS_SITE_DIR, encodeAppPath: true });`. Add `LISTINGS_SITE.id` to the `tags` array in `revalidateCache()` (`seed.ts:370`), otherwise re-seeds serve 60s-stale listing rows, config and path caches. Teardown needs nothing: deleting the user cascades.

- [ ] **Step 4: Playwright project.** In `playwright.config.ts`: import `LISTINGS_SITE_BASE_URL`; add `'**/listings*.spec.ts'` to the `chromium` project's `testIgnore`; add

```ts
    {
      name: 'listings',
      use: { ...devices['Desktop Chrome'], baseURL: LISTINGS_SITE_BASE_URL, basePath: '' } as any,
      testMatch: ['**/listings*.spec.ts'],
      dependencies: ['setup'],
    },
```

and `'listings'` to `teardown.dependencies`. Update `e2e/README.md`: seven projects, the `listings` project and its site, and the screenshot command from Task B19.

- [ ] **Step 5: Local checks only**: `cd apps/flowershow && npx tsc --noEmit -p e2e/tsconfig.json` (no new errors) and `npx eslint e2e/helpers/seed.ts playwright.config.ts`. The data is exercised by CI in Task B18.
- [ ] **Step 6: Commit** `test(listing): listings demo fixture site and e2e project`

### Task B18: e2e spec

**Files:**
- Create: `e2e/specs/listings.spec.ts`

- [ ] **Step 1: Write it**

```ts
import { encodeSlug } from '@flowershow/core';
import { filePathToSlug } from '../helpers/file-path-to-slug';
import { expect, test } from '../helpers/fixtures';

const items = (page: import('@playwright/test').Page, root = 'section.list-component') => page.locator(`${root} > article.list-component-item`);

test('layout: list blog index, page 1', async ({ page }) => {
  await page.goto('/blog');
  const list = page.locator('section.list-component.list-component--list');
  await expect(items(page)).toHaveCount(20);
  await expect(list.locator('.list-component-item-headline a').first()).toHaveText('Filename only post');
  await expect(page.getByText('Draft post')).toHaveCount(0);
  await expect(page.getByText('Unpublished post')).toHaveCount(0);
  await expect(list.locator('.heading-link')).toHaveCount(0);
  await expect(list.locator('h3[id]')).toHaveCount(0);
  await expect(page.locator('.page-toc-container')).not.toContainText('Filename only post');
  const thumb = list.locator('img.list-component-item-media-img').first();
  await expect(thumb).toHaveAttribute('sizes', /16rem/);
  await expect(thumb).toHaveAttribute('loading', 'lazy');
  await expect(list.locator('.list-component-pagination-button--prev')).toHaveClass(/is-disabled/);
  await expect(list.locator('a.list-component-pagination-button--next[rel="next"]')).toHaveAttribute('href', '/blog?page=2');
  await expect(list.locator('[aria-current="page"]')).toHaveText('1');
});

test('layout: list blog index, page 2, canonical and junk params', async ({ page }) => {
  await page.goto('/blog?page=2&utm_source=x');
  await expect(items(page)).toHaveCount(8);
  await expect(page.locator('.list-component-item-headline a').last()).toHaveText('1984');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/blog\?page=2$/);
  await expect(page.locator('a.list-component-pagination-button--prev[rel="prev"]')).toHaveAttribute('href', '/blog');
  await expect(page.locator('.list-component-pagination-button--next')).toHaveClass(/is-disabled/);
  for (const a of await page.locator('nav.list-component-pagination a').all()) await expect(a).not.toHaveAttribute('href', /utm_source/);
});

test('bad and out-of-range pages', async ({ page }) => {
  await page.goto('/blog?page=abc');
  await expect(items(page)).toHaveCount(20);
  await page.goto('/blog?page=99');
  await expect(page.locator('section.list-component > p.list-component-empty')).toHaveText('Nothing here yet.');
  await expect(page.locator('nav.list-component-pagination')).toBeVisible();
});

test('authors resolve to people pages; unknown handles are plain text', async ({ page }) => {
  await page.goto('/blog');
  await expect(page.locator('a.list-component-item-author[href="/people/ada"]').first()).toContainText('Ada Lovelace');
  await expect(page.locator('a.list-component-item-author[href="/people/ada"] img.list-component-item-author-avatar').first()).toBeVisible();
  await expect(page.locator('span.list-component-item-author', { hasText: 'nobody' })).toHaveCount(1);
});

test('home page: latest 3 and featured compact', async ({ page }) => {
  await page.goto('/');
  const lists = page.locator('section.list-component');
  await expect(lists).toHaveCount(2);
  await expect(lists.nth(0).locator('> article')).toHaveCount(3);
  await expect(lists.nth(0).locator('nav')).toHaveCount(0);
  await expect(page.locator('section.list-component--compact > article')).toHaveCount(4); // posts 3, 10, 17 + odd-frontmatter
});

test('projects as cards with nested indexes', async ({ page }) => {
  await page.goto('/projects');
  const cards = page.locator('section.list-component--cards > article');
  await expect(cards.locator('.list-component-item-headline a')).toHaveText(['Beta', 'Gamma', 'Project Alpha']);
  await expect(cards.nth(0).locator('[data-field="status"] dd')).toHaveText('Shipped');
  await cards.nth(2).locator('.list-component-item-summary').click(); // whole card is clickable
  await expect(page).toHaveURL(/\/projects\/alpha$/);
});

test('folder note with where, and wiki-linked custom fields', async ({ page }) => {
  await page.goto('/podcast');
  await expect(items(page)).toHaveCount(2);
  await expect(page.locator('[data-field="guests"] a[href="/people/ada"]')).toHaveText('Ada Lovelace');
});

test('archive: compact with one ellipsis per gap', async ({ page }) => {
  await page.goto('/archive');
  await expect(page.locator('.list-component-pagination-ellipsis')).toHaveCount(1);
  await expect(page.locator('.list-component-pagination-pages > *')).toHaveText(['1', '2', '3', '…', '10']);
});

test('error cards are isolated and specific', async ({ page }) => {
  await page.goto('/errors');
  const card = page.locator('.list-component-error--block');
  await expect(card).toContainText('Unknown key "pagesize". Did you mean "pageSize"?');
  await expect(card).toContainText('Unknown key "layout". Use "view: cards".');
  await expect(items(page)).toHaveCount(2);
  await page.goto('/two-paginated');
  await expect(page.locator('.list-component-error--block')).toContainText('Only one list per page can paginate');
});

test('paths with spaces and non-ASCII link to the encoded appPath (Review Focus 3)', async ({ page }) => {
  await page.goto('/blog');
  const href = encodeSlug(filePathToSlug('blog/2026/nested post ü.md'));
  await expect(page.locator(`a.list-component-item-headline-link[href="${href}"]`)).toHaveText('Nested post ü');
  await page.locator(`a.list-component-item-headline-link[href="${href}"]`).click();
  await expect(page.locator('#mdxpage')).toBeVisible(); // resolves, not a 404
});

test('limit with pageSize renders with a note', async ({ page }) => {
  await page.goto('/limit-note');
  await expect(page.locator('section.list-component > p.list-component-note')).toContainText('"pageSize" is ignored');
  await expect(items(page)).toHaveCount(2);
});

test('case-insensitive folder, nested blocks, MDX page', async ({ page }) => {
  await page.goto('/case');
  await expect(items(page)).toHaveCount(2);
  await page.goto('/nested');
  await expect(page.locator('section.list-component')).toHaveCount(2);
  await page.goto('/mdx-page');
  await expect(items(page)).toHaveCount(3); // client-rendered MDX; auto-waits
});

test('RSS excludes drafts', async ({ request }) => {
  const xml = await (await request.get('/rss.xml')).text();
  expect(xml).toContain('Post 25');
  expect(xml).not.toContain('Draft post');
});
```

If an assertion fails, fix the fixture data or the code, never the assertion: every literal above is derived from the fixture in Task B17 (e.g. `nobody` is post 20 so that it is on page 1). Add `limit-note.md` to the fixture: ```` ```blog ```` with `limit: 2` and `pageSize: 5`.

- [ ] **Step 2: Local**: `npx tsc --noEmit -p e2e/tsconfig.json`. **CI**: push, then `gh pr checks --watch` (or `gh run watch`) on the draft PR. Expected: `E2E Tests` green, including the existing `blog`, `changelog`, `tags`, `bases` specs (legacy `<List />`, changelog and tag pages untouched).
- [ ] **Step 3: CI time**: compare the `E2E Tests` job duration with the last run on `main` (`gh run list --workflow e2e.yml --branch main -L 1 --json databaseId,updatedAt,createdAt`). The job runs serially under `timeout 20m`; if the new site pushes it past ~15 min, report it in the PR.
- [ ] **Step 4: Commit** `test(listing): e2e for list blocks and layout: list`

### Task B19: CI opt-in screenshot run (off by default)

**Files:**
- Create: `e2e/specs/listings-screenshots.spec.ts`
- Modify: `.github/workflows/e2e.yml` (repo root)

Cheap: one extra Playwright invocation of about 10 shots plus an artifact upload, only when a maintainer asks for it via `workflow_dispatch`. The default push/PR runs are unchanged (the spec skips itself without `LISTING_SCREENSHOTS`).

- [ ] **Step 1: The gated spec** (first-fold crops, real dark mode, reloaded mobile)

```ts
import { test } from '../helpers/fixtures';

test.skip(!process.env.LISTING_SCREENSHOTS, 'set LISTING_SCREENSHOTS=1 to capture');
test.use({ viewport: { width: 1440, height: 900 } });

const OUT = 'test-results/listing-screenshots';
const shots: Array<[string, string, string?]> = [
  ['list-view', '/blog'],
  ['list-view-page-2', '/blog?page=2'],
  ['cards-view', '/projects'],
  ['people-cards', '/people'],
  ['compact-archive-pagination', '/archive?page=5'],
  ['home-latest-3', '/'],
  ['podcast-where', '/podcast'],
  ['error-card', '/errors', '.list-component-error--block'],
];

for (const [name, url, selector] of shots) {
  test(name, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    if (selector) await page.locator(selector).screenshot({ path: `${OUT}/${name}.png` });
    else await page.screenshot({ path: `${OUT}/${name}.png` }); // first fold, not fullPage
  });
}

test('list-view-dark', async ({ page }) => {
  // The site picks data-theme from localStorage (THEME_PREFERENCE_STORAGE_KEY in lib/const.ts) in an inline script.
  await page.addInitScript(() => localStorage.setItem('theme-preference', 'dark'));
  await page.goto('/blog');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/list-view-dark.png` });
});

test('list-view-mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blog');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/list-view-mobile.png` });
});
```

- [ ] **Step 2: Workflow opt-in.** In `.github/workflows/e2e.yml` add to `on:`

```yaml
  workflow_dispatch:
    inputs:
      listing_screenshots:
        description: Also capture listing screenshots and upload them as an artifact
        type: boolean
        default: false
```

and after the "Run Playwright tests" step:

```yaml
      - name: Capture listing screenshots (opt-in)
        if: ${{ github.event_name == 'workflow_dispatch' && inputs.listing_screenshots }}
        working-directory: apps/flowershow
        env:
          LISTING_SCREENSHOTS: "1"
        # the main run's teardown project deleted the seeded data: re-seed, then capture
        run: npx playwright test --project=setup && npx playwright test --project=listings --no-deps listings-screenshots

      - name: Upload listing screenshots
        if: ${{ github.event_name == 'workflow_dispatch' && inputs.listing_screenshots }}
        uses: actions/upload-artifact@v4
        with:
          name: listing-screenshots
          path: apps/flowershow/test-results/listing-screenshots/
```

The re-seed in the opt-in step is needed because the main run ends with the `teardown` project, which deletes the seeded user. Default push/PR runs never execute these two steps.
- [ ] **Step 3: Validate the YAML locally**: `npx --yes @action-validator/cli .github/workflows/e2e.yml` if available, else `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/e2e.yml'))"`.
- [ ] **Step 4: Trigger once on the PR branch** after it is pushed: `gh workflow run e2e.yml --ref feat/listing-pages -f listing_screenshots=true`, then `gh run download <run-id> -n listing-screenshots -D /private/tmp/claude-501/-Users-rgrp-src-flowershow/d2c4795e-404c-4108-baa6-af3d8c88e424/scratchpad/ci-shots` and look at them. These real-page shots complement the Storybook mockup; add any that are clearer to `docs/pr-assets/listings/`.
- [ ] **Step 5: Commit** `ci(e2e): opt-in listing screenshots artifact`

# Phase 4: PR B finish (security, docs, changelog, ready for review)

### Task B20: security review

- [ ] Walk the `AGENTS.md` checklist and record the result in the PR body:
  - Auth: the plugin queries Prisma directly (Bases precedent) and runs only inside an already-authorised page render; every query is scoped by `siteId`; `getAuthors` keeps `assertSiteAccess`.
  - Input: all frontmatter text is emitted as mdast `text` (escaped; pinned by the B8 XSS test); hrefs go through `ensureLeadingSlash` (a `permalink: javascript:…` becomes a relative path; pinned in B4); image `src` goes through `resolveContentLink`; `from` rejects `..` (cosmetic, since queries are site-scoped).
  - No secrets; error cards never include `error.message` (pinned in B10).
  - Cost: `from: /` on a large vault selects metadata only, behind a 60s cache; at most 10 listings per page; author lookups cached per site.
  - Hrefs: item URLs are forced to a single leading slash, so neither `javascript:` nor protocol-relative `//evil.com` permalinks can leave the site (pinned in B4); `where`/`sort` field names are only used for in-memory property reads (`__proto__` is a harmless non-match); YAML alias bombs are capped by `yaml`'s `maxAliasCount`.

### Task B21: docs

**Files (all under `content/flowershow-app/`):**
- Create: `docs/reference/listings.md`
- Modify: `docs/reference/list-component.md` (legacy banner), `llms.txt`

The guide rewrites and the tutorial removal are docs PR E (Task E1), opened after B.

- [ ] **Step 1: `docs/reference/listings.md`**, style of sibling reference pages (frontmatter `title`, `description`, concise prose, examples). Sections, in order:
  1. Frontmatter: `title: Listing pages`, `description: List the pages in any folder as a blog index, cards or a compact archive, in plain Markdown.`
  2. "Blog index in one line": the `layout: list` example (design 3.1) and the ```` ```blog ```` example (3.2), each with one sentence on what renders.
  3. "Latest posts on your home page": design 3.3.
  4. "Options": the seven-key table from design 4.2 verbatim (types, defaults, meaning), plus "`dir` and `folder` also work for `from`".
  5. "Views": list, cards, compact, one short example each (3.4, 3.5, 3.7).
  6. "Which pages are listed": the 4.3 bullets in user terms, including `draft: true` (unlisted, still reachable, not in RSS) and nested `index.md` as an item titled by its folder.
  7. "Which fields are used": the 4.4 table in user terms (image falls back to `avatar` then `cover`; authors link to author pages; other `show` fields render as labelled values; wiki links become links).
  8. "Sorting" and "Filtering with where" (4.5, 4.6 with the scalar/list/tags rules; say that `where` values are single values and the comparison is case-sensitive).
  9. "Pagination": `?page=N`, 20 per page on `layout: list`, none on blocks unless `pageSize`, one paginated list per page, `.md` pages are fully server-rendered (`.mdx` pages render after load).
  10. "When something is wrong": the error card example (3.8) and the exact messages from Task B2 for the five most common mistakes.
  11. "List block or Obsidian Bases?": a two-row box (list block: "a list or grid of pages from a folder"; Bases: "a query with formulas or a table"), link `[[obsidian-bases|Obsidian Bases]]`.
  12. "Coming from `<List />`": translation table

     | `<List />` | List block |
     | --- | --- |
     | `<List dir="/blog" />` in `.mdx` | ```` ```list ```` + `from: blog` (or ```` ```blog ````), works in `.md` |
     | `pageSize={5}` | `pageSize: 5` |
     | `slots={{ media: "image" }}` | `image` in `show` |
     | `slots={{ eyebrow: "date" }}` | `date` in `show` |
     | `slots={{ headline: "title" }}` | `title` in `show` |
     | `slots={{ summary: "description" }}` | `description` in `show` |
     | `slots={{ footnote: "authors" }}` | `authors` in `show` (now shows names and avatars, linked) |
     | a slot mapped to another field, e.g. `eyebrow: "status"` | add `status` to `show` (renders as a labelled field) |
     | `fields={["title", "date"]}` | `show: [title, date]` |

  13. "Styling": the semantic classes and the `--list-*` custom properties table from design section 6, link `[[theme-class-reference|Theme class reference]]`.
  14. Precedence note: `layout: list` on a `changelog/` README renders a plain listing, not the timeline.
  15. Small print: relative `image:` paths resolve against the item's own file (unlike `<List />`, which resolved them against the site root; add this as a row in the translation table too); with a site `rootDir`, a `from` that starts with the root folder's name has it stripped (`from: Public/blog` = `from: blog` when the root is `Public`); at most 10 lists per page; `limit` + `pageSize` shows a note and uses `limit`.
- [ ] **Step 2:** `docs/reference/list-component.md`: replace the opening `[!important]` callout with `> [!note] Legacy component\n> Use a [[listings|list block]] instead: it works in plain Markdown, renders on the server and resolves authors. The table in [[listings#coming-from-list|Coming from <List />]] translates every prop.` Keep the rest.
- [ ] **Step 3 (moved to Task E1):** guide rewrites. Leave them alone here.
- [ ] ~~Step 3 original~~ for reference only, executed in E1: Switch the examples in `docs/guides/publish-blog.md`, `docs/guides/turn-obsidian-vault-into-a-blog.md`, `docs/guides/content-catalogs.md` and `uses/blogs.md` from `<List …/>` (and any "rename to .mdx" advice tied to it) to `layout: list` / ```` ```blog ```` / ```` ```list ````, linking `[[listings|Listing pages]]`. Update `docs/reference/syntax-mode.md:34` (List is no longer a reason to use MDX) and `docs/guides/custom-navbar-and-footer.md:212` (link `[[listings|list blocks]]`). In `docs/README.mdx:87` point the card at `/docs/reference/listings` with the new title/description.
- [ ] ~~Step 4 original~~ for reference only, executed in E1: Delete `docs/guides/custom-collection-cards.md`. In `config.json` `redirects`: change the existing `/docs/custom-collection-cards` entry's `to` to `/docs/reference/listings` and add `{ "from": "/docs/guides/custom-collection-cards", "to": "/docs/reference/listings" }`. `grep -rn "custom-collection-cards" content/` must then only hit `config.json`.
- [ ] **Step 5:** `llms.txt`: under "## Docs" add `- [Listing pages](https://flowershow.app/docs/reference/listings.md): blog index, cards or "latest 3" from any folder with one fenced block or layout: list; works in .md`.
- [ ] **Step 6:** Run `pnpm docs:sitemap` so `docs/sitemap.md` lists the new page (the `docs-sitemap.yml` workflow would also regenerate it after merge).
- [ ] **Step 7:** Check every wiki link in the touched pages resolves (`grep -o "\[\[[^]]*\]\]"` and compare with file names). Commit `docs: listing pages reference, llms.txt, legacy List marked`.

### Task B22: changelog entry

**Files:**
- Create: `content/flowershow-app/changelog/<release-date>-listing-pages.md`, `content/flowershow-app/assets/changelog-listing-pages.webp`

- [ ] **Step 1:** Check `content/flowershow-app/changelog/` and open PRs for a same-theme entry from the last few days; extend it if one exists (AGENTS.md).
- [ ] **Step 2:** Convert the Storybook list-view shot (Task B25): `cd apps/flowershow && node -e "require('sharp')('../../docs/pr-assets/listings/list-view.png').resize({width:1440}).webp({quality:85}).toFile('../../content/flowershow-app/assets/changelog-listing-pages.webp')"` (`sharp` ships with Next; check `node -e "require.resolve('sharp')"` first, else use `cwebp -q 85` if installed). Prefer re-taking it from a live `fl --anon` preview of the demo folder once PR B is deployed.
- [ ] **Step 2b:** Validate the frontmatter parses: `node -e "console.log(require('gray-matter')(require('fs').readFileSync(process.argv[1],'utf8')).data)" content/flowershow-app/changelog/<release-date>-listing-pages.md` (run from `apps/flowershow` so `gray-matter` resolves). Expected: an object with `title`, `date`, `description`, `image`.
- [ ] **Step 3:** Write the entry:

```markdown
---
title: Blog indexes and lists of pages in plain Markdown
date: <release-date>
description: "Put layout: list in a folder's README, or a ```blog block anywhere, to list its pages as a blog index, cards or a compact archive. Works in .md."
authors:
  - rufuspollock
image: "[[assets/changelog-listing-pages.webp]]"
showToc: false
---

You can now list the pages of any folder without MDX or components. Add `layout: list` to a folder's `README.md`, or put a ```` ```blog ```` block on any page:

- **Zero config**: newest first, images, dates, descriptions and author names, 20 per page.
- **Latest posts anywhere**: ```` ```blog ```` with `limit: 3` on your home page.
- **Cards and compact views** for projects, people and archives, with `sort`, `where` and `show`.
- **Drafts**: `draft: true` keeps a page reachable but out of lists and the RSS feed.
- **Clear errors**: a wrong key shows a card that names it and suggests the fix.

See [[listings|Listing pages]]. The `<List />` component keeps working; the docs show how to switch.

**Fixes**

- `<List />` no longer lists pages marked `publish: false`.
- `<List />` pagination shows one `...` per gap instead of one per hidden page.
- Author links no longer match a page whose name merely ends with the author handle (`jane` no longer links to `mary-jane`).
```

The `limit`/`pageSize` note and the 10-lists cap are documented in the reference page, not here.

- [ ] **Step 4: Commit** `docs(changelog): listing pages`

### Task B23: finalize PR B

- [ ] **Step 1: Local gates** (worktree root): `pnpm lint && pnpm test` (runs `prisma generate` and the unit project); `cd apps/flowershow && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -1` (no new errors vs baseline); `npx vitest run --project=storybook stories/Listing.stories.tsx stories/List.stories.tsx`.
- [ ] **Step 2: CI gates**: push; `gh pr checks --watch`. Expected: `Unit Tests`, `Lint`, `E2E Tests` green.
- [ ] **Step 3: Update the PR body** (`gh pr edit --body-file`): add the security notes from B20, the CI e2e duration (B18 Step 3), any CI screenshots worth showing (B19 Step 4), the follow-ups list (design section 8 "Deferred" plus "inline paginated blocks get a bare canonical" and "error card for a missing `from` folder"), and a post-deploy checklist: (1) open a production listing page and confirm thumbnails have a `srcset` (optimisation is off outside production); (2) publish a post to a test site and confirm it appears within 60 s; (3) `fl --anon apps/flowershow/e2e/fixtures/listings-demo` renders like the mockup.
- [ ] **Step 4: Decide on the screenshot folder**: ask the maintainer whether to keep `docs/pr-assets/listings/` or drop it before merge; if dropping, `git rm -r docs/pr-assets/listings && git commit -m "docs(pr): drop mockup screenshots"` as the last commit (the PR body's raw links will then 404 after the branch is deleted, which is acceptable; or switch them to a pinned commit SHA URL first).
- [ ] **Step 5:** `gh pr ready`. Comment on #1222: "Superseded by the listing pages design (docs/plans/2026-10-10-listing-pages-design.md, section 5.2): `show` + labelled fields + three views replace the `{% for %}` loop; a `template:` key is a deferred follow-up if demand persists." Comment on #1120, #1008, #923, #924 with the PR link.
- [ ] **Step 6: Beads**: update the B bead with the PR link; create follow-ups with `bd -C /Users/rgrp/src/flowershow/flowershow create … --related flowershow-sgw` for: `<List />` shims (design deferred 1), `group: year` (2), self-canonical for inline paginated blocks, error card for a missing `from` folder.

---

# Phase 5 deliverables

# Deliverable C: theme audit (repo `flowershow/themes`)

### Task C1: `.is-disabled` and new markup across the six official themes

**Files:** `/Users/rgrp/src/flowershow/themes/{leaf,lessflowery,letterpress,superstack,monospace,material-draft}/theme.css`. Work in a worktree of that repo (`git -C /Users/rgrp/src/flowershow/themes worktree add /Users/rgrp/src/flowershow/themes-listings -b fix/listing-pagination-disabled origin/main`), never in its main checkout.

- [ ] **Step 1:** For lessflowery (`theme.css:2523-2528`), letterpress (`:2550-2555`) and superstack (`:2518-2523`): change `.list-component-pagination-button:disabled` to `.list-component-pagination-button:is(:disabled, .is-disabled)` and `:not(:disabled)` to `:not(:disabled, .is-disabled)`.
- [ ] **Step 2:** In every theme, grep for rules that assume legacy markup: `grep -n "list-component-pagination-button-icon\|list-component-item-footnote\|list-component-pagination-page-button\|list-component {" */theme.css`. Confirm icon rules size the inline SVG (`width/height`), that nothing styles `.list-component-item-footnote` as plain text in a way that breaks the authors row, that `button`-specific resets do not leave `<a>` page buttons underlined (add `text-decoration: none` scoped to `a.list-component-pagination-*` if they do), and that `.list-component-note` spans the grid in themes that make `.list-component` a grid.
- [ ] **Step 3:** Leaf: `.list-component { display: grid }` styles items as cards already; confirm `view: list` and `view: cards` both look intentional. If `.list-component--cards` fights Leaf's grid, add a Leaf rule for the modifier rather than changing the app.
- [ ] **Step 4: Before/after via Storybook** (no database needed): serve the themes worktree (`python3 -m http.server 8080 -d /Users/rgrp/src/flowershow/themes-listings &`), then in the flowershow worktree run Storybook and capture the `BlogIndexPage1`, `ProjectsCards` and `CompactArchivePaginated` stories with `themeCss` set to `http://localhost:8080/<theme>/theme.css` for each theme, once against `origin/main` of the themes repo ("before") and once against the branch ("after"). Easiest: add a temporary `ThemeCheck` story that reads the theme name from a `?theme=` query param (`new URLSearchParams(location.search)`), do not commit it, and point the capture script at `iframe.html?id=…&theme=<name>`.
- [ ] **Step 5:** PR in `flowershow/themes` with the before/after screenshots committed to that branch (same raw-URL approach as B26). Merge after PR B deploys (it targets markup only PR B emits; harmless before).

# Deliverable D: agent skill (repo `flowershow/skills`)

### Task D1: teach the skill the list block

**Files:** `/Users/rgrp/src/flowershow/skills/SKILL.md` and `CHANGELOG.md` (worktree `/Users/rgrp/src/flowershow/skills-listings`, branch `docs/listing-blocks`).

- [ ] **Step 1:** Near the HTML/Markdown section (around line 140), add:

```markdown
- **Blog index or any list of pages:** put `layout: list` in the folder's `README.md` frontmatter, or add a ```` ```blog ```` block anywhere (`limit: 3` for "latest 3"). Works in `.md`. Keys: `from`, `view` (list, cards, compact), `sort`, `limit`, `pageSize`, `show`, `where`. A wrong key shows an error card on the page that names the fix. Do not use `<List />` (legacy, needs MDX). Reference: https://flowershow.app/docs/reference/listings.md
```

- [ ] **Step 2:** Bump the skill version per `skills/README.md`, add a `CHANGELOG.md` line, open the PR after PR B is deployed (the docs URL must resolve).

# Deliverable E: guide rewrites and tutorial removal (docs PR, flowershow repo)

### Task E1: switch the guides to list blocks

**Files (all under `content/flowershow-app/`):**
- Modify: `docs/guides/publish-blog.md`, `docs/guides/turn-obsidian-vault-into-a-blog.md`, `docs/guides/content-catalogs.md`, `uses/blogs.md`, `docs/reference/syntax-mode.md:34`, `docs/guides/custom-navbar-and-footer.md:212`, `docs/README.mdx:87` (card), `config.json` (redirects), `docs/sitemap.md` (regenerated)
- Delete: `docs/guides/custom-collection-cards.md`

Entry: PR B is open (draft is fine) so the reference page exists to link to; branch off `origin/main` after PR B merges, or off `feat/listing-pages` if B is still open (then rebase once B merges). Branch `docs/listing-guides` in the same worktree (`git switch -c docs/listing-guides origin/main` after a clean `git status`).

- [ ] **Step 1:** Switch the examples in `docs/guides/publish-blog.md`, `docs/guides/turn-obsidian-vault-into-a-blog.md`, `docs/guides/content-catalogs.md` and `uses/blogs.md` from `<List …/>` (and any "rename to .mdx" advice tied to it) to `layout: list` / ```` ```blog ```` / ```` ```list ````, linking `[[listings|Listing pages]]`. Update `docs/reference/syntax-mode.md:34` (List is no longer a reason to use MDX) and `docs/guides/custom-navbar-and-footer.md:212` (link `[[listings|list blocks]]`). In `docs/README.mdx:87` point the card at `/docs/reference/listings` with the new title and description.
- [ ] **Step 2:** Delete `docs/guides/custom-collection-cards.md`. In `config.json` `redirects`: change the existing `/docs/custom-collection-cards` entry's `to` to `/docs/reference/listings` and add `{ "from": "/docs/guides/custom-collection-cards", "to": "/docs/reference/listings" }`.
- [ ] **Step 3:** `pnpm docs:sitemap`; then `grep -rn "custom-collection-cards" content/` must only hit `config.json`.
- [ ] **Step 4:** Check every wiki link in the touched pages resolves (`grep -o "\[\[[^]]*\]\]"` against file names) and that every fenced example parses with `parseListingBlock` (paste each into a scratch `node`/`tsx` call or a throwaway vitest case; do not commit it).
- [ ] **Step 5:** Commit `docs: switch guides to list blocks; retire custom collection cards tutorial`; push; `gh pr create --title "docs: use list blocks in the blog and catalog guides" --body "<summary; follows #<PR B>>\n\nhttps://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q"`. Merge the same day as PR B.

---

## Risks and how each is verified

| Risk | Where it bites | Verified by |
| --- | --- | --- |
| md/mdx divergence (the class of bug this design exists to remove) | `ListingImage` mapping, SVG attributes, non-string props, `rehype-raw` restructuring | B14 parity test through production `serialize`+`hydrate`, attribute-order-insensitive full-section equality; string-props invariant (B8); e2e `mdx-page` in CI |
| Item headings leak into ToC, anchors or slugs | Home pages with teasers | B12 unit (slug not shifted), B12's parity cases (no ids, no `.heading-link`), B18 e2e (ToC text) in CI |
| Non-string frontmatter crashes render | Every listing (most common 500 historically) | B4 malformed test, B8 render, fixture `odd-frontmatter.md` in CI e2e |
| Theme CSS fights modifiers | Leaf grid vs cards; disabled ends unstyled | Modifier-scoped rules (B16); `ThemedLetterpress` story; per-theme Storybook before/after (C1) |
| Shared `?page` param | Page with several blocks | One-paginated rule (B10 unit, B18 `/two-paginated`) |
| Cold-cache cost of many blocks | A page with dozens of blocks | 10-listings cap (B10 test); folder rows and authors cached and tagged by site (B5, B7) |
| Out-of-range pages cannot 404 | `?page=99` | Empty state + strip (B6, B8, B18) |
| Large folders | `from: /` on 10k pages | Metadata-only select (B5 test), 60 s cache keyed without per-page data |
| Author matching change | Sites relying on loose suffix match | B7 router test; separate revertable commit; changelog Fixes bullet |
| `draft` semantics surprise | Vaults already using `draft` | Docs (B21); RSS test (B3); open question kept in design |
| `next/image` unoptimised outside production | No `srcset` locally/CI | B11 checks props; e2e checks `sizes`/`loading`; post-deploy checklist item in PR B |
| Cache staleness | New post missing for up to 60 s; stale e2e data | Site tag revalidated on publish; seed revalidates the listings site id (B17) |
| No local e2e (no Docker on this machine) | e2e regressions found late | CI `E2E Tests` is the gate on every push of the draft PR; Storybook covers visuals locally; parity + unit tests cover the pipeline |
| Seed vs worker `appPath` shape | Encoded-URL bugs invisible in e2e | Listings site seeds `encodeSlug(filePathToSlug())` like the worker (B17); e2e asserts the encoded href resolves (B18) |
| Mockup drifts from real rendering | Reviewer approves something that is not shipped | Stories call the real `renderListing` and parse their spec from the Markdown shown in the PR (B24); CI screenshot opt-in shows real pages (B19) |
| PR B depends on PR A | `lib/page-window.ts` | B branched from A until A merges; CI on B includes A's tests |

## Design deviations and resolved ambiguities

These are the places where the design was ambiguous or did not match the code. Each is resolved in the task named; reviewers should push back here if they disagree.

1. **`ListingImage` node shape (B8, B13).** The design says a generic `listingimage` `hName` element mapped in both registries. In MDX a lowercase intrinsic element is not reliably overridable, while an `mdxJsxFlowElement` named `ListingImage` is native to MDX and is lowercased to `listingimage` for `.md` by the existing `remarkMdxJsxToElement`, exactly the `ObsidianBasesViews` precedent the design cites. Same outcome, one proven path.
2. **Intrinsic image dimensions dropped (B11).** With `fill` inside a fixed `--list-media-aspect` box, `width`/`height` cannot affect layout, so `imageDimensions` is not threaded into the MDX options (where it is not available today: `getMdxOptions` has no such parameter; dimensions are injected later by `MDXClient`).
3. **`srcset` in e2e is impossible (B11, B18).** `next.config.mjs` sets `images.unoptimized` whenever `NEXT_PUBLIC_VERCEL_ENV !== 'production'`, so dev, CI and previews render plain `<img>` without `srcset`. Tests assert `sizes`/`loading`/`fill`; `srcset` is a post-deploy production check.
4. **"Server-rendered, no client JavaScript" holds for `.md` only.** `MDXClient` is `dynamic(..., { ssr: false })`, so `.mdx` pages render the listing after hydration (data is still fetched at request time; no tRPC, no skeleton). Docs say so and recommend `.md`.
5. **Heading ids (B12).** Stripping ids only after `rehype-slug` (design section 6) still advances the slugger, shifting real headings to `-1` suffixes. Resolved with a placeholder id set by the renderer so `rehype-slug` skips item headings, then removed.
6. **`publish: false` bug is narrower than stated (A2).** The worker deletes `publish: false` files at ingestion (`queue-consumer.js:198`) and the e2e seed skips them, so the "listed and links to a 404" case only hits legacy rows or the delete-event window. Kept as defence in depth; unit-tested only.
7. **Themes and the agent skill are separate repos** (`flowershow/themes`, `flowershow/skills`), not `apps/flowershow/../themes`. Hence Deliverables C and D.
8. **The theme contract lives in the generated class reference**, not `docs/theming.md` (which never mentions `.list-component-*`). The listings DOM tree in `scripts/theme-class-reference.mjs` is hand-written and enforced by `pnpm lint` (`docs:theme-classes:check`), so B16 edits it.
9. **Custom properties vs "no existing rule changed" (B16).** The existing rules hard-code `16rem`, `3 / 2`, etc. To keep them byte-identical, all `var(--list-*)` rules are scoped to the new `--list/--cards/--compact` modifiers.
10. **Pagination labels.** "Newer/Older" only makes sense for `date desc`; other sorts say "Previous/Next" (B8).
11. **Strip example.** Design 3.1's `1 … 2 3 [4] 5 6 … 12` contradicts "one collapsed ellipsis per gap". `pageWindow` shows a one-page gap as the page and longer gaps as one ellipsis (A1).
12. **Self-canonical only for `layout: list` (B6, B15).** `generateMetadata` cannot see inline blocks without fetching and parsing content; inline paginated blocks keep the bare canonical in v1.
13. **"`limit` with `pageSize` is reported"**: the list renders using `limit`, with an inline `p.list-component-note` ("`pageSize` is ignored because `limit` is set; remove one of them."), and only when `pageSize` is explicit (the `layout: list` default of 20 never triggers it). One redundant key must not blank a home-page teaser.
14. **`where` values are scalars only** (a list value is an error); comparison is type-loose, case-sensitive, wiki brackets ignored. The design did not define list values.
15. **Relative item images resolve against the item's own file** (standard Markdown semantics); legacy `<List />` resolved them against the site root.
16. **Unresolved author names drop wiki brackets** (`[[ada]]` → `ada`); legacy `getAuthors` returned the raw string. Avatar resolution keeps legacy semantics so post headers do not change.
17. **Cache shape (B5).** The design's single `queryListingItems(prisma, {…, files, permalinks})` would make `unstable_cache` serialise every site path into its key. Split into cached rows (key: site, folder, where, sort) and uncached per-page item mapping; self-exclusion moved after the cache.
18. **Out-of-range page markup.** Section 4.8 says "empty text with the strip" while section 6 says the empty `<p>` replaces the section; resolved as: no items at all → bare `<p>`; out-of-range page → `<section>` containing the `<p>` and the strip.
19. **Ingestion's `computed: ['title']` does not distinguish H1 from file name** (`queue-consumer.js:parseMarkdown`), so file-name titles are detected by comparing with the base name (`resolveEntryTitle`), and nested indexes by `README`/`index`.
20. **Obsidian-capitalised folders (Review Focus 1)** are not covered by the design: `resolveFolderCase` falls back to a case-insensitive folder match so ```` ```blog ```` finds `Blog/`.
21. **Not changed, but worth a follow-up:** a `from` folder that does not exist renders "Nothing here yet." per the design; an error card ("No folder "blgo". Folders: blog, projects") would serve the AI-writability goal better. Logged as a bead in B23.
22. **Testing site (B17).** The design suggests a sibling of `blog.spec.ts` using the existing fixture's `blog/README.md`. The plan seeds a separate `listings-demo` site with its own Playwright project instead, so `blog/` sits at the root (```` ```blog ```` works literally), the legacy `blog/index.mdx` test stays untouched, and the same folder can be published with `fl` as a live demo.
23. **Phase boundaries.** `ListingImage` (B11) runs in Phase 2, not Phase 3, because pipeline registration (B13) and the parity test (B14) need it. Heading hygiene (B12) stays in Phase 3 and adds its own parity cases; until then both pipelines carry the same placeholder id.
24. **Additions beyond the design** (from review): at most 10 listings per page; author lookups cached and tagged by site like legacy `getAuthors`; `protectWikiLinkAliases`' U+E000 divider undone inside blocks; hrefs never protocol-relative (`//evil.com` → `/evil.com`; ingestion's `normalizePermalink` already strips leading slashes); `--list-gap` wired for the list view too.
25. **Mockup and e2e environment.** Storybook (no database) is the primary mockup and the local visual gate; e2e runs in CI only, with an opt-in screenshot artifact. The listings e2e site stores `appPath` encoded like the worker; the existing fixture sites keep the seed's unencoded shape.
26. **PR split.** Guide rewrites and the tutorial removal move to docs PR E; the `getAuthors` delegation is a separately revertable commit inside B.
