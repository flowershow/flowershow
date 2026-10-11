# Listing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan v5 (2026-10-10). Revised after two adversarial reviews (see "Changes after adversarial review" at the end). PR A (#1457) is squash-merged to `main` as `e8ea840f`.

**Goal:** Ship ```` ```list ````/```` ```blog ```` blocks, `layout: list` pages and zero-config `blog/`/`posts/` folders that render a server-side, paginated, themeable listing from frontmatter in `.md` and `.mdx`: PR B (engine, `list`, `grid`, zero-config) and the stacked PR B2 (`compact`, `group`, `people`, `featured`), with the official themes updated first (C1).

**Architecture:** One async remark plugin (`lib/remark-listing.ts`) in both pipelines turns fences into generic mdast nodes (the `lib/remark-changelog.ts` technique). Page-level listings (`layout: list`, zero-config) go through the same plugin via a standalone `.md` render made by the route, outside the MDX tree, so they are always server-rendered. A pure route resolver (`lib/listing/route.ts`) decides which page gets which listing. Options are parsed by `lib/listing/spec.ts`; items are mapped by pure `lib/listing/items.ts`; `lib/listing/query.ts` caches only an ordered index of ids per folder query and fetches the page's rows by id; authors resolve in one cached query. Images are the one component (`ListingImage`, `next/image`), emitted as an MDX JSX element like `ObsidianBasesViews`. CSS uses `:where()` so themes always win, and every new root carries `data-view` so themes can tell old from new markup.

**Tech Stack:** Next.js 15 (app router), unified/remark/rehype, next-mdx-remote-client, Prisma 5, `yaml`, vitest (jsdom, `--project=unit`; Storybook `--project=storybook`), Playwright, Biome + ESLint, pnpm + turbo.

**Spec:** `docs/plans/2026-10-10-listing-pages-design.md` (v5), especially sections 4, 6, 7.3, 8 and "Changes after adversarial review". Background: `docs/plans/2026-10-10-listing-pages-consolidation.md`, `moodboard/findings.md`. Where this plan deviates from the design it says so (see "Design deviations" at the end).

All paths below are relative to `apps/flowershow/` unless they start with `content/`, `scripts/`, `docs/`, `.github/` or a repo name.

## Global Constraints

- Works identically in `.md` (`processMarkdown`) and `.mdx` (`getMdxOptions`) for inline blocks; page-level listings always render through the `.md` pipeline in the route. Every renderer change gets a parity test.
- Author-facing syntax is fenced blocks and frontmatter only; no MDX component is ever required. `ListingImage` is internal.
- Keys (design 4.2): `from`, `view`, `sort`, `limit`, `pageSize`, `where`, `fields`, `media` (`thumb left|right`), `ratio`, `defaultImage` in PR B; `featured`, `group` added in PR B2. Key names match case-insensitively. Silent aliases: `dir`/`folder` → `from`; `layout` → `view` (inside a block or `list:` map); `cards` → `grid`; `sortBy` + `sortDirection` → `sort`; `-field` sort; `headline`/`media`/`footnote` inside `fields`; the list form of `fields`.
- Views: `list` (default) and `grid` in PR B; `compact` and `people` in PR B2. In PR B, `view: compact|people` is an error card "not available yet; use list or grid". One card DOM for all views (design 6).
- Defaults: `sort: date desc` where `date` is the date slot (`title asc` for `people`); `fields` per view with fallbacks (design 4.4); `media: thumb` + `ratio: 3/2` (list), `media: cover` + `ratio: 16/9` (grid), `cover 1/1` (people), `none` (compact); `group: none`, except `compact` on page-level listings → `year`; `featured: 0`; `pageSize: 20` on page-level listings, none inline; ```` ```blog ```` means `from: blog`.
- Errors vs notes (design 4.12): error cards only for things the engine cannot interpret (including a missing folder, with nearest matches, and `from` naming a file); redundancies are notes in `data-listing-notes` + server log, never visible.
- Item rules: under `from` at any depth; `.md`/`.mdx` with an `appPath`; not the folder's own index; nested indexes are items; not the current page; not `publish: false`; not `draft: true` (drafts also out of RSS and the sitemap, and `noindex`).
- Pagination: `?page=N` on the public URL; bare URL for page 1; other params dropped; junk → 1; one paginated listing per page (page-level claims it first); at most 10 listings per page; no strip for one page.
- CSS: every new rule through `:where()`; every new root carries `data-view`; the listing root never sets `max-width` (page-level `list` pages constrain the page through `.listing-page`); no existing rule in `styles/default-theme.css` is modified.
- Themes: the themes PR (C1) re-scopes legacy rules to `.list-component:not([data-view])` and is merged and released before PR B deploys.
- Every `hProperties` value emitted by the renderer is a string.
- Item and group headings: no `id`, no `.heading-link`, `data-toc-ignore`, never in the ToC.
- Cache: only the ordered index (ids, paths, featured flags, group keys) is cached; never full metadata.
- Repo rules (`AGENTS.md`): update the README of any package whose documented behaviour changes (`e2e/README.md`); changelog entry with a ~1440px `.webp` screenshot; security checklist before finishing; never hard-wrap Markdown.

## Review Focus

1. **Obsidian-capitalised folders and folder notes.** A vault with `Blog/` and a ```` ```blog ```` block lists `Blog/`; a vault with `blog.md` beside `blog/` gets the listing under the note's prose. Pinned in B4 (`resolveFolderCase`), B15 (route table) and the e2e fixture (B18).
2. **Malformed item frontmatter.** `title: 1984`, `date: TBD`, `authors: {name: x}`, unquoted `image: [[cover.png]]`, `description: 42` render a sensible item and never throw. Pinned in B4 and B8.
3. **Spaces and non-ASCII in paths.** Items link to the stored, encoded `appPath`; a zero-config folder under `My Blog/posts` resolves. Pinned in B4, B15 and the encoded seed (B17/B18).
4. **Junk and huge `?page` values.** Pinned in B6 and B15 (`noindex` out of range).
5. **Blocks not at top level.** Fences in callouts, blockquotes, list items and `~~~` fences render, and the zero-config detector sees them too. Pinned in B10 and B15.

## Execution phases

Hand each phase to a separate agent, in order. Task IDs are stable references; **execution order is the order in this table**.

| Phase | Tasks, in order | Entry criteria | Exit criteria |
| --- | --- | --- | --- |
| **1. PR A: legacy fixes** | A1–A3 | Done: #1457 squash-merged as `e8ea840f` | Done |
| **2. PR B core** | B1, B2, B3, B4, B5, B6, B7 (two commits), B8, B9, B10, B11, B13, B14 | Worktree on `feat/listing-pages` off a fresh `origin/main` (includes `lib/page-window.ts` from PR A); `pnpm install`; `prisma generate`; type-error baseline recorded | All unit tests and the parity test pass; `pnpm lint`, `pnpm test` green; no new type errors; every task committed |
| **3. PR B presentation + themes prerequisite** | B16, B12, B15, B24, B25, C1 (themes PR, in parallel from here), B26 (draft PR), B17, B18, B19 | Phase 2 exit | Route table test passes; Storybook project passes, including the theme stories and the grid column check; mockup PNGs committed; draft PR B open with source + screenshots; CI `E2E Tests` green including `listings`; C1 PR open with before/after per theme |
| **4. PR B finish** | B20, B21, B22, B23 | Phase 3 exit; **C1 merged and a themes release tagged by the maintainer** | Security notes in PR B; docs/llms.txt/changelog for exactly what B ships; all gates green; PR ready; beads filed |
| **4b. PR B2: compact, group, people, featured** | G1, G2, G3, G4, G5 | Phase 4 exit | `[B2]` tests un-skipped and green; stories/screenshots for the B2 views; e2e green in CI; draft PR B2 stacked on B; merged in the same release |
| **5. Cross-repo and docs PR** | D1 (skills), E1 (guides docs PR) | PR B (and B2 for D1's full snippet) deployed | Two PRs open; E1 merged the same day as B |
| **6. PR F: post page layout (outline only)** | F1–F6 (to be detailed) | PR B and B2 merged | A detailed plan from design section 10, then a draft PR with Storybook before/after |

### Environment (this machine)

- **No Docker, colima or podman, and none will be installed.** Local verification is: unit tests (vitest `--project=unit`, after `prisma generate`), the md/mdx parity test, `tsc`, lint/format, and Storybook (`--project=storybook`, `build-storybook`). The CI workflow `.github/workflows/e2e.yml` is the e2e gate; never run `pnpm dev`, `scripts/dev-up.sh`, the e2e seed or Playwright e2e specs locally.
- There is no `apps/flowershow/.env`; unit tests do not need one (`vitest.setup.ts` mocks `@/env.mjs`; `SKIP_ENV_VALIDATION` is set by `vitest.config.ts`).
- Playwright's Chromium download (`npx playwright install chromium`) is allowed: Storybook's vitest project and the screenshot script need it.
- The official themes live in `/Users/rgrp/src/flowershow/themes` (repo `flowershow/themes`; releases are git tags `v0.1.x` cut by the maintainer, never by an agent: see that repo's `AGENTS.md`).

---

## How to work in this repo

- Never switch or edit the main checkout `/Users/rgrp/src/flowershow/flowershow`. One worktree for the flowershow repo: `/Users/rgrp/src/flowershow/flowershow-listings`.
  - Phase 2: `git -C /Users/rgrp/src/flowershow/flowershow-listings fetch origin && git -C /Users/rgrp/src/flowershow/flowershow-listings switch -c feat/listing-pages origin/main` (create the worktree first with `git -C /Users/rgrp/src/flowershow/flowershow worktree add /Users/rgrp/src/flowershow/flowershow-listings origin/main` if it does not exist; switch only with a clean `git status`).
  - Phase 4b: `git switch -c feat/listing-views feat/listing-pages`. When PR B is squash-merged, move B2 onto main without replaying B's commits: `git fetch origin && git rebase --onto origin/main feat/listing-pages feat/listing-views`, then `gh pr edit <B2> --base main` **before** deleting B's branch.
  - Phase 5 (E1): `git switch -c docs/listing-guides origin/main`.
  - After each branch creation: `pnpm install` at the worktree root, then `cd apps/flowershow && npx prisma generate` (direct `npx vitest run` does not run it; `pnpm test` does).
- Themes worktree (C1): `git -C /Users/rgrp/src/flowershow/themes worktree add /Users/rgrp/src/flowershow/themes-listings -b feat/listing-views origin/main`.
- Unit tests: `cd /Users/rgrp/src/flowershow/flowershow-listings/apps/flowershow && npx vitest run --project=unit <path>`. Full suite: `pnpm test` at the worktree root.
- Storybook: `npx vitest run --project=storybook <story files>`; `pnpm storybook`; `pnpm build-storybook` (→ `deploy/storybook/out`). Theme CSS for stories: `node scripts/sync-theme-fixtures.mjs [themesDir]` (Task B24).
- Lint/format: `pnpm lint` at the worktree root and `npx biome format --write <files>`.
- Types: record a baseline once: `cd apps/flowershow && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -1`; the error count must not grow. e2e specs: `npx tsc --noEmit -p e2e/tsconfig.json`.
- e2e: CI only. Push and use `gh pr checks --watch` / `gh run watch`.
- Commit after every task. End every commit message with `Claude-Session: https://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q`; end PR descriptions with `https://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q`.
- Tracking: beads (`bd -C /Users/rgrp/src/flowershow/flowershow ...`). `bd show flowershow-sgw`; child beads `listing: v1 engine` (B), `listing: views` (B2), `listing: themes` (C1), `listing: guides` (E) with `--external-ref` to the PRs.

## File structure

PR B:

| File | Responsibility |
| --- | --- |
| Create `lib/listing/spec.ts` (+ test) | Parse/validate a block, a `list:` map or the blog preset → `ListingSpec` + notes, or errors. Pure. |
| Create `lib/listing/rules.ts` (+ test) | `isDraft`, `isUnpublished`. Pure; shared with RSS, sitemap, metadata. |
| Create `lib/listing/dates.ts` (+ test) | `resolveLocale`, `formatListingDate`, `groupLabel`. Pure, browser-safe (Storybook uses it). |
| Create `lib/listing/items.ts` (+ test) | Item rules, `where`, slot fallbacks, group-first sort, `buildIndex`, `toListingItem`, `resolveFolderCase`, folder checks. Pure (no Prisma). |
| Create `lib/listing/query.ts` (+ test) | Folder fetch, cached `queryListingIndex`, `fetchRowsByIds`. |
| Create `lib/listing/authors.ts` (+ test) | `resolveAuthors` (tRPC `getAuthors` too) and `cachedResolveAuthors`. |
| Create `lib/listing/paginate.ts` (+ test) | `sliceListing`, `pageHref`, `pageFromSearchParam`, `listingCanonical`. Pure. |
| Create `lib/listing/render.ts` (+ test) | Spec + page of items → mdast (section 6 DOM), error card, pagination. Pure. |
| Create `lib/listing/route.ts` (+ test) | `resolveListingRoute`, `virtualListingDir`, `autoListingFor`, `hasExplicitListing` (AST). Pure. |
| Create `lib/listing/page-listing.tsx` | `renderPageListing`: the standalone `.md` render of a page-level listing. |
| Create `lib/remark-listing.ts` (+ test) | The plugin. |
| Create `lib/rehype-listing-headings.ts` (+ test) | Strip placeholder ids from listing headings after `rehype-slug`. |
| Create `components/public/mdx/listing-image.tsx` (+ test) | `next/image` leaf for media and 20px avatars. |
| Create `components/public/listing/virtual-listing-page.tsx` | Zero-config case 1 page. |
| Create `lib/markdown-listing.test.tsx` | md/mdx parity. |
| Modify `lib/markdown.ts`, `components/public/mdx/mdx-components-factory.tsx`, `components/public/table-of-contents.tsx` | Registration, autolink test, ToC selector. |
| Modify `lib/render-page-content.tsx`, `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`, `…/_components/url-normalizer.tsx` | Route wiring, page-level SSR, widths, canonical/noindex, `?page` kept. |
| Modify `server/api/types.ts`, `components/types.ts` | `draft`, `list`, `locale` on page metadata; `locale` on `SiteConfig`. |
| Modify `lib/rss.ts`, `app/api/sitemap/[user]/[project]/route.ts` (+ tests) | Skip drafts. |
| Modify `server/api/routers/site.ts` (+ test) | `getAuthors` delegates (own commit). |
| Modify `styles/default-theme.css`, `scripts/theme-class-reference.mjs`, regenerate `content/flowershow-app/docs/reference/theme-class-reference.md` | `:where()` rules for list, grid, shared parts, page widths. |
| Modify `.storybook/main.ts`; create `scripts/sync-theme-fixtures.mjs`, `stories/__fixtures__/themes/.gitkeep` (+ `.gitignore` entry), `stories/Listing.stories.tsx`, `stories/__fixtures__/listing.tsx`, `stories/__fixtures__/listing-assets/*`, `scripts/capture-listing-stories.mjs` | Mockup, theme stories, screenshots. |
| Create `docs/pr-assets/listings/*.png` (repo root) | PR screenshots (droppable before merge). |
| Create `e2e/fixtures/listings-demo/**`; modify `e2e/helpers/seed.ts`, `playwright.config.ts`, `e2e/README.md`; create `e2e/specs/listings.spec.ts`, `e2e/specs/listings-screenshots.spec.ts`; modify `.github/workflows/e2e.yml` | Fixture site, e2e, opt-in CI screenshots. |
| Docs under `content/flowershow-app/` | `docs/reference/listings.md` (list, grid, zero-config only), legacy banner on `list-component.md`, `config-file.md` (`locale`), `llms.txt`, changelog entry. |

PR B2: `lib/listing/spec.ts` constants, `render.ts`/`items.ts` people initials, CSS for compact/people/featured/group, stories, fixture/e2e, docs. C1: six `theme.css` files in `flowershow/themes`. D1: `flowershow/skills` `SKILL.md`. E: guides docs PR. F: post page (outline).

---

# Phase 1: PR A (done)

PR A (`fix(list): hide publish: false pages and collapse pagination ellipsis`, #1457) is squash-merged to `main` as `e8ea840f`: `lib/page-window.ts` (`pageWindow(current, pageCount, radius?)`, used by Task B8), the legacy `list-pagination.tsx` collapsed ellipsis, and the `publish: false` SQL filter in `getListComponentItems`. Tasks A1–A3 are kept in git history of this plan (v4) for reference; nothing remains to do. Its two changelog bullets ship in PR B's entry under **Fixes** (Task B22).

---

# Phase 2: PR B core (engine, pipelines, unit and parity tests)

Branch `feat/listing-pages` off `origin/main`, worktree `/Users/rgrp/src/flowershow/flowershow-listings`.

### Task B1: metadata and config types

**Files:**
- Modify: `server/api/types.ts` (`PageMetadata`), `components/types.ts:69` (`SiteConfig`)

- [ ] **Step 1:** In `PageMetadata`, next to `layout`:

```ts
  /** `true` keeps the page reachable by URL but out of listings, RSS and the sitemap, and noindex. */
  draft?: boolean;
  /** Options for page-level listings (same keys as a ```list block), or `false` to opt out of zero-config. Untrusted. */
  list?: unknown;
  /** BCP 47 tag for dates on this page (overrides the site `locale`). Untrusted. */
  locale?: string;
```

In `SiteConfig`: `/** BCP 47 tag for listing dates, e.g. "de-DE". Default en-US. */ locale?: string;`
- [ ] **Step 2:** `npx tsc --noEmit -p tsconfig.json 2>&1 | tail -1`; error count unchanged.
- [ ] **Step 3: Commit** `chore(types): add draft, list and locale to page metadata and site config`

### Task B2: option parsing (`spec.ts`)

**Files:**
- Create: `lib/listing/spec.ts`, `lib/listing/spec.test.ts`

**Interfaces:**
- Consumes: `isFolderIndexPath`, `dirOf` from `@/lib/changelog`.
- Produces:

```ts
export const ALL_LISTING_KEYS = ['from', 'view', 'sort', 'limit', 'pageSize', 'where', 'fields', 'media', 'ratio', 'featured', 'group'] as const;
export const LISTING_KEYS: readonly ListingKey[];      // PR B: without 'featured' and 'group'; PR B2 (G1): all
export type ListingView = 'list' | 'grid' | 'compact' | 'people';
export const LISTING_VIEWS: readonly ListingView[];    // PR B: ['list', 'grid']; PR B2: all four
export type ListingSort = { field: string; direction: 'asc' | 'desc' };
export type ListingFields = { eyebrow: string[]; title: string; summary: string | null; date: string | null; image: string | null; authors: string | null; meta: string[] };
export type ListingGroup = { by: 'none' | 'year' | 'month' | 'day' | 'folder' } | { by: 'field'; field: string };
export type MediaShape = 'none' | 'thumb' | 'cover';
export type Ratio = '16/9' | '3/2' | '4/3' | '1/1' | '3/4';
export type ListingSpec = {
  from: string; fromRelative: boolean; view: ListingView; sort: ListingSort; limit: number | null; pageSize: number | null;
  where: Record<string, string[]>; fields: ListingFields; media: MediaShape; ratio: Ratio; featured: 0 | 1; group: ListingGroup;
};
export type ListingSource = 'list' | 'blog' | 'layout';
export type SpecResult = { ok: true; spec: ListingSpec; notes: string[] } | { ok: false; errors: string[] };
export const DEFAULT_FIELDS: Record<ListingView, ListingFields>;
export const INDEX_PAGE_SIZE = 20;
export function parseListingSpec(input: unknown, opts: { source: ListingSource; defaultFrom?: string | null; rootDir?: string }): SpecResult;
export function parseListingBlock(lang: 'list' | 'blog', code: string, opts?: { rootDir?: string }): SpecResult;
export function implicitListingFrom(blobPath: string, files: string[]): string | null;
```

**Staging.** PR B exports `LISTING_VIEWS = ['list', 'grid']` and `LISTING_KEYS` without `featured`/`group`. `view: compact|people` gets `View "compact" is not available yet; use "list" or "grid".`; `featured:`/`group:` get `"group" is not available yet.` Task G1 widens both constants and un-skips the `[B2]` tests (write them with `it.skip`).

- [ ] **Step 1: Write the failing tests** (`lib/listing/spec.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_FIELDS, implicitListingFrom, parseListingBlock, parseListingSpec } from './spec';

const ok = (r: ReturnType<typeof parseListingSpec>) => {
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.spec;
};
const errs = (r: ReturnType<typeof parseListingSpec>) => (r.ok ? [] : r.errors);
const notes = (r: ReturnType<typeof parseListingSpec>) => (r.ok ? r.notes : []);
const blog = (o: unknown) => parseListingSpec(o, { source: 'blog' });
const page = (o: unknown) => parseListingSpec(o, { source: 'layout', defaultFrom: 'blog' });

describe('presets and from', () => {
  it('an empty ```blog block', () => {
    expect(ok(parseListingBlock('blog', ''))).toEqual({
      from: 'blog', fromRelative: false, view: 'list', sort: { field: 'date', direction: 'desc' }, limit: null, pageSize: null, where: {},
      fields: { eyebrow: [], title: 'title', summary: 'description', date: 'date', image: 'image', authors: 'authors', meta: [] },
      media: 'thumb', ratio: '3/2', featured: 0, group: { by: 'none' },
    });
  });
  it('```list requires from; dir/folder are aliases; ./ is relative', () => {
    expect(errs(parseListingBlock('list', ''))).toEqual(['"from" is required: the folder to list, e.g. "from: blog".']);
    expect(ok(parseListingBlock('list', 'dir: /blog/')).from).toBe('blog');
    expect(ok(parseListingBlock('list', 'Folder: notes/2026')).from).toBe('notes/2026');
    expect(ok(parseListingBlock('list', 'from: ./posts'))).toMatchObject({ from: 'posts', fromRelative: true });
    expect(errs(parseListingBlock('list', 'from: a\ndir: b'))).toEqual(['Use either "from" or "dir", not both.']);
  });
  it('from must be a folder (people need one page per person)', () => {
    expect(errs(parseListingBlock('list', 'from: team.md'))).toEqual(['"from" must be a folder; "team.md" is a page. Listings show one page per item, e.g. one page per person in "people/".']);
  });
  it('from: strips slashes and rootDir, rejects ..', () => {
    expect(ok(parseListingSpec({ from: '/Public/blog/' }, { source: 'list', rootDir: 'Public' })).from).toBe('blog');
    expect(ok(parseListingSpec({ from: '/' }, { source: 'list' })).from).toBe('');
    expect(errs(parseListingSpec({ from: '../x' }, { source: 'list' }))).toEqual(['"from" cannot contain "..".']);
  });
  it('layout: list without a folder; a non-map list:', () => {
    expect(errs(parseListingSpec({}, { source: 'layout', defaultFrom: null }))).toEqual(['Add "list: { from: <folder> }" to the frontmatter: this page is not a folder index and has no folder with the same name.']);
    expect(errs(parseListingSpec('blog', { source: 'layout', defaultFrom: 'x' }))[0]).toMatch(/must be "key: value" lines \(got a string\)/);
  });
});

describe('keys: case-insensitive, aliases, hints', () => {
  it('silently accepts the natural guesses', () => {
    const s = ok(parseListingBlock('list', 'folder: blog\nlayout: cards\npagesize: 5\nSortBy: title\nsortDirection: desc'));
    expect(s).toMatchObject({ from: 'blog', view: 'grid', pageSize: 5, sort: { field: 'title', direction: 'desc' } });
    expect(ok(blog({ sort: '-weight' })).sort).toEqual({ field: 'weight', direction: 'desc' });
  });
  it('produces the design 3.8 messages', () => {
    expect(errs(parseListingBlock('list', 'from: blog\nperPage: 5\nimage: cover'))).toEqual([
      'Unknown key "perPage". Use "pageSize".',
      'Unknown key "image". Use "media: cover" (to choose which field holds the image, use "fields: { image: <key> }").',
    ]);
  });
  it('other hints and close matches', () => {
    expect(errs(blog({ limt: 3 }))).toEqual(['Unknown key "limt". Did you mean "limit"?']);
    expect(errs(blog({ filter: 'x' }))).toEqual(['Unknown key "filter". Use "where".']);
    expect(errs(blog({ show: ['title'] }))).toEqual(['Unknown key "show". Use "fields", e.g. "fields: [title, date, description]".']);
    expect(errs(blog({ zzz: 1 }))).toEqual(['Unknown key "zzz".']);
  });
  it('PR B: B2 keys and views are "not available yet"', () => {
    expect(errs(blog({ group: 'year' }))).toEqual(['"group" is not available yet.']);
    expect(errs(blog({ view: 'compact' }))).toEqual(['View "compact" is not available yet; use "list" or "grid".']);
    expect(errs(blog({ view: 'masonry' }))).toEqual(['Unknown view "masonry". Use list or grid.']);
  });
  it('reports YAML that is not a map, or does not parse', () => {
    expect(errs(parseListingBlock('list', '- a\n- b'))[0]).toMatch(/must be "key: value" lines/);
    expect(errs(parseListingBlock('list', 'from: [unclosed'))[0]).toMatch(/^Could not read the block as YAML/);
  });
  it('undoes the wiki-alias divider protectWikiLinkAliases puts inside fences', () => {
    expect(ok(parseListingBlock('list', 'from: p\nwhere:\n  guests: "[[adaAda]]"')).where).toEqual({ guests: ['[[ada|Ada]]'] });
  });
  it('collects every error', () => {
    expect(errs(blog({ view: 'masonry', limit: -1, nope: 1 }))).toHaveLength(3);
  });
});

describe('limit, pageSize', () => {
  it('lenient on type; inline limit + pageSize is a note', () => {
    expect(ok(blog({ limit: '3' })).limit).toBe(3);
    expect(ok(blog({ pageSize: 'none' })).pageSize).toBeNull();
    const r = blog({ limit: 3, pageSize: 5 });
    expect(r.ok && r.spec).toMatchObject({ limit: 3, pageSize: null });
    expect(notes(r)).toEqual(['"pageSize" is ignored because "limit" is set.']);
  });
  it('page-level: pageSize 20 by default; limit is an error pointing to pageSize', () => {
    expect(ok(page({})).pageSize).toBe(20);
    expect(errs(page({ limit: 10 }))).toEqual(['"limit" shows only the first 10 items and hides the rest; for 10 per page use "pageSize: 10".']);
  });
});

describe('fields', () => {
  it('map: merges over the view defaults, case-insensitive slots', () => {
    expect(ok(blog({ fields: { Eyebrow: 'category', meta: 'status' } })).fields).toEqual({ ...DEFAULT_FIELDS.list, eyebrow: ['category'], meta: ['status'] });
  });
  it('eyebrow and meta take up to two keys; a key in the eyebrow leaves the meta line', () => {
    expect(ok(blog({ fields: { eyebrow: ['date', 'category'], meta: ['category', 'status'] } })).fields).toMatchObject({ eyebrow: ['date', 'category'], meta: ['status'] });
    expect(errs(blog({ fields: { meta: ['a', 'b', 'c'] } }))).toEqual(['"fields.meta" takes at most 2 fields (got 3).']);
  });
  it('list form turns on exactly the named slots', () => {
    expect(ok(blog({ fields: ['title', 'date', 'description'] })).fields).toEqual({ eyebrow: [], title: 'title', summary: 'description', date: 'date', image: null, authors: null, meta: [] });
    expect(ok(blog({ fields: ['title', 'image', 'author', 'status'] })).fields).toEqual({ eyebrow: [], title: 'title', summary: null, date: null, image: 'image', authors: 'authors', meta: ['status'] });
  });
  it('none/false clears a slot; title cannot be cleared', () => {
    expect(ok(blog({ fields: { date: 'none', authors: false } })).fields).toMatchObject({ date: null, authors: null });
    expect(errs(blog({ fields: { title: 'none' } }))).toEqual(['"fields.title" cannot be none.']);
  });
  it('legacy slot names', () => {
    expect(ok(blog({ fields: { headline: 'name', media: 'cover', footnote: 'status' } })).fields).toMatchObject({ title: 'name', image: 'cover', meta: ['status'] });
  });
  it('unknown slots, readingTime and dotted keys are errors', () => {
    expect(errs(blog({ fields: { subtitle: 'dek' } }))).toEqual(['Unknown field slot "subtitle". Slots: eyebrow, title, summary, date, image, authors, meta.']);
    expect(errs(blog({ fields: { meta: ['readingTime'] } }))).toEqual(['"readingTime" is computed on the page and is not available in listings yet.']);
    expect(errs(blog({ fields: { meta: ['links.github'] } }))).toEqual(['Nested keys like "links.github" are not supported yet.']);
    expect(errs(blog({ fields: 'title' }))).toEqual(['"fields" must be "slot: key" lines or a list of field names, e.g. "fields: [title, date, description]".']);
  });
});

describe('media and ratio', () => {
  it('per-view defaults and explicit values', () => {
    expect(ok(blog({}))).toMatchObject({ media: 'thumb', ratio: '3/2' });
    expect(ok(blog({ view: 'grid' }))).toMatchObject({ media: 'cover', ratio: '16/9' });
    expect(ok(blog({ media: 'cover' }))).toMatchObject({ media: 'cover', ratio: '16/9' });
    expect(ok(blog({ media: 'thumb', ratio: '1:1' }))).toMatchObject({ media: 'thumb', ratio: '1/1' });
    expect(ok(blog({ media: false })).media).toBe('none');
    expect(errs(blog({ media: 'huge' }))).toEqual(['"media" must be none, thumb or cover (got "huge").']);
    expect(errs(blog({ ratio: '2/1' }))).toEqual(['"ratio" must be one of 16/9, 3/2, 4/3, 1/1, 3/4 (got "2/1").']);
  });
  it('grid shows thumb as cover, with a note', () => {
    const r = blog({ view: 'grid', media: 'thumb' });
    expect(r.ok && r.spec.media).toBe('cover');
    expect(notes(r)).toEqual(['"media: thumb" is shown as "cover" in the grid view.']);
  });
});

describe('where and sort', () => {
  it('scalars and lists (any-of), stringified; upcoming/past; dotted keys error', () => {
    expect(ok(blog({ where: { year: 2026, tags: ['a', 'b'], date: 'upcoming' } })).where).toEqual({ year: ['2026'], tags: ['a', 'b'], date: ['upcoming'] });
    expect(errs(blog({ where: { tags: [{ a: 1 }] } }))).toEqual(['"where.tags" must be a value or a list of values, e.g. "tags: featured".']);
    expect(errs(blog({ where: 'tags = x' }))).toEqual(['"where" must be "field: value" lines, e.g. "where: { tags: featured }".']);
    expect(errs(blog({ where: { 'meta.type': 'x' } }))).toEqual(['Nested keys like "meta.type" are not supported yet.']);
  });
  it('sort direction defaults per field', () => {
    expect(ok(blog({ sort: 'title' })).sort).toEqual({ field: 'title', direction: 'asc' });
    expect(errs(blog({ sort: 'date sideways' }))).toEqual(['Sort direction must be "asc" or "desc" (got "sideways").']);
  });
});

describe.skip('[B2] compact, people, featured, group', () => {
  it('views', () => {
    expect(ok(blog({ view: 'compact' }))).toMatchObject({ view: 'compact', media: 'none', group: { by: 'none' }, fields: DEFAULT_FIELDS.compact });
    expect(ok(page({ view: 'compact' })).group).toEqual({ by: 'year' });
    expect(ok(blog({ view: 'people' }))).toMatchObject({ sort: { field: 'title', direction: 'asc' }, media: 'cover', ratio: '1/1' });
    expect(errs(blog({ view: 'magazine' }))).toEqual(['Unknown view "magazine". Use "view: grid" with "featured: 1".']);
  });
  it('group values', () => {
    expect(ok(blog({ group: 'Month' })).group).toEqual({ by: 'month' });
    expect(ok(blog({ group: 'folder' })).group).toEqual({ by: 'folder' });
    expect(ok(blog({ group: 'team' })).group).toEqual({ by: 'field', field: 'team' });
    expect(ok(page({ view: 'compact', group: false })).group).toEqual({ by: 'none' });
  });
  it('featured', () => {
    expect(ok(blog({ featured: true })).featured).toBe(1);
    expect(errs(blog({ featured: 3 }))).toEqual(['"featured" must be 0 or 1 (got "3").']);
    const r = blog({ view: 'compact', featured: 1, media: 'cover' });
    expect(r.ok && r.spec).toMatchObject({ featured: 0, media: 'none' });
    expect(notes(r)).toEqual(['"media" is ignored in the compact view.', '"featured" is ignored in the compact view.']);
  });
});

describe('implicitListingFrom', () => {
  const files = ['/blog/README.md', '/blog/a.md', '/podcast.md', '/podcast/ep-1.md', '/about.md'];
  it('folder index → own folder; folder note → sibling folder; else null', () => {
    expect(implicitListingFrom('blog/README.md', files)).toBe('blog');
    expect(implicitListingFrom('README.md', files)).toBe('');
    expect(implicitListingFrom('podcast.md', files)).toBe('podcast');
    expect(implicitListingFrom('about.md', files)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/spec.test.ts`
- [ ] **Step 3: Implement** (`lib/listing/spec.ts`)

```ts
import * as yaml from 'yaml';
import { dirOf, isFolderIndexPath } from '@/lib/changelog';

export const ALL_LISTING_KEYS = ['from', 'view', 'sort', 'limit', 'pageSize', 'where', 'fields', 'media', 'ratio', 'featured', 'group'] as const;
export type ListingKey = (typeof ALL_LISTING_KEYS)[number];
/** PR B: no featured/group. Task G1 (PR B2): ALL_LISTING_KEYS. */
export const LISTING_KEYS: readonly ListingKey[] = ALL_LISTING_KEYS.filter((k) => k !== 'featured' && k !== 'group');
export type ListingView = 'list' | 'grid' | 'compact' | 'people';
const ALL_VIEWS: readonly ListingView[] = ['list', 'grid', 'compact', 'people'];
/** PR B: list and grid. Task G1 (PR B2): all four. */
export const LISTING_VIEWS: readonly ListingView[] = ['list', 'grid'];
export type ListingSort = { field: string; direction: 'asc' | 'desc' };
export type ListingFields = { eyebrow: string[]; title: string; summary: string | null; date: string | null; image: string | null; authors: string | null; meta: string[] };
export type ListingGroup = { by: 'none' | 'year' | 'month' | 'day' | 'folder' } | { by: 'field'; field: string };
export type MediaShape = 'none' | 'thumb' | 'cover';
export const RATIOS = ['16/9', '3/2', '4/3', '1/1', '3/4'] as const;
export type Ratio = (typeof RATIOS)[number];
export type ListingSpec = {
  from: string; fromRelative: boolean; view: ListingView; sort: ListingSort; limit: number | null; pageSize: number | null;
  where: Record<string, string[]>; fields: ListingFields; media: MediaShape; ratio: Ratio; featured: 0 | 1; group: ListingGroup;
};
export type ListingSource = 'list' | 'blog' | 'layout';
export type SpecResult = { ok: true; spec: ListingSpec; notes: string[] } | { ok: false; errors: string[] };

export const INDEX_PAGE_SIZE = 20;
const SLOTS = ['eyebrow', 'title', 'summary', 'date', 'image', 'authors', 'meta'] as const;
type Slot = (typeof SLOTS)[number];
const BASE_FIELDS: ListingFields = { eyebrow: [], title: 'title', summary: 'description', date: 'date', image: 'image', authors: 'authors', meta: [] };
export const DEFAULT_FIELDS: Record<ListingView, ListingFields> = {
  list: BASE_FIELDS,
  grid: BASE_FIELDS,
  people: { eyebrow: [], title: 'title', summary: 'bio', date: null, image: 'avatar', authors: null, meta: ['role'] },
  compact: { eyebrow: [], title: 'title', summary: null, date: 'date', image: null, authors: null, meta: [] },
};
const DEFAULT_MEDIA: Record<ListingView, MediaShape> = { list: 'thumb', grid: 'cover', people: 'cover', compact: 'none' };
const SLOT_ALIASES: Record<string, Slot> = { headline: 'title', media: 'image', footnote: 'meta' };
/** List-form names → slot. Anything else in the list goes to meta. */
const LIST_FORM: Record<string, Slot> = { title: 'title', headline: 'title', summary: 'summary', description: 'summary', date: 'date', image: 'image', media: 'image', authors: 'authors', author: 'authors', eyebrow: 'eyebrow' };
const VIEW_ALIASES: Record<string, ListingView> = { cards: 'grid', card: 'grid', table: 'compact', archive: 'compact', team: 'people' };

const canon = (k: string) => k.toLowerCase().replace(/[-_\s]/g, '');
/** Canonical key for each spelling (case-insensitive); aliases included. */
const KEY_INDEX: Record<string, ListingKey | 'sortDirection'> = {
  ...Object.fromEntries(ALL_LISTING_KEYS.map((k) => [canon(k), k])),
  dir: 'from', folder: 'from', layout: 'view', sortby: 'sort', sortdirection: 'sortDirection',
};
const FROM_ALIASES = new Set(['dir', 'folder']);
const KEY_HINTS: Record<string, string> = {
  perpage: 'Use "pageSize".', paginate: 'Use "pageSize".', pagination: 'Use "pageSize".',
  filter: 'Use "where".', filters: 'Use "where".',
  show: 'Use "fields", e.g. "fields: [title, date, description]".', slots: 'Use "fields", e.g. "fields: [title, date, description]".',
  max: 'Use "limit".', count: 'Use "limit".', order: 'Use "sort".', orderby: 'Use "sort".', type: 'Use "view".',
  hero: 'Use "featured: 1".', groupby: 'Use "group".', thumbnail: 'Use "media: thumb".',
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const kindOf = (v: unknown) => (Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v);
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
  const c = canon(key);
  if (c === 'image') return `Unknown key "${key}". Use "media: ${typeof value === 'string' && ['none', 'thumb', 'cover'].includes(value) ? value : 'cover'}" (to choose which field holds the image, use "fields: { image: <key> }").`;
  if (KEY_HINTS[c]) return `Unknown key "${key}". ${KEY_HINTS[c]}`;
  const close = LISTING_KEYS.find((k) => editDistance(canon(k), c) <= 2);
  return close ? `Unknown key "${key}". Did you mean "${close}"?` : `Unknown key "${key}".`;
}
const isNone = (v: unknown) => v === false || v === null || (typeof v === 'string' && v.trim().toLowerCase() === 'none');
const dotted = (k: string, errors: string[]) => {
  if (!k.includes('.')) return false;
  errors.push(`Nested keys like "${k}" are not supported yet.`);
  return true;
};
function positiveInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+\s*$/.test(v) ? Number(v) : Number.NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}
function normalizeFrom(raw: string, rootDir: string | undefined, errors: string[]): { from: string; relative: boolean } | null {
  let from = raw.trim().replace(/\\/g, '/');
  const relative = from.startsWith('./');
  from = from.replace(/^(\.\/)+/, '').replace(/^\/+|\/+$/g, '');
  if (from.split('/').includes('..')) {
    errors.push('"from" cannot contain "..".');
    return null;
  }
  if (/\.mdx?$/i.test(from)) {
    errors.push(`"from" must be a folder; "${from}" is a page. Listings show one page per item, e.g. one page per person in "people/".`);
    return null;
  }
  const root = (rootDir ?? '').replace(/^\/+|\/+$/g, '');
  if (!relative && root && (from === root || from.startsWith(`${root}/`))) from = from.slice(root.length).replace(/^\/+/, '');
  return { from, relative };
}
const keyList = (v: unknown) => (Array.isArray(v) ? v : String(v).split(',')).map((x) => String(x).trim()).filter(Boolean);
function checkFieldKey(k: string, errors: string[]): boolean {
  if (dotted(k, errors)) return false;
  if (canon(k) === 'readingtime') {
    errors.push('"readingTime" is computed on the page and is not available in listings yet.');
    return false;
  }
  return true;
}

function parseFields(raw: unknown, view: ListingView, errors: string[]): ListingFields {
  const d = DEFAULT_FIELDS[view];
  const fields: ListingFields = { ...d, eyebrow: [...d.eyebrow], meta: [...d.meta] };
  if (raw == null) return fields;
  if (Array.isArray(raw)) {
    const on: ListingFields = { eyebrow: [], title: d.title, summary: null, date: null, image: null, authors: null, meta: [] };
    for (const name of keyList(raw)) {
      if (!checkFieldKey(name, errors)) continue;
      const slot = LIST_FORM[name.toLowerCase()];
      if (slot === 'title') continue;
      if (slot === 'eyebrow') continue;
      if (slot) on[slot] = (d[slot] as string | null) ?? (slot === 'summary' ? 'description' : slot === 'image' ? 'image' : slot === 'authors' ? 'authors' : 'date');
      else on.meta.push(name);
    }
    if (on.meta.length > 2) errors.push(`"fields.meta" takes at most 2 fields (got ${on.meta.length}).`);
    return on;
  }
  if (!isPlainObject(raw)) {
    errors.push('"fields" must be "slot: key" lines or a list of field names, e.g. "fields: [title, date, description]".');
    return fields;
  }
  for (const [rawSlot, value] of Object.entries(raw)) {
    const lower = rawSlot.toLowerCase();
    let slot = (SLOTS as readonly string[]).includes(lower) ? (lower as Slot) : SLOT_ALIASES[lower];
    if (!slot) {
      errors.push(`Unknown field slot "${rawSlot}". Slots: ${SLOTS.join(', ')}.`);
      continue;
    }
    if (lower === 'footnote' && value === 'authors') slot = 'authors';
    if (slot === 'meta' || slot === 'eyebrow') {
      const list = isNone(value) ? [] : keyList(value).filter((k) => checkFieldKey(k, errors));
      if (list.length > 2) errors.push(`"fields.${slot}" takes at most 2 fields (got ${list.length}).`);
      else fields[slot] = list;
    } else if (isNone(value)) {
      if (slot === 'title') errors.push('"fields.title" cannot be none.');
      else fields[slot] = null;
    } else if (checkFieldKey(String(value).trim(), errors)) fields[slot] = String(value).trim();
  }
  // a key shown in the eyebrow is not repeated in the meta line (design 4.4)
  fields.meta = fields.meta.filter((k) => !fields.eyebrow.includes(k));
  return fields;
}

function parseGroup(raw: unknown, view: ListingView, source: ListingSource, errors: string[]): ListingGroup {
  if (raw == null) return view === 'compact' && source === 'layout' ? { by: 'year' } : { by: 'none' };
  if (isNone(raw)) return { by: 'none' };
  const v = String(raw).trim();
  const lower = v.toLowerCase();
  if (lower === 'year' || lower === 'month' || lower === 'day' || lower === 'folder') return { by: lower };
  if (dotted(v, errors)) return { by: 'none' };
  return { by: 'field', field: v };
}

export function parseListingSpec(input: unknown, opts: { source: ListingSource; defaultFrom?: string | null; rootDir?: string }): SpecResult {
  const errors: string[] = [];
  const notes: string[] = [];
  const raw = input == null ? {} : input;
  if (!isPlainObject(raw)) return { ok: false, errors: [`List options must be "key: value" lines (got a ${kindOf(raw)}).`] };

  const values: Partial<Record<ListingKey | 'sortDirection', unknown>> = {};
  let fromKey: string | null = null;
  for (const [key, value] of Object.entries(raw)) {
    const k = KEY_INDEX[canon(key)];
    if (!k) {
      errors.push(unknownKeyMessage(key, value));
      continue;
    }
    if (k !== 'sortDirection' && !LISTING_KEYS.includes(k)) {
      errors.push(`"${k}" is not available yet.`);
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
    if (opts.defaultFrom == null) errors.push('Add "list: { from: <folder> }" to the frontmatter: this page is not a folder index and has no folder with the same name.');
    else from = opts.defaultFrom;
  } else errors.push('"from" is required: the folder to list, e.g. "from: blog".');

  let view: ListingView = 'list';
  if (values.view != null) {
    const v = String(values.view).trim().toLowerCase();
    const resolved = VIEW_ALIASES[v] ?? v;
    if ((LISTING_VIEWS as readonly string[]).includes(resolved)) view = resolved as ListingView;
    else if ((ALL_VIEWS as readonly string[]).includes(resolved)) errors.push(`View "${resolved}" is not available yet; use "list" or "grid".`);
    else if (v === 'magazine' && LISTING_KEYS.includes('featured')) errors.push(`Unknown view "${String(values.view)}". Use "view: grid" with "featured: 1".`);
    else errors.push(`Unknown view "${String(values.view)}". Use ${LISTING_VIEWS.join(', ').replace(/, ([^,]*)$/, ' or $1')}.`);
  }

  let sort: ListingSort = view === 'people' ? { field: 'title', direction: 'asc' } : { field: 'date', direction: 'desc' };
  if (values.sort != null) {
    const str = String(values.sort).trim();
    const [first = '', dir, ...rest] = str.split(/\s+/);
    const field = first.replace(/^-/, '');
    const direction = (dir ?? (typeof values.sortDirection === 'string' ? values.sortDirection : undefined))?.toLowerCase();
    if (!field || rest.length) errors.push(`"sort" must look like "date desc" (got "${str}").`);
    else if (!dotted(field, errors)) {
      if (direction && direction !== 'asc' && direction !== 'desc') errors.push(`Sort direction must be "asc" or "desc" (got "${dir ?? values.sortDirection}").`);
      else sort = { field, direction: first.startsWith('-') ? 'desc' : ((direction as 'asc' | 'desc') ?? (field === 'date' ? 'desc' : 'asc')) };
    }
  }

  let limit: number | null = null;
  if (values.limit != null) {
    limit = positiveInt(values.limit);
    if (limit === null) errors.push(`"limit" must be a whole number above 0 (got "${String(values.limit)}").`);
    else if (opts.source === 'layout') errors.push(`"limit" shows only the first ${limit} items and hides the rest; for ${limit} per page use "pageSize: ${limit}".`);
  }
  let pageSize: number | null = opts.source === 'layout' ? INDEX_PAGE_SIZE : null;
  const explicitNone = values.pageSize === false || (typeof values.pageSize === 'string' && values.pageSize.trim().toLowerCase() === 'none');
  if (values.pageSize != null && !explicitNone) {
    pageSize = positiveInt(values.pageSize);
    if (pageSize === null) errors.push(`"pageSize" must be a whole number above 0 or "none" (got "${String(values.pageSize)}").`);
    else if (limit !== null) notes.push('"pageSize" is ignored because "limit" is set.');
  }
  if (explicitNone || limit !== null) pageSize = null;

  const where: Record<string, string[]> = {};
  if (values.where != null) {
    if (!isPlainObject(values.where)) errors.push('"where" must be "field: value" lines, e.g. "where: { tags: featured }".');
    else
      for (const [field, value] of Object.entries(values.where)) {
        if (dotted(field, errors)) continue;
        const list = Array.isArray(value) ? value : [value];
        if (list.length && list.every((x) => ['string', 'number', 'boolean'].includes(typeof x))) where[field] = list.map(String);
        else errors.push(`"where.${field}" must be a value or a list of values, e.g. "${field}: featured".`);
      }
  }

  const fields = parseFields(values.fields, view, errors);

  let media = DEFAULT_MEDIA[view];
  if (values.media != null) {
    const m = isNone(values.media) ? 'none' : String(values.media).trim().toLowerCase();
    if (m === 'none' || m === 'thumb' || m === 'cover') media = m;
    else errors.push(`"media" must be none, thumb or cover (got "${String(values.media)}").`);
  }
  if (view === 'compact' && media !== 'none') {
    if (values.media != null) notes.push('"media" is ignored in the compact view.');
    media = 'none';
  }
  if (view === 'grid' && media === 'thumb') {
    notes.push('"media: thumb" is shown as "cover" in the grid view.');
    media = 'cover';
  }
  let ratio: Ratio = view === 'people' ? '1/1' : media === 'cover' ? '16/9' : '3/2';
  if (values.ratio != null) {
    const r = String(values.ratio).replace(/\s+/g, '').replace(':', '/');
    if ((RATIOS as readonly string[]).includes(r)) ratio = r as Ratio;
    else errors.push(`"ratio" must be one of ${RATIOS.join(', ')} (got "${String(values.ratio)}").`);
  }

  const group = parseGroup(values.group, view, opts.source, errors);

  let featured: 0 | 1 = 0;
  if (values.featured != null && !isNone(values.featured) && values.featured !== 0 && values.featured !== '0') {
    if (values.featured === true || values.featured === 1 || values.featured === '1') {
      if (view === 'list' || view === 'grid') featured = 1;
      else notes.push(`"featured" is ignored in the ${view} view.`);
    } else errors.push(`"featured" must be 0 or 1 (got "${String(values.featured)}").`);
  }

  if (errors.length || from === null) return { ok: false, errors };
  return { ok: true, spec: { from, fromRelative, view, sort, limit, pageSize, where, fields, media, ratio, featured, group }, notes };
}

export function parseListingBlock(lang: 'list' | 'blog', code: string, opts: { rootDir?: string } = {}): SpecResult {
  // processMarkdown's protectWikiLinkAliases runs over the whole document, fences included,
  // replacing `|` in [[a|b]] with U+E000 (lib/markdown.ts WIKI_ALIAS_DIVIDER).
  const source = code.replace(//g, '|');
  let parsed: unknown;
  try {
    parsed = source.trim() ? yaml.parse(source) : {};
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : 'invalid YAML';
    return { ok: false, errors: [`Could not read the block as YAML: ${message}`] };
  }
  return parseListingSpec(parsed, { source: lang, rootDir: opts.rootDir });
}

/** `from` for page-level listings: the index's own folder, or the folder note's sibling folder. */
export function implicitListingFrom(blobPath: string, files: string[]): string | null {
  const p = blobPath.replace(/^\/+/, '');
  if (isFolderIndexPath(p)) return dirOf(p);
  const sibling = p.replace(/\.mdx?$/i, '');
  return files.some((f) => f.replace(/^\/+/, '').startsWith(`${sibling}/`)) ? sibling : null;
}
```

Notes on the code: the list form of `fields` keeps `title` on always; `eyebrow` in the list form is ignored (it needs a key, so use the map). In PR B the `[B2]` group/featured branches are unreachable because their keys are rejected first; they are covered once G1 widens the constants.

- [ ] **Step 4: Run, expect PASS** (the `[B2]` block is skipped). If a message differs, fix the implementation, not the test: these strings are the AI-facing contract and are copied into the docs (Task B21).
- [ ] **Step 5: Commit** `feat(listing): parse and validate list block options`

### Task B3: draft rule, RSS and sitemap

**Files:**
- Create: `lib/listing/rules.ts`, `lib/listing/rules.test.ts`
- Modify: `lib/rss.ts:25-30` (+ `lib/rss.test.ts`), `app/api/sitemap/[user]/[project]/route.ts` (+ `route.test.ts` beside it)

**Interfaces:** Produces `isDraft(m: Record<string, unknown> | null | undefined): boolean`, `isUnpublished(m): boolean`. (The `noindex` for draft pages is wired in Task B15.)

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
  });
});
```

Add to `lib/rss.test.ts` (`describe('filterRssBlobs')`):

```ts
  it('excludes drafts', () => {
    const blobs = [makeBlob({ metadata: { title: 'A', date: '2025-06-01', draft: true } }), makeBlob({ metadata: { title: 'B', date: '2025-06-02' } })];
    expect(filterRssBlobs(blobs).map((b) => (b.metadata as { title: string }).title)).toEqual(['B']);
  });
```

Add to the sitemap route test (read its existing helpers first and follow their style): a site with blobs `a.md` (`metadata: { title: 'A' }`) and `d.md` (`metadata: { title: 'D', draft: true }`); the returned XML contains `/a` and not `/d`.

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/rules.test.ts lib/rss.test.ts "app/api/sitemap"`
- [ ] **Step 3: Implement**

```ts
// lib/listing/rules.ts
type Meta = Record<string, unknown> | null | undefined;

/** `draft: true`: reachable by URL, but never listed, in the feed or the sitemap, and noindex. */
export function isDraft(m: Meta): boolean {
  const d = m?.draft;
  return d === true || (typeof d === 'string' && d.trim().toLowerCase() === 'true');
}

/** Same rule as the page route's 404 (`metadata.publish === false`). */
export function isUnpublished(m: Meta): boolean {
  return m?.publish === false;
}
```

`lib/rss.ts`: `return metadata?.publish !== false && !isDraft(metadata) && metadata?.date;` (import from `@/lib/listing/rules`).

Sitemap route: add `metadata: true` to the blob `select` and filter `blobs.filter((b) => !isDraft(b.metadata as Record<string, unknown> | null))` before building entries.

- [ ] **Step 4: Run, expect PASS** (whole files).
- [ ] **Step 5: Commit** `feat(listing): draft rule; RSS and sitemap skip draft: true`

### Task B4: dates and items (pure: `dates.ts`, `items.ts`)

**Files:**
- Create: `lib/listing/dates.ts`, `lib/listing/dates.test.ts`, `lib/listing/items.ts`, `lib/listing/items.test.ts`

Pure modules with no Prisma or `next/cache` import, so Storybook (Task B24) can use them.

**Interfaces:**
- Consumes: `ListingSpec`, `ListingFields`, `ListingGroup` (B2), `isDraft`/`isUnpublished` (B3), `dirOf`, `isFolderIndexPath`, `entryTitleFromPath`, `resolveEntryTitle`, `resolveEntryDate` (`@/lib/changelog`), `normalizeAuthors`, `extractWikiLinkTarget`, `safeDate` (`@/lib/utils`), `matchLinkTarget`, `normalizeFrontmatterTags`, `tagMatches` (`@flowershow/core`), `resolveContentLink` (`@/lib/resolve-link`).
- Produces (`dates.ts`):

```ts
export const DEFAULT_LOCALE = 'en-US';
export function resolveLocale(...candidates: unknown[]): string;          // first valid BCP 47 tag, else en-US
export function formatListingDate(isoDate: string, locale: string): string; // "Sep 18, 2026" / "18. Sept. 2026"
export function groupLabel(key: string, group: ListingGroup, locale: string): string; // '' → "Undated"/"Other"
```

- Produces (`items.ts`):

```ts
export type ListingRow = { id: string; path: string; appPath: string | null; permalink: string | null; metadata: Record<string, unknown> | null; tags?: { tag: string }[] };
export type ListingFieldPart = { text: string; href?: string };
export type ListingField = { key: string; label: string; parts: ListingFieldPart[] };
export type ListingItem = {
  path: string; url: string; title: string;
  date: string | null;          // ISO date of the date slot
  dateInEyebrow: boolean;       // the date is shown in the eyebrow, not the meta line
  summary: string | null; image: string | null; authorHandles: string[];
  eyebrow: ListingFieldPart[]; meta: ListingField[];
  group: string | null;         // heading label, set by the plugin from the index
};
export type ItemContext = { siteHostname: string; files: string[]; permalinks?: Record<string, string>; fields: ListingFields; locale: string };
export const DATE_FALLBACKS: readonly string[];   // date, pubDate, published, publishDate, created
export function slotDate(row: ListingRow, dateKey: string | null): string | null;
export function isListedRow(row: ListingRow, folder: string): boolean;
export function matchesWhere(row: ListingRow, where: Record<string, string[]>, dateKey: string | null, today: string): boolean;
export function itemTitle(row: ListingRow): string;
export function groupKey(row: ListingRow, spec: Pick<ListingSpec, 'from' | 'group' | 'fields'>): string | null;
export function selectListingRows(rows: ListingRow[], spec: Pick<ListingSpec, 'from' | 'where' | 'sort' | 'fields' | 'group'>, today: string): ListingRow[];
export function resolveFolderCase(from: string, files: string[]): string;
export function folderHasPages(folder: string, files: string[]): boolean;
export function nearestFolders(from: string, files: string[], n?: number): string[];
export function toListingItem(row: ListingRow, ctx: ItemContext): ListingItem;
```

- [ ] **Step 1: Failing tests for `dates.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatListingDate, groupLabel, resolveLocale } from './dates';

describe('dates', () => {
  it('resolveLocale takes the first valid tag', () => {
    expect(resolveLocale(undefined, 'de-DE', 'fr')).toBe('de-DE');
    expect(resolveLocale('not a locale!!', null)).toBe('en-US');
    expect(resolveLocale()).toBe('en-US');
  });
  it('formats in the locale, in UTC', () => {
    expect(formatListingDate('2026-09-18', 'en-US')).toBe('Sep 18, 2026');
    expect(formatListingDate('2026-09-18', 'de-DE')).toBe('18. Sept. 2026');
  });
  it('group labels', () => {
    expect(groupLabel('2026', { by: 'year' }, 'en-US')).toBe('2026');
    expect(groupLabel('2026-09', { by: 'month' }, 'en-US')).toBe('September 2026');
    expect(groupLabel('2026-09', { by: 'month' }, 'de-DE')).toBe('September 2026');
    expect(groupLabel('2026-09-18', { by: 'day' }, 'en-US')).toBe('Sep 18, 2026');
    expect(groupLabel('', { by: 'year' }, 'en-US')).toBe('Undated');
    expect(groupLabel('tutorials', { by: 'folder' }, 'en-US')).toBe('Tutorials');
    expect(groupLabel('Shipped', { by: 'field', field: 'status' }, 'en-US')).toBe('Shipped');
    expect(groupLabel('', { by: 'field', field: 'status' }, 'en-US')).toBe('Other');
  });
});
```

If Node's ICU renders `de-DE` slightly differently (e.g. `18. Sep. 2026`), pin whatever `new Intl.DateTimeFormat('de-DE', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })` returns in this Node version: the test is about the locale being honoured, not about ICU's abbreviations.

- [ ] **Step 2: Failing tests for `items.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { folderHasPages, groupKey, itemTitle, nearestFolders, resolveFolderCase, selectListingRows, slotDate, toListingItem, type ListingRow } from './items';
import { DEFAULT_FIELDS, type ListingSpec } from './spec';

const row = (path: string, metadata: Record<string, unknown> | null = {}, extra: Partial<ListingRow> = {}): ListingRow => ({
  id: path, path, appPath: '/' + path.replace(/\.mdx?$/, '').replace(/\/(README|index)$/i, ''), permalink: null, metadata, ...extra,
});
const TODAY = '2026-10-10';
const spec = (o: Partial<ListingSpec> = {}) => ({ from: 'b', where: {}, sort: { field: 'date', direction: 'desc' as const }, fields: DEFAULT_FIELDS.list, group: { by: 'none' as const }, ...o });
const paths = (rows: ListingRow[]) => rows.map((r) => r.path);

describe('which pages are items (4.3)', () => {
  const rows = [
    row('blog/README.md'), row('blog/readme.MD'), row('blog/a.md', { date: '2026-01-02' }),
    row('blog/sub/index.md', { date: '2026-01-03' }), row('blog/draft.md', { draft: true, date: '2026-02-01' }),
    row('blog/hidden.md', { publish: false, date: '2026-02-02' }), row('blog/pic.png', null, { appPath: null }),
    row('blog/b.mdx', { date: '2026-01-01' }), row('blogger/x.md', { date: '2026-03-01' }),
  ];
  it('keeps nested indexes, drops own index (any case), drafts, unpublished and non-pages', () => {
    expect(paths(selectListingRows(rows, spec({ from: 'blog' }), TODAY))).toEqual(['blog/sub/index.md', 'blog/a.md', 'blog/b.mdx']);
  });
});

describe('the date slot (4.4; tech M5)', () => {
  it('default chain: date → pubDate → published → publishDate → created → file name', () => {
    expect(slotDate(row('b/x.md', { pubDate: '2025-01-02' }), 'date')).toBe('2025-01-02');
    expect(slotDate(row('b/x.md', { created: '2025-03-04', published: '2025-02-03' }), 'date')).toBe('2025-02-03');
    expect(slotDate(row('b/2024-05-06-x.md', {}), 'date')).toBe('2024-05-06');
    expect(slotDate(row('b/x.md', { date: 'TBD' }), 'date')).toBeNull();
  });
  it('an explicit key reads only that key; sort: date follows the slot', () => {
    expect(slotDate(row('b/2024-05-06-x.md', { published: '2025-02-03' }), 'published')).toBe('2025-02-03');
    expect(slotDate(row('b/2024-05-06-x.md', {}), 'published')).toBeNull();
    const rows = [row('b/a.md', { pubDate: '2026-01-01' }), row('b/b.md', { pubDate: '2026-03-01' })];
    expect(paths(selectListingRows(rows, spec({ fields: { ...DEFAULT_FIELDS.list, date: 'pubDate' } }), TODAY))).toEqual(['b/b.md', 'b/a.md']);
  });
});

describe('sort (4.5)', () => {
  it('date desc: dated newest first, ties by path desc, undated after by title', () => {
    const rows = [row('b/x.md', { title: 'Zed' }), row('b/2026-05-01-y.md'), row('b/a.md', { date: '2026-05-01' }), row('b/c.md', { title: 'Alpha' }), row('b/d.md', { date: '2026-06-01' })];
    expect(paths(selectListingRows(rows, spec(), TODAY))).toEqual(['b/d.md', 'b/a.md', 'b/2026-05-01-y.md', 'b/c.md', 'b/x.md']);
  });
  it('custom field: numbers numerically, missing last in both directions', () => {
    const rows = [row('p/a.md', { weight: 10 }), row('p/b.md', { weight: '9' }), row('p/c.md', {}), row('p/d.md', { weight: 100 })];
    expect(paths(selectListingRows(rows, spec({ from: 'p', sort: { field: 'weight', direction: 'asc' } }), TODAY))).toEqual(['p/b.md', 'p/a.md', 'p/d.md', 'p/c.md']);
    expect(paths(selectListingRows(rows, spec({ from: 'p', sort: { field: 'weight', direction: 'desc' } }), TODAY))).toEqual(['p/d.md', 'p/a.md', 'p/b.md', 'p/c.md']);
  });
  it('title sort is locale-aware and numeric; never throws on odd dates', () => {
    const rows = [row('p/1.md', { title: 'item 10' }), row('p/2.md', { title: 'Item 9' }), row('p/3.md', { title: 'élan' })];
    expect(selectListingRows(rows, spec({ from: 'p', sort: { field: 'title', direction: 'asc' } }), TODAY).map(itemTitle)).toEqual(['élan', 'Item 9', 'item 10']);
    expect(() => selectListingRows([row('p/a.md', { date: 'TBD' }), row('p/b.md', { date: { x: 1 } })], spec({ from: 'p' }), TODAY)).not.toThrow();
  });
  it('[B2 data, tested now] group-first ordering: each group appears once (UX M-12, tech M4)', () => {
    const rows = [row('t/ann.md', { title: 'Ann', team: 'Eng' }), row('t/bob.md', { title: 'Bob', team: 'Design' }), row('t/cat.md', { title: 'Cat', team: 'Eng' }), row('t/dan.md', { title: 'Dan' })];
    const s = spec({ from: 't', sort: { field: 'title', direction: 'asc' }, group: { by: 'field', field: 'team' } });
    expect(paths(selectListingRows(rows, s, TODAY))).toEqual(['t/bob.md', 't/ann.md', 't/cat.md', 't/dan.md']); // Design, Eng, Eng, Other
    const years = [row('y/a.md', { title: 'A', date: '2025-01-01' }), row('y/b.md', { title: 'B', date: '2026-01-01' }), row('y/c.md', { title: 'C', date: '2025-06-01' })];
    expect(paths(selectListingRows(years, spec({ from: 'y', sort: { field: 'title', direction: 'asc' }, group: { by: 'year' } }), TODAY))).toEqual(['y/b.md', 'y/a.md', 'y/c.md']); // 2026, then 2025 (A, C)
  });
});

describe('groupKey', () => {
  it('time units from the date slot, folder, field', () => {
    const r = row('blog/tutorials/x.md', { date: '2026-09-18', status: ['Shipped', 'x'] });
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'year' } }))).toBe('2026');
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'month' } }))).toBe('2026-09');
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'day' } }))).toBe('2026-09-18');
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'folder' } }))).toBe('tutorials');
    expect(groupKey(row('blog/top.md', {}), spec({ from: 'blog', group: { by: 'folder' } }))).toBe('');
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'field', field: 'status' } }))).toBe('Shipped');
    expect(groupKey(r, spec({ from: 'blog', group: { by: 'none' } }))).toBeNull();
  });
});

describe('where (4.6)', () => {
  const rows = [
    row('p/a.md', { type: 'episode', year: 2026, guests: ['Ada', '[[Grace]]'], date: '2026-12-01' }),
    row('p/b.md', { type: 'trailer', year: '2025', date: '2025-01-01' }),
    row('p/c.md', { type: 'episode' }, { tags: [{ tag: 'featured/2026' }] }),
  ];
  const sel = (where: Record<string, string[]>) => paths(selectListingRows(rows, spec({ from: 'p', where, sort: { field: 'path', direction: 'asc' } }), TODAY));
  it('scalar equality loose on type; lists contain; list values are any-of', () => {
    expect(sel({ type: ['episode'] })).toEqual(['p/a.md', 'p/c.md']);
    expect(sel({ year: ['2026'] })).toEqual(['p/a.md']);
    expect(sel({ guests: ['Grace'] })).toEqual(['p/a.md']);
    expect(sel({ type: ['trailer', 'bonus'] })).toEqual(['p/b.md']);
  });
  it('tags use the Tag rows and the nested-tag rule; upcoming/past use the date slot', () => {
    expect(sel({ tags: ['featured'] })).toEqual(['p/c.md']);
    expect(sel({ date: ['upcoming'] })).toEqual(['p/a.md']);
    expect(sel({ date: ['past'] })).toEqual(['p/b.md']);
  });
});

describe('folders', () => {
  const files = ['/Blog/a.md', '/Projects/x/index.md', '/notes/n.md', '/assets/pic.png', '/blog-old/p.md'];
  it('resolveFolderCase keeps an exact folder, else a case-insensitive match', () => {
    expect(resolveFolderCase('blog', files)).toBe('Blog');
    expect(resolveFolderCase('Projects/x', files)).toBe('Projects/x');
    expect(resolveFolderCase('missing', files)).toBe('missing');
  });
  it('folderHasPages and nearestFolders (UX M-10)', () => {
    expect(folderHasPages('notes', files)).toBe(true);
    expect(folderHasPages('assets', files)).toBe(false);
    expect(folderHasPages('', files)).toBe(true);
    expect(nearestFolders('posts', files)).toEqual(['notes', 'Blog', 'Projects']);
  });
});

describe('itemTitle', () => {
  it('frontmatter, numbers, file names, nested folders', () => {
    expect(itemTitle(row('b/x.md', { title: 1984 }))).toBe('1984');
    expect(itemTitle(row('b/2026-09-01-filename-only-post.md', { title: '2026-09-01-filename-only-post', computed: ['title'] }))).toBe('Filename only post');
    expect(itemTitle(row('projects/alpha/index.md', { title: 'index', computed: ['title'] }))).toBe('Alpha');
    expect(itemTitle(row('projects/beta/README.md', { title: 'README' }))).toBe('Beta');
  });
});

describe('toListingItem (4.4, Review Focus 2 and 3)', () => {
  const ctx = {
    siteHostname: 'demo.flowershow.site', locale: 'en-US',
    files: ['/blog/assets/cover.jpg', '/blog/2026/pic ü.png', '/people/ada.md', '/assets/sapiens.jpg', '/notes/page.md'],
    fields: { ...DEFAULT_FIELDS.list, eyebrow: ['category'], meta: ['status', 'guests'] },
  };
  it('maps the default slots', () => {
    const item = toListingItem(row('blog/a.md', { title: 'A', date: '2026-09-18', description: 'D', image: 'assets/cover.jpg', authors: 'ada', category: 'Themes' }, { permalink: '/a-post' }), ctx);
    expect(item).toMatchObject({ url: '/a-post', title: 'A', date: '2026-09-18', dateInEyebrow: false, summary: 'D', authorHandles: ['ada'], eyebrow: [{ text: 'Themes' }], group: null });
    expect(item.image).toBe('http://demo.flowershow.site/blog/assets/cover.jpg');
  });
  it('image fallbacks: image → cover → heroImage → thumbnail → avatar; unquoted wiki links', () => {
    expect(toListingItem(row('x/a.md', { heroImage: 'https://cdn.x.org/h.png' }), ctx).image).toBe('https://cdn.x.org/h.png');
    expect(toListingItem(row('x/a.md', { cover: [['sapiens.jpg']] }), ctx).image).toBe('http://demo.flowershow.site/assets/sapiens.jpg');
    expect(toListingItem(row('people/ada.md', { avatar: 'https://x.org/ada.png' }), ctx).image).toBe('https://x.org/ada.png');
  });
  it('only real images become src (tech minor 9)', () => {
    expect(toListingItem(row('x/a.md', { image: '[[page]]' }), ctx).image).toBeNull();
    expect(toListingItem(row('x/a.md', { image: '#hero' }), ctx).image).toBeNull();
    expect(toListingItem(row('x/a.md', { image: 'mailto:a@b.c' }), ctx).image).toBeNull();
  });
  it('authors: authors → author; wiki-link handles; display names stay text', () => {
    expect(toListingItem(row('x/a.md', { author: 'Jane Smith' }), ctx).authorHandles).toEqual(['Jane Smith']);
    expect(toListingItem(row('x/a.md', { authors: ['[[olayway]]'] }), ctx).authorHandles).toEqual(['olayway']);
    expect(toListingItem(row('x/a.md', { authors: [['ada']] }), ctx).authorHandles).toEqual(['ada']);
  });
  it('eyebrow: date moves the date up and out of the meta line (UX M-8)', () => {
    const c = { ...ctx, fields: { ...ctx.fields, eyebrow: ['date', 'category'], meta: [] } };
    const item = toListingItem(row('x/a.md', { date: '2026-09-18', category: 'Themes' }), c);
    expect(item).toMatchObject({ dateInEyebrow: true, eyebrow: [{ text: 'Sep 18, 2026' }, { text: 'Themes' }] });
  });
  it('people defaults: bio → description, avatar → image → photo, role in meta', () => {
    const c = { ...ctx, fields: DEFAULT_FIELDS.people };
    const item = toListingItem(row('people/ada.md', { title: 'Ada', description: 'Mathematician.', photo: 'https://x.org/p.png', role: 'Founder' }), c);
    expect(item).toMatchObject({ summary: 'Mathematician.', image: 'https://x.org/p.png', date: null, meta: [{ key: 'role', label: 'Role', parts: [{ text: 'Founder' }] }] });
  });
  it('encodes spaces and non-ASCII; URL is the stored appPath with a single leading slash', () => {
    expect(toListingItem(row('blog/2026/nested post ü.md', { image: 'pic ü.png' }), ctx).image).toBe(`http://demo.flowershow.site/blog/2026/${encodeURIComponent('pic ü.png')}`);
    expect(toListingItem(row('blog/2026/nested post ü.md', {}, { appPath: '/blog/2026/nested+post+%C3%BC' }), ctx).url).toBe('/blog/2026/nested+post+%C3%BC');
    expect(toListingItem(row('x/a.md', {}, { permalink: 'javascript:alert(1)' }), ctx).url).toBe('/javascript:alert(1)');
    expect(toListingItem(row('x/a.md', {}, { permalink: '//evil.com/x' }), ctx).url).toBe('/evil.com/x');
  });
  it('never throws on malformed frontmatter', () => {
    const item = toListingItem(row('x/a.md', { title: 1984, date: 'TBD', authors: { name: 'x' }, image: ['a', 'b'], description: 42, category: { a: 1 }, status: { nested: true } }), ctx);
    expect(item).toMatchObject({ title: '1984', date: null, authorHandles: [], image: null, summary: '42', eyebrow: [] });
    expect(item.meta).toEqual([]);
  });
  it('meta values: wiki links resolve, booleans and numbers stringify', () => {
    const item = toListingItem(row('x/a.md', { status: true, guests: ['[[ada|Ada Lovelace]]', 'Grace Hopper'] }), ctx);
    expect(item.meta).toEqual([
      { key: 'status', label: 'Status', parts: [{ text: 'Yes' }] },
      { key: 'guests', label: 'Guests', parts: [{ text: 'Ada Lovelace', href: '/people/ada' }, { text: 'Grace Hopper' }] },
    ]);
  });
});
```

Notes: `resolveContentLink` uses `http` unless `NEXT_PUBLIC_VERCEL_ENV` is `production`/`preview`; the unit env has neither. `nearestFolders` sorts by edit distance to `from` and then by name, over every folder that directly contains a page; pin the actual order the implementation produces for the fixture if ties resolve differently, but keep "folders with pages only".

- [ ] **Step 3: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/dates.test.ts lib/listing/items.test.ts`
- [ ] **Step 4: Implement `dates.ts`**

```ts
import { entryTitleFromPath } from '@/lib/changelog';
import type { ListingGroup } from './spec';

export const DEFAULT_LOCALE = 'en-US';

export function resolveLocale(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c !== 'string' || !c.trim()) continue;
    try {
      if (Intl.DateTimeFormat.supportedLocalesOf([c.trim()]).length) return c.trim();
    } catch {
      // invalid tag: try the next one
    }
  }
  return DEFAULT_LOCALE;
}

const fmt = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, opts: Intl.DateTimeFormatOptions, key: string) {
  const k = `${locale}|${key}`;
  if (!fmt.has(k)) fmt.set(k, new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }));
  return fmt.get(k)!;
}

export function formatListingDate(isoDate: string, locale: string): string {
  return formatter(locale, { year: 'numeric', month: 'short', day: 'numeric' }, 'day').format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

export function groupLabel(key: string, group: ListingGroup, locale: string): string {
  if (group.by === 'year' || group.by === 'month' || group.by === 'day') {
    if (!key) return 'Undated';
    if (group.by === 'year') return key;
    if (group.by === 'month') return formatter(locale, { year: 'numeric', month: 'long' }, 'month').format(new Date(`${key}-01T00:00:00Z`));
    return formatListingDate(key, locale);
  }
  if (!key) return 'Other';
  return group.by === 'folder' ? entryTitleFromPath(key) : key;
}
```

- [ ] **Step 5: Implement `items.ts`**

```ts
import { matchLinkTarget, normalizeFrontmatterTags, tagMatches } from '@flowershow/core';
import { dirOf, entryTitleFromPath, isFolderIndexPath, resolveEntryDate, resolveEntryTitle } from '@/lib/changelog';
import { resolveContentLink } from '@/lib/resolve-link';
import { ensureLeadingSlash, extractWikiLinkTarget, normalizeAuthors, safeDate } from '@/lib/utils';
import { formatListingDate } from './dates';
import { isDraft, isUnpublished } from './rules';
import type { ListingFields, ListingSpec } from './spec';

export type ListingRow = { id: string; path: string; appPath: string | null; permalink: string | null; metadata: Record<string, unknown> | null; tags?: { tag: string }[] };
export type ListingFieldPart = { text: string; href?: string };
export type ListingField = { key: string; label: string; parts: ListingFieldPart[] };
export type ListingItem = { path: string; url: string; title: string; date: string | null; dateInEyebrow: boolean; summary: string | null; image: string | null; authorHandles: string[]; eyebrow: ListingFieldPart[]; meta: ListingField[]; group: string | null };
export type ItemContext = { siteHostname: string; files: string[]; permalinks?: Record<string, string>; fields: ListingFields; locale: string };

export const DATE_FALLBACKS = ['date', 'pubDate', 'published', 'publishDate', 'created'] as const;
const IMAGE_FALLBACKS: Record<string, string[]> = { image: ['image', 'cover', 'heroImage', 'thumbnail', 'avatar'], avatar: ['avatar', 'image', 'photo'] };
const SUMMARY_FALLBACKS: Record<string, string[]> = { bio: ['bio', 'description'] };
const AUTHOR_FALLBACKS: Record<string, string[]> = { authors: ['authors', 'author'] };
const MARKDOWN_RE = /\.mdx?$/i;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** YAML reads an unquoted Obsidian `[[x]]` as [["x"]]; turn it back into the wiki link. */
function unwrapNested(v: unknown): unknown {
  if (Array.isArray(v) && v.length === 1 && Array.isArray(v[0]) && v[0].length === 1 && typeof v[0][0] === 'string') return `[[${v[0][0]}]]`;
  if (Array.isArray(v)) return v.map((x) => (Array.isArray(x) && x.length === 1 && typeof x[0] === 'string' ? `[[${x[0]}]]` : x));
  return v;
}
const stripWiki = (s: string) => extractWikiLinkTarget(s.trim()) ?? s.trim();
const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1).replace(MARKDOWN_RE, '');

export function isListedRow(row: ListingRow, folder: string): boolean {
  if (!row.appPath || !MARKDOWN_RE.test(row.path)) return false;
  if (folder && !row.path.startsWith(`${folder}/`)) return false;
  if (dirOf(row.path) === folder && isFolderIndexPath(row.path)) return false;
  return !isUnpublished(row.metadata) && !isDraft(row.metadata);
}

export function slotDate(row: ListingRow, dateKey: string | null): string | null {
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

export function matchesWhere(row: ListingRow, where: Record<string, string[]>, dateKey: string | null, today: string): boolean {
  return Object.entries(where).every(([field, expected]) => {
    if (field === 'tags') {
      const tags = row.tags ? row.tags.map((t) => t.tag) : normalizeFrontmatterTags(row.metadata?.tags);
      return expected.some((e) => tagMatches(tags, e));
    }
    if (field === 'date' && expected.length === 1 && (expected[0] === 'upcoming' || expected[0] === 'past')) {
      const d = slotDate(row, dateKey);
      return d !== null && (expected[0] === 'upcoming' ? d >= today : d < today);
    }
    return fieldMatches(row.metadata?.[field], expected);
  });
}

export function itemTitle(row: ListingRow): string {
  const raw = row.metadata?.title;
  const title = raw == null || typeof raw === 'object' ? '' : String(raw).trim();
  if (isFolderIndexPath(row.path)) {
    if (!title || title.toLowerCase() === basename(row.path).toLowerCase()) return entryTitleFromPath(dirOf(row.path) || row.path);
    return title;
  }
  return resolveEntryTitle(title, row.path);
}

export function groupKey(row: ListingRow, spec: Pick<ListingSpec, 'from' | 'group' | 'fields'>): string | null {
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
    return typeof first === 'boolean' ? (first ? 'Yes' : 'No') : stripWiki(String(first));
  }
  const d = slotDate(row, spec.fields.date);
  if (!d) return '';
  return g.by === 'year' ? d.slice(0, 4) : g.by === 'month' ? d.slice(0, 7) : d;
}

type SortValue = { kind: 0; n: number } | { kind: 1; t: number } | { kind: 2; s: string } | null;
function scalarSortValue(v: unknown): SortValue {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? { kind: 0, n: v } : null;
  if (typeof v === 'boolean') return { kind: 0, n: v ? 1 : 0 };
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { kind: 0, n: Number(s) };
  const d = /^\d{4}-\d{2}-\d{2}/.test(s) ? safeDate(s) : null;
  return d ? { kind: 1, t: d.getTime() } : { kind: 2, s };
}
function sortValue(row: ListingRow, field: string, fields: ListingFields): SortValue {
  if (field === 'title') return { kind: 2, s: itemTitle(row) };
  if (field === 'path') return { kind: 2, s: row.path };
  if (field === 'date') {
    const d = slotDate(row, fields.date);
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

function compareGroupKeys(a: string, b: string, spec: Pick<ListingSpec, 'group' | 'sort'>): number {
  if (a === b) return 0;
  if (a === '') return 1; // Undated / Other last
  if (b === '') return -1;
  const timeGroup = spec.group.by === 'year' || spec.group.by === 'month' || spec.group.by === 'day';
  if (timeGroup) {
    const dir = spec.sort.field === 'date' ? spec.sort.direction : 'desc';
    return (a < b ? -1 : 1) * (dir === 'desc' ? -1 : 1);
  }
  return collator.compare(a, b);
}

export function selectListingRows(rows: ListingRow[], spec: Pick<ListingSpec, 'from' | 'where' | 'sort' | 'fields' | 'group'>, today: string): ListingRow[] {
  const { field, direction } = spec.sort;
  const sign = direction === 'desc' ? -1 : 1;
  return rows
    .filter((r) => isListedRow(r, spec.from) && matchesWhere(r, spec.where, spec.fields.date, today))
    .map((r) => ({ r, v: sortValue(r, field, spec.fields), g: groupKey(r, spec) }))
    .sort((a, b) => {
      if (a.g !== null && b.g !== null) {
        const gc = compareGroupKeys(a.g, b.g, spec);
        if (gc) return gc;
      }
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
  return folder === '' ? pages.length > 0 : pages.some((p) => p.startsWith(`${folder}/`));
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

/** The folders (with pages) closest to a mistyped `from`, for the error card. */
export function nearestFolders(from: string, files: string[], n = 3): string[] {
  const dirs = new Set<string>();
  for (const p of plainPaths(files)) if (MARKDOWN_RE.test(p)) {
    const parts = p.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  return [...dirs]
    .map((d) => ({ d, score: editDistance(from.toLowerCase(), d.toLowerCase()) }))
    .sort((a, b) => a.score - b.score || collator.compare(a.d, b.d))
    .slice(0, n)
    .map((x) => x.d);
}

function resolveTarget(value: string, originPath: string, ctx: ItemContext): string {
  const wiki = extractWikiLinkTarget(value);
  const match = wiki === null ? null : matchLinkTarget(wiki, ctx.files.map((path) => ({ path })));
  const target = wiki === null ? value : match ? ensureLeadingSlash(match.path) : wiki;
  return resolveContentLink({ target, originFilePath: ensureLeadingSlash(originPath), siteHostname: ctx.siteHostname, permalinks: ctx.permalinks });
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
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim().toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : key;
}

const WIKI_RE = /^\[\[([^|\]]+?)(?:\|([^\]]+))?\]\]$/;
function fieldParts(value: unknown, ctx: ItemContext): ListingFieldPart[] {
  const v0 = unwrapNested(value);
  const list = Array.isArray(v0) ? v0 : [v0];
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
  const f = ctx.fields;
  const title = f.title === 'title' ? itemTitle(row) : (firstString(m, [f.title]) ?? itemTitle(row));
  const date = f.date ? slotDate(row, f.date) : null;
  const dateKeys = new Set(['date', ...(f.date ? [f.date] : [])]);
  const dateInEyebrow = f.eyebrow.some((k) => dateKeys.has(k));
  const eyebrow = f.eyebrow.flatMap((k) => (dateKeys.has(k) ? (date ? [{ text: formatListingDate(date, ctx.locale) }] : []) : fieldParts(m[k], ctx)));
  const imageKeys = f.image ? (IMAGE_FALLBACKS[f.image] ?? [f.image]) : [];
  const rawImage = firstString(m, imageKeys);
  const authorKeys = f.authors ? (AUTHOR_FALLBACKS[f.authors] ?? [f.authors]) : [];
  const authorsRaw = authorKeys.map((k) => unwrapNested(m[k])).find((v) => normalizeAuthors(v).length > 0);
  return {
    path: row.path,
    url: `/${(row.permalink || row.appPath || row.path).replace(/^\/+/, '')}`,
    title,
    date,
    dateInEyebrow,
    summary: f.summary ? firstString(m, SUMMARY_FALLBACKS[f.summary] ?? [f.summary]) : null,
    image: rawImage ? imageSrc(resolveTarget(rawImage, row.path, ctx), ctx.siteHostname) : null,
    authorHandles: normalizeAuthors(authorsRaw).map(stripWiki),
    eyebrow,
    meta: f.meta.map((key) => ({ key, label: humanize(key), parts: fieldParts(m[key], ctx) })).filter((x) => x.parts.length > 0),
    group: null,
  };
}
```

Check while implementing: the `resolveEntryDate(undefined, path)` call returns the file-name prefix date (read `lib/changelog.ts`); `normalizeAuthors` accepts a scalar; `resolveContentLink` for a `.md` target returns a `/slug` path (so `imageSrc` rejects it).

- [ ] **Step 6: Run, expect PASS.** Adjust implementation, not expectations, except for the two ICU/tie-order notes above.
- [ ] **Step 7: Commit** `feat(listing): pure item mapping, slot fallbacks, group-first sort and dates`

### Task B5: the cached ordered index and page rows by id (`query.ts`)

**Files:**
- Create: `lib/listing/query.ts`, `lib/listing/query.test.ts`

The Data Cache stores at most 2 MB per item on Vercel; above that Next silently stops caching and every request rescans the folder (tech M7). So the cache holds only what ordering and slicing need, and the 20-odd rows of the current page are fetched by id with full metadata.

**Interfaces:**
- Consumes: `ListingRow`, `selectListingRows`, `groupKey` (B4), `ListingSpec` (B2), `isDraft` (B3).
- Produces:

```ts
export type ListingDb = { blob: { findMany: (args: any) => Promise<unknown[]> } };
/** Ordered, filtered items of one folder query. Arrays are parallel. */
export type ListingIndex = { ids: string[]; paths: string[]; featured: number[]; groups: string[] | null };
export function fetchFolderRows(db: ListingDb, args: { siteId: string; folder: string; withTags: boolean }): Promise<ListingRow[]>;
export function buildIndex(rows: ListingRow[], spec: Pick<ListingSpec, 'from' | 'group' | 'fields'>): ListingIndex;
export function queryListingIndex(args: { siteId: string; spec: ListingSpec; today: string }, db?: ListingDb): Promise<ListingIndex>;
export function fetchRowsByIds(db: ListingDb, siteId: string, ids: string[]): Promise<ListingRow[]>;
```

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...a: unknown[]) => unknown) => fn }));
import { buildIndex, fetchFolderRows, fetchRowsByIds, queryListingIndex } from './query';
import { DEFAULT_FIELDS, parseListingBlock } from './spec';

const spec = (code = '') => {
  const r = parseListingBlock('list', `from: b\n${code}`);
  if (!r.ok) throw new Error(r.errors.join());
  return r.spec;
};

describe('fetchFolderRows', () => {
  it('one folder, metadata columns only, tags only when where.tags is used', async () => {
    const findMany = vi.fn(async () => []);
    await fetchFolderRows({ blob: { findMany } }, { siteId: 's', folder: 'blog', withTags: false });
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 's', appPath: { not: null }, extension: { in: ['md', 'mdx'] }, path: { startsWith: 'blog/' } },
      select: { id: true, path: true, appPath: true, permalink: true, metadata: true },
    });
    await fetchFolderRows({ blob: { findMany } }, { siteId: 's', folder: '', withTags: true });
    const args = (findMany.mock.calls[1] as any[])[0];
    expect(args.where.path).toBeUndefined();
    expect(args.select.tags).toEqual({ select: { tag: true } });
  });
});

describe('buildIndex and queryListingIndex', () => {
  it('returns ids/paths in order, featured positions, no metadata', async () => {
    const findMany = vi.fn(async () => [
      { id: '1', path: 'b/old.md', appPath: '/b/old', permalink: null, metadata: { date: '2020-01-01', featured: true, description: 'x' } },
      { id: '2', path: 'b/new.md', appPath: '/b/new', permalink: null, metadata: { date: '2026-01-01' } },
    ]);
    const index = await queryListingIndex({ siteId: 's', spec: spec(), today: '2026-10-10' }, { blob: { findMany } });
    expect(index).toEqual({ ids: ['2', '1'], paths: ['b/new.md', 'b/old.md'], featured: [1], groups: null });
  });
  it('group keys are stored when grouping (PR B2 uses them)', () => {
    const rows = [{ id: '1', path: 'b/a.md', appPath: '/b/a', permalink: null, metadata: { date: '2026-01-01' } }];
    expect(buildIndex(rows, { from: 'b', group: { by: 'year' }, fields: DEFAULT_FIELDS.list }).groups).toEqual(['2026']);
  });
  it('a 5,000-item folder with heavy frontmatter caches well under 1 MB, with no metadata (tech M7)', () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      id: `cm${String(i).padStart(23, '0')}`, path: `blog/2026/${String(i).padStart(4, '0')}-a-fairly-long-post-slug-for-realism.md`, appPath: `/blog/x${i}`, permalink: null,
      metadata: { title: `Post ${i}`, date: '2026-01-01', description: 'x'.repeat(400), tags: ['a', 'b', 'c'], featured: i % 50 === 0 },
    }));
    const index = buildIndex(rows, { from: 'blog', group: { by: 'month' }, fields: DEFAULT_FIELDS.list });
    const json = JSON.stringify(index);
    expect(json.length).toBeLessThan(1_000_000);
    expect(json).not.toContain('description');
    expect(json).not.toContain('xxxx');
  });
});

describe('fetchRowsByIds', () => {
  it('one query by id, scoped to the site, returned in the requested order', async () => {
    const findMany = vi.fn(async () => [
      { id: 'b', path: 'x/b.md', appPath: '/x/b', permalink: null, metadata: {} },
      { id: 'a', path: 'x/a.md', appPath: '/x/a', permalink: null, metadata: {} },
    ]);
    const rows = await fetchRowsByIds({ blob: { findMany } }, 's', ['a', 'b', 'gone']);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(findMany).toHaveBeenCalledWith({ where: { siteId: 's', id: { in: ['a', 'b', 'gone'] } }, select: { id: true, path: true, appPath: true, permalink: true, metadata: true } });
  });
  it('no query for an empty page', async () => {
    const findMany = vi.fn();
    expect(await fetchRowsByIds({ blob: { findMany } }, 's', [])).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/query.test.ts`
- [ ] **Step 3: Implement**

```ts
import { unstable_cache } from 'next/cache';
import prisma from '@/server/db';
import { groupKey, type ListingRow, selectListingRows } from './items';
import type { ListingSpec } from './spec';

export type ListingDb = { blob: { findMany: (args: any) => Promise<unknown[]> } };
export type ListingIndex = { ids: string[]; paths: string[]; featured: number[]; groups: string[] | null };

const ROW_SELECT = { id: true, path: true, appPath: true, permalink: true, metadata: true } as const;

export async function fetchFolderRows(db: ListingDb, { siteId, folder, withTags }: { siteId: string; folder: string; withTags: boolean }): Promise<ListingRow[]> {
  return (await db.blob.findMany({
    where: { siteId, appPath: { not: null }, extension: { in: ['md', 'mdx'] }, ...(folder ? { path: { startsWith: `${folder}/` } } : {}) },
    select: { ...ROW_SELECT, ...(withTags ? { tags: { select: { tag: true } } } : {}) },
  })) as ListingRow[];
}

const isFeatured = (m: Record<string, unknown> | null) => m?.featured === true || m?.featured === 'true';

export function buildIndex(rows: ListingRow[], spec: Pick<ListingSpec, 'from' | 'group' | 'fields'>): ListingIndex {
  return {
    ids: rows.map((r) => r.id),
    paths: rows.map((r) => r.path),
    featured: rows.flatMap((r, i) => (isFeatured(r.metadata) ? [i] : [])),
    groups: spec.group.by === 'none' ? null : rows.map((r) => groupKey(r, spec) ?? ''),
  };
}

/**
 * The folder's items, filtered and ordered (group first, then sort), cached per
 * site/folder/where/sort/date slot/group and invalidated by the site tag on
 * publish. Only ids, paths, featured positions and group keys are cached.
 */
export async function queryListingIndex({ siteId, spec, today }: { siteId: string; spec: ListingSpec; today: string }, db: ListingDb = prisma as unknown as ListingDb): Promise<ListingIndex> {
  const usesToday = spec.where.date?.some((v) => v === 'upcoming' || v === 'past') ?? false;
  const key = JSON.stringify({
    from: spec.from,
    where: Object.entries(spec.where).sort(([a], [b]) => (a < b ? -1 : 1)),
    sort: spec.sort,
    date: spec.fields.date,
    group: spec.group,
    today: usesToday ? today : null,
  });
  return unstable_cache(
    async (sid: string, keyJson: string) => {
      const k = JSON.parse(keyJson) as { from: string; where: [string, string[]][]; sort: ListingSpec['sort']; date: string | null; group: ListingSpec['group'] };
      const s = { from: k.from, where: Object.fromEntries(k.where), sort: k.sort, group: k.group, fields: { ...spec.fields, date: k.date } };
      const rows = await fetchFolderRows(db, { siteId: sid, folder: k.from, withTags: 'tags' in s.where });
      return buildIndex(selectListingRows(rows, s, today), s);
    },
    ['listing-index'],
    { revalidate: 60, tags: [siteId] },
  )(siteId, key);
}

export async function fetchRowsByIds(db: ListingDb, siteId: string, ids: string[]): Promise<ListingRow[]> {
  if (ids.length === 0) return [];
  const rows = (await db.blob.findMany({ where: { siteId, id: { in: ids } }, select: ROW_SELECT })) as ListingRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
```

`fetchRowsByIds` is not cached: it is one indexed primary-key query for one page. A row deleted between the index and the page fetch simply drops out.

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(listing): cache an ordered index, fetch page rows by id`

### Task B6: pagination helpers

**Files:**
- Create: `lib/listing/paginate.ts`, `lib/listing/paginate.test.ts`

**Interfaces:**
- Consumes: `parsePageParam` (`@/lib/changelog`), `ListingSpec`.
- Produces: `export type ListingPage<T> = { items: T[]; page: number; pageCount: number; total: number; paginated: boolean }; export function sliceListing<T>(items: T[], spec: Pick<ListingSpec, 'limit' | 'pageSize'>, page: number): ListingPage<T>; export function pageHref(publicUrl: string, page: number): string; export function pageFromSearchParam(value: string | string[] | undefined): number; export function listingCanonical(url: string, pageLevel: boolean, pageParam: string | string[] | undefined): string`.

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
  it('self-canonical only for page-level listings beyond page 1', () => {
    expect(listingCanonical('https://s.site/blog', true, '2')).toBe('https://s.site/blog?page=2');
    expect(listingCanonical('https://s.site/blog', true, '1')).toBe('https://s.site/blog');
    expect(listingCanonical('https://s.site/blog', true, 'abc')).toBe('https://s.site/blog');
    expect(listingCanonical('https://s.site/blog', false, '2')).toBe('https://s.site/blog');
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

/** `generateMetadata` cannot see inline blocks, so only page-level listings (layout: list, zero-config) get a self-canonical. */
export function listingCanonical(url: string, pageLevel: boolean, pageParam: string | string[] | undefined): string {
  const page = pageLevel ? pageFromSearchParam(pageParam) : 1;
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
- Produces: `export type ResolvedAuthor = { key: string; name: string; url: string | null; avatar?: string }; export function authorPathMatches(handle: string, path: string): boolean; export function pickAuthorBlob<T extends { path: string }>(handle: string, candidates: T[]): T | undefined; export function resolveAuthors(db: ListingDb, args: { siteId: string; handles: string[]; siteHostname: string; files: string[] }): Promise<ResolvedAuthor[]>` (same order and length as `handles`); `export function cachedResolveAuthors(args: { siteId: string; handles: string[]; siteHostname: string; files: string[] }, db?: ListingDb): Promise<ResolvedAuthor[]>` (what the plugin calls). Only the matching author rows (projected to `id, path, appPath, permalink, title, avatar`) are cached, keyed by site + sorted handles, tagged `siteId`, revalidate 60; avatar URLs are resolved per request from the caller's `files`, so the cache never scans the site's paths (tech minor 4). Handles arrive already unwrapped from wiki links and from the `author` fallback (Task B4).

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
  it('cachedResolveAuthors: one author query, no site-wide path scan, input order kept', async () => {
    const findMany = vi.fn(async () => [{ id: 'b1', path: 'people/ada.md', appPath: '/people/ada', permalink: null, metadata: { title: 'Ada', avatar: '[[ada.jpg]]', bio: 'long text that must not be cached' } }]);
    const out = await cachedResolveAuthors({ siteId: 's', handles: ['zed', 'ada'], siteHostname: 'h', files: ['/people/ada.jpg'] }, { blob: { findMany } });
    expect(out.map((a) => a.name)).toEqual(['zed', 'Ada']);
    expect(out[1]!.avatar).toBe('http://h/people/ada.jpg');
    expect(findMany).toHaveBeenCalledTimes(1);
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
// ListingDb is a type-only import, so authors.ts does not pull query.ts into bundles that only need types.

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

/** The cacheable part of an author page: no bodies, no other frontmatter. */
type AuthorRow = { id: string; path: string; appPath: string | null; permalink: string | null; title: string; avatar: string | null };

async function fetchAuthorRows(db: ListingDb, siteId: string, unique: string[]): Promise<AuthorRow[]> {
  if (unique.length === 0) return [];
  const blobs = (await db.blob.findMany({
    where: { siteId, OR: unique.flatMap((h) => [{ path: `${h}.md` }, { path: `${h}.mdx` }, { path: { endsWith: `/${h}.md` } }, { path: { endsWith: `/${h}.mdx` } }]) },
    select: { id: true, path: true, appPath: true, permalink: true, metadata: true },
  })) as AuthorBlob[];
  return blobs.map((b) => {
    const m = b.metadata ?? {};
    return {
      id: b.id, path: b.path, appPath: b.appPath, permalink: b.permalink,
      title: m.title == null || typeof m.title === 'object' ? '' : String(m.title).trim(),
      avatar: typeof m.avatar === 'string' && m.avatar.trim() ? m.avatar.trim() : null,
    };
  });
}

function toResolvedAuthors(handles: string[], rows: AuthorRow[], siteHostname: string, files: string[]): ResolvedAuthor[] {
  const siteFiles = files.map((p) => ({ path: p.replace(/^\/+/, '') }));
  return handles.map((handle) => {
    const row = pickAuthorBlob(handle, rows);
    if (!row) return { key: handle, name: clean(handle) || handle, url: null };
    let avatar: string | undefined;
    if (row.avatar) {
      const wiki = extractWikiLinkTarget(row.avatar);
      const target = wiki !== null ? (matchLinkTarget(wiki, siteFiles)?.path ?? wiki) : row.avatar;
      avatar = resolveContentLink({ target, siteHostname });
    }
    return { key: row.id, name: row.title || clean(handle), url: ensureLeadingSlash(row.permalink || row.appPath || ''), ...(avatar ? { avatar } : {}) };
  });
}

export async function resolveAuthors(db: ListingDb, { siteId, handles, siteHostname, files }: { siteId: string; handles: string[]; siteHostname: string; files: string[] }): Promise<ResolvedAuthor[]> {
  const unique = [...new Set(handles.map(clean).filter(Boolean))];
  return toResolvedAuthors(handles, await fetchAuthorRows(db, siteId, unique), siteHostname, files);
}
```

Append the cached wrapper the plugin uses (the tRPC procedure keeps calling `resolveAuthors` inside its own cache):

```ts
export async function cachedResolveAuthors(
  args: { siteId: string; handles: string[]; siteHostname: string; files: string[] },
  db: ListingDb = prisma as unknown as ListingDb,
): Promise<ResolvedAuthor[]> {
  const unique = [...new Set(args.handles.map(clean).filter(Boolean))].sort();
  const rows = await unstable_cache(
    async (siteId: string, handlesJson: string) => fetchAuthorRows(db, siteId, JSON.parse(handlesJson) as string[]),
    ['listing-author-rows'],
    { revalidate: 60, tags: [args.siteId] },
  )(args.siteId, JSON.stringify(unique));
  return toResolvedAuthors(args.handles, rows, args.siteHostname, args.files);
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

### Task B8: renderer: card anatomy, list and grid, placeholders, notes, empty state, error card, pagination

**Files:**
- Create: `lib/listing/render.ts`, `lib/listing/render.test.ts`

**Interfaces:**
- Consumes: `ListingSpec`, `LISTING_KEYS` (B2), `ListingItem` (B4), `formatListingDate`, `groupLabel` (B4 `dates.ts`), `ListingPage`, `pageHref` (B6), `ResolvedAuthor` (B7), `pageWindow` (`lib/page-window.ts`, PR A).
- Produces:

```ts
export const LISTING_HEADLINE_CLASS = 'list-component-item-headline';
export const LISTING_GROUP_HEADING_CLASS = 'list-component-group-heading';
export const LISTING_HEADING_PLACEHOLDER_ID = 'listing-item-heading';
export type RenderListingInput = {
  spec: ListingSpec; page: ListingPage<ListingItem>; authors: Map<string, ResolvedAuthor>; publicUrl: string; locale: string;
  label?: string;        // page title; only page-level listings pass it (aria-label)
  notes?: string[];      // invisible: data-listing-notes
  featuredFirst?: boolean; // the first item on this page is the featured hero (PR B2; the plugin decides)
};
export function renderListing(input: RenderListingInput): RootContent;
export function renderListingError(errors: string[], heading: string): RootContent;
```

One DOM for every view (design 6). The view changes the root modifier, `data-media`/`data-ratio`, image `sizes`, placeholders and (B2) initials and the hero; layout is CSS.

Invariants: no block element inside `<p>`, no `<a>` inside `<a>`; items and group headings are direct children of the `<section>`, pagination is the last child and absent for one page; every `hProperties` value is a string (`tabIndex: '-1'`, `dataTocIgnore: ''`, `ariaHidden: 'true'`).

- [ ] **Step 1: Failing tests** (`lib/listing/render.test.ts`)

```ts
import type { Root } from 'mdast';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import type { ListingItem } from './items';
import { renderListing, renderListingError, type RenderListingInput } from './render';
import { DEFAULT_FIELDS, type ListingSpec } from './spec';

// ListingImage is an MDX JSX element; give it a visible stand-in for plain remark-rehype.
const handlers = { mdxJsxFlowElement: (_s: any, node: any) => ({ type: 'element', tagName: 'listing-image', properties: Object.fromEntries(node.attributes.map((a: any) => [a.name, a.value])), children: [] }) };
async function html(node: any) {
  const tree: Root = { type: 'root', children: [node] };
  const processor = unified().use(remarkRehype, { handlers } as any).use(rehypeStringify);
  return new DOMParser().parseFromString(String(processor.stringify((await processor.run(tree)) as any)), 'text/html').body;
}

const spec = (o: Partial<ListingSpec> = {}): ListingSpec => ({
  from: 'blog', fromRelative: false, view: 'list', sort: { field: 'date', direction: 'desc' }, limit: null, pageSize: 20, where: {},
  fields: DEFAULT_FIELDS.list, media: 'thumb', ratio: '3/2', featured: 0, group: { by: 'none' }, ...o,
});
const item = (o: Partial<ListingItem> = {}): ListingItem => ({
  path: 'blog/a.md', url: '/blog/a', title: 'A post', date: '2026-09-18', dateInEyebrow: false, summary: 'Summary', image: 'http://h/a.jpg',
  authorHandles: ['ada', 'guest'], eyebrow: [], meta: [], group: null, ...o,
});
const authors = new Map([
  ['ada', { key: 'b1', name: 'Ada Lovelace', url: '/people/ada', avatar: 'http://h/ada.jpg' }],
  ['guest', { key: 'guest', name: 'Guest Writer', url: null }],
  ['c', { key: 'c', name: 'C', url: null }],
  ['d', { key: 'd', name: 'D', url: null }],
]);
const page = (items: ListingItem[], o: Partial<RenderListingInput['page']> = {}) => ({ items, page: 1, pageCount: 1, total: items.length, paginated: false, ...o });
const input = (o: Partial<RenderListingInput> = {}): RenderListingInput => ({ spec: spec(), page: page([item()]), authors, publicUrl: '/blog', locale: 'en-US', ...o });

describe('card anatomy (design section 6)', () => {
  it('list view: root attributes and slot order; no aria-label inline', async () => {
    const body = await html(renderListing(input()));
    const root = body.querySelector('section.list-component.list-component--list.not-prose[data-view="list"][data-media="thumb"][data-ratio="3-2"]')!;
    expect(root).not.toBeNull();
    expect(root.hasAttribute('aria-label')).toBe(false);
    expect(root.hasAttribute('data-listing-notes')).toBe(false);
    const art = root.querySelector(':scope > article.list-component-item')!;
    expect(art.querySelector(':scope > .list-component-item-media > a.list-component-item-media-link[href="/blog/a"][tabindex="-1"][aria-hidden="true"] > listing-image[src="http://h/a.jpg"][variant="media"][sizes="(min-width: 640px) 160px, 88px"]')).not.toBeNull();
    const content = art.querySelector(':scope > .list-component-item-content')!;
    expect([...content.children].map((c) => c.className)).toEqual(['list-component-item-headline', 'list-component-item-summary', 'list-component-item-meta']);
    const h3 = content.querySelector('h3.list-component-item-headline')!;
    expect(h3.id).toBe('listing-item-heading');
    expect(h3.getAttribute('data-toc-ignore')).toBe('');
    expect(h3.querySelector('a.list-component-item-headline-link[href="/blog/a"]')!.textContent).toBe('A post');
    const meta = content.querySelector('.list-component-item-meta')!;
    expect(meta.querySelector(':scope > time.list-component-item-date[datetime="2026-09-18"]')!.textContent).toBe('Sep 18, 2026');
    const by = meta.querySelector(':scope > span.list-component-item-authors')!;
    expect(by.querySelector('.list-component-item-avatars > listing-image[variant="avatar"][src="http://h/ada.jpg"]')).not.toBeNull();
    expect(by.querySelector('a.list-component-item-author[href="/people/ada"]')!.textContent).toBe('Ada Lovelace');
    expect(by.querySelector('span.list-component-item-author')!.textContent).toBe('Guest Writer');
  });
  it('page-level listings carry the page title as aria-label', async () => {
    expect((await html(renderListing(input({ label: 'Blog' })))).querySelector('section')!.getAttribute('aria-label')).toBe('Blog');
  });
  it('dates follow the locale; the ISO date stays in datetime', async () => {
    const t = (await html(renderListing(input({ locale: 'de-DE' })))).querySelector('time')!;
    expect(t.getAttribute('datetime')).toBe('2026-09-18');
    expect(t.textContent).not.toBe('Sep 18, 2026');
  });
  it('eyebrow and meta values; a date in the eyebrow is not repeated in the meta line', async () => {
    const body = await html(renderListing(input({ page: page([item({ dateInEyebrow: true, eyebrow: [{ text: 'Sep 18, 2026' }, { text: 'Themes' }], meta: [{ key: 'guests', label: 'Guests', parts: [{ text: 'Ada', href: '/people/ada' }, { text: 'Grace' }] }] })]) })));
    expect(body.querySelector('.list-component-item-content > :first-child')!.matches('div.list-component-item-eyebrow')).toBe(true);
    expect([...body.querySelectorAll('.list-component-item-eyebrow > span')].map((s) => s.textContent)).toEqual(['Sep 18, 2026', 'Themes']);
    expect(body.querySelector('.list-component-item-meta time')).toBeNull();
    expect(body.querySelector('.list-component-item-meta-value[data-field="guests"]')!.innerHTML).toBe('<a href="/people/ada">Ada</a>, Grace');
  });
  it('more than two authors: two names then "and N others"; at most three avatars', async () => {
    const by = (await html(renderListing(input({ page: page([item({ authorHandles: ['ada', 'guest', 'c', 'd'] })]) })))).querySelector('.list-component-item-authors')!;
    expect(by.querySelectorAll('.list-component-item-author')).toHaveLength(2);
    expect(by.querySelector('.list-component-item-authors-more')!.textContent).toBe('and 2 others');
  });
  it('list: a row without an image collapses (no media, no placeholder); media none hides images', async () => {
    const body = await html(renderListing(input({ page: page([item(), item({ url: '/b', image: null })]) })));
    expect(body.querySelectorAll('.list-component-item-media')).toHaveLength(1);
    expect((await html(renderListing(input({ spec: spec({ media: 'none' }) })))).querySelector('.list-component-item-media')).toBeNull();
  });
  it('cover uses the cover sizes and ratio attribute', async () => {
    const cover = await html(renderListing(input({ spec: spec({ media: 'cover', ratio: '16/9' }) })));
    expect(cover.querySelector('section[data-media="cover"][data-ratio="16-9"] listing-image')!.getAttribute('sizes')).toBe('(min-width: 768px) 44rem, 100vw');
  });
  it('escapes frontmatter text', async () => {
    const body = await html(renderListing(input({ page: page([item({ title: '<img src=x onerror=alert(1)>' })]) })));
    expect(body.querySelector('img')).toBeNull();
    expect(body.querySelector('.list-component-item-headline-link')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('grid view and the no-image rule (UX M-2)', () => {
  const grid = spec({ view: 'grid', media: 'cover', ratio: '16/9' });
  it('grid modifier and sizes', async () => {
    const body = await html(renderListing(input({ spec: grid })));
    expect(body.querySelector('section.list-component--grid[data-view="grid"] listing-image[variant="media"]')!.getAttribute('sizes')).toBe('(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw');
  });
  it('some items with images: the others get a placeholder box', async () => {
    const body = await html(renderListing(input({ spec: grid, page: page([item(), item({ url: '/b', image: null })]) })));
    expect(body.querySelectorAll('.list-component-item-media')).toHaveLength(2);
    expect(body.querySelectorAll('.list-component-item-media--placeholder[aria-hidden="true"]')).toHaveLength(1);
  });
  it('no item with an image: the slot collapses for the whole listing', async () => {
    const body = await html(renderListing(input({ spec: grid, page: page([item({ image: null }), item({ url: '/b', image: null })]) })));
    expect(body.querySelector('.list-component-item-media')).toBeNull();
    expect(body.querySelector('section')!.getAttribute('data-media')).toBe('none');
  });
});

describe('notes are invisible (UX M-13)', () => {
  it('notes go to data-listing-notes; nothing visible is added', async () => {
    const body = await html(renderListing(input({ notes: ['"pageSize" is ignored because "limit" is set.', 'second'] })));
    expect(body.querySelector('section')!.getAttribute('data-listing-notes')).toBe('"pageSize" is ignored because "limit" is set. | second');
    expect(body.querySelector('section > :first-child')!.matches('article')).toBe(true);
  });
  it('an empty folder with a note is a section with the note attribute and the empty text', async () => {
    const body = await html(renderListing(input({ notes: ['n'], page: page([], { total: 0 }) })));
    expect(body.querySelector('section[data-listing-notes="n"] > p.list-component-empty')).not.toBeNull();
  });
});

describe('empty and pagination (4.8)', () => {
  it('an empty folder is a paragraph, not a section', async () => {
    const body = await html(renderListing(input({ page: page([], { total: 0, paginated: true }) })));
    expect(body.querySelector('section')).toBeNull();
    expect(body.querySelector('p.list-component-empty')!.textContent).toBe('Nothing here yet.');
  });
  it('an out-of-range page keeps the strip', async () => {
    const body = await html(renderListing(input({ page: page([], { page: 9, pageCount: 3, total: 45, paginated: true }) })));
    expect(body.querySelector('section > p.list-component-empty')).not.toBeNull();
    expect(body.querySelector('section > nav.list-component-pagination:last-child')).not.toBeNull();
  });
  it('page 1 of 12: disabled Newer span, numbered strip, Older link', async () => {
    const body = await html(renderListing(input({ page: page([item()], { pageCount: 12, total: 240, paginated: true }) })));
    const nav = body.querySelector('section > nav.list-component-pagination[aria-label="Pages"]:last-child')!;
    const prev = nav.querySelector('.list-component-pagination-nav > .list-component-pagination-button--prev')!;
    expect(prev.tagName).toBe('SPAN');
    expect(prev.classList.contains('is-disabled')).toBe(true);
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(prev.textContent).toBe('Newer');
    expect(prev.querySelector('svg.list-component-pagination-button-icon.list-component-pagination-button-icon--prev[viewBox="0 0 24 24"]')).not.toBeNull();
    expect([...nav.querySelectorAll('.list-component-pagination-pages > *')].map((e) => e.textContent)).toEqual(['1', '2', '3', '…', '12']);
    expect(nav.querySelector('.list-component-pagination-page-button--current[aria-current="page"]')!.getAttribute('href')).toBe('/blog');
    const next = nav.querySelector('.list-component-pagination-nav--end > a.list-component-pagination-button--next[rel="next"]')!;
    expect(next.getAttribute('href')).toBe('/blog?page=2');
    expect(next.textContent).toBe('Older');
  });
  it('the last page links back with rel=prev and disables Older', async () => {
    const body = await html(renderListing(input({ page: page([item()], { page: 2, pageCount: 2, total: 21, paginated: true }) })));
    expect(body.querySelector('a.list-component-pagination-button--prev[rel="prev"]')!.getAttribute('href')).toBe('/blog');
    expect(body.querySelector('span.list-component-pagination-button--next.is-disabled')).not.toBeNull();
  });
  it('non-date sorts say Previous/Next; one page has no strip', async () => {
    const titled = await html(renderListing(input({ spec: spec({ sort: { field: 'title', direction: 'asc' } }), page: page([item()], { pageCount: 2, total: 21, paginated: true }) })));
    expect(titled.querySelector('.list-component-pagination-button--next')!.textContent).toBe('Next');
    expect((await html(renderListing(input({ page: page([item()], { paginated: true }) })))).querySelector('nav')).toBeNull();
  });
});

describe('renderListingError', () => {
  it('lists every problem and the keys this build accepts', async () => {
    const body = await html(renderListingError(['Unknown key "perPage". Use "pageSize".'], 'List block has problems'));
    const card = body.querySelector('div.list-component-error.list-component-error--block')!;
    expect(card.querySelector('.list-component-error-title')!.textContent).toBe('List block has problems');
    expect(card.querySelectorAll('li')).toHaveLength(1);
    expect(card.querySelector('.list-component-error-keys')!.textContent).toMatch(/^Keys: from, view, sort, limit, pageSize, where, fields, media, ratio(, featured, group)?\.$/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/render.test.ts`
- [ ] **Step 3: Implement** (`lib/listing/render.ts`)

```ts
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
const el = (tagName: string, className: string[], children: unknown[], props: Props = {}): RootContent =>
  ({ type: 'listingElement', data: { hName: tagName, hProperties: { ...(className.length ? { className } : {}), ...props } }, children }) as unknown as RootContent;
const text = (value: string): PhrasingContent => ({ type: 'text', value });

/** next/image `sizes` per view and media shape (design section 6). */
function mediaSizes(spec: ListingSpec, featured: boolean): string {
  if (featured) return '(min-width: 768px) 58vw, 100vw';
  if (spec.view === 'grid') return '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';
  if (spec.view === 'people') return spec.media === 'thumb' ? '96px' : '(min-width: 1024px) 25vw, 50vw';
  return spec.media === 'thumb' ? '(min-width: 640px) 160px, 88px' : '(min-width: 768px) 44rem, 100vw';
}

/** The one component: an MDX JSX element in both pipelines (see lib/markdown.ts remarkMdxJsxToElement). */
const image = (attrs: Record<string, string>): RootContent =>
  ({ type: 'mdxJsxFlowElement', name: 'ListingImage', attributes: Object.entries(attrs).map(([name, value]) => ({ type: 'mdxJsxAttribute', name, value })), children: [] }) as unknown as RootContent;

const ICONS = { prev: ['m12 19-7-7 7-7', 'M19 12H5'], next: ['M5 12h14', 'm12 5 7 7-7 7'] };
const icon = (dir: 'prev' | 'next') =>
  el('svg', ['list-component-pagination-button-icon', `list-component-pagination-button-icon--${dir}`], ICONS[dir].map((d) => el('path', [], [], { d })), { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', ariaHidden: 'true' });

const partsToNodes = (parts: ListingFieldPart[]) =>
  parts.flatMap((p, i) => [...(i ? [text(', ')] : []), p.href ? el('a', [], [text(p.text)], { href: p.href }) : text(p.text)]);

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

function renderAuthors(handles: string[], authors: Map<string, ResolvedAuthor>): RootContent | null {
  if (handles.length === 0) return null;
  const resolved = handles.map((h) => authors.get(h) ?? { key: h, name: h, url: null });
  const avatars = resolved.filter((a) => a.avatar).slice(0, 3).map((a) => image({ src: a.avatar!, alt: '', sizes: '20px', variant: 'avatar' }));
  const names = resolved.slice(0, 2).map((a) => (a.url ? el('a', ['list-component-item-author'], [text(a.name)], { href: a.url }) : el('span', ['list-component-item-author'], [text(a.name)])));
  const more = resolved.length > 2 ? [el('span', ['list-component-item-authors-more'], [text(`and ${resolved.length - 2} others`)])] : [];
  return el('span', ['list-component-item-authors'], [...(avatars.length ? [el('span', ['list-component-item-avatars'], avatars)] : []), ...names, ...more]);
}

type ItemCtx = { authors: Map<string, ResolvedAuthor>; featured: boolean; showMedia: boolean; placeholder: boolean; locale: string };

function renderMedia(item: ListingItem, spec: ListingSpec, ctx: ItemCtx): RootContent | null {
  if (!ctx.showMedia) return null;
  if (item.image) {
    return el('div', ['list-component-item-media'], [el('a', ['list-component-item-media-link'], [image({ src: item.image, alt: '', sizes: mediaSizes(spec, ctx.featured), variant: 'media' })], { href: item.url, tabIndex: '-1', ariaHidden: 'true' })]);
  }
  if (spec.view === 'people') return el('div', ['list-component-item-media', 'list-component-item-media--placeholder'], [el('span', ['list-component-item-initials'], [text(initials(item.title))])], { ariaHidden: 'true' });
  if (ctx.placeholder && !ctx.featured) return el('div', ['list-component-item-media', 'list-component-item-media--placeholder'], [], { ariaHidden: 'true' });
  return null;
}

function renderItem(item: ListingItem, spec: ListingSpec, ctx: ItemCtx): RootContent {
  const children: RootContent[] = [];
  const media = renderMedia(item, spec, ctx);
  if (media) children.push(media);
  const content: RootContent[] = [];
  if (item.eyebrow.length) content.push(el('div', ['list-component-item-eyebrow'], item.eyebrow.map((p) => el('span', [], partsToNodes([p])))));
  content.push(el('h3', [LISTING_HEADLINE_CLASS], [el('a', ['list-component-item-headline-link'], [text(item.title)], { href: item.url })], { id: LISTING_HEADING_PLACEHOLDER_ID, dataTocIgnore: '' }));
  if (item.summary) content.push(el('p', ['list-component-item-summary'], [text(item.summary)]));
  const meta: RootContent[] = [];
  if (item.date && !item.dateInEyebrow) meta.push(el('time', ['list-component-item-date'], [text(formatListingDate(item.date, ctx.locale))], { dateTime: item.date }));
  const by = renderAuthors(item.authorHandles, ctx.authors);
  if (by) meta.push(by);
  for (const f of item.meta) meta.push(el('span', ['list-component-item-meta-value'], partsToNodes(f.parts), { dataField: f.key }));
  if (meta.length) content.push(el('div', ['list-component-item-meta'], meta));
  children.push(el('div', ['list-component-item-content'], content));
  return el('article', ['list-component-item', ...(ctx.featured ? ['list-component-item--featured'] : [])], children);
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

export type RenderListingInput = { spec: ListingSpec; page: ListingPage<ListingItem>; authors: Map<string, ResolvedAuthor>; publicUrl: string; locale: string; label?: string; notes?: string[]; featuredFirst?: boolean };

export function renderListing({ spec, page, authors, publicUrl, locale, label, notes = [], featuredFirst = false }: RenderListingInput): RootContent {
  const empty = el('p', ['list-component-empty'], [text('Nothing here yet.')]);
  if (page.total === 0 && notes.length === 0) return empty;
  const anyImage = page.items.some((i) => i.image);
  const showMedia = spec.media !== 'none' && (anyImage || spec.view === 'people');
  const placeholder = spec.view === 'grid' && anyImage && page.items.some((i) => !i.image);
  const children: RootContent[] = [];
  if (page.items.length === 0) children.push(empty);
  let lastGroup: string | null = null;
  page.items.forEach((it, i) => {
    const featured = featuredFirst && i === 0;
    if (!featured && it.group !== null && it.group !== lastGroup) {
      children.push(el('h2', [LISTING_GROUP_HEADING_CLASS], [text(it.group)], { id: LISTING_HEADING_PLACEHOLDER_ID, dataTocIgnore: '' }));
      lastGroup = it.group;
    }
    children.push(renderItem(it, spec, { authors, featured, showMedia, placeholder, locale }));
  });
  if (page.paginated && page.pageCount > 1) children.push(renderPagination(page, spec, publicUrl));
  return el('section', ['list-component', `list-component--${spec.view}`, 'not-prose'], children, {
    dataView: spec.view,
    dataMedia: showMedia ? spec.media : 'none',
    dataRatio: spec.ratio.replace('/', '-'),
    ...(label ? { ariaLabel: label } : {}),
    ...(notes.length ? { dataListingNotes: notes.join(' | ') } : {}),
  });
}

export function renderListingError(errors: string[], heading: string): RootContent {
  return el('div', ['list-component-error', 'list-component-error--block'], [
    el('p', ['list-component-error-title'], [text(heading)]),
    el('ul', ['list-component-error-list'], errors.map((e) => el('li', [], [text(e)]))),
    el('p', ['list-component-error-keys'], [text(`Keys: ${LISTING_KEYS.join(', ')}.`)]),
  ]);
}
```

Group labels are computed by the plugin (`item.group`, from the cached index keys and `groupLabel` with the page locale); the renderer only inserts a heading when the label changes, and repeats it at the top of a page because `lastGroup` starts at `null`.

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(listing): render cards, placeholders, notes, empty state, error card and pagination`

### Task B9: B2 contract tests (written now, skipped)

**Files:**
- Modify: `lib/listing/render.test.ts` (append)

The renderer is view-agnostic, so PR B2 needs almost no renderer code; these pin its DOM now and Task G1 flips `describe.skip` to `describe`.

- [ ] **Step 1: Tests**

```ts
describe.skip('[B2] compact, people, featured, grouping', () => {
  it('compact: date + title, no media', async () => {
    const body = await html(renderListing(input({ spec: spec({ view: 'compact', fields: DEFAULT_FIELDS.compact, media: 'none' }), page: page([item({ summary: null, authorHandles: [] })]) })));
    expect(body.querySelector('section.list-component--compact[data-view="compact"][data-media="none"] .list-component-item-date')).not.toBeNull();
    expect(body.querySelector('.list-component-item-media')).toBeNull();
  });
  it('people: portrait sizes, role meta, initials when there is no portrait', async () => {
    const people = spec({ view: 'people', fields: DEFAULT_FIELDS.people, media: 'cover', ratio: '1/1' });
    const body = await html(renderListing(input({ spec: people, page: page([item({ date: null, authorHandles: [], meta: [{ key: 'role', label: 'Role', parts: [{ text: 'Founder' }] }] }), item({ url: '/g', title: 'Grace Hopper', image: null, date: null, authorHandles: [] })]) })));
    expect(body.querySelector('section.list-component--people[data-ratio="1-1"] listing-image')!.getAttribute('sizes')).toBe('(min-width: 1024px) 25vw, 50vw');
    expect(body.querySelector('.list-component-item-meta-value[data-field="role"]')!.textContent).toBe('Founder');
    expect(body.querySelector('.list-component-item-media--placeholder .list-component-item-initials')!.textContent).toBe('GH');
  });
  it('featured: only the first item of the page the plugin marks, hero sizes, no placeholder, above the first group', async () => {
    const items = [item({ url: '/f', group: '2025' }), item({ url: '/a', group: '2026' }), item({ url: '/b', group: '2026', image: null })];
    const body = await html(renderListing(input({ spec: spec({ view: 'grid', featured: 1, media: 'cover', ratio: '16/9', group: { by: 'year' } }), featuredFirst: true, page: page(items) })));
    const kids = [...body.querySelector('section')!.children].map((c) => (c.tagName === 'H2' ? `h2:${c.textContent}` : c.classList.contains('list-component-item--featured') ? 'hero' : 'article'));
    expect(kids).toEqual(['hero', 'h2:2026', 'article', 'article']);
    expect(body.querySelector('.list-component-item--featured listing-image')!.getAttribute('sizes')).toBe('(min-width: 768px) 58vw, 100vw');
  });
  it('grouping: flat headings before each group, out of the ToC', async () => {
    const items = [item({ url: '/a', group: '2026' }), item({ url: '/b', group: '2026' }), item({ url: '/c', group: '2025' })];
    const body = await html(renderListing(input({ spec: spec({ group: { by: 'year' } }), page: page(items) })));
    const kids = [...body.querySelector('section')!.children].map((c) => (c.tagName === 'H2' ? `h2:${c.textContent}` : 'article'));
    expect(kids).toEqual(['h2:2026', 'article', 'article', 'h2:2025', 'article']);
    expect(body.querySelector('h2.list-component-group-heading')!.getAttribute('data-toc-ignore')).toBe('');
  });
});
```

- [ ] **Step 2: Run** (skipped tests report as skipped) and **commit** `test(listing): pin compact, people, featured and grouping DOM for PR B2`

### Task B10: the remark plugin

**Files:**
- Create: `lib/remark-listing.ts`, `lib/remark-listing.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:

```ts
export type ListingRenderContext = {
  page?: number; publicUrl?: string; locale?: string;
  /** Page-level listing to append (only the route's standalone render passes it). */
  implicit?: { options: unknown; defaultFrom: string | null; pageTitle?: string };
  /** The page-level listing already paginates: inline blocks may not. */
  paginationClaimed?: boolean;
  /** Today's UTC date (YYYY-MM-DD) for where: { date: upcoming|past }; injectable for tests. */
  today?: string;
};
export type RemarkListingOptions = ListingRenderContext & { siteId: string; siteHostname: string; rootDir?: string; filePath: string; files: string[]; permalinks?: Record<string, string> };
export const MAX_LISTINGS_PER_PAGE = 10;
export default function remarkListing(options: RemarkListingOptions): (tree: Root) => Promise<void>;
```

- [ ] **Step 1: Failing tests** (mock the data layer; parse with `remark-parse` + `remark-gfm` + `@r4ai/remark-callout` so nested cases are real)

```ts
import remarkCallout from '@r4ai/remark-callout';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}`, path: `blog/p${String(i).padStart(2, '0')}.md`, appPath: `/blog/p${i}`, permalink: null, metadata: { title: `Post ${i}`, authors: ['ada'], featured: i === 7 } }));
const queryListingIndex = vi.fn();
const fetchRowsByIds = vi.fn(async (_db: unknown, _s: string, ids: string[]) => ids.map((id) => rows.find((r) => r.id === id)!));
const cachedResolveAuthors = vi.fn(async (a: { handles: string[] }) => a.handles.map((h) => ({ key: h, name: h.toUpperCase(), url: `/people/${h}` })));
vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('@/lib/listing/query', () => ({ queryListingIndex: (...a: unknown[]) => queryListingIndex(...a), fetchRowsByIds: (...a: [unknown, string, string[]]) => fetchRowsByIds(...a) }));
vi.mock('@/lib/listing/authors', () => ({ cachedResolveAuthors: (a: { handles: string[] }) => cachedResolveAuthors(a) }));
import remarkListing, { type RemarkListingOptions } from './remark-listing';

const index = (rs = rows, groups: string[] | null = null) => ({ ids: rs.map((r) => r.id), paths: rs.map((r) => r.path), featured: rs.flatMap((r, i) => (r.metadata.featured ? [i] : [])), groups });
const base: RemarkListingOptions = { siteId: 's', siteHostname: 'h', filePath: 'README.md', files: ['/blog/p00.md', '/notes/n.md', '/projects/x.md'], publicUrl: '/', today: '2026-10-10' };
async function run(md: string, opts: Partial<RemarkListingOptions> = {}) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkCallout).use(remarkListing, { ...base, ...opts });
  return processor.run(processor.parse(md)) as Promise<any>;
}
const cls = (n: any) => n.data?.hProperties?.className ?? [];
const sections = (tree: any) => (JSON.stringify(tree).match(/"className":\["list-component"/g) ?? []).length;

beforeEach(() => {
  queryListingIndex.mockReset().mockResolvedValue(index());
  fetchRowsByIds.mockClear();
  cachedResolveAuthors.mockClear();
});

describe('remarkListing', () => {
  it('replaces ```blog and ```list fences, leaves other code alone', async () => {
    const tree = await run('```blog\nlimit: 3\n```\n\n```js\nx\n```\n\n```list\nfrom: blog\nlimit: 1\n```');
    expect(tree.children.map((n: any) => cls(n)[0] ?? n.type)).toEqual(['list-component', 'code', 'list-component']);
    expect(queryListingIndex).toHaveBeenCalledWith({ siteId: 's', spec: expect.objectContaining({ from: 'blog' }), today: '2026-10-10' });
  });
  it('fetches only the page rows by id', async () => {
    await run('```blog\nlimit: 3\n```');
    expect(fetchRowsByIds).toHaveBeenCalledWith(expect.anything(), 's', ['r0', 'r1', 'r2']);
  });
  it('renders blocks nested in callouts, blockquotes, list items, and ~~~ fences (Review Focus 5)', async () => {
    const tree = await run('> [!note]\n> ```blog\n> limit: 1\n> ```\n\n> ```blog\n> limit: 1\n> ```\n\n- item\n\n  ```blog\n  limit: 1\n  ```\n\n~~~blog\nlimit: 1\n~~~');
    expect(sections(tree)).toBe(4);
  });
  it('excludes the current page; resolves authors once per block with the page files', async () => {
    const tree = await run('```blog\nlimit: 2\n```', { filePath: 'blog/p00.md' });
    expect(fetchRowsByIds).toHaveBeenCalledWith(expect.anything(), 's', ['r1', 'r2']);
    expect(cachedResolveAuthors).toHaveBeenCalledTimes(1);
    expect(cachedResolveAuthors.mock.calls[0]![0]).toMatchObject({ files: base.files });
    expect(JSON.stringify(tree)).not.toContain('"Post 0"');
  });
  it('a missing folder is an error card with the nearest folders (UX M-10)', async () => {
    const tree = await run('```list\nfrom: posts\n```');
    expect(JSON.stringify(tree.children[0])).toContain('No folder \\"posts\\" with pages. Folders with pages: ');
    expect(queryListingIndex).not.toHaveBeenCalled();
  });
  it('./ resolves against the page folder; capitalised folders resolve (Review Focus 1)', async () => {
    await run('```list\nfrom: ./x\n```', { filePath: 'projects/README.md', files: ['/projects/x/a.md'] });
    expect(queryListingIndex.mock.calls[0]![0].spec.from).toBe('projects/x');
    await run('```blog\nlimit: 1\n```', { files: ['/Blog/a.md'] });
    expect(queryListingIndex.mock.calls[1]![0].spec.from).toBe('Blog');
  });
  it('an invalid block becomes an error card and the rest still renders; a data failure leaks nothing', async () => {
    const t1 = await run('```list\nfrom: blog\nperPage: 5\n```\n\nafter\n\n```blog\nlimit: 1\n```');
    expect(cls(t1.children[0])).toContain('list-component-error');
    expect(t1.children[1].type).toBe('paragraph');
    expect(cls(t1.children[2])).toContain('list-component');
    queryListingIndex.mockRejectedValueOnce(new Error('db down'));
    const t2 = await run('```blog\n```\n\n```blog\nlimit: 1\n```');
    expect(cls(t2.children[0])).toContain('list-component-error');
    expect(JSON.stringify(t2.children[0])).not.toContain('db down');
  });
  it('one paginated listing per page; a page-level listing claims it first', async () => {
    const t = await run('```blog\npageSize: 5\n```\n\n```blog\npageSize: 5\n```');
    expect(cls(t.children[1])).toContain('list-component-error');
    const t2 = await run('```blog\npageSize: 5\n```', { paginationClaimed: true });
    expect(JSON.stringify(t2.children[0])).toContain('Only one list per page can paginate');
  });
  it('caps a page at 10 listings', async () => {
    const tree = await run(Array.from({ length: 11 }, () => '```blog\nlimit: 1\n```').join('\n\n'));
    expect(queryListingIndex).toHaveBeenCalledTimes(10);
    expect(JSON.stringify(tree.children[10])).toContain('At most 10 lists per page');
  });
  it('notes go to the data attribute, not the page', async () => {
    const tree = await run('```blog\nlimit: 2\npageSize: 5\n```');
    expect(tree.children[0].data.hProperties.dataListingNotes).toContain('"pageSize" is ignored');
  });
  it('a page-level listing (implicit) is appended with the page title as label and paginates at 20', async () => {
    const tree = await run('', { implicit: { options: undefined, defaultFrom: 'blog', pageTitle: 'Blog' }, page: 2, publicUrl: '/blog' });
    const section = tree.children.at(-1);
    expect(section.data.hProperties.ariaLabel).toBe('Blog');
    expect(section.children.filter((c: any) => c.data?.hName === 'article')).toHaveLength(5);
  });
  it('page-level errors use the settings heading', async () => {
    expect(JSON.stringify(await run('', { implicit: { options: { veiw: 'grid' }, defaultFrom: 'blog' } }))).toContain('List settings have problems');
  });
});

describe.skip('[B2] featured and grouping in the plugin', () => {
  it('featured: 1 promotes the first featured: true item to the front of page 1 only', async () => {
    await run('```blog\nview: grid\nfeatured: 1\nlimit: 3\n```');
    expect(fetchRowsByIds.mock.calls[0]![2]).toEqual(['r7', 'r0', 'r1']);
  });
  it('group labels come from the index keys and the locale', async () => {
    queryListingIndex.mockResolvedValueOnce(index(rows.slice(0, 2), ['2026-09', '2026-08']));
    const tree = await run('```blog\ngroup: month\nlimit: 2\n```', { locale: 'en-US' });
    expect(JSON.stringify(tree)).toContain('"September 2026"');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/remark-listing.test.ts`
- [ ] **Step 3: Implement** (`lib/remark-listing.ts`)

```ts
import type { Code, Parent, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { dirOf } from '@/lib/changelog';
import { cachedResolveAuthors } from '@/lib/listing/authors';
import { DEFAULT_LOCALE, groupLabel } from '@/lib/listing/dates';
import { folderHasPages, nearestFolders, resolveFolderCase, toListingItem } from '@/lib/listing/items';
import { sliceListing } from '@/lib/listing/paginate';
import { fetchRowsByIds, queryListingIndex } from '@/lib/listing/query';
import { renderListing, renderListingError } from '@/lib/listing/render';
import { parseListingBlock, parseListingSpec, type SpecResult } from '@/lib/listing/spec';
import prisma from '@/server/db';

export type ListingRenderContext = {
  page?: number; publicUrl?: string; locale?: string;
  implicit?: { options: unknown; defaultFrom: string | null; pageTitle?: string };
  paginationClaimed?: boolean;
  today?: string;
};
export type RemarkListingOptions = ListingRenderContext & { siteId: string; siteHostname: string; rootDir?: string; filePath: string; files: string[]; permalinks?: Record<string, string> };

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

    let paginationClaimed = options.paginationClaimed === true;
    let listings = 0;
    const currentPath = options.filePath.replace(/^\/+/, '');
    const locale = options.locale ?? DEFAULT_LOCALE;
    const today = options.today ?? new Date().toISOString().slice(0, 10);

    const build = async (result: SpecResult, heading: string, label?: string): Promise<RootContent> => {
      try {
        if (++listings > MAX_LISTINGS_PER_PAGE) return renderListingError([`At most ${MAX_LISTINGS_PER_PAGE} lists per page; remove or combine some blocks.`], heading);
        if (!result.ok) return renderListingError(result.errors, heading);
        const parsed = result.spec;
        const joined = parsed.fromRelative ? [dirOf(currentPath), parsed.from].filter(Boolean).join('/') : parsed.from;
        const spec = { ...parsed, from: resolveFolderCase(joined, options.files) };
        if (!folderHasPages(spec.from, options.files)) {
          const near = nearestFolders(spec.from, options.files);
          return renderListingError([`No folder "${spec.from}" with pages.${near.length ? ` Folders with pages: ${near.join(', ')}.` : ''}`], heading);
        }
        if (spec.pageSize != null) {
          if (paginationClaimed) return renderListingError(['Only one list per page can paginate; add "limit:" or remove "pageSize:" from this one.'], heading);
          paginationClaimed = true;
        }
        if (result.notes.length) console.warn(`[listing] ${options.filePath}: ${result.notes.join(' | ')}`);

        const index = await queryListingIndex({ siteId: options.siteId, spec, today });
        let positions = index.ids.map((_, i) => i).filter((i) => index.paths[i] !== currentPath);
        const featuredFirst = spec.featured === 1 && (options.page ?? 1) <= 1 && positions.length > 0;
        if (spec.featured === 1 && positions.length) {
          const promoted = positions.find((i) => index.featured.includes(i)) ?? positions[0]!;
          positions = [promoted, ...positions.filter((i) => i !== promoted)];
        }
        const slice = sliceListing(positions, spec, options.page ?? 1);
        const rows = await fetchRowsByIds(prisma as never, options.siteId, slice.items.map((i) => index.ids[i]!));
        const ctx = { siteHostname: options.siteHostname, files: options.files, permalinks: options.permalinks, fields: spec.fields, locale };
        const items = rows.map((row) => {
          const it = toListingItem(row, ctx);
          const pos = index.ids.indexOf(row.id);
          return index.groups ? { ...it, group: groupLabel(index.groups[pos] ?? '', spec.group, locale) } : it;
        });
        const handles = spec.fields.authors ? [...new Set(items.flatMap((i) => i.authorHandles))] : [];
        const resolved = handles.length ? await cachedResolveAuthors({ siteId: options.siteId, handles, siteHostname: options.siteHostname, files: options.files }) : [];
        return renderListing({
          spec,
          page: { ...slice, items },
          authors: new Map(handles.map((h, i) => [h, resolved[i]!])),
          publicUrl: options.publicUrl ?? '/',
          locale,
          label,
          notes: result.notes,
          featuredFirst: featuredFirst && slice.page === 1,
        });
      } catch (error) {
        console.error('Error rendering listing:', error);
        return renderListingError(['This list could not be loaded right now. Reload the page; if it keeps failing, check the options.'], heading);
      }
    };

    // The page-level listing claims pagination first and renders last.
    const implicitNode = options.implicit
      ? await build(parseListingSpec(options.implicit.options, { source: 'layout', defaultFrom: options.implicit.defaultFrom, rootDir: options.rootDir }), LAYOUT_HEADING, options.implicit.pageTitle)
      : null;
    for (const { node, index, parent } of targets) {
      parent.children[index] = (await build(parseListingBlock(node.lang as 'list' | 'blog', node.value, { rootDir: options.rootDir }), BLOCK_HEADING)) as never;
    }
    if (implicitNode) tree.children.push(implicitNode);
  };
}
```

`index.ids.indexOf` is O(n) per row; with ≤ ~20 rows per page that is fine. The featured promotion happens on the full ordered positions, so page 2 starts after the promoted item and nothing appears twice.

- [ ] **Step 4: Run, expect PASS** (the `[B2]` block is skipped).
- [ ] **Step 5: Commit** `feat(listing): remark plugin for list blocks and page-level listings`

### Task B11: `ListingImage` component

**Files:**
- Create: `components/public/mdx/listing-image.tsx`, `components/public/mdx/listing-image.test.tsx`

**Interfaces:** Produces `export type ListingImageProps = { src?: string; alt?: string; sizes?: string; variant?: string }; export default function ListingImage(props: ListingImageProps): JSX.Element | null`.

`src` has already been restricted to real images by `toListingItem` (Task B4). Note: `next.config.mjs` sets `images.unoptimized` outside production, so locally and in CI `next/image` renders no `srcset`. The test checks the props we pass; the e2e test checks `sizes` and `loading`.

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
  it('avatar: fixed 20px (one size; CSS agrees)', () => {
    const { container } = render(<ListingImage src="http://h/ada.jpg" variant="avatar" />);
    expect(container.querySelector('img.list-component-item-author-avatar')!.getAttribute('data-w')).toBe('20');
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
    return <Image className="list-component-item-author-avatar" src={src} alt={alt} width={20} height={20} sizes="20px" loading="lazy" />;
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

- [ ] **Step 1:** `MarkdownOptions` gains `listing?: ListingRenderContext;` (from `./remark-listing`; it carries `page`, `publicUrl`, `locale`, `paginationClaimed`, and `implicit` only for the route's standalone page-level render) (import type from `./remark-listing`). In `processMarkdown`, directly after the `remarkObsidianBases` `.use(...)` and before `.use(remarkMdxJsxToElement)`:

```ts
    // ```list / ```blog blocks and layout: list (needs a site to query)
    .use(options.siteId ? remarkListing : () => undefined, {
      siteId: options.siteId!,
      siteHostname,
      rootDir: options.rootDir,
      filePath,
      files,
      permalinks,
      ...options.listing,
    })
```

In the `rehypeToReact` components map add `listingimage: ListingImage` (import from `@/components/public/mdx/listing-image`). `remarkMdxJsxToElement` already lowercases `ListingImage` to `listingimage`, the same path `ObsidianBasesViews` takes.

- [ ] **Step 2:** `getMdxOptions` gains a `listing?: ListingRenderContext` parameter. In `remarkPlugins`, after `[remarkObsidianBases, …]` and before the changelog entry:

```ts
        ...(siteId
          ? [[remarkListing, { siteId, siteHostname, rootDir, filePath, files, permalinks, ...listing }] as Pluggable]
          : []),
```

(`rehypeListingHeadings` is registered by Task B12 in Phase 3; until then item headings carry the placeholder id, identically in both pipelines.)

- [ ] **Step 3:** `mdx-components-factory.tsx`: `import ListingImage from './listing-image';` and add `ListingImage: withErrorBoundary(ListingImage, 'ListingImage'),` to the `components` object, so one bad image never breaks an `.mdx` page (in `.md` the sanitised `src` from B4 is the guard).
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
const ROWS = [
  { id: '1', path: 'blog/intro.md', appPath: '/blog/intro', permalink: null, metadata: { title: 'Intro', date: '2026-09-18', description: 'First', image: 'https://x.org/a.jpg', authors: ['ada'], category: 'Themes', guests: ['[[people/ada|Ada Lovelace]]'] } },
  { id: '2', path: 'blog/two.md', appPath: '/blog/two', permalink: null, metadata: { title: 'Two', date: '2026-09-17' } },
];
vi.mock('@/lib/listing/query', () => ({
  queryListingIndex: async () => ({ ids: ['1', '2'], paths: ['blog/intro.md', 'blog/two.md'], featured: [], groups: null }),
  fetchRowsByIds: async (_db: unknown, _s: string, ids: string[]) => ROWS.filter((r) => ids.includes(r.id)),
}));
vi.mock('@/lib/listing/authors', () => ({ cachedResolveAuthors: async () => [{ key: 'b', name: 'Ada Lovelace', url: '/people/ada', avatar: 'https://x.org/ada.jpg' }] }));

import { mdxComponentsFactory } from '@/components/public/mdx/mdx-components-factory';
import { getMdxOptions, processMarkdown, protectNonMathDollars, protectWikiLinkAliases } from './markdown';

// `pageSize: 1` gives 2 pages (pagination + SVG icons); `fields` exercises the eyebrow and a wiki alias in meta.
const SRC = '## Intro\n\n```blog\npageSize: 1\nfields:\n  eyebrow: category\n  meta: [guests]\n```\n\n## Outro\n';
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

# Phase 3: PR B presentation (CSS, headings, route, Storybook, themes prerequisite, draft PR, fixture, e2e)

### Task B16: CSS and theme class reference (list, grid, shared parts, page widths)

**Files:**
- Modify: `styles/default-theme.css` (insert after the `.list-component-item-footnote` rule, before `/* List component skeleton */`, around line 1620)
- Modify: `scripts/theme-class-reference.mjs:45` (listings `dom` string) and its `STATE_OWNERS` map; `scripts/theme-class-reference.test.mjs`
- Regenerate: `content/flowershow-app/docs/reference/theme-class-reference.md`

Rules (design section 6): every new selector is wrapped in `:where()` so its specificity is at most one class and any theme rule wins (tech M2); every new rule keys off `data-view` or a class only the new engine emits, so legacy `<List />` is untouched; the listing root never sets `max-width` (tech M1): page-level `list`/`compact` pages are constrained by `.listing-page`. Compact, people, featured and group rules come in Task G2.

- [ ] **Step 1: Add the rules**

```css
  /* ────────────────────────────────────────────────────
   List blocks and page-level listings (lib/listing/render.ts)
   All selectors are :where() so themes always win. Custom properties:
     --list-max-width, --list-gap, --list-card-min, --list-card-radius,
     --list-card-border, --list-card-bg, --list-card-hover-bg,
     --list-media-ratio, --list-media-placeholder, --list-thumb-width,
     --list-avatar-shape, --list-meta-color, --list-eyebrow-color,
     --list-rule-color, --list-compact-meta-width
   ──────────────────────────────────────────────────── */

  /* Page-level list/compact pages share one column (header, intro, listing) */
  :where(.listing-page[data-view="list"], .listing-page[data-view="compact"]) {
    max-width: var(--list-max-width, 44rem);
    margin-inline: auto;
  }

  /* Image ratio: settable from :root through --list-media-ratio */
  :where(.list-component[data-view]) { --_list-ratio: var(--list-media-ratio, 3 / 2); }
  :where(.list-component[data-ratio="16-9"]) { --_list-ratio: var(--list-media-ratio, 16 / 9); }
  :where(.list-component[data-ratio="3-2"]) { --_list-ratio: var(--list-media-ratio, 3 / 2); }
  :where(.list-component[data-ratio="4-3"]) { --_list-ratio: var(--list-media-ratio, 4 / 3); }
  :where(.list-component[data-ratio="1-1"]) { --_list-ratio: var(--list-media-ratio, 1 / 1); }
  :where(.list-component[data-ratio="3-4"]) { --_list-ratio: var(--list-media-ratio, 3 / 4); }

  /* Shared slots */
  :where(.list-component[data-view]) .list-component-item-eyebrow {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.5rem;
    margin: 0 0 0.375rem;
    font-size: 0.8125rem;
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--list-eyebrow-color, var(--color-foreground-500));
  }
  :where(.list-component-item-eyebrow > * + *)::before {
    content: "·";
    margin-right: 0.5rem;
  }
  /* Titles are never clamped (UX m-2) */
  :where(.list-component[data-view]) .list-component-item-headline {
    margin: 0 0 0.375rem;
    font-size: 1.25rem;
    line-height: 1.35;
  }
  :where(.list-component[data-view]) .list-component-item-summary {
    margin: 0 0 0.5rem;
    -webkit-line-clamp: 2;
    color: var(--color-foreground-600);
  }
  :where(.list-component-item-meta) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.125rem 0.5rem;
    font-size: 0.875rem;
    color: var(--list-meta-color, var(--color-foreground-500));
  }
  /* Segments never break internally; a separator may start a wrapped line */
  :where(.list-component-item-meta) > * {
    white-space: nowrap;
  }
  :where(.list-component-item-meta > * + *)::before {
    content: "·";
    margin-right: 0.5rem;
  }
  :where(.list-component-item-authors) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  :where(.list-component-item-author + .list-component-item-author)::before {
    content: ", ";
  }
  :where(.list-component-item-authors-more)::before {
    content: " ";
  }
  :where(.list-component-item-author) {
    color: inherit;
    text-decoration: none;
  }
  :where(.list-component-item-avatars) {
    display: inline-flex;
    margin-right: 0.25rem;
  }
  :where(.list-component-item-avatars > * + *) {
    margin-left: -6px;
  }
  /* One avatar size, here and in ListingImage (20px) */
  :where(.list-component-item-author-avatar) {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: var(--list-avatar-shape, 50%);
    object-fit: cover;
    box-shadow: 0 0 0 2px var(--color-background);
  }
  :where(.list-component[data-view]) .list-component-item-media {
    aspect-ratio: var(--_list-ratio);
  }
  :where(.list-component[data-view]) .list-component-item-media-img {
    border-radius: var(--list-card-radius, 0.5rem);
  }
  :where(.list-component-item-media--placeholder) {
    border-radius: var(--list-card-radius, 0.5rem);
    background: var(--list-media-placeholder, color-mix(in oklch, var(--color-foreground-900) 4%, transparent));
  }

  /* list: text left, thumbnail right; full-width text row without an image */
  :where(.list-component--list) .list-component-item {
    flex-direction: row;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 1.5rem 0;
    border-color: var(--list-rule-color, var(--color-foreground-100));
  }
  :where(.list-component--list) .list-component-item-content {
    flex: 1 1 auto;
    min-width: 0;
  }
  :where(.list-component--list[data-media="thumb"]) .list-component-item-media {
    order: 2;
    flex: 0 0 auto;
    width: var(--list-thumb-width, 160px);
    @media (max-width: 639px) {
      width: var(--list-thumb-width, 88px);
    }
  }
  :where(.list-component--list[data-media="cover"]) .list-component-item {
    flex-direction: column;
  }
  :where(.list-component--list[data-media="cover"]) .list-component-item-media {
    width: 100%;
  }

  /* grid (design 4.9): 3 / 2 / 1 columns from the container width; never the measure */
  :where(.list-component--grid) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--list-card-min, 17.5rem)), 1fr));
    gap: var(--list-gap, 2rem);
    @media (max-width: 639px) {
      gap: var(--list-gap, 1.5rem);
    }
  }
  :where(.list-component--grid) > :is(.list-component-pagination, .list-component-empty, .list-component-group-heading) {
    grid-column: 1 / -1;
  }
  :where(.list-component--grid) .list-component-item {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0;
    border: var(--list-card-border, none);
    border-radius: var(--list-card-radius, 0.5rem);
    background: var(--list-card-bg, transparent);
  }
  :where(.list-component--grid) .list-component-item:hover {
    background: var(--list-card-hover-bg, var(--list-card-bg, transparent));
  }
  :where(.list-component--grid) .list-component-item-media {
    width: 100%;
    border-radius: var(--list-card-radius, 0.5rem);
    box-shadow: 0 0 0 1px var(--color-foreground-100);
  }
  :where(.list-component--grid) .list-component-item-summary {
    font-size: 0.9375rem;
    -webkit-line-clamp: 3;
  }
  /* Whole card clickable; links inside it stay above the overlay (UX m-4) */
  :where(.list-component--grid) .list-component-item-headline-link::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
  }
  :where(.list-component--grid) :is(.list-component-item-author, .list-component-item-meta-value a, .list-component-item-eyebrow a) {
    position: relative;
    z-index: 2;
  }

  /* Pagination, errors */
  :where(a.list-component-pagination-button, a.list-component-pagination-page-button) {
    text-decoration: none;
  }
  /* <a>/<span> cannot match :disabled; mirrors the :disabled rule above. */
  :where(.list-component-pagination-button.is-disabled) {
    cursor: not-allowed;
    opacity: 0.5;
  }
  :where(.list-component-error--block) {
    padding: 1rem 1.25rem;
    border: 1px solid var(--color-foreground-200);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-sm);
  }
  :where(.list-component-error-title) {
    font-weight: var(--font-weight-semibold);
  }
  :where(.list-component-error-list) {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
    list-style: disc;
  }
  :where(.list-component-error-keys) {
    color: var(--color-foreground-500);
  }
```

Why the base rules still lose: the legacy `.list-component-item` rules are one class inside the same `@layer components`; the `:where(...) .list-component-item` rules are also one class and come later in the file, so they win by source order, and an unlayered theme rule beats both. Check every token used exists (`grep -n -- '--color-foreground-600\|--font-weight-semibold\|--radius-lg' styles/default-theme.css`); swap in the nearest existing token if not.

- [ ] **Step 2: Class reference.** Update the listings `dom` tree in `scripts/theme-class-reference.mjs:45`:

```
div.listing-page[data-view] (page-level list/compact pages only)
section.list-component[.list-component--list | --grid | --compact | --people][data-view][data-media][data-ratio][data-listing-notes]   (div without data-view for legacy <List />)
├─ h2.list-component-group-heading (optional, with group)
├─ article.list-component-item[.list-component-item--featured] / .list-component-skeleton-item (legacy only)
│  ├─ .list-component-item-media[.list-component-item-media--placeholder] > a.list-component-item-media-link > img.list-component-item-media-img | span.list-component-item-initials
│  └─ .list-component-item-content
│     ├─ .list-component-item-eyebrow > span
│     ├─ .list-component-item-headline > a.list-component-item-headline-link
│     ├─ .list-component-item-summary
│     ├─ .list-component-item-meta
│     │  ├─ time.list-component-item-date
│     │  ├─ .list-component-item-authors > .list-component-item-avatars > img.list-component-item-author-avatar, .list-component-item-author, .list-component-item-authors-more
│     │  └─ .list-component-item-meta-value[data-field]
│     └─ .list-component-item-footnote (legacy only)
└─ nav.list-component-pagination
   ├─ .list-component-pagination-nav > .list-component-pagination-button[.is-disabled]
   └─ .list-component-pagination-pages
.list-component-empty (no matching pages)
.list-component-error[.list-component-error--block] (items failed to load / invalid block)
```

(encoded with `\n` like the existing string). Add `'is-disabled': '.list-component-pagination-button'` to `STATE_OWNERS` and a row to `scripts/theme-class-reference.test.mjs` asserting the generated reference says `.list-component-pagination-button` for `.is-disabled`, not `undefined` (tech minor 11).

- [ ] **Step 3:** `pnpm docs:theme-classes`; `pnpm docs:theme-classes:check` and `node --test scripts/theme-class-reference.test.mjs` pass.
- [ ] **Step 4:** Visual check happens in Storybook (Task B24): list (thumb, cover, none), grid (images, mixed, none), page width, light, dark, mobile, and each official theme.
- [ ] **Step 5: Commit** `feat(listing): default styles through :where(), page widths and class reference`

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
import { LISTING_GROUP_HEADING_CLASS, LISTING_HEADING_PLACEHOLDER_ID, LISTING_HEADLINE_CLASS } from './listing/render';

/** Runs after rehype-slug: listing item headings get no id, so no anchor, no slug collisions. */
export default function rehypeListingHeadings() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      const cls = node.properties?.className;
      // item titles and group headings share the placeholder id
      if (Array.isArray(cls) && (cls.includes(LISTING_HEADLINE_CLASS) || cls.includes(LISTING_GROUP_HEADING_CLASS)) && node.properties.id === LISTING_HEADING_PLACEHOLDER_ID) delete node.properties.id;
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
  return Array.isArray(className) && (className.includes('list-component-item-headline') || className.includes('list-component-group-heading'));
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

### Task B15: route resolver, page-level SSR, zero-config, widths, canonical/noindex

**Files:**
- Create: `lib/listing/route.ts`, `lib/listing/route.test.ts`, `lib/listing/page-listing.tsx`, `components/public/listing/virtual-listing-page.tsx`
- Modify: `lib/render-page-content.tsx`, `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` (`generateMetadata` and `SitePage`), `app/(public)/site/[user]/[project]/[[...slug]]/_components/url-normalizer.tsx`

This task replaces v4's B15 + B27. Design 4.1, 4.10, 6 ("Widths"), 7.3.

**Interfaces:**
- Consumes: `parseListingSpec`, `implicitListingFrom` (B2), `isDraft` (B3), `resolveLocale` (B4), `listingCanonical`, `pageFromSearchParam` (B6), `processMarkdown` + `ListingRenderContext` (B10/B13), `dirOf`, `isFolderIndexPath`, `normalizeDir`, `entryTitleFromPath` (`@/lib/changelog`), `encodeSlug`, `filePathToSlug` (`@flowershow/core`).
- Produces (`route.ts`, pure):

```ts
export const AUTO_LISTING_DIR_NAMES = ['blog', 'posts'] as const;
export type ListingRoute =
  | { kind: 'none' }
  | { kind: 'virtual'; dir: string; title: string }
  | { kind: 'page'; options: unknown; defaultFrom: string | null; source: 'layout' | 'auto'; view: ListingView; pageSize: number | null };
export function isAutoListingDirName(dir: string): boolean;
export function hasExplicitListing(content: string): boolean;                       // AST: list/blog/base code nodes or <List
export function virtualListingDir(slug: string, siteFilePaths: string[]): string | null; // slug as page.tsx's decodedSlug
export function autoListingFor(args: { blobPath: string; metadata: Record<string, unknown> | null; content: string; siteFilePaths: string[] }): { options: unknown; defaultFrom: string } | null;
export function resolveListingRoute(args: { slug: string; blob: { path: string } | null; metadata: Record<string, unknown> | null; content: string; siteFilePaths: string[]; changelogKind: 'index' | 'entry' | 'file' | null }): ListingRoute;
```

- Produces (`page-listing.tsx`): `renderPageListing(args: { site: { id: string; rootDir?: string | null }; filePath: string; siteHostname: string; siteFilePaths: string[]; permalinks: Record<string, string>; route: Extract<ListingRoute, { kind: 'page' | 'virtual' }>; page: number; publicUrl: string; pageTitle?: string; locale: string }): Promise<React.ReactElement>` — `processMarkdown('', { …, listing: { implicit, page, publicUrl, locale } })`.

- [ ] **Step 1: Failing table test** (`lib/listing/route.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { autoListingFor, hasExplicitListing, isAutoListingDirName, resolveListingRoute, virtualListingDir } from './route';

const files = ['/blog/a.md', '/blog/2026/b.md', '/Posts/x.md', '/posts-old/y.md', '/empty/blog/pic.png', '/withreadme/blog/README.md', '/withreadme/blog/c.md', '/My Blog/posts/p.md', '/lower/blog/readme.md', '/lower/blog/q.md', '/notes.md', '/notes/n.md', '/podcast.md', '/podcast/ep.md', '/fn/blog.md', '/fn/blog/z.md'];
const route = (o: Partial<Parameters<typeof resolveListingRoute>[0]>) =>
  resolveListingRoute({ slug: '/', blob: null, metadata: null, content: '', siteFilePaths: files, changelogKind: null, ...o });

describe('names and detection', () => {
  it('blog and posts, any case, any depth; nothing else', () => {
    for (const d of ['blog', 'Blog', 'POSTS', 'notes/blog', '/blog/']) expect(isAutoListingDirName(d)).toBe(true);
    for (const d of ['', 'articles', 'news', 'notes', 'blogs', 'blog/2026', 'myblog']) expect(isAutoListingDirName(d)).toBe(false);
  });
  it('hasExplicitListing uses the AST: nested fences count, prose and other code do not', () => {
    expect(hasExplicitListing('Intro\n\n```blog\nlimit: 3\n```')).toBe(true);
    expect(hasExplicitListing('> [!note]\n> ```list\n> from: x\n> ```')).toBe(true);
    expect(hasExplicitListing('- item\n\n  ```blog\n  ```')).toBe(true);
    expect(hasExplicitListing('~~~base\nviews: []\n~~~')).toBe(true);
    expect(hasExplicitListing('<List dir="/blog" />')).toBe(true);
    expect(hasExplicitListing('---\ntitle: x\n---\nI keep a blog.\n\n- [One](one.md)')).toBe(false);
    expect(hasExplicitListing('```js\nconst blog = 1;\n```')).toBe(false);
    expect(hasExplicitListing('```Blog\n```')).toBe(false); // the plugin is case-sensitive too, so this renders nothing and is not a listing
    expect(hasExplicitListing('Use `<List />` in MDX.')).toBe(false); // inline code, not an element
  });
});

describe('virtualListingDir (case 1)', () => {
  it('README-less blog/posts folder with pages; slug in the URL form', () => {
    expect(virtualListingDir('/blog', files)).toBe('blog');
    expect(virtualListingDir('/Posts', files)).toBe('Posts');
    expect(virtualListingDir('/posts', files)).toBeNull(); // the slug must match the folder's real case
    expect(virtualListingDir('/My+Blog/posts', files)).toBe('My Blog/posts'); // encoded slug (tech minor 2)
    expect(virtualListingDir('/lower/blog', files)).toBe('lower/blog'); // readme.md is not an index for ingestion, so /lower/blog has no blob
    expect(virtualListingDir('/empty/blog', files)).toBeNull();
    expect(virtualListingDir('/withreadme/blog', files)).toBeNull();
    expect(virtualListingDir('/articles', ['/articles/a.md'])).toBeNull();
  });
});

describe('autoListingFor (cases 2 and 3)', () => {
  const prose = 'Notes on building things.';
  it('prose-only README in a blog/posts folder; folder note beside the folder', () => {
    expect(autoListingFor({ blobPath: 'blog/README.md', metadata: { title: 'Blog' }, content: prose, siteFilePaths: files })).toEqual({ options: undefined, defaultFrom: 'blog' });
    expect(autoListingFor({ blobPath: 'fn/blog.md', metadata: {}, content: prose, siteFilePaths: files })).toEqual({ options: undefined, defaultFrom: 'fn/blog' });
    expect(autoListingFor({ blobPath: 'blog/README.md', metadata: { list: { view: 'grid' } }, content: prose, siteFilePaths: files })?.options).toEqual({ view: 'grid' });
  });
  it('back-compat: any layout, list: false, an existing listing, other folders, other pages are untouched', () => {
    const none = (blobPath: string, metadata: Record<string, unknown>, content = prose) => expect(autoListingFor({ blobPath, metadata, content, siteFilePaths: files })).toBeNull();
    none('blog/README.md', { layout: 'plain' });
    none('blog/README.md', { list: false });
    none('blog/README.md', { list: 'false' });
    none('blog/README.mdx', {}, '<List dir="/blog" />');
    none('blog/index.md', {}, '> ```blog\n> ```');
    none('notes.md', {});            // notes is not an auto folder name
    none('blog/first-post.md', {});
    none('podcast.md', {});          // folder note, but podcast is not an auto folder name
  });
});

describe('resolveListingRoute (precedence table)', () => {
  it('no blob: virtual folder; changelog and other misses are none', () => {
    expect(route({ slug: '/blog' })).toEqual({ kind: 'virtual', dir: 'blog', title: 'Blog' });
    expect(route({ slug: '/changelog', changelogKind: 'index' })).toEqual({ kind: 'none' });
    expect(route({ slug: '/nope' })).toEqual({ kind: 'none' });
  });
  it('layout: list wins and is page-level with its view and page size', () => {
    expect(route({ slug: '/projects', blob: { path: 'projects/README.md' }, metadata: { layout: 'list', list: { view: 'grid' } }, siteFilePaths: [...files, '/projects/a.md'] }))
      .toEqual({ kind: 'page', options: { view: 'grid' }, defaultFrom: 'projects', source: 'layout', view: 'grid', pageSize: 20 });
  });
  it('auto cases are page-level list views', () => {
    expect(route({ slug: '/blog', blob: { path: 'blog/README.md' }, metadata: {}, content: 'Hi.' })).toMatchObject({ kind: 'page', source: 'auto', view: 'list', defaultFrom: 'blog' });
  });
  it('a changelog index or file is never a listing page; an invalid list: map still routes (the plugin shows the error card)', () => {
    expect(route({ slug: '/changelog', blob: { path: 'changelog/README.md' }, metadata: { layout: 'list' }, changelogKind: 'index' })).toEqual({ kind: 'none' });
    expect(route({ slug: '/blog', blob: { path: 'blog/README.md' }, metadata: { layout: 'list', list: { veiw: 'x' } } })).toMatchObject({ kind: 'page', view: 'list' });
  });
});
```

The `changelogKind: 'index'` + `layout: list` case cannot happen in practice (`isChangelogDir` already opts out on any other `layout`); the row pins that the route never double-renders.

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run --project=unit lib/listing/route.test.ts`
- [ ] **Step 3: Implement `route.ts`**

```ts
import { encodeSlug, filePathToSlug } from '@flowershow/core';
import matter from 'gray-matter';
import type { Code, Html } from 'mdast';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { dirOf, entryTitleFromPath, isFolderIndexPath, normalizeDir } from '@/lib/changelog';
import { implicitListingFrom, type ListingView, parseListingSpec } from './spec';

export const AUTO_LISTING_DIR_NAMES = ['blog', 'posts'] as const;
const MARKDOWN_RE = /\.mdx?$/i;
/** Ingestion's index rule (packages/core filePathToSlug): exact README/index. */
const INGESTION_INDEX_RE = /(?:^|\/)(?:README|index)\.mdx?$/;
const LISTING_LANGS = new Set(['list', 'blog', 'base']);

export type ListingRoute =
  | { kind: 'none' }
  | { kind: 'virtual'; dir: string; title: string }
  | { kind: 'page'; options: unknown; defaultFrom: string | null; source: 'layout' | 'auto'; view: ListingView; pageSize: number | null };

export function isAutoListingDirName(dir: string): boolean {
  const last = normalizeDir(dir).split('/').pop() ?? '';
  return (AUTO_LISTING_DIR_NAMES as readonly string[]).includes(last.toLowerCase());
}

/** Same AST the plugin sees, so detection and rendering never disagree (tech minor 1). */
export function hasExplicitListing(content: string): boolean {
  let body = content;
  try {
    body = matter(content).content;
  } catch {
    // malformed frontmatter: scan the raw text
  }
  const tree = unified().use(remarkParse).parse(body);
  let found = false;
  visit(tree, (node) => {
    if (found) return;
    if (node.type === 'code' && LISTING_LANGS.has((node as Code).lang ?? '')) found = true;
    else if (node.type === 'html' && /<List[\s/>]/.test((node as Html).value)) found = true;
  });
  return found;
}

const plain = (files: string[]) => files.map((f) => f.replace(/^\/+/, ''));
const folderSlug = (dir: string) => encodeSlug(filePathToSlug(`${dir}/index.md`));

export function virtualListingDir(slug: string, siteFilePaths: string[]): string | null {
  const paths = plain(siteFilePaths);
  const dirs = new Set<string>();
  for (const p of paths) {
    if (!MARKDOWN_RE.test(p)) continue;
    const parts = p.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) {
      const d = parts.slice(0, i).join('/');
      if (isAutoListingDirName(d)) dirs.add(d);
    }
  }
  for (const dir of dirs) {
    if (folderSlug(dir) !== slug) continue;
    if (paths.some((p) => dirOf(p) === dir && INGESTION_INDEX_RE.test(p))) return null;
    return dir;
  }
  return null;
}

export function autoListingFor({ blobPath, metadata, content, siteFilePaths }: { blobPath: string; metadata: Record<string, unknown> | null; content: string; siteFilePaths: string[] }): { options: unknown; defaultFrom: string } | null {
  const path = blobPath.replace(/^\/+/, '');
  let dir: string | null = null;
  if (isFolderIndexPath(path)) dir = dirOf(path);
  else {
    const sibling = path.replace(MARKDOWN_RE, '');
    if (isAutoListingDirName(sibling) && implicitListingFrom(path, siteFilePaths) === sibling) dir = sibling; // folder note (case 3)
  }
  if (dir === null || !isAutoListingDirName(dir)) return null;
  if (metadata?.layout) return null;
  if (metadata?.list === false || metadata?.list === 'false') return null;
  if (hasExplicitListing(content)) return null;
  return { options: metadata?.list, defaultFrom: dir };
}

function pageRoute(options: unknown, defaultFrom: string | null, source: 'layout' | 'auto'): ListingRoute {
  const parsed = parseListingSpec(options, { source: 'layout', defaultFrom });
  return { kind: 'page', options, defaultFrom, source, view: parsed.ok ? parsed.spec.view : 'list', pageSize: parsed.ok ? parsed.spec.pageSize : null };
}

export function resolveListingRoute({ slug, blob, metadata, content, siteFilePaths, changelogKind }: { slug: string; blob: { path: string } | null; metadata: Record<string, unknown> | null; content: string; siteFilePaths: string[]; changelogKind: 'index' | 'entry' | 'file' | null }): ListingRoute {
  if (!blob) {
    if (changelogKind) return { kind: 'none' };
    const dir = virtualListingDir(slug, siteFilePaths);
    return dir === null ? { kind: 'none' } : { kind: 'virtual', dir, title: entryTitleFromPath(dir) };
  }
  if (changelogKind === 'index' || changelogKind === 'file') return { kind: 'none' };
  if (metadata?.layout === 'list') return pageRoute(metadata?.list, implicitListingFrom(blob.path, siteFilePaths), 'layout');
  const auto = autoListingFor({ blobPath: blob.path, metadata, content, siteFilePaths });
  return auto ? pageRoute(auto.options, auto.defaultFrom, 'auto') : { kind: 'none' };
}
```

Check: `remark-parse` as a dependency of the app (it is: `lib/markdown.ts` imports it); `entryTitleFromPath('My Blog/posts')` → "Posts".

- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: `page-listing.tsx` and `virtual-listing-page.tsx`**

```tsx
// lib/listing/page-listing.tsx
import { processMarkdown } from '@/lib/markdown';
import type { ListingRoute } from './route';

/** A page-level listing, always through the .md pipeline (server-rendered whatever the page's renderMode; tech M6). */
export async function renderPageListing(args: {
  site: { id: string; rootDir?: string | null }; filePath: string; siteHostname: string; siteFilePaths: string[]; permalinks: Record<string, string>;
  route: Extract<ListingRoute, { kind: 'page' } | { kind: 'virtual' }>; page: number; publicUrl: string; pageTitle?: string; locale: string;
}) {
  const implicit = args.route.kind === 'virtual'
    ? { options: undefined, defaultFrom: args.route.dir, pageTitle: args.pageTitle ?? args.route.title }
    : { options: args.route.options, defaultFrom: args.route.defaultFrom, pageTitle: args.pageTitle };
  return processMarkdown('', {
    filePath: args.filePath,
    files: args.siteFilePaths,
    siteHostname: args.siteHostname,
    siteId: args.site.id,
    rootDir: args.site.rootDir ?? undefined,
    permalinks: args.permalinks,
    listing: { implicit, page: args.page, publicUrl: args.publicUrl, locale: args.locale },
  });
}
```

```tsx
// components/public/listing/virtual-listing-page.tsx
import { BlogLayout } from '@/components/public/layouts/blog';

/** Zero-config case 1: same shell as the README-less changelog page (no sidebar, ToC, breadcrumbs or hero). */
export function VirtualListingPage({ title, listing, view }: { title: string; listing: React.ReactNode; view: string }) {
  return (
    <div className="listing-page" data-view={view}>
      <BlogLayout title={title}>
        <div className="rendered-mdx" id="mdxpage">{listing}</div>
      </BlogLayout>
    </div>
  );
}
```

- [ ] **Step 6: `render-page-content.tsx`.** `RenderPageContentOptions` gains `listing?: ListingRenderContext` (no `implicit` here: page-level listings are rendered separately); pass it to `processMarkdown({ …, listing })` and `getMdxOptions({ …, listing })`. The changelog index's call passes nothing.
- [ ] **Step 7: `SitePage`.** After `changelog` is resolved and, for a blob, after `pageContent` is loaded:

```ts
  const searchParams = await props.searchParams;
  const listingPageNumber = pageFromSearchParam(searchParams.page);
  const listingRoute = resolveListingRoute({
    slug: decodedSlug, blob: blob ? { path: blob.path } : null, metadata: (blob?.metadata as Record<string, unknown> | null) ?? null,
    content: pageContent ?? '', siteFilePaths, changelogKind: changelog?.kind ?? null,
  });
  const locale = resolveLocale((blob?.metadata as PageMetadata | null)?.locale, siteConfig?.locale);
```

(For the `!blob` branch, compute `listingRoute` with `content: ''` before the tag/changelog checks' final `notFound()`.)

In the `!blob` branch, after the tag-page checks and before `if (changelog?.kind !== 'index') notFound();`:

```tsx
    if (listingRoute.kind === 'virtual') {
      const listing = await renderPageListing({ site, filePath: `${listingRoute.dir}/index.md`, siteHostname, siteFilePaths, permalinks: permalinksMapping, route: listingRoute, page: listingPageNumber, publicUrl: decodedSlug, locale });
      return (
        <>
          <UrlNormalizer />
          {chromeMarker}
          <div className="layout-inner">
            <div className="layout-inner-center">
              <main className="page-main">
                <VirtualListingPage title={listingRoute.title} listing={listing} view="list" />
              </main>
            </div>
          </div>
        </>
      );
    }
```

For a blob with `listingRoute.kind === 'page'`:

```tsx
  const pageLevel = listingRoute.kind === 'page';
  const publicUrl = ensureLeadingSlash(blob.permalink || blob.appPath || blob.path);
  const compiledContent = await renderPageContent({
    …existing args,
    listing: { page: listingPageNumber, publicUrl, locale, paginationClaimed: pageLevel && listingRoute.pageSize != null },
  });
  const pageListing = pageLevel
    ? await renderPageListing({ site, filePath: blob.path, siteHostname, siteFilePaths, permalinks: permalinksMapping, route: listingRoute, page: listingPageNumber, publicUrl, pageTitle: metadata?.title, locale })
    : null;
```

and in the `BlogLayout` branch render `<div className="rendered-mdx" id="mdxpage">{compiledContent}{pageListing}</div>`, wrapping the `BlogLayout` in `<div className="listing-page" data-view={listingRoute.view}>` when `pageLevel` (CSS constrains only `list`/`compact`). Do the same in the `layout: plain` branch only if `layout` is not `plain` (it never is for a listing page: `layout: plain` opts out of zero-config, and `layout: list` is not plain).

- [ ] **Step 8: `generateMetadata`.** Add `searchParams: Promise<Record<string, string | string[] | undefined>>` to its props. In the `getBlob` `.catch`, before `notFound()`: `if (isAutoListingDirName(decodedSlug)) return null;`. Fetch `siteFilePaths` with `api.site.getAllBlobPaths` (cached) and compute `listingRoute` as in `SitePage` (pass `content: ''`: `generateMetadata` does not load the body, so a prose README with its own block is treated as auto here; harmless, since only the self-canonical and `noindex` depend on it). Then:

```ts
  const pageLevel = listingRoute.kind !== 'none';
  const pageParam = (await props.searchParams)?.page;
  const titleFallback = listingRoute.kind === 'virtual' ? listingRoute.title : undefined;
  // …buildPageTitle(metadata?.title ?? (isChangelogFallback ? 'Changelog' : isTagIndexRoute ? 'Tags' : tagListingTitle ?? titleFallback), siteName)
  const noindex = isDraft(metadata as Record<string, unknown> | null) || (pageLevel && (await isListingPageOutOfRange({ site, listingRoute, blob, siteFilePaths, page: pageFromSearchParam(pageParam) })));
  // alternates.canonical: listingCanonical(url, pageLevel, pageParam)
  // robots: …(noindex || annotationsOn ? { robots: { index: false, follow: false } } : {})
```

`isListingPageOutOfRange` lives in `lib/listing/page-listing.tsx`: it parses the route's spec, resolves the folder like the plugin, calls the cached `queryListingIndex` and returns `page > Math.max(1, Math.ceil(count / pageSize))` (false for page 1 or an unparsable spec). Add a unit test for it with `queryListingIndex` mocked (counts 0, 20, 21 with pages 1, 2, 3).

- [ ] **Step 9: `UrlNormalizer` keeps `?page`** (tech minor 3): `router.replace(normalizedPath + window.location.search)`.
- [ ] **Step 10: Verify locally:** `npx vitest run --project=unit lib/listing lib/changelog-context.test.ts` and `npx tsc --noEmit -p tsconfig.json 2>&1 | tail -1` (no new errors). Real pages are checked by the fixture (B17) and e2e (B18) in CI, including an `.mdx` README whose page-level listing must be in the initial HTML.
- [ ] **Step 11: Commit** `feat(listing): route resolver, server-rendered page-level listings, zero-config folders`

### Task B24: Storybook mockup and theme stories (primary visual review)

**Files:**
- Create: `stories/Listing.stories.tsx` (beside `stories/List.stories.tsx`, the legacy "before"), `stories/__fixtures__/listing.tsx`, `stories/__fixtures__/listing-assets/*`
- Create: `scripts/sync-theme-fixtures.mjs`, `stories/__fixtures__/themes/.gitkeep`; add `apps/flowershow/stories/__fixtures__/themes/*.css` to `.gitignore`
- Modify: `.storybook/main.ts` (`staticDirs`)

**Interfaces:**
- Consumes: `renderListing`, `renderListingError` (B8), `parseListingBlock`, `parseListingSpec` (B2), `sliceListing` (B6), `formatListingDate`, `groupLabel` (B4 `dates.ts`, browser-safe), `ListingItem` type (B4), `ResolvedAuthor` type (B7), `ListingImage` (B11), `styles/default-theme.css` (B16), `BlogLayout`.
- Must not import `lib/listing/query.ts`, `lib/listing/authors.ts` (runtime) or `lib/remark-listing.ts`: they pull in Prisma and `next/cache`. `import type` only.

Why: the reviewer approves the look here with no database, and every official theme is checked against the new markup locally (UX B-1, tech M2/M3). Every story parses its spec from the exact Markdown shown in the PR. PR B covers `list`, `grid`, zero-config, notes, errors, dark, mobile and the six themes; Task G3 adds `compact`, `people`, `featured` and grouping.

- [ ] **Step 1: Copy real assets** (run from the worktree root):

```bash
cd /Users/rgrp/src/flowershow/flowershow-listings
D=apps/flowershow/stories/__fixtures__/listing-assets; mkdir -p $D
for f in annotations breadcrumbs file-types publish-with-ai publish-without-an-account publish-from-claude-and-chatgpt social-preview-cards customize-your-site markdown-mermaid-bases-pdf; do cp content/flowershow-app/assets/changelog-$f.webp $D/; done
cp content/flowershow-app/people/rufuspollock.jpeg content/flowershow-app/people/olayway.jpeg content/flowershow-app/people/abeelha.jpg $D/
du -sh $D   # expect well under 1 MB
```

- [ ] **Step 1b: Theme CSS for stories.** `scripts/sync-theme-fixtures.mjs` copies each official theme's CSS into a gitignored folder that Storybook serves at `/themes/<name>.css`:

```js
// Usage (from apps/flowershow): node scripts/sync-theme-fixtures.mjs [themesDir]
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const themesDir = resolve(process.argv[2] ?? process.env.THEMES_DIR ?? '../../../themes');
const out = resolve('stories/__fixtures__/themes');
mkdirSync(out, { recursive: true });
for (const name of ['leaf', 'lessflowery', 'letterpress', 'superstack', 'monospace', 'material-draft']) {
  const src = join(themesDir, name, 'theme.css');
  if (!existsSync(src)) throw new Error(`missing ${src}`);
  copyFileSync(src, join(out, `${name}.css`));
}
console.log(`synced 6 themes from ${themesDir}`);
```

In `.storybook/main.ts` add `staticDirs: [{ from: '../stories/__fixtures__/themes', to: '/themes' }]`. Commit `stories/__fixtures__/themes/.gitkeep`. Run `node scripts/sync-theme-fixtures.mjs /Users/rgrp/src/flowershow/themes` (main checkout of the themes repo = "before"); for C1 use the themes worktree (`/Users/rgrp/src/flowershow/themes-listings`) = "after".

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
import { formatListingDate, groupLabel } from '@/lib/listing/dates';
import type { ListingItem } from '@/lib/listing/items';
import { renderListing, renderListingError } from '@/lib/listing/render';
import { type ListingSpec, parseListingBlock, parseListingSpec } from '@/lib/listing/spec';
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

const src = (m: unknown) => (m == null ? null : typeof m === 'string' ? m : (m as { src: string }).src);

export const authors = new Map<string, ResolvedAuthor>([
  ['rufuspollock', { key: 'rufuspollock', name: 'Rufus Pollock', url: '/people/rufuspollock', avatar: src(rufus)! }],
  ['olayway', { key: 'olayway', name: 'Ola Rubaj', url: '/people/olayway', avatar: src(ola)! }],
  ['guest', { key: 'guest', name: 'Guest Writer', url: null }],
]);

/** A story item: a ListingItem plus raw values for eyebrow/meta/group keys, so `fields`/`group` in the shown Markdown take effect. */
export type StoryItem = ListingItem & { values: Record<string, string> };

const post = (slug: string, title: string, date: string, summary: string, image: unknown, handles: string[], values: Record<string, string> = {}): StoryItem => ({
  path: `blog/${date}-${slug}.md`, url: `/blog/${date}-${slug}`, title, date, dateInEyebrow: false, summary, image: src(image), authorHandles: handles, eyebrow: [], meta: [], group: null,
  values: { ...values },
});

/** Real flowershow.app changelog entries (content/flowershow-app/changelog), newest first. */
export const realPosts: StoryItem[] = [
  post('mermaid-bases-pdf-in-markdown', 'Mermaid, Obsidian Bases and PDF embeds now work in plain Markdown', '2026-10-10', 'Mermaid diagrams, Obsidian Bases, the PDF viewer and code-block copy buttons now work in .md pages. You no longer need to switch to MDX.', mermaid, ['rufuspollock'], { category: 'Markdown', tags: 'featured' }),
  post('custom-footer', 'Customize your site even more', '2026-10-08', 'Premium sites can replace the default footer and navbar with their own HTML, any page can hide the navbar or footer, and brand fonts, tag colors and list cards are easier to style.', customize, ['rufuspollock'], { category: 'Themes' }),
  post('reading-time', 'Show reading time in the page header', '2026-10-06', 'Pages can show an estimated reading time, like "8 min read", next to the authors and date.', null, ['olayway'], { category: 'Pages' }),
  post('breadcrumbs', 'Show breadcrumbs above the page title', '2026-10-06', 'Pages now show a breadcrumb trail like "Guides › Install" above the title, on desktop and mobile.', breadcrumbs, ['olayway'], { category: 'Pages' }),
  post('annotations', 'Get feedback on drafts with annotations', '2026-10-05', 'Turn on annotations and anyone with the link can select text on your page and leave a note, no account needed. Then your AI agent pulls the open notes, revises your pages and resolves them.', annotations, ['rufuspollock', 'olayway'], { category: 'Collaboration', tags: 'featured' }),
  post('social-preview-cards', 'Every page gets its own social preview', '2026-10-05', "Every page on your site now gets a generated social preview card with its title, description and site name, and a short description is computed when you haven't written one.", social, ['rufuspollock'], { category: 'SEO' }),
  post('publish-from-claude-and-chatgpt', 'Publish from Claude and ChatGPT (beta)', '2026-10-03', 'Add the Flowershow connector to Claude or ChatGPT, ask it to publish, and get a live link. Nothing to install, no account needed.', claude, ['rufuspollock'], { category: 'AI', tags: 'featured' }),
  post('publish-without-an-account', 'Publish without an account', '2026-09-30', 'Run fl --anon to put a folder online with no signup, then claim it to keep it.', anon, ['rufuspollock', 'guest'], { category: 'CLI' }),
  post('publish-with-ai', 'Publish with AI', '2026-09-30', 'Go from your AI session to a live website. A new Publish with AI page, an updated Flowershow skill, per-agent install guides and a safer fl CLI.', ai, ['rufuspollock'], { category: 'AI' }),
  post('more-than-markdown', 'Publish HTML, not just Markdown', '2026-09-30', 'HTML pages publish as-is with their CSS, JavaScript and data, side by side with Markdown. New guides cover what you can publish and how.', fileTypes, ['rufuspollock'], { category: 'Publishing' }),
];

/** realPosts first, then older generated posts (spread over 2025 and 2026, for year/month grouping and 12 pages at 20 per page). */
export const manyPosts = (n: number): StoryItem[] => [
  ...realPosts,
  ...Array.from({ length: Math.max(0, n - realPosts.length) }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8, 28) - (i + 1) * 3 * 86400000).toISOString().slice(0, 10);
    return post(`older-${i}`, `Older update ${i + 1}`, d, 'An older entry, kept to show pagination and grouping.', null, ['olayway'], { category: 'Updates' });
  }),
];

/** Group keys the way lib/listing/items.ts groupKey computes them; labels via the real groupLabel (PR B2 stories). */
function storyGroupKey(it: StoryItem, spec: ListingSpec): string | null {
  const g = spec.group;
  if (g.by === 'none') return null;
  if (g.by === 'field') return it.values[g.field] ?? '';
  if (g.by === 'folder') return it.values.folder ?? '';
  if (!it.date) return '';
  return g.by === 'year' ? it.date.slice(0, 4) : g.by === 'month' ? it.date.slice(0, 7) : it.date;
}

/** Apply the spec's slot map the way toListingItem would (eyebrow/meta from raw values; slots set to none emptied). */
function applySpec(items: StoryItem[], spec: ListingSpec, locale: string): ListingItem[] {
  const f = spec.fields;
  return items.map((it) => {
    const key = storyGroupKey(it, spec);
    return {
      ...it,
      date: f.date ? it.date : null,
      dateInEyebrow: f.eyebrow.includes('date'),
      summary: f.summary ? it.summary : null,
      image: f.image ? it.image : null,
      authorHandles: f.authors ? it.authorHandles : [],
      eyebrow: f.eyebrow.flatMap((k) => (k === 'date' ? (it.date ? [{ text: formatListingDate(it.date, locale) }] : []) : it.values[k] ? [{ text: it.values[k]! }] : [])),
      meta: f.meta.filter((k) => it.values[k]).map((k) => ({ key: k, label: k, parts: [{ text: it.values[k]! }] })),
      group: key === null ? null : groupLabel(key, spec.group, locale),
    };
  });
}

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

/**
 * `implicit`: a page-level listing (`layout: list` or zero-config); its options come from `listOptions` (the `list:` map).
 * Items are pre-filtered and pre-sorted (filtering and sorting are unit-tested in B4).
 */
export function ListingFromMarkdown({ markdown, items, page = 1, publicUrl = '/blog', label, implicit = false, listOptions, locale = 'en-US' }: { markdown: string; items: StoryItem[]; page?: number; publicUrl?: string; label?: string; implicit?: boolean; listOptions?: unknown; locale?: string }) {
  const result = implicit ? parseListingSpec(listOptions, { source: 'layout', defaultFrom: 'blog' }) : (() => { const { lang, code } = fence(markdown); return parseListingBlock(lang, code); })();
  if (!result.ok) return toReact(renderListingError(result.errors, implicit ? 'List settings have problems' : 'List block has problems'));
  const mapped = applySpec(items, result.spec, locale);
  return toReact(renderListing({ spec: result.spec, page: sliceListing(mapped, result.spec, page), authors, publicUrl, locale, label: implicit ? (label ?? 'Blog') : undefined, notes: result.notes }));
}

/** Realistic projects (grid stories, PR B) and people (PR B2, Task G3). */
export const projects: StoryItem[] = [
  { path: 'projects/flowershow/index.md', url: '/projects/flowershow', title: 'Flowershow', date: null, dateInEyebrow: false, summary: 'Turn Markdown into a website in seconds.', image: src(ai), authorHandles: [], eyebrow: [], meta: [], group: null, values: { status: 'In progress', client: 'Open source' } },
  { path: 'projects/annotations/index.md', url: '/projects/annotations', title: 'Annotations', date: null, dateInEyebrow: false, summary: 'Select text on any page and leave a note.', image: src(annotations), authorHandles: [], eyebrow: [], meta: [], group: null, values: { status: 'Shipped', client: 'Flowershow' } },
  { path: 'projects/connector.md', url: '/projects/connector', title: 'Claude and ChatGPT connector', date: null, dateInEyebrow: false, summary: 'Publish from a chat with no install.', image: src(claude), authorHandles: [], eyebrow: [], meta: [], group: null, values: { status: 'Beta', client: 'Flowershow' } },
  { path: 'projects/themes.md', url: '/projects/themes', title: 'Themes', date: null, dateInEyebrow: false, summary: 'Six official themes on one stable class contract.', image: null, authorHandles: [], eyebrow: [], meta: [], group: null, values: { status: 'Shipped', client: 'Community' } },
];
export const people: StoryItem[] = [
  { path: 'people/abeelha.md', url: '/people/abeelha', title: 'Abeelha', date: null, dateInEyebrow: false, summary: 'Builds the publishing pipeline and the CLI.', image: src(abeelha), authorHandles: [], eyebrow: [], meta: [], group: null, values: { role: 'Engineer', team: 'Engineering' } },
  { path: 'people/olayway.md', url: '/people/olayway', title: 'Ola Rubaj', date: null, dateInEyebrow: false, summary: 'Works on rendering, themes and Obsidian support.', image: src(ola), authorHandles: [], eyebrow: [], meta: [], group: null, values: { role: 'Engineer', team: 'Engineering' } },
  { path: 'people/rufuspollock.md', url: '/people/rufuspollock', title: 'Rufus Pollock', date: null, dateInEyebrow: false, summary: 'Founder. Writes about open knowledge and publishing.', image: src(rufus), authorHandles: [], eyebrow: [], meta: [], group: null, values: { role: 'Founder', team: 'Leadership' } },
];
```


- [ ] **Step 3: Stories** (`stories/Listing.stories.tsx`)

```tsx
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';
import { expect } from 'storybook/test';
import { BlogLayout } from '@/components/public/layouts/blog';
import { ListingFromMarkdown, manyPosts, projects, realPosts } from '@/stories/__fixtures__/listing';
import '@/styles/default-theme.css';

/** Page-like shell; sets data-theme for dark stories and loads an official theme's CSS when asked. */
const withPage: Decorator = (Story, ctx) => {
  const theme = (ctx.parameters.theme as string) ?? 'light';
  const themeName = ctx.parameters.flowershowTheme as string | undefined;
  const width = (ctx.parameters.contentWidth as string) ?? '60rem';
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const link = themeName ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `/themes/${themeName}.css` }) : null;
    if (link) document.head.appendChild(link);
    return () => link?.remove();
  }, [theme, themeName]);
  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100vh', padding: '2rem 1rem' }}>
      <main className="page-main" style={{ maxWidth: width, margin: '0 auto' }}>
        <Story />
      </main>
    </div>
  );
};
/** A page-level listing page: the same .listing-page wrapper and BlogLayout header the route renders. */
const asPage = (title: string, intro?: string, view = 'list'): Decorator => (Story) => (
  <div className="listing-page" data-view={view}>
    <BlogLayout title={title}>
      <div className="rendered-mdx" id="mdxpage">
        {intro ? <p>{intro}</p> : null}
        <Story />
      </div>
    </BlogLayout>
  </div>
);
/** An inline block inside ordinary page content. */
const inline: Decorator = (Story) => (
  <div className="rendered-mdx" id="mdxpage">
    <h2>Latest posts</h2>
    <Story />
  </div>
);

const meta: Meta<typeof ListingFromMarkdown> = { title: 'Other/Listing', component: ListingFromMarkdown, decorators: [withPage], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof ListingFromMarkdown>;

// Zero-config (design 4.10)
export const ZeroConfigBlogFolder: Story = { args: { implicit: true, markdown: '', items: manyPosts(28) }, decorators: [asPage('Blog')] };
export const ProseReadmeAutoListing: Story = { args: { implicit: true, markdown: '---\ntitle: Blog\n---\n\nNotes on building things, roughly weekly.\n', items: realPosts }, decorators: [asPage('Blog', 'Notes on building things, roughly weekly.')] };

// list (page-level and inline)
export const BlogIndexPage1: Story = { args: { implicit: true, markdown: '---\ntitle: Blog\nlayout: list\n---\n', items: manyPosts(240), page: 1 }, decorators: [asPage('Blog')] };
export const BlogIndexPage2: Story = { ...BlogIndexPage1, args: { ...BlogIndexPage1.args, items: manyPosts(28), page: 2 } };
export const BlogIndexMiddlePage: Story = { ...BlogIndexPage1, args: { ...BlogIndexPage1.args, page: 6 } };
export const LatestThree: Story = { args: { markdown: '```blog\nlimit: 3\n```\n', items: realPosts, publicUrl: '/' }, decorators: [inline] };
export const ListCover: Story = { args: { markdown: '```blog\nmedia: cover\nlimit: 4\n```\n', items: realPosts }, decorators: [inline] };
export const ListNoImages: Story = { args: { markdown: '```blog\nmedia: none\nlimit: 6\n```\n', items: realPosts }, decorators: [inline] };
export const ListEyebrow: Story = { args: { markdown: '```blog\nlimit: 5\nfields:\n  eyebrow: [date, category]\n```\n', items: realPosts }, decorators: [inline] };
export const ListGerman: Story = { args: { markdown: '```blog\nlimit: 4\n```\n', items: realPosts, locale: 'de-DE' }, decorators: [inline] };

// grid
export const GridBlog: Story = { args: { markdown: '```blog\nview: grid\nlimit: 9\nfields:\n  eyebrow: category\n```\n', items: realPosts }, decorators: [inline] };
export const GridMixedImages: Story = { args: { markdown: '```blog\nview: grid\nlimit: 6\n```\n', items: realPosts.slice(1, 7) }, decorators: [inline] }; // includes the image-less "reading time" post
export const GridNoImages: Story = { args: { markdown: '```blog\nview: grid\nmedia: none\nlimit: 9\nfields:\n  eyebrow: category\n```\n', items: realPosts }, decorators: [inline] };
export const GridProjects: Story = { args: { implicit: true, markdown: '---\ntitle: Projects\nlayout: list\nlist:\n  view: grid\n  sort: title\n  ratio: 4/3\n  fields:\n    date: none\n    eyebrow: client\n    meta: [status]\n---\n', listOptions: { view: 'grid', sort: 'title', ratio: '4/3', fields: { date: 'none', eyebrow: 'client', meta: ['status'] } }, items: projects, label: 'Projects', publicUrl: '/projects' }, decorators: [asPage('Projects', undefined, 'grid')] };
/** 3 columns at the default content width (tech M1): fails if anything caps the grid at the 44rem measure. */
export const GridColumnCheck: Story = {
  ...GridBlog,
  parameters: { contentWidth: '960px' },
  play: async ({ canvasElement }) => {
    const grid = canvasElement.querySelector('section.list-component--grid') as HTMLElement;
    await expect(getComputedStyle(grid).gridTemplateColumns.split(' ').length).toBe(3);
  },
};

// notes, errors, empty
export const LimitAndPageSizeNote: Story = { args: { markdown: '```blog\nlimit: 3\npageSize: 5\n```\n', items: realPosts, publicUrl: '/' }, decorators: [inline] };
export const ErrorCard: Story = { args: { markdown: '```list\nfrom: blog\nperPage: 5\nimage: cover\nview: compact\n```\n', items: [] }, decorators: [inline] };
export const EmptyFolder: Story = { args: { markdown: '```list\nfrom: notes\n```\n', items: [] }, decorators: [inline] };

// dark, mobile
export const DarkList: Story = { ...BlogIndexPage1, parameters: { theme: 'dark' } };
export const DarkGrid: Story = { ...GridBlog, parameters: { theme: 'dark' } };
export const MobileList: Story = { ...BlogIndexPage1, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const MobileGrid: Story = { ...GridBlog, globals: { viewport: { value: 'mobile1', isRotated: false } } };

// each official theme × list and grid (UX B-1): run sync-theme-fixtures first
const themed = (base: Story, name: string): Story => ({ ...base, parameters: { ...base.parameters, flowershowTheme: name } });
export const LeafList = themed(BlogIndexPage1, 'leaf');
export const LeafGrid = themed(GridBlog, 'leaf');
export const LessfloweryList = themed(BlogIndexPage1, 'lessflowery');
export const LessfloweryGrid = themed(GridBlog, 'lessflowery');
export const LetterpressList = themed(BlogIndexPage1, 'letterpress');
export const LetterpressGrid = themed(GridBlog, 'letterpress');
export const SuperstackList = themed(BlogIndexPage1, 'superstack');
export const SuperstackGrid = themed(GridBlog, 'superstack');
export const MonospaceList = themed(BlogIndexPage1, 'monospace');
export const MonospaceGrid = themed(GridBlog, 'monospace');
export const MaterialDraftList = themed(BlogIndexPage1, 'material-draft');
export const MaterialDraftGrid = themed(GridBlog, 'material-draft');
```

Notes: `sliceListing` with `limit` takes the first N, so stories pass pre-sorted, pre-filtered items. Vite resolves the imported images to URLs and `next/image` (via `@storybook/nextjs-vite`) renders them. The legacy before/after is `Other/List` → `With Pagination` next to `BlogIndexPage1`. Theme stories show the **unpatched** themes until C1 lands; that is the point (they are the regression evidence for C1).

- [ ] **Step 4: Run Storybook's vitest project** (renders every story in headless Chromium and runs the `play` check):

```bash
cd /Users/rgrp/src/flowershow/flowershow-listings/apps/flowershow
npx playwright install chromium   # once per machine; a browser download, no Docker
node scripts/sync-theme-fixtures.mjs /Users/rgrp/src/flowershow/themes
npx vitest run --project=storybook stories/Listing.stories.tsx stories/List.stories.tsx
```

Expected: all stories render and `GridColumnCheck` passes (a11y is `todo`: violations are reported, not failing; fix any on our markup, e.g. contrast of `--list-meta-color`).

- [ ] **Step 5: Look at it**: `pnpm storybook` (port 6006), Other/Listing next to Other/List (legacy). Check against design 4.9 and 6: the page-level list page is one centred 44rem column (header, intro, rows); inline blocks fill their column; list rows text left, 160px 3:2 thumbnail right (88px on mobile, never dropped); titles never clamped, summaries 2 lines; meta "date · avatars + names" wraps between segments; image-less rows are full-width text; grid 3/2/1 columns, image-less cards get a placeholder when others have images and no image slot when none do; whole grid card clickable while author links still work; one ellipsis per gap; disabled ends visibly disabled; `ErrorCard` lists all three problems (the missing-folder message needs the plugin and is covered by B10 and the e2e); `LimitAndPageSizeNote` shows nothing extra (the note is only in `data-listing-notes`); dark readable; no horizontal scroll on mobile; German dates in `ListGerman`. For each theme story, note what breaks (expected before C1) for the C1 checklist.
- [ ] **Step 6: Commit** `feat(listing): Storybook mockup, theme stories and grid column check`

### Task B25: capture mockup screenshots for the PR

**Files:**
- Create: `scripts/capture-listing-stories.mjs`, `docs/pr-assets/listings/*.png` (repo root; committed on the PR branch, droppable before merge)

- [ ] **Step 1: Capture script** (the shot list is data, so G3 and C1 only append rows)

```js
// Usage (from apps/flowershow): node scripts/capture-listing-stories.mjs [baseUrl] [outDir] [nameFilterRegex]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:6007';
const out = process.argv[3] ?? '../../docs/pr-assets/listings';
const only = process.argv[4] ? new RegExp(process.argv[4]) : null;
mkdirSync(out, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
// [file name, story id, optional element selector, viewport]
const shots = [
  ['before-legacy-list', 'other-list--with-pagination'],
  ['zero-config-blog', 'other-listing--zero-config-blog-folder'],
  ['prose-readme-auto-listing', 'other-listing--prose-readme-auto-listing'],
  ['list-view', 'other-listing--blog-index-page-1'],
  ['list-view-page-2', 'other-listing--blog-index-page-2'],
  ['pagination-ellipsis', 'other-listing--blog-index-middle-page', 'nav.list-component-pagination'],
  ['latest-three', 'other-listing--latest-three'],
  ['list-cover', 'other-listing--list-cover'],
  ['list-no-images', 'other-listing--list-no-images'],
  ['list-eyebrow', 'other-listing--list-eyebrow'],
  ['grid-blog', 'other-listing--grid-blog'],
  ['grid-mixed-images', 'other-listing--grid-mixed-images'],
  ['grid-no-images', 'other-listing--grid-no-images'],
  ['grid-projects', 'other-listing--grid-projects'],
  ['error-card', 'other-listing--error-card', '.list-component-error'],
  ['dark-list', 'other-listing--dark-list'],
  ['dark-grid', 'other-listing--dark-grid'],
  ['mobile-list', 'other-listing--blog-index-page-1', undefined, MOBILE],
  ['mobile-grid', 'other-listing--grid-blog', undefined, MOBILE],
  ...['leaf', 'lessflowery', 'letterpress', 'superstack', 'monospace', 'material-draft'].flatMap((t) => [
    [`theme-${t}-list`, `other-listing--${t}-list`],
    [`theme-${t}-grid`, `other-listing--${t}-grid`],
  ]),
  // Task G3 (PR B2) appends compact, people, featured and grouping rows here.
];

const browser = await chromium.launch();
let n = 0;
for (const [name, id, selector, viewport = DESKTOP] of shots) {
  if (only && !only.test(name)) continue;
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  await (selector ? page.locator(selector).first() : page).screenshot({ path: `${out}/${name}.png` }); // first fold or element crop
  await page.close();
  n++;
}
await browser.close();
console.log(`wrote ${n} screenshots to ${out}`);
```

Check the story ids once in the built `index.json` (`deploy/storybook/out/index.json`); `MaterialDraftList` becomes `other-listing--material-draft-list`, and correct any that differ.

- [ ] **Step 2: Build, serve, capture** (with the unpatched themes synced, so the theme shots are C1's "before"):

```bash
cd /Users/rgrp/src/flowershow/flowershow-listings/apps/flowershow
node scripts/sync-theme-fixtures.mjs /Users/rgrp/src/flowershow/themes
pnpm build-storybook                                    # -> deploy/storybook/out
python3 -m http.server 6007 -d deploy/storybook/out &   # no extra install
node scripts/capture-listing-stories.mjs http://localhost:6007 ../../docs/pr-assets/listings
mkdir -p ../../docs/pr-assets/listings/themes-before && mv ../../docs/pr-assets/listings/theme-*.png ../../docs/pr-assets/listings/themes-before/
kill %1
```

- [ ] **Step 3: Review every PNG** with the Read tool against the B24 Step 5 checklist; fix and re-capture until right. Keep the set under ~4 MB (`du -sh docs/pr-assets/listings`); if larger, convert to WebP with `sharp` and reference the `.webp` files.
- [ ] **Step 4: Commit** `docs(pr): listing mockup screenshots (drop before merge)` with `git add docs/pr-assets/listings apps/flowershow/scripts/capture-listing-stories.mjs`. Make sure `deploy/storybook/out` and `stories/__fixtures__/themes/*.css` are not staged.

### Task C1: themes PR (prerequisite of PR B): scope legacy rules, add per-view rules

**Repo:** `flowershow/themes`, worktree `/Users/rgrp/src/flowershow/themes-listings` on `feat/listing-views` (see "How to work"). Read that repo's `AGENTS.md` first: never push to `main`, never create a `v*` tag (the maintainer releases).

**Files:** `{leaf,lessflowery,letterpress,superstack,monospace,material-draft}/theme.css`

Why (UX B-1, tech M3): themes are unlayered, so their single-class `.list-component*` rules beat every default rule. Today they turn the new `list` view into Leaf's 3-column card grid, flip thumbnails back to the left with `row-reverse`, size media to 20–30%, move the eyebrow with `order`, cap widths with `--width-list-component`, and Lessflowery hides media below 500px. The fix is to apply each theme's legacy look only to legacy markup (no `data-view`) and to add deliberate rules per view.

- [ ] **Step 1: Inventory.** For each theme, list every rule whose selector contains `.list-component` and record the properties in this set: root `display`, `grid-template-columns`, `gap`, `max-width`, `margin-left`/`margin-right`; item `display`, `flex-direction`, `border*`, `border-radius`, `align-items`, `padding`; media `width`, `aspect-ratio`, `display`; eyebrow `order`; pagination `:disabled`. Command: `grep -n "list-component" */theme.css`. Write the inventory into the PR body as a table (theme × rule × action).
- [ ] **Step 2: Re-scope layout rules to legacy markup.** Change each layout rule found in Step 1 from `.list-component…` to `.list-component:not([data-view])…` (root rules) or `.list-component:not([data-view]) .list-component-item…` (descendant rules). Leave typography and colour rules (font, size, colour, link styles) unscoped so the new views inherit the theme's voice. Example (Leaf):

```css
/* before */
.list-component { display: grid; grid-template-columns: 1fr 1fr 1fr; }
.list-component-item { border: 1px solid var(--…); border-radius: 16px; flex-direction: column; align-items: center; }
/* after */
.list-component:not([data-view]) { display: grid; grid-template-columns: 1fr 1fr 1fr; }
.list-component:not([data-view]) .list-component-item { border: 1px solid var(--…); border-radius: 16px; flex-direction: column; align-items: center; }
```

- [ ] **Step 3: Per-view rules.** For each theme, add a short block that expresses the theme's look through the documented variables first, rules second, for example Leaf's bordered cards on the new grid:

```css
.list-component[data-view="grid"] { --list-card-border: 1px solid var(--…); --list-card-radius: 16px; --list-card-bg: var(--…); }
.list-component[data-view="grid"] .list-component-item-content { padding: 0 1rem 1rem; }
```

Lessflowery/Letterpress/Superstack: express their list width as `--list-max-width: var(--width-list-component)` on `.listing-page[data-view="list"]` instead of capping the root; do not hide media on mobile for `[data-view]` roots; keep the eyebrow in DOM order for `[data-view]` roots. Material: confirm nothing needs changing.
- [ ] **Step 4: `.is-disabled`.** Lessflowery (`theme.css:2523-2528`), Letterpress (`:2550-2555`), Superstack (`:2518-2523`): `.list-component-pagination-button:disabled` → `.list-component-pagination-button:is(:disabled, .is-disabled)`; `:not(:disabled)` → `:not(:disabled, .is-disabled)`. Check `a.list-component-pagination-*` is not underlined by `button` resets.
- [ ] **Step 5: Before/after in Storybook** (from the flowershow worktree, after B24/B25): `node scripts/sync-theme-fixtures.mjs /Users/rgrp/src/flowershow/themes-listings`, rebuild and serve Storybook, then `node scripts/capture-listing-stories.mjs http://localhost:6007 ../../docs/pr-assets/listings/themes-after 'theme-'`. Compare with `themes-before/`. Also check legacy `Other/List` with each theme (`flowershowTheme` parameter on a copy of `List.stories.tsx`'s `WithPagination`, not committed) to prove the legacy look is unchanged.
- [ ] **Step 6: PR** in `flowershow/themes`: `gh pr create --repo flowershow/themes --title "Scope list styles to legacy markup; add rules for the new listing views" --body-file <file>` with the inventory table and before/after images (raw URLs on the flowershow PR B branch). Ask the maintainer to merge and tag a release before PR B deploys; PR B's Task B23 checks the tag and purges jsDelivr.
- [ ] **Step 7:** Commit in the flowershow worktree: `git add docs/pr-assets/listings/themes-after && git commit -m "docs(pr): theme after-shots"` and update PR B's body "Theme impact" section.

### Task B26: open PR B as a draft

Entry: B1 to B16, B15, B24 and B25 committed; `pnpm lint`, `pnpm test`, the parity test and the Storybook project pass locally.

- [ ] **Step 1:** `git push -u origin feat/listing-pages`
- [ ] **Step 2:** `gh pr create --draft --title "feat: list blocks and layout: list (listing pages v1)" --body-file <file>`, where the body (write it to the scratchpad first) has:
  - Summary and link to `docs/plans/2026-10-10-listing-pages-design.md`.
  - "Mockup": for each screenshot, the Markdown source in a fenced block directly above the image, image via `https://raw.githubusercontent.com/flowershow/flowershow/feat/listing-pages/docs/pr-assets/listings/<name>.png`. Lead with the zero-config pair: `zero-config-blog.png` captioned "no file at all: `blog/` contains only posts" and `prose-readme-auto-listing.png` with its prose-only `blog/README.md`, plus the back-compat note (READMEs with any `layout`, `list: false`, a list/blog/base fence or `<List` are unchanged). Then the before/after pair (`before-legacy-list.png` with its `<List dir="/blog" pageSize={10} />` MDX source vs `list-view.png` with its `layout: list` frontmatter). State: "Screenshots live in `docs/pr-assets/listings/` on this branch so they render here; they can be dropped before merge."
  - "How to try it": `pnpm storybook` → Other/Listing; real pages are exercised by the CI e2e job (`listings` project).
  - "Separately revertable": the `getAuthors` delegation commit (`refactor(site): getAuthors delegates…`), and what it changes (anchored author matching on every post).
  - "Depends on": the themes PR (C1) merged and released before this deploys; link it.
  - "Theme impact": the `themes-before/` screenshots (unpatched themes against the new markup) and, once C1 has them, the "after" set.
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
media: none
```
````

No `blog/README.md`: `/blog` is the zero-config generated page (design 4.10, case 1). Explicit `layout: list` stays covered by `projects/README.md` and `podcast.md` below.

`posts/README.md` (zero-config case 2, prose only, no `layout`):

```markdown
---
title: Posts
---

Shorter notes, collected here. The list below appears without any configuration.
```

with `posts/first-note.md` (`title: First note`, `date: 2026-05-01`), `posts/second-note.md` (`title: Second note`, `date: 2026-06-01`, `image: "[[sapiens.jpg]]"`), `posts/third-note.md` (`title: Third note`, `date: 2026-07-01`, `authors: [grace]`).

`notes/blog/README.md` (opt-out): frontmatter `title: Old blog` and `list: false`, body `Nothing is listed here on purpose.`; plus `notes/blog/hello.md` (`title: Hello`). Nested `blog` folders count, so this pins the opt-out.

`notes/posts/one.md` (`title: Nested posts item`) with no README: pins the generated page for a nested `posts` folder at `/notes/posts`. (`notes/` itself is not an auto folder, so `/notes` stays a 404 without a page.)

`projects/README.md`:

```markdown
---
title: Projects
layout: list
list:
  view: grid
  sort: title
  ratio: 4/3
  fields:
    date: none
    meta: [status]
---
```

`projects/alpha/index.md` (`title: Project Alpha`, `description: A short summary of the project.`, `image: "[[alpha-cover.jpg]]"`, `status: In progress`) with `projects/alpha/alpha-cover.jpg`; `projects/beta/README.md` (no frontmatter title, no H1, `status: Shipped`, `description: Shipped last spring.`); `projects/gamma.md` (`title: Gamma`, `status: Paused`, no image).

`people.md` is added in Task G4 (PR B2, `view: people`). In PR B, keep the `people/` pages (they are author pages for the posts) but no `people.md` listing.

~~`people.md` (PR B2 version, for reference)~~:

````markdown
---
title: People
---

```list
from: people
view: people
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
  ratio: 1/1
  fields:
    meta: [duration, guests]
  pageSize: 25
---
```

`podcast/ep-1.md` (`type: episode`, `date: 2026-06-01`, `duration: 42 min`, `guests: ["[[ada|Ada Lovelace]]"]`), `podcast/ep-2.md` (`type: episode`, `date: 2026-07-01`, `guests: [Grace Hopper]`), `podcast/trailer.md` (`type: trailer`).

`archive.md`: ```` ```list ```` with `from: blog`, `pageSize: 3`, `media: none` (10 pages, ellipsis visible). Task G4 switches it to `view: compact` and adds `by-month.md`, `people.md` and `magazine.md`.

`writing/blog.md` (zero-config case 3, an Obsidian folder note beside `writing/blog/`): frontmatter `title: Writing`, body `Essays, collected.`; plus `writing/blog/essay-one.md` (`title: Essay one`, `date: 2026-04-01`) and `writing/blog/essay-two.md` (`title: Essay two`, `date: 2026-05-01`).

`mdx/posts/README.mdx` (zero-config case 2 in an `.mdx` page; its page-level listing must be server-rendered): frontmatter `title: MDX posts`, body `Server-rendered even in MDX.`; plus `mdx/posts/one.md` (`title: MDX post one`, `date: 2026-03-01`).

`limit-note.md`: ```` ```blog ```` with `limit: 2` and `pageSize: 5`.

`errors.md`: the design 3.8 block (`from: posts-typo`, `perPage: 5`, `image: cover`), then a paragraph, then ```` ```blog ```` `limit: 2`. (`posts-typo` rather than `posts`, because this site has a `posts/` folder.)

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
    i === 10 ? 'featured: true' : null, // used by PR B2's featured e2e
    `category: ${['Compilers', 'Gardening'][i % 2]}`,
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

Listed in `/blog`: 25 + 3 = 28 items, so 20 on page 1 and 8 on page 2 (`notes/blog/`, `posts/`, `writing/blog/` and `mdx/posts/` are separate folders and are not included). Add `draft-post` and the posts to the sitemap expectations: `/blog/draft-post` is reachable but `noindex` and absent from `/sitemap.xml`.

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

test('zero-config blog folder (no README), page 1', async ({ page }) => {
  await page.goto('/blog');
  await expect(page).toHaveTitle(/^Blog/);
  await expect(page.locator('main h1').first()).toHaveText('Blog');
  await expect(page.locator('.layout-inner-left')).toHaveCount(0); // no sidebar, like the changelog fallback
  const list = page.locator('section.list-component.list-component--list');
  await expect(items(page)).toHaveCount(20);
  await expect(list.locator('.list-component-item-headline a').first()).toHaveText('Filename only post');
  await expect(page.getByText('Draft post')).toHaveCount(0);
  await expect(page.getByText('Unpublished post')).toHaveCount(0);
  await expect(list.locator('.heading-link')).toHaveCount(0);
  await expect(list.locator('h3[id]')).toHaveCount(0);
  const thumb = list.locator('img.list-component-item-media-img').first();
  await expect(thumb).toHaveAttribute('sizes', /160px/);
  await expect(page.locator('.listing-page[data-view="list"]')).toBeVisible(); // one column for header, intro and list
  await expect(thumb).toHaveAttribute('loading', 'lazy');
  await expect(list.locator('.list-component-pagination-button--prev')).toHaveClass(/is-disabled/);
  await expect(list.locator('a.list-component-pagination-button--next[rel="next"]')).toHaveAttribute('href', '/blog?page=2');
  await expect(list.locator('[aria-current="page"]')).toHaveText('1');
});

test('zero-config blog folder, page 2, canonical and junk params', async ({ page }) => {
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

test('home page: latest 3 and a featured-tag list; inline blocks have no aria-label and no page wrapper', async ({ page }) => {
  await page.goto('/');
  const lists = page.locator('section.list-component');
  await expect(lists).toHaveCount(2);
  await expect(lists.nth(0).locator('> article')).toHaveCount(3);
  await expect(lists.nth(0).locator('nav')).toHaveCount(0);
  await expect(lists.nth(0)).not.toHaveAttribute('aria-label', /.+/);
  await expect(lists.nth(1).locator('> article')).toHaveCount(4); // posts 3, 10, 17 + odd-frontmatter
  await expect(lists.nth(1)).toHaveAttribute('data-media', 'none');
  await expect(page.locator('.listing-page')).toHaveCount(0);
});

test('projects grid: nested indexes, placeholders, whole card clickable, full content width', async ({ page }) => {
  await page.goto('/projects');
  const cards = page.locator('section.list-component--grid > article');
  await expect(cards.locator('.list-component-item-headline a')).toHaveText(['Beta', 'Gamma', 'Project Alpha']);
  await expect(cards.nth(0).locator('.list-component-item-meta-value[data-field="status"]')).toHaveText('Shipped');
  await expect(cards.locator('time')).toHaveCount(0); // fields.date: none
  await expect(page.locator('.list-component-item-media--placeholder')).toHaveCount(2); // Beta and Gamma have no image, Alpha does
  await expect(page.locator('.listing-page[data-view="grid"]')).toBeVisible();
  await cards.nth(2).locator('.list-component-item-summary').click();
  await expect(page).toHaveURL(/\/projects\/alpha$/);
});

test('folder note with where, and wiki-linked custom fields', async ({ page }) => {
  await page.goto('/podcast');
  await expect(items(page)).toHaveCount(2);
  await expect(page.locator('.list-component-item-meta-value[data-field="guests"] a[href="/people/ada"]')).toHaveText('Ada Lovelace');
  await expect(page.locator('section.list-component[data-media="thumb"][data-ratio="1-1"]')).toBeVisible();
});

test('archive: one ellipsis per gap', async ({ page }) => {
  await page.goto('/archive');
  await expect(page.locator('.list-component-pagination-ellipsis')).toHaveCount(1);
  await expect(page.locator('.list-component-pagination-pages > *')).toHaveText(['1', '2', '3', '…', '10']);
});

test('error cards are isolated and specific', async ({ page }) => {
  await page.goto('/errors');
  const card = page.locator('.list-component-error--block');
  await expect(card).toContainText('No folder "posts-typo" with pages. Folders with pages:');
  await expect(card).toContainText('Unknown key "perPage". Use "pageSize".');
  await expect(card).toContainText('Unknown key "image". Use "media: cover"');
  await expect(items(page)).toHaveCount(2);
  await page.goto('/two-paginated');
  await expect(page.locator('.list-component-error--block')).toContainText('Only one list per page can paginate');
});

test('prose-only posts/README gets the listing appended; ToC ignores items', async ({ page }) => {
  await page.goto('/posts');
  await expect(page.locator('#mdxpage')).toContainText('Shorter notes, collected here.');
  await expect(items(page)).toHaveCount(3);
  await expect(page.locator('.list-component-item-headline a').first()).toHaveText('Third note');
  await expect(page.locator('#mdxpage > :last-child')).toHaveClass(/list-component/); // after the prose
  await expect(page.locator('.page-toc-container')).not.toContainText('Third note');
});

test('opt-out and nested zero-config folders', async ({ page }) => {
  await page.goto('/notes/blog');
  await expect(page.locator('#mdxpage')).toContainText('Nothing is listed here on purpose.');
  await expect(page.locator('section.list-component')).toHaveCount(0);
  await page.goto('/notes/posts');
  await expect(items(page)).toHaveCount(1);
});

test('paths with spaces and non-ASCII link to the encoded appPath (Review Focus 3)', async ({ page }) => {
  await page.goto('/blog');
  const href = encodeSlug(filePathToSlug('blog/2026/nested post ü.md'));
  await expect(page.locator(`a.list-component-item-headline-link[href="${href}"]`)).toHaveText('Nested post ü');
  await page.locator(`a.list-component-item-headline-link[href="${href}"]`).click();
  await expect(page.locator('#mdxpage')).toBeVisible(); // resolves, not a 404
});

test('limit with pageSize renders normally; the note is invisible (data attribute only)', async ({ page }) => {
  await page.goto('/limit-note');
  await expect(page.locator('section.list-component')).toHaveAttribute('data-listing-notes', /"pageSize" is ignored/);
  await expect(page.getByText('is ignored')).toHaveCount(0);
  await expect(items(page)).toHaveCount(2);
});

test('folder note beside blog/ gets the listing (zero-config case 3, UX M-3)', async ({ page }) => {
  await page.goto('/writing/blog');
  await expect(page.locator('#mdxpage')).toContainText('Essays, collected.');
  await expect(page.locator('.list-component-item-headline a')).toHaveText(['Essay two', 'Essay one']);
});

test('page-level listings are in the initial HTML, even on an .mdx page (tech M6)', async ({ request }) => {
  for (const url of ['/blog', '/mdx/posts', '/projects']) {
    const html = await (await request.get(url)).text();
    expect(html, url).toContain('list-component-item-headline');
  }
});

test('drafts: reachable, noindex, not in the sitemap; out-of-range pages are noindex', async ({ page, request }) => {
  await page.goto('/blog/draft-post');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('draft-post');
  await page.goto('/blog?page=99');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('case-insensitive folder, nested blocks, MDX page', async ({ page }) => {
  await page.goto('/case');
  await expect(items(page)).toHaveCount(2);
  await page.goto('/nested');
  await expect(page.locator('section.list-component')).toHaveCount(2);
  await page.goto('/mdx-page');
  await expect(items(page)).toHaveCount(3); // inline block in MDX: rendered after hydration; auto-waits
});

test('RSS excludes drafts', async ({ request }) => {
  const xml = await (await request.get('/rss.xml')).text();
  expect(xml).toContain('Post 25');
  expect(xml).not.toContain('Draft post');
});
```

If an assertion fails, fix the fixture data or the code, never the assertion: every literal above is derived from the fixture in Task B17 (e.g. `nobody` is post 20 so that it is on page 1).

- [ ] **Step 1b: Back-compat on the free site.** Add to `e2e/specs/blog.spec.ts` (its `blog/index.mdx` uses `<List dir="/blog" />`, so the zero-config rule must not add a second list): in the first test, `await expect(page.locator('.list-component')).toHaveCount(1);`.
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
  ['zero-config-blog', '/blog'],
  ['list-view-page-2', '/blog?page=2'],
  ['prose-readme-auto-listing', '/posts'],
  ['projects-grid', '/projects'],
  ['folder-note', '/writing/blog'],
  ['archive-pagination', '/archive?page=5'],
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
  - Images: `src` is only an `http(s)` URL or a site asset with an image extension (pinned in B4); `ListingImage` sits in an error boundary in MDX.
  - Missing-folder errors list folder names only (no paths outside the site, no metadata).
  - Hrefs: item URLs are forced to a single leading slash, so neither `javascript:` nor protocol-relative `//evil.com` permalinks can leave the site (pinned in B4); `where`/`sort` field names are only used for in-memory property reads (`__proto__` is a harmless non-match); YAML alias bombs are capped by `yaml`'s `maxAliasCount`.

### Task B21: docs (exactly what PR B ships)

**Files (all under `content/flowershow-app/`):**
- Create: `docs/reference/listings.md`
- Modify: `docs/reference/list-component.md` (legacy banner), `docs/reference/config-file.md` (`locale`), `docs/reference/frontmatter-variables.md` (`draft`, `list`, `locale`), `llms.txt`

PR B docs describe only `list`, `grid`, zero-config and the nine keys; `compact`, `people`, `featured` and `group` are added by Task G5 (tech minor 16). The guide rewrites and the tutorial removal are docs PR E (Task E1).

- [ ] **Step 1: `docs/reference/listings.md`** (style of sibling reference pages: frontmatter `title`, `description`, concise prose, examples). Frontmatter: `title: Listing pages`, `description: "A blog index, a grid of projects or the latest posts on your home page, from any folder, in plain Markdown."` Sections, in order:
  1. Intro: everything on this page is fenced blocks and frontmatter; no MDX or components are needed.
  2. "A blog with nothing to write": design 4.10 in user terms: a `blog/` or `posts/` folder lists itself (at any depth); a prose-only `README.md`, or an Obsidian folder note `blog.md` beside the folder, gets the list under its prose; `list: false` opts out; which existing pages are unchanged (any `layout`, a list/blog/base block, `<List />`).
  3. "Blog index in one line": `layout: list` (design 3.1) and ```` ```blog ```` (3.2).
  4. "Latest posts on your home page": design 3.3.
  5. "Options": the design 4.2 table for the nine PR B keys (no `featured`, `group`), plus the silent aliases (`dir`, `folder`, `layout` for `view`, `cards`, `sortBy`, `-date`, case-insensitive keys).
  6. "Choosing what each card shows (`fields`)": the slot table from design 4.4 (with the date, image and author fallbacks), the list form `fields: [title, date, description]`, `eyebrow: [date, category]`, and projects with `date: none`. Say that `readingTime` is not available in listings yet.
  7. "Views": `list` (`media: thumb | cover | none`, `ratio`) and `grid` (placeholders and the text-only grid), with the thumb-on-the-left one-line CSS.
  8. "Which pages are listed": design 4.3 in user terms, including `draft: true` (unlisted, reachable, out of RSS and the sitemap, `noindex`) and nested `index.md` as an item titled by its folder.
  9. "Sorting" and "Filtering with where": design 4.5/4.6 (`sort: date` is the date slot; list values are any of; `date: upcoming|past`; case-sensitive values).
  10. "Pagination": `?page=N`, 20 per page on page-level listings, none on blocks unless `pageSize`, one paginated list per page, `limit` on a page-level listing is an error; page-level listings are always server-rendered, inline blocks in `.mdx` render after load (prefer `.md`).
  11. "Dates in your language": the site `locale` key and the page override (design 4.11).
  12. "When something is wrong": the error card example (3.8); the exact messages from Task B2 for the most common mistakes, including the missing folder and `from: team.md`; and that harmless redundancies leave a `data-listing-notes` attribute instead (how to inspect it).
  13. "List block or Obsidian Bases?": the two-row box, link `[[obsidian-bases|Obsidian Bases]]`.
  14. "Coming from `<List />`": translation table

     | `<List />` | List block |
     | --- | --- |
     | `<List dir="/blog" />` in `.mdx` | ```` ```list ```` + `from: blog` (or ```` ```blog ````), works in `.md` |
     | `pageSize={5}` | `pageSize: 5` |
     | `fields={["title", "description", "date", "image"]}` | `fields: [title, description, date, image]` |
     | `slots={{ media: "cover" }}` | `fields: { image: cover }` |
     | `slots={{ eyebrow: "date" }}` | `fields: { eyebrow: date }` (the date moves up and leaves the meta line) |
     | `slots={{ headline: "name" }}` | `fields: { title: name }` |
     | `slots={{ summary: "dek" }}` | `fields: { summary: dek }` |
     | `slots={{ footnote: "authors" }}` | the default: authors show as avatars and linked names |
     | `slots={{ footnote: "status" }}` | `fields: { meta: [status] }` |
     | relative `image:` paths resolved from the site root | resolved from the item's own file |

  15. "Styling": the semantic classes, `data-view`/`data-media`/`data-ratio`, the `--list-*` custom properties (design section 6), labels for meta values (`[data-field="episode"]::before { content: "Episode " }`), and the theme pattern for `custom.css` authors (`.list-component:not([data-view])` for the legacy look); link `[[theme-class-reference|Theme class reference]]`.
  16. Precedence note: `layout: list` on a `changelog/` README renders a plain listing; with a site `rootDir`, a `from` starting with the root folder's name has it stripped; at most 10 lists per page.
- [ ] **Step 2:** `docs/reference/list-component.md`: replace the opening `[!important]` callout with `> [!note] Legacy component\n> Use a [[listings|list block]] instead: it works in plain Markdown, renders on the server and resolves authors. The table in [[listings#coming-from-list|Coming from <List />]] translates every prop.` Keep the rest.
- [ ] **Step 3:** `config-file.md`: document `locale` (BCP 47, default `en-US`, used for listing dates). `frontmatter-variables.md`: `draft`, `list` (map or `false`), `locale`.
- [ ] **Step 4:** `llms.txt`: under "## Docs" add `- [Listing pages](https://flowershow.app/docs/reference/listings.md): a blog index or a grid of projects from any folder with one fenced block, layout: list, or nothing at all for a blog/ folder; works in .md`.
- [ ] **Step 5:** `pnpm docs:sitemap`; check every wiki link in the touched pages resolves. Commit `docs: listing pages reference, locale, llms.txt, legacy List marked`.

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
description: "A blog/ folder now lists itself, and a ```blog block or layout: list shows any folder as a blog index or a grid. Works in .md."
authors:
  - rufuspollock
image: "[[assets/changelog-listing-pages.webp]]"
showToc: false
---

You can now list the pages of any folder without MDX or components. Add `layout: list` to a folder's `README.md`, or put a ```` ```blog ```` block on any page:

- **Zero config**: newest first, images, dates, descriptions and author names, 20 per page.
- **Latest posts anywhere**: ```` ```blog ```` with `limit: 3` on your home page.
- **List and grid views** with thumbnails or covers, and `sort`, `where` and `fields` to choose what each card shows. (If PR B2 lands in the same release, add: compact archives grouped by year, team pages, and a featured hero.)
- **Dates in your language** with the new `locale` setting.
- **Drafts**: `draft: true` keeps a page reachable but out of lists, the RSS feed and the sitemap.
- **Clear errors**: a wrong key shows a card that names it and suggests the fix.
- **A `blog/` or `posts/` folder lists itself** (at any depth): with no README, `/blog` is a paginated index; a README or Obsidian folder note with only prose gets the list underneath. If your `blog/README.md` already links to posts by hand, add `list: false` to its frontmatter to keep it as it was.

**Themes:** the official themes were updated for the new layouts. If you pin a theme version (`theme: leaf@v0.1.8`), move to the latest; if your `custom.css` restyles `.list-component`, scope those rules to `.list-component:not([data-view])` to keep them on the old `<List />` only.

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
- [ ] **Step 2b: Themes gate**: confirm C1 is merged and the maintainer has tagged a themes release (`git -C /Users/rgrp/src/flowershow/themes fetch --tags && git -C /Users/rgrp/src/flowershow/themes tag --sort=-v:refname | head -1`) newer than `v0.1.8`; purge jsDelivr for the six bare theme URLs (`curl -s https://purge.jsdelivr.net/gh/flowershow/themes/<name>/theme.css`). Do not mark PR B ready before this.
- [ ] **Step 3: Update the PR body** (`gh pr edit --body-file`): add the security notes from B20, the CI e2e duration (B18 Step 3), any CI screenshots worth showing (B19 Step 4), the follow-ups list (design section 8 "Deferred" plus "inline paginated blocks get a bare canonical"), and a post-deploy checklist: (1) open a production listing page and confirm thumbnails have a `srcset` (optimisation is off outside production); (2) publish a post to a test site and confirm it appears within 60 s; (3) `fl --anon apps/flowershow/e2e/fixtures/listings-demo` renders like the mockup.
- [ ] **Step 4: Decide on the screenshot folder**: ask the maintainer whether to keep `docs/pr-assets/listings/` or drop it before merge; if dropping, `git rm -r docs/pr-assets/listings && git commit -m "docs(pr): drop mockup screenshots"` as the last commit (the PR body's raw links will then 404 after the branch is deleted, which is acceptable; or switch them to a pinned commit SHA URL first).
- [ ] **Step 5:** `gh pr ready`. Comment on #1222: "Superseded by the listing pages design (docs/plans/2026-10-10-listing-pages-design.md, section 5.2): `show` + labelled fields + three views replace the `{% for %}` loop; a `template:` key is a deferred follow-up if demand persists." Comment on #1120, #1008, #923, #924 with the PR link.
- [ ] **Step 6: Beads**: update the B bead with the PR link; create follow-ups with `bd -C /Users/rgrp/src/flowershow/flowershow create … --related flowershow-sgw` for: `<List />` shims (design deferred 1), outline-aware heading levels and `<html lang>` (2), self-canonical for inline paginated blocks, publish-log/CLI surfacing of errors and notes (11).

# Phase 4b: PR B2, `compact`, `group`, `people` and `featured`

Branch `feat/listing-views` stacked on `feat/listing-pages` (`git switch -c feat/listing-views feat/listing-pages`). After PR B is squash-merged: `git fetch origin && git rebase --onto origin/main feat/listing-pages feat/listing-views`, then `gh pr edit <B2> --base main` before B's branch is deleted. Released together with PR B (same day). The parser, items, index and renderer already carry these features behind constants and skipped tests (B2, B4, B5, B8–B10), so B2 is mostly constants, CSS, stories, fixture/e2e and docs.

### Task G1: enable `compact`, `people`, `featured`, `group`

**Files:** `lib/listing/spec.ts` (two constants), `lib/listing/spec.test.ts`, `lib/listing/render.test.ts`, `lib/remark-listing.test.ts`

- [ ] **Step 1:** Change `describe.skip('[B2] …` to `describe('[B2] …` in the three test files; remove the PR B-only "not available yet" test rows (`group`, `view: compact`) from `spec.test.ts` and replace the `masonry` expectation with `Unknown view "masonry". Use list, grid, compact or people.`. Run `npx vitest run --project=unit lib/listing lib/remark-listing.test.ts`; expect the `[B2]` cases to FAIL.
- [ ] **Step 2:** `export const LISTING_KEYS: readonly ListingKey[] = ALL_LISTING_KEYS;` and `export const LISTING_VIEWS: readonly ListingView[] = ['list', 'grid', 'compact', 'people'];`.
- [ ] **Step 3:** Run again, expect PASS, plus `lib/markdown-listing.test.tsx` (unchanged list/grid behaviour). Commit `feat(listing): compact and people views, featured, grouping`.

### Task G2: CSS for compact, people, featured and group headings

**Files:** `styles/default-theme.css` (append to the block from Task B16)

- [ ] **Step 1: Add the rules** (design 4.9; all through `:where()`)

```css
  /* group headings (all views) */
  :where(.list-component-group-heading) {
    margin: 2rem 0 0.25rem;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid var(--list-rule-color, var(--color-foreground-100));
    font-size: 1rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-foreground-500);
  }
  :where(.list-component-group-heading:first-child) {
    margin-top: 0;
  }

  /* compact: date column, optional fixed meta column, title */
  :where(.list-component--compact) .list-component-item {
    display: grid;
    grid-template-columns: 6.5em minmax(0, 1fr);
    gap: 0 1rem;
    padding: 0.375rem 0;
    border-bottom-width: 0;
  }
  :where(.list-component--compact:has(.list-component-item-meta-value)) .list-component-item {
    grid-template-columns: 6.5em var(--list-compact-meta-width, 9em) minmax(0, 1fr);
  }
  :where(.list-component--compact) :is(.list-component-item-content, .list-component-item-meta) {
    display: contents;
  }
  :where(.list-component--compact .list-component-item-meta > * + *)::before {
    content: none;
  }
  :where(.list-component--compact) .list-component-item-date {
    grid-column: 1;
    grid-row: 1;
    font-variant-numeric: tabular-nums;
  }
  :where(.list-component--compact) .list-component-item-meta-value {
    grid-column: 2;
    grid-row: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :where(.list-component--compact) .list-component-item-headline {
    grid-column: -2;
    grid-row: 1;
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
  }
  :where(.list-component--compact) .list-component-group-heading {
    margin-top: 2.25rem;
    font-size: 1.5rem;
    font-weight: var(--font-weight-bold);
    color: var(--color-foreground-900);
  }
  @media (max-width: 639px) {
    :where(.list-component--compact) .list-component-item,
    :where(.list-component--compact:has(.list-component-item-meta-value)) .list-component-item {
      grid-template-columns: 5.5em minmax(0, 1fr);
    }
    :where(.list-component--compact) .list-component-item-meta-value {
      display: none;
    }
  }

  /* people: 4 / 3 / 2 columns, square portraits, initials placeholder */
  :where(.list-component--people) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--list-gap, 1.5rem);
    @media (min-width: 768px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    @media (min-width: 1024px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  :where(.list-component--people) > :is(.list-component-pagination, .list-component-empty, .list-component-group-heading) {
    grid-column: 1 / -1;
  }
  :where(.list-component--people) .list-component-item {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0;
    border-bottom-width: 0;
  }
  :where(.list-component--people) .list-component-item-media {
    width: 100%;
  }
  :where(.list-component--people) :is(.list-component-item-media-img, .list-component-item-media--placeholder) {
    border-radius: var(--list-avatar-shape, var(--list-card-radius, 0.5rem));
  }
  :where(.list-component-item-initials) {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    font-size: 2rem;
    font-weight: var(--font-weight-semibold);
    color: var(--color-foreground-500);
  }
  :where(.list-component--people) .list-component-item-headline {
    margin: 0;
    font-size: 1.0625rem;
  }
  :where(.list-component--people) .list-component-item-summary {
    font-size: 0.875rem;
  }
  :where(.list-component--people[data-media="thumb"]) {
    grid-template-columns: minmax(0, 1fr);
  }
  :where(.list-component--people[data-media="thumb"]) .list-component-item {
    flex-direction: row;
    align-items: flex-start;
    gap: 1rem;
  }
  :where(.list-component--people[data-media="thumb"]) .list-component-item-media {
    flex: 0 0 auto;
    width: 96px;
  }

  /* featured hero (list and grid), inside the list measure */
  :where(.list-component-item--featured) {
    grid-column: 1 / -1;
  }
  :where(.list-component[data-view]) .list-component-item--featured {
    flex-direction: column;
    gap: 1.25rem;
    @media (min-width: 768px) {
      flex-direction: row;
      align-items: center;
      gap: 2rem;
    }
  }
  :where(.list-component[data-view]) .list-component-item--featured .list-component-item-media {
    order: 0;
    width: 100%;
    aspect-ratio: 16 / 9;
    @media (min-width: 768px) {
      flex: 0 0 58%;
      width: 58%;
    }
  }
  :where(.list-component[data-view]) .list-component-item--featured .list-component-item-headline {
    font-size: 2rem;
  }
```

A featured item without an image has no media element, so the hero is a full-width text block automatically.
- [ ] **Step 2:** `pnpm docs:theme-classes` and `pnpm docs:theme-classes:check` (the B16 tree already lists these classes).
- [ ] **Step 3: Commit** `feat(listing): compact, people, featured and group styles`

### Task G3: stories and screenshots for the B2 features

**Files:** `stories/Listing.stories.tsx`, `apps/flowershow/scripts/capture-listing-stories.mjs`; PNGs in `docs/pr-assets/listings/` on `feat/listing-views`

- [ ] **Step 1: Stories** (append; `people` exists in the fixture with `team` values; for featured stories pass the items already promoted, as the plugin would):

```tsx
import { people } from '@/stories/__fixtures__/listing';

export const CompactArchiveByYear: Story = { args: { implicit: true, markdown: '---\ntitle: Archive\nlayout: list\nlist:\n  view: compact\n  pageSize: 40\n---\n', listOptions: { view: 'compact', pageSize: 40 }, items: manyPosts(160), label: 'Archive', publicUrl: '/archive' }, decorators: [asPage('Archive', undefined, 'compact')] };
export const CompactTeaser: Story = { args: { markdown: '```blog\nview: compact\nlimit: 3\n```\n', items: realPosts }, decorators: [inline] }; // inline: no year headings (UX M-1)
export const CompactWithCategory: Story = { args: { markdown: '```blog\nview: compact\nlimit: 12\nfields:\n  meta: [category]\n```\n', items: realPosts }, decorators: [inline] };
export const ListGroupedByMonth: Story = { args: { markdown: '```blog\ngroup: month\nlimit: 12\n```\n', items: manyPosts(40) }, decorators: [inline] };
export const GridMagazine: Story = { args: { markdown: '```blog\nview: grid\nfeatured: 1\nlimit: 7\nfields:\n  eyebrow: category\n```\n', items: [realPosts[4]!, ...realPosts.filter((_, i) => i !== 4)] }, decorators: [inline] }; // the featured: true post promoted first
export const ListFeatured: Story = { args: { markdown: '```blog\nfeatured: 1\nlimit: 6\n```\n', items: realPosts }, decorators: [inline] };
export const FeaturedTextOnly: Story = { args: { markdown: '```blog\nview: grid\nfeatured: 1\nlimit: 4\n```\n', items: [realPosts[2]!, ...realPosts.slice(3)] }, decorators: [inline] }; // hero without an image
export const People: Story = { args: { markdown: '```list\nfrom: people\nview: people\n```\n', items: people, publicUrl: '/people' }, decorators: [inline] };
export const PeopleRows: Story = { args: { markdown: '```list\nfrom: people\nview: people\nmedia: thumb\n```\n', items: people, publicUrl: '/people' }, decorators: [inline] };
export const PeopleByTeam: Story = { args: { markdown: '```list\nfrom: people\nview: people\ngroup: team\n```\n', items: [...people].sort((a, b) => a.values.team!.localeCompare(b.values.team!)), publicUrl: '/people' }, decorators: [inline] };
export const PeopleInitials: Story = { args: { markdown: '```list\nfrom: people\nview: people\n```\n', items: people.map((p, i) => (i === 0 ? { ...p, image: null } : p)), publicUrl: '/people' }, decorators: [inline] };
export const DarkCompact: Story = { ...CompactArchiveByYear, parameters: { theme: 'dark' } };
export const DarkPeople: Story = { ...People, parameters: { theme: 'dark' } };
export const MobileCompact: Story = { ...CompactArchiveByYear, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const MobilePeople: Story = { ...People, globals: { viewport: { value: 'mobile1', isRotated: false } } };
export const LeafCompact = themed(CompactArchiveByYear, 'leaf');
export const LetterpressPeople = themed(People, 'letterpress');
```

(Merge the import into the existing one; `featuredFirst` comes from the spec in the story helper: extend `ListingFromMarkdown` to pass `featuredFirst: result.spec.featured === 1 && page === 1` to `renderListing`.)
- [ ] **Step 2: Capture rows** (append to `shots`):

```js
  ['compact-by-year', 'other-listing--compact-archive-by-year'],
  ['compact-teaser', 'other-listing--compact-teaser'],
  ['compact-category', 'other-listing--compact-with-category'],
  ['list-grouped-month', 'other-listing--list-grouped-by-month'],
  ['grid-magazine-featured', 'other-listing--grid-magazine'],
  ['list-featured', 'other-listing--list-featured'],
  ['featured-text-only', 'other-listing--featured-text-only'],
  ['people', 'other-listing--people'],
  ['people-rows', 'other-listing--people-rows'],
  ['people-by-team', 'other-listing--people-by-team'],
  ['people-initials', 'other-listing--people-initials'],
  ['dark-compact', 'other-listing--dark-compact'],
  ['dark-people', 'other-listing--dark-people'],
  ['mobile-compact', 'other-listing--compact-archive-by-year', undefined, MOBILE],
  ['mobile-people', 'other-listing--people', undefined, MOBILE],
  ['theme-leaf-compact', 'other-listing--leaf-compact'],
  ['theme-letterpress-people', 'other-listing--letterpress-people'],
```

- [ ] **Step 3:** `npx vitest run --project=storybook stories/Listing.stories.tsx`; build, serve, capture with the filter `'compact|people|featured|grouped|magazine'`. Review against design 4.9 (compact columns aligned, teaser has no headings, each group appears once, hero 58% and stacked on mobile, text hero full width, people 4/3/2 with initials). Commit `feat(listing): stories and screenshots for compact, people, featured, grouping`.

### Task G4: fixture and e2e for the B2 features

**Files:** `e2e/fixtures/listings-demo/{archive.md,by-month.md,people.md,magazine.md,team/*}`, `e2e/specs/listings.spec.ts`

- [ ] **Step 1: Fixture.** `archive.md` → `view: compact`, `pageSize: 3`, no `media`. Add `by-month.md` (```` ```blog ```` `group: month`, `limit: 10`, `fields: { eyebrow: category }`), `people.md` (```` ```list ```` `from: people`, `view: people`), `team/` with `ann.md` (`team: Eng`), `bob.md` (`team: Design`), `cat.md` (`team: Eng`) and `team.md` folder note with `layout: list` + `list: { view: people, group: team }`, and `magazine.md` (```` ```blog ```` `view: grid`, `featured: 1`, `limit: 7`). Also `team-file.md` with ```` ```list ```` `from: team.md` for the error.
- [ ] **Step 2: e2e** (append)

```ts
test('compact archive: page-level, grouped by year, one ellipsis per gap', async ({ page }) => {
  await page.goto('/archive');
  await expect(page.locator('section.list-component--compact > h2.list-component-group-heading').first()).toHaveText('2026');
  await expect(page.locator('h2.list-component-group-heading[id]')).toHaveCount(0);
  await expect(page.locator('.list-component-pagination-pages > *')).toHaveText(['1', '2', '3', '…', '10']);
});

test('grouping: by month; each team heading once', async ({ page }) => {
  await page.goto('/by-month');
  await expect(page.locator('h2.list-component-group-heading').first()).toHaveText(/^\w+ 2026$/);
  await expect(page.locator('.page-toc-container')).not.toContainText('2026');
  await page.goto('/team');
  await expect(page.locator('h2.list-component-group-heading')).toHaveText(['Design', 'Eng']);
});

test('people view: portraits, role, title sort; a file in from is an error', async ({ page }) => {
  await page.goto('/people');
  const cards = page.locator('section.list-component--people > article');
  await expect(cards.locator('.list-component-item-headline a')).toHaveText(['Ada Lovelace', 'Grace Hopper']);
  await expect(cards.nth(0).locator('.list-component-item-meta-value[data-field="role"]')).toHaveText('Mathematician');
  await page.goto('/team-file');
  await expect(page.locator('.list-component-error--block')).toContainText('"from" must be a folder');
});

test('magazine = grid + featured: the featured: true post is the hero, once', async ({ page }) => {
  await page.goto('/magazine');
  const hero = page.locator('section.list-component--grid > article').first();
  await expect(hero).toHaveClass(/list-component-item--featured/);
  await expect(hero.locator('.list-component-item-headline a')).toHaveText(/^Post 10:/);
  await expect(page.locator('.list-component-item-headline a', { hasText: /^Post 10:/ })).toHaveCount(1);
});
```

- [ ] **Step 3:** `npx tsc --noEmit -p e2e/tsconfig.json`; push; CI `E2E Tests` green. Commit `test(listing): e2e for compact, people, featured and grouping`.

### Task G5: docs, changelog and PR B2

- [ ] **Step 1:** `docs/reference/listings.md`: add `compact` (and the page-level year grouping), `people` (one page per person; initials; `sort: order`), `featured` ("a magazine is `grid` + `featured: 1`"; prefers `featured: true`), `group` (`year|month|day|folder|<field>`, group-first ordering), and the `featured`/`group` rows of the options table. `llms.txt`: extend the line with "compact archives, team pages". Changelog: if B2 merges in the same release as B, add the bullet to B's entry; otherwise a new entry "Archives, team pages and a featured post" with the `grid-magazine-featured.png` screenshot as `.webp` (frontmatter quoted and validated as in B22).
- [ ] **Step 2:** Local gates (`pnpm lint`, `pnpm test`, `tsc`, Storybook project). Push; `gh pr create --draft --base feat/listing-pages --title "feat(listing): compact, people, featured and grouping" --body-file <file>` with the Markdown source above each screenshot (raw URLs on `feat/listing-views`), as in B26. End the body with `https://claude.ai/code/session_016wMKR4Fhz1JYpKtpmph94q`.
- [ ] **Step 3:** After B merges: `git rebase --onto origin/main feat/listing-pages feat/listing-views`, `git push --force-with-lease`, `gh pr edit --base main`, then `gh pr ready`.


# Phase 5: agent skill and guides docs PR

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

# Phase 6 (outline): PR F, post page layout

Design section 10. A detailed plan is written once PR B and B2 have merged; this is the shape.

- **Scope:** `components/public/layouts/blog.tsx` header (eyebrow, title with `clamp()`, dek, byline with avatar stack and `date · N min read`, hero inside the measure with `--post-hero-bleed`), body measure 44rem shared with `--list-max-width`, and a new footer component: tags row → prev/next (collection sort order; generalise `lib/changelog.ts:neighbours`) → three "Read more" `grid` cards (same tag first, else most recent; rendered with `lib/listing/render.ts`) → author card only when a `people/`/`authors/` collection resolves the post's authors.
- **Which pages:** items of a listed collection (a page in a `blog`/`posts` folder or under a folder with `layout: list`), opt-out `showPostFooter: false`; other pages unchanged.
- **Tasks (to detail):** F1 neighbour/related query (pure + cached, unit tests); F2 footer render via the listing renderer (parity test); F3 header anatomy and CSS variables (Storybook stories on the post page shell, light/dark/mobile); F4 route wiring and opt-out; F5 e2e on the listings fixture (`/blog/post-20` shows tags, prev/next, three cards); F6 theme audit and docs (`page-headers.md`, `page-authors.md`), changelog entry with screenshot.
- **Entry:** PR B and B2 merged. **Exit:** draft PR with Storybook before/after of a post page, CI green.

---

## Risks and how each is verified

| Risk | Where it bites | Verified by |
| --- | --- | --- |
| Official themes break the new views (UX B-1) | Five of six themes restyle `.list-component` unconditionally, unlayered | `data-view` on every root, `:where()` defaults (B16); theme stories and before/after shots (B24, B25, C1); C1 merged and released before PR B deploys (B23 gate) |
| Default CSS out-ranks theme typography (tech M2) | Sites switching from `<List />` to a block | Every new selector in `:where()`; theme stories |
| Grid capped at the measure (tech M1) | 2 columns instead of 3 | No `max-width` on the root; `GridColumnCheck` play test (B24) |
| md/mdx divergence | `ListingImage`, SVG attributes, non-string props | B14 parity through `serialize`+`hydrate`; string-props invariant (B8) |
| Page-level listings invisible to crawlers in MDX (tech M6) | `layout: list` on `.mdx`, `syntaxMode: mdx` sites | Standalone `.md` render in the route (B15); e2e `request.get` on `/mdx/posts` (B18) |
| Cache over 2 MB stops caching (tech M7) | Large folders | Index-only cache, rows by id (B5); 5,000-item payload test |
| Interleaved group headings (UX M-12, tech M4) | `group: team` + `sort: title` | Group-first ordering (B4 test); e2e team page (G4) |
| Date slot and sort disagree (tech M5) | `fields.date: pubDate` | `sort: date` = slot (B4 test) |
| A typo in `from` looks like success (UX M-10) | AI loops | Missing-folder error card with nearest folders (B10, e2e `/errors`) |
| Visitors see author notes (UX M-13) | Unpreviewed Obsidian publishes | Notes only in `data-listing-notes` (B8, e2e `/limit-note`) |
| Zero-config listing on existing blogs | A prose README that links posts by hand | Narrow AST rule, `list: false`, route table (B15), back-compat e2e (`blog.spec.ts`), changelog note |
| Folder notes miss the zero-config promise (UX M-3) | `blog.md` beside `blog/` | Case 3 (B15 table, e2e `/writing/blog`) |
| Encoded or nested zero-config folders 404 (tech minor 2) | `My Blog/posts`, `readme.md` | Route table (B15) |
| Non-string frontmatter crashes render | Every listing | B4 malformed test, B8, fixture `odd-frontmatter.md` |
| Bad image `src` breaks a page (tech minor 9) | `image: "[[page]]"`, `#hero` | `imageSrc` restriction (B4); error boundary in MDX (B13) |
| PR B ships a half-built view | Deploy of B before B2 | Parser constants (B2), skipped `[B2]` tests un-skipped in G1 |
| No local e2e (no Docker) | Late e2e regressions | CI is the gate on every push; Storybook and unit/parity tests locally |
| `next/image` unoptimised outside production | No `srcset` in CI | Props checked (B11); post-deploy checklist (B23) |
| Stacked PR replays B's commits after squash (tech minor 15) | B2 rebase | `git rebase --onto origin/main feat/listing-pages feat/listing-views` (How to work, G5) |

## Design deviations and resolved ambiguities

Items 1–28 below are from v1–v4; where "Changes after adversarial review" (end of this plan) says otherwise, it wins (notably: notes are invisible, not `p.list-component-note`; the knob is `media` + `ratio`, not `image`; PR B ships `list` + `grid`, PR B2 `compact`, `people`, `featured`, `group`; `compact` groups by year only on page-level listings; a missing folder is an error card).


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
27. **Zero-config blog folders (design v3, 4.10; now in Task B15; detection by AST since v5, see 32).** Pulled into v1 for `blog` and `posts` only (`articles`/`news`/`notes` excluded as too often non-feed content). Case 1 mirrors the changelog fallback (shell, title, metadata, no sidebar/ToC/breadcrumbs, empty folder 404s, slug must match the folder's real case); case 2 appends the default listing to a prose-only README. Detection reads the raw body with a fence/`<List` regex rather than parsing, which is cheap and errs towards "already has a listing" (a fenced block quoted inside another code block would also count; acceptable). The e2e `/blog` page is now zero-config; explicit `layout: list` is covered by `projects/` and `podcast.md`.
28. **Moodboard (design v4).** Views `list`/`grid`/`people`/`compact`, knobs `featured`/`group`/`image`, a `fields` slot map replacing `show`, one card DOM, `.list-component-*` extended rather than a parallel `.fs-card*` family, CSS variables under `--list-*` (see "Changes after moodboard").
29. **Page-level listings render outside the MDX tree (tech M6).** The design's v4 "one plugin in both pipelines" still holds for inline blocks; page-level listings use the same plugin through a standalone `.md` render made by the route, so they are server-rendered for every `renderMode`. Inline blocks in `.mdx` remain client-rendered after hydration.
30. **Route resolver (tech minor 19).** v4's B15 + B27 become one task built around a pure `resolveListingRoute`, unit-tested as a precedence table; the page route only wires it.
31. **Cache shape (tech M7).** Deviation 17's "cached rows" becomes a cached ordered index (ids, paths, featured positions, group keys); rows are fetched by id per page.
32. **Detection by AST (tech minor 1).** Zero-config "already has a listing" uses `remark-parse` and the plugin's case-sensitive languages, not a regex, so detection and rendering agree.
33. **`readingTime` (UX M-14).** Not exposed: it is computed on the post page from the body, and storing a word count at ingestion would need a worker change plus republishing every page. It is an error with an explanation, and a follow-up.
34. **Themes repo release.** C1 cannot be released by an agent (themes `AGENTS.md`); PR B's readiness is gated on the maintainer's tag and a jsDelivr purge (B23).
35. **Story fixtures build `ListingItem`s directly.** `items.ts` is pure, but the stories use bundled image URLs that `toListingItem` would treat as site paths, so the fixture maps slots itself and uses the real `formatListingDate`/`groupLabel`.


## Changes after moodboard

Source: `moodboard/findings.md` (approved 80/20 recommendation) and design v4 sections 4.2, 4.4, 4.9, 6 and 10.

- **Schema (B2):** ten keys. `show` is gone; `fields` maps the slots eyebrow, title, summary, date, image, authors, meta (≤2) with per-view defaults, accepting the legacy `<List slots>` names. New `group` (compact defaults to `year`), `image: "<none|thumb|cover> [ratio]"`, `featured: 0|1`. Knobs a view ignores render with a note. `cards` is a silent alias of `grid`.
- **Items (B4):** `ListingItem` now carries `summary`, `eyebrow`, `meta`, `group`; slot keys come from `fields` with image/summary fallbacks; `groupLabel` computes year/month/day/field labels. Tags are no longer a card slot.
- **Renderer (B8, B9):** one DOM for all views with a meta line (date · avatar stack + names, "and N others" · meta values); flat group headings; featured marks the first item of page 1; `data-image`/`data-ratio` drive CSS. Grid/people/featured contract tests written now, skipped until PR B2.
- **Headings (B12):** group headings share the placeholder id and are stripped, kept out of autolinks and the ToC.
- **CSS (B16, G2):** list = text left, thumbnail right (160px, 88px mobile); compact = date column with year headings; grid 3/2/1; people 4/3/2; featured split hero. Twelve `--list-*` variables (design section 6).
- **Mockup (B24, B25, G3):** Storybook shows list thumb/cover/none, eyebrow and meta, month and year grouping, compact flat and with a category column, zero-config pages, notes, errors, dark and mobile; PR B2 adds grid (blog, magazine/featured, no images, projects, grouped by status), list featured, people (grid, rows, by team), dark and mobile.
- **PR size and split:** with four views, three knobs and grouping, PR B was heading for roughly 1.5k lines of code, 1.3k of tests and 400 of CSS. Recommendation adopted: **PR B** = engine, `fields`, `list`, `compact`, `group`, `image`, zero-config, docs, changelog (Phases 2–4); **PR B2** = `grid`, `people`, `featured` (Phase 4b), stacked on B and merged in the same release. The renderer is view-agnostic, so B2 is mostly constants, CSS, stories and tests, and reviewable in isolation. PR B's parser rejects the B2 views until B2 lands, so production never shows a half-styled view.
- **Post page (PR F):** a Phase 6 outline only; the spec is design section 10. Not in PR B or B2.
- **Fixture/e2e:** `projects/` stays a list (with `fields.date: none`, `meta: [status]`) in PR B and becomes a grid in G4; `people.md` and `magazine.md` arrive in G4; `by-month.md` added for grouping; the error-card hint is now `view: grid`.

## Changes after adversarial review

Sources: `adv-review-ux.md` and `adv-review-tech.md` (both on v4). All BLOCKER and MAJOR items adopted; design v5 has the matching "Changes after adversarial review" section.

- **PR A merged** (#1457, `e8ea840f`): Phase 1 is done; PR B branches off `origin/main`; B2 moves with `rebase --onto`.
- **Split (UX M-16):** PR B = engine, `list`, `grid`, zero-config cases 1–3; PR B2 = `compact`, `group`, `people`, `featured`. Constants in `spec.ts` and skipped `[B2]` tests (B2, B4, B8–B10) stage it; PR B docs and `llms.txt` describe only PR B (B21).
- **Themes (UX B-1, tech M2/M3):** `:where()` everywhere and `data-view` on every root (B16); C1 moved into Phase 3 as a prerequisite that re-scopes legacy theme rules to `.list-component:not([data-view])`, adds per-view rules, and must be merged and released before PR B is marked ready (B23); theme stories × 6 and before/after captures (B24, B25, C1).
- **Widths (tech M1, UX M-15):** no root `max-width`; `.listing-page[data-view]` wrapper for page-level `list`/`compact` pages (B15, B16); `GridColumnCheck` play test (B24); e2e checks (B18).
- **Grouping (UX M-1, M-12, tech M4):** group-first sort in `selectListingRows`; `compact` groups by year only on page-level listings (B2, B4).
- **Dates (tech M5, UX M-11, m-9):** `slotDate` with fallbacks and `sort: date` = slot (B4); `locale` in site config and page frontmatter, `dates.ts` (B1, B4, B15, B21).
- **Authors (UX M-4):** `authors → author`, wiki links, unquoted wiki links (B4); author rows cached without a site-wide scan (B7).
- **Featured (UX M-6):** the plugin promotes the first `featured: true` item (from the cached index) to the front of page 1; text-only hero; above the first group (B5, B8, B9, B10, G2).
- **Knob rename (UX M-5):** `media` + `ratio`; block-level `image:` errors with a pointer (B2).
- **fields (UX M-9, M-8):** list form, `layout`/`sortBy`/case-insensitive keys, eyebrow lists and de-dup, `readingTime` error, dotted-key error (B2, B4).
- **Errors vs notes (UX M-10, M-13, M-7):** missing-folder card with nearest folders, `from: team.md` error (B2, B10); notes → `data-listing-notes` + server log (B8, B10).
- **No images (UX M-2):** list collapse, grid placeholder/collapse, people initials (B8, G2).
- **SSR (tech M6):** `renderPageListing` in the route (B15); e2e `request.get` on `/blog`, `/mdx/posts`, `/projects` (B18).
- **Cache (tech M7):** `queryListingIndex` + `fetchRowsByIds` with a 5,000-item payload test (B5).
- **Testability (tech minor 19):** `resolveListingRoute` table test (B15).
- **Fixture/e2e:** folder note `/writing/blog`, `.mdx` README `/mdx/posts`, drafts in the sitemap/`noindex`, out-of-range `noindex`, new 3.8 messages, grid projects with placeholders (B17, B18); compact/people/featured/grouping in G4.
- **Minors adopted:** see the design's list; in the plan they land in B4 (image `src`, unquoted wiki links, dotted keys), B7 (author cache), B15 (`UrlNormalizer` keeps `?page`, encoded slugs, ingestion index rule), B16 (`--_list-ratio`, `is-disabled` owner, link lifting, no title clamp, unbreakable meta segments, one avatar size), B3 (draft out of the sitemap, `noindex` in B15), B2 (`-date`, `sortBy`, `where` any-of, `limit` on page-level is an error, `upcoming|past`), G2 (`--list-compact-meta-width`), G1/B4 (`group: folder`).
- **Minors skipped:** UX m-1 (legacy slot aliases kept for a mechanical migration), UX m-8 and tech 13 (heading levels: ToC-excluded; outline-aware levels are a follow-up), UX m-17 (automatic thumb rows for mobile grids), tech 5 (parallel, de-duplicated fetches: bounded by the cap and the cache), tech 6 (timezone-aware dates: shared with the changelog; own PR).

## Execution notes

Phase 2 (PR B core), executed 2026-10-11 on `feat/listing-pages`. Type-error baseline was 0 and stayed 0. Deviations from the plan text:

- **B2 (`spec.ts`):** the plan's `parseFields` list-form branch did not type-check (`on[slot] = …` where `slot` could still be `'meta'`, TS2322). Narrowed the guard to `if (slot && slot !== 'meta')`; `LIST_FORM` never maps to `meta`, so behaviour is unchanged.
- **B4 (`items.test.ts`):** `nearestFolders('posts', …)` returns `['notes', 'Projects', 'Blog']`, not `['notes', 'Blog', 'Projects']`: edit distances are 3, 4 and 5, so it is not a tie. Pinned the real order as the plan's note allows; "folders with pages only" still holds (`assets` is excluded).
- **B7 (router test):** the plan's `site.getAuthors` test would have passed before the change. The legacy code looks authors up with `blob.findFirst`, which the plan's mock left as `createMockDb`'s default, and with `blobs: []` that returns null. The test now uses a small `authorDb` helper whose `findFirst` and `findMany` both honour `OR` of exact or `endsWith` paths. It failed on the legacy code and passes after the delegation. I also added a positive test ("still resolves an exact author page"). The commit also removes the `ensureLeadingSlash` import from `site.ts`, which became unused.
- **B11:** the test's `next/image` stand-in uses `<img>`; added `// eslint-disable-next-line @next/next/no-img-element` so lint stays clean.
- **B8/B9:** the `[B2]` render tests were un-skipped once locally and all 4 pass against the PR B renderer, so G1 only needs to flip `describe.skip`.

Phase 3, first half (B16, B12, B15, preview harness, draft PR B), executed 2026-10-11. Type-error baseline 0 and stayed 0. Deviations:

- **No Storybook (user decision).** B24 and B25 are replaced by a static preview harness in `apps/flowershow/scripts/listing-preview/`: `pnpm preview:listings` (vitest with its own config, `build.preview.tsx` is not in the unit project) runs every scenario in `scenarios.ts` through the real `resolveListingRoute`, `processMarkdown` + `remark-listing`, `renderPageListing`, `BlogLayout`/`VirtualListingPage` over an in-memory site (`fixtures.ts`: the real `content/flowershow-app/changelog` entries and images, author pages with local avatars, generated older posts; a fake Prisma `blob.findMany`, so `query.ts` and `authors.ts` run for real) and writes static HTML to `apps/flowershow/.listing-preview/` (gitignored) with `index.html`. The app CSS is compiled the way Next does (`tailwindcss --postcss -i styles/default-theme.css`); official themes are copied from `THEMES_DIR` (default `../../../themes`) and loaded with `?theme=<name>`; `?dark` sets `data-theme="dark"` (the attribute the site layout's `theme-preference` script sets). `next/image` is mocked to a plain `<img>`. `pnpm preview:listings:shots` (`capture.mjs`, Playwright over `file://`) writes `docs/pr-assets/listings/*.png` (JPEG fallback over 300 KB) and fails on: grid columns at 1440 ≠ 3, list page `max-width` ≠ 704px, avatars ≠ 20×20, horizontal scroll at 390. The build also fails if any listing class styled in `default-theme.css` is missing from the compiled CSS. `sync-theme-fixtures.mjs`, `.storybook/main.ts`, `stories/Listing.stories.tsx` and `capture-listing-stories.mjs` were not created. C1 should extend `scenarios.ts` `shots` with a `theme` per theme (all six themes are already linkable from the gallery).
- **B16 bugs the harness found (fixed in `fix(listing): styles survive Tailwind purge…`):** (1) Tailwind v3 purges `@layer components` rules whose classes are not in its `content` globs, and the new classes are emitted only from `lib/listing/render.ts`, so the meta line, authors, avatars, placeholder and error-card rules were missing in production CSS. `tailwind.config.js` now also scans `./lib/listing/**/*.{ts,tsx}`. (2) `:where(.list-component--grid) { display: grid }` has zero specificity and lost to the legacy `.list-component { display: flex }`: now `.list-component:where(.list-component--grid)` (one class, later in the file; themes still win with one class). (3) Preflight's `img { height: auto }` beat `:where(.list-component-item-author-avatar)` and stretched non-square avatars to 20×36: now `img:where(…)`. Also: `overflow-wrap: anywhere` on titles (an unbreakable title scrolled the page at 390px), the hairline ring and radius moved from grid media to all `[data-view]` media (white screenshots melted into the page in list rows), grid placeholders hidden below 640px (one column: a tall empty box), author names joined with ",\00a0" and the "and N others" spacing done with a margin (flex gaps produced "Rufus Pollock , Ola Rubaj"), and `render.ts` says "and 1 other" (singular) with a test.
- **B16 class reference:** `classifyClassName` maps `listing-page` to the listings group (the generator threw on the new class).
- **B15:** `isListingPageOutOfRange` takes `{ siteId, rootDir, filePath, siteFilePaths, route, page }` (pure inputs) and mirrors the plugin's relative `from` and self-exclusion; 6 unit tests. `SitePage` renders the page-level listing only when there is no changelog context. The wrapper for blob pages is a small `ListingPageWrapper` in `page.tsx`.
- **Screenshots:** 26 files, 2.6 MB in total, each under 300 KB. Theme shots (`theme-lessflowery-*`) show the unpatched theme: C1's "before".
- **Final review (fresh reviewer) fixes:** `generateMetadata` now resolves the route through `resolveMetadataListingRoute`, which loads the body only for an auto listing (a README with its own block was noindexed and canonicalised as a zero-config listing); the self-canonical is used only when `listingPaginatesByPage(route)` (a `pageSize: none` or invalid `list:` map made every `?page=N` its own canonical); `autoListingFor` requires the folder to have pages (a folder note beside an attachments-only folder showed the "no folder with pages" card). Deferred minors for the next run: an MDX fence inside JSX with no blank lines is missed by `hasExplicitListing` (two listings in `.mdx`); `%% … %%` around a fence suppresses the zero-config listing; `?page=1e22` canonical does not round-trip; `paginationClaimed` is true when the page-level folder has no pages; changelog entries with `layout: list` get listing metadata; `blog.md` beside `Blog/` (mixed case, Review Focus 1) gets no listing because `implicitListingFrom` matches case-sensitively; a folder of only drafts/unpublished posts gets an empty virtual page instead of a 404; `generateMetadata` adds an uncached `getAllBlobPaths` per page.

Phase 3, second half (deferred fixes, visual fixes, B17–B19, C1), executed 2026-10-11. Type-error baseline 0 and stayed 0. Deviations:

- **Deferred minors fixed (TDD):** M6 `implicitListingFrom` falls back to a case-insensitive sibling folder (`blog.md` beside `Blog/` gets the listing; `defaultFrom` is the real case). M2 `hasExplicitListing` runs `remarkObsidianComments` before visiting, so a `%%`-commented fence no longer suppresses the zero-config listing. M1 `hasExplicitListing(content, { mdx })`: for `.mdx` an html node containing a listing fence line counts (MDX parses JSX children as Markdown), so a JSX-wrapped fence no longer double-lists; in `.md` it is raw HTML and does not count. M8 `mayBeListingRoute({ slug, blobPath, metadata })` is a pure, sound pre-check (tested against every listing case of the route table) and `generateMetadata` loads `getAllBlobPaths` only when it is true (the path list itself was already behind `unstable_cache`; the saved work is the per-call site lookup and access check). M3, M4, M5, M7 remain deferred.
- **Found by the fixture dry run:** the error card listed only key errors when the block also named a missing folder (design 3.8 shows all three). `SpecResult` errors now carry the parsed `from`, and the plugin reports the folder first, then the keys.
- **Visual fixes:** eyebrow and meta separators use a wrap-friendly pattern (every segment has its "·" in a `--_list-sep` slot; the row is pulled left by one slot and `clip-path: inset()` hides that strip), so no line starts with "·". Grid placeholders (mixed grids only) are a tile tinted with the theme accent carrying the title's first letter or digit (`.list-component-item-monogram`, `--list-monogram-color`; empty tile if the title has none) instead of an empty grey box. Justification: Vercel's text-only grid shows a grid without images works, which we already do when no item has one (the slot collapses); in a mixed grid an aligned media row matters, and a monogram (Linear/Notion fallback) reads as deliberate. Placeholders stay hidden below 640px.
- **B17:** the fixture adds `garden/blog.md` beside `garden/Blog/` with a `%%`-commented fence (M6 + M2 end to end) and `jsx/blog/README.mdx` with a JSX-wrapped fence (M1 end to end), and gives `podcast/ep-1.md` an image (with no image in the folder the root is `data-media="none"`, so the plan's `data-media="thumb"` assertion needed the data, not a weaker assertion). `pnpm preview:listings:demo` (`scripts/listing-preview/demo.preview.tsx` + `demo-site.ts`) renders every fixture URL through the real listing code over the fixture parsed with the seed's own `parseMarkdown` and writes `report.json`; every literal in the spec was checked against it before CI. The listings site has no `/people` nav link (no `people.md` in PR B).
- **B18:** ToC assertion is `locator('.page-toc-container', { hasText })` `toHaveCount(0)` (a negated `toContainText` on a missing element is ambiguous); the encoded-path click asserts the post's `h1`, not just `#mdxpage`. Added specs: capitalised `Blog/` folder note with a commented fence, and the JSX fence in MDX.
- **C1:** themes worktree `/Users/rgrp/src/flowershow/themes-listings` on `feat/listing-views` (upstream unset so it can never push to `main`), PR flowershow/themes#19. Lessflowery/Letterpress/Superstack share one rule set, scoped by a script (whole rules for root/item/media/content/eyebrow including those in media queries; headline/summary split into typography unscoped + margin/max-width/order scoped). Letterpress list pages keep the content width rather than `--width-list-component` (64rem sized its legacy two-column grid); Lessflowery list pages widen to 48rem and grid pages in all three widen `.layout-inner` to `--width-content-toc` through `:has(.listing-page[data-view])`, as the legacy negative margins did. Material needed no change. Legacy `<List />` is pixel-identical before/after in all six themes (new `legacy-list` harness scenario renders the real MDX `List` with mocked tRPC). Themes are consumed via jsDelivr: bare name = latest release tag, `name@ver` pins, `monospace` = `@main` (`lib/get-theme.ts`), so PR B needs no bump, only the maintainer's release tag.
- **Harness:** theme matrix (6 themes × list page, grid page, legacy; mobile Lessflowery list and Leaf grid) captured only with a `theme-` filter into `docs/pr-assets/listings/themes-before|after/` from two builds (`THEMES_DIR`).
- **First CI e2e run (126 passed, 4 failed) found three real bugs and one wrong selector:** (1) the whole-card overlay only covered the title: `.rendered-mdx :is(h1, …, h6) { position: relative }` (0,1,1) made the headline its containing block; grid headlines are now `position: static` through `.list-component--grid .list-component-item-headline` (two classes, not `:where()`, to beat that rule), and `capture.mjs` checks a summary click hits the card link. (2) `/rss.xml` returned 500 for `authors: "[[ada]]"` (scalar) and would for `title: 1984`; `buildRssItem` reads scalars as text, shows wiki-link targets/aliases, skips objects (test first). (3) next/image drops `sizes` when `images.unoptimized` (every non-production env), so the spec asserts the 160px thumbnail box instead (the `sizes` value stays pinned in `render.test.ts`). (4) Avatars stack in `.list-component-item-avatars` before the names, not inside the author link; the selector now matches Ada's photo in the authors group that contains her link.
- **Open (Phase 4 design call):** with `showToc: true`, `layout: list` grid pages render an empty ToC column, so the projects grid is 2 columns at 1280px. Consider hiding the ToC on page-level listing pages when the page has no headings of its own.
- **User decisions mid-run (2026-10-11), supersede the monogram tile above:** (A) list thumbnails sit on the **left** by default (Ghost Edition/Headline, The Atlantic, Acquired); `media: thumb right` / `thumb left` (one word plus an option, errors for `cover right` and unknown sides) sets `spec.mediaSide`, emitted as `data-media-side` on the root; CSS `order: var(--list-thumb-order, 0)` (right sets 2) so themes can flip it; the DOM keeps the image first but `aria-hidden`/`tabindex=-1`, so the title is read first; mobile keeps an 88px thumb on the same side. (B) **no generated placeholders**: the grid placeholder box and monogram are removed (render, CSS, class reference, themes PR); a grid card without an image has no media block and its text starts at the top; a mixed list's text-only rows are indented to line up with the image rows' text (thumbnail left only, `:has()`); new block key `defaultImage` (path or `[[wikilink]]`, nested-list YAML form accepted) resolved against the listing page by `resolveListingImage` (the item image resolver) and rendered through `ListingImage`, ignored with a note under `media: none`. Ten keys in PR B (twelve with B2). The people view's initials (B2) are untouched and need the same decision in G2. Site-wide default image: deferred follow-up. The docs page (B21) must document `media: thumb right` and `defaultImage`.
- **CI e2e iterations 2–4:** run 2: the grid headline was still `position: relative` because autoprefixer's `:-webkit-any(h1, …)` copy of `.rendered-mdx`'s heading rule counts as (0,2,0) in Chrome and comes later; the rule is now `.list-component.list-component--grid .list-component-item-headline` (three classes). The harness check did not catch it (its compiled CSS has no `:-webkit-any()` copy); the e2e does. Run 3: the overlay worked, so Playwright's locator click on the summary was (correctly) intercepted by the card link; the spec now clicks with the mouse at the summary's centre. Run 4: `E2E Tests` green, 133 passed in 12.0 min (the `listings` project adds about a minute). The opt-in screenshot steps now run with `!cancelled()` so a failing spec does not skip them.

Phase 4 (PR B finish), executed 2026-10-11. Type-error baseline 0 and stayed 0. User decisions implemented first (test first):

- **Monogram tiles back, all or nothing** (revives b1643436; supersedes "no generated placeholders" in decision (B) above): in `grid`, if any rendered card has an image, cards without one get `.list-component-item-media.list-component-item-media--placeholder[aria-hidden]` with `span.list-component-item-monogram` (first letter or digit, uppercased; empty tile if none), tinted through `--list-media-placeholder` / `--list-monogram-color`; if no card has an image, the cards are text only (no media block). `list` never uses monograms. A featured card never gets one. `defaultImage: <path>` still fills images first; `defaultImage: none` (or `false`) parses to `spec.defaultImage === false` and turns the tiles off (no "ignored" note). Tiles are hidden below 640px (one column), as in b1643436. The themes PR (#19) gets `cd13acd` reverted so Leaf/Monospace keep their tile variables.
- **Empty ToC column hidden on page-level listings:** `hasTocHeadings(content)` (route.ts, shares `parseBody` with `hasExplicitListing`: frontmatter and `%%` comments removed; counts mdast headings depth ≥ 2 and raw `<h2…h6>`) decides; `SitePage` sets `showToc` false for a page-level route without one (a knowledge graph still keeps the right column). The fixture's `podcast.md` gains an `## About the show` intro to pin "headings keep the ToC"; the e2e asserts 3 grid columns at 1280px on `/projects` and no `.page-toc-container`. `capture.mjs` checks 3 columns at 1280 on `grid-projects` and that monogram tiles have the image media height.
- **B2 people initials:** unchanged (initials avatars stay; noted in design 4.9).
- New fixture pages `no-monogram.md` (`defaultImage: none`) and `text-grid.md` (grid over `notes/`, no images); new harness scenarios `grid-monogram-off` and `grid-text-only`.

