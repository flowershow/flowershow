# Site layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** add a site and page `layout` setting with two values, `docs` (today, the default) and `reading` (site contents in a drawer behind a menu button, page rail at the far left, text centred, previous and next links).

**Architecture:** one pure resolver, `resolveLayout()`, turns today's keys plus the layout into what the page shows (`sidebar`, `toc`, `showGraph`). `page.tsx` renders from its result in place of its current inline logic. `docs` and `reading` stop counting as "some other layout" in the post, listing and changelog checks. CSS adds one grid variant, `.layout-reading`, with a sticky left rail; nothing is positioned by script.

**Tech Stack:** Next.js app router (server components), React client components, Zod config schema, Vitest unit tests, Playwright e2e, plain CSS in `styles/default-theme.css`.

**Spec:** `docs/plans/2026-11-09-site-layouts-design.md` (approved 2026-11-12). Bead: flowershow-otm.

## Global Constraints

- Layout values: exactly `docs` and `reading`. No other value changes anything; an unknown site value means `docs`.
- Precedence: the page's `layout` if it is `docs` or `reading`, else the site's `layout`, else `docs`.
- Rule 1: a left rail never sits beside a site sidebar. If a page key brings the sidebar back, page contents go right, as in `docs`.
- Rule 2: a layout only moves things. A site or page with `showSidebar: false` gets no drawer and no menu button; `showToc: false` gets no rail.
- Page keys beat the layout: `showSidebar: true`, `toc: { style: panel }`, `showKnowledgeGraph: true` set in a page's frontmatter bring that element back under `reading`. Site-level `toc.style: panel` is ignored under `reading`.
- `layout: plain`, canvas pages and the hero are unchanged.
- Rail breakpoint 1024px, three or more headings, as today. Phones (below 1024px) look the same under both layouts.
- Text column under `reading`: the post column width, `var(--post-max-width, var(--list-max-width, 44rem))`. No new setting.
- A site that sets no `layout` renders byte-for-byte as today, apart from pages that already say `layout: reading` or `layout: docs`. (`docs` pages change too: after Task 3 they can be posts and get zero-config listings, and as folder hosts they no longer stop the post walk.)
- Markdown in docs: never hard-wrap.

## Review Focus

1. A page with `layout: reading` in a `blog/` folder, dated: it must still be a post (post header, post footer), with the rail left and no sidebar.
2. `blog/README.md` with `layout: reading` and no explicit listing: it must still get the zero-config listing.
3. A site with `layout: reading` and `sidebar.paths: ["/course"]`: pages outside `/course` get no menu button (they have no site contents today).
4. A `reading` page with fewer than three headings: no rail, no empty left column, text still centred.
5. A `reading` page with `showSidebar: true` in frontmatter: sidebar left, rail right (rule 1), no menu button.

Each line has its test in the owning task (Tasks 2, 3 and 7).

---

### Task 1: Count production `layout` values

Read-only. Decides whether `reading` is safe as a word.

**Files:**
- Create: `apps/flowershow/scripts/count-layout-values.ts`

- [ ] **Step 1:** Write the script in the style of `scripts/backfill-tags.ts` (PrismaClient, run with `npx tsx` from `apps/flowershow`). It counts `Blob.metadata->>'layout'` values across all sites with a raw query, prints each value with page count and site count, and for `reading` and `docs` also lists the site ids.
- [ ] **Step 2:** Run it against production if a database URL is available (`DATABASE_URL=… npx tsx scripts/count-layout-values.ts`). The agent's secrets file has none (checked 2026-11-12), so this step is for whoever holds production access: note it in the PR description and go on. The risk is small and the change is reversible.
- [ ] **Step 3:** Ruling: if more than 5 sites use `layout: reading` or `layout: docs`, stop and report the counts to Rufus before merging. Otherwise record the counts in the ledger and the PR description.
- [ ] **Step 4:** Commit the script: `git commit -m "chore(scripts): count frontmatter layout values"`.

### Task 2: `resolveLayout()`

**Files:**
- Create: `apps/flowershow/lib/layout.ts`
- Test: `apps/flowershow/lib/layout.test.ts`

**Interfaces:**
- Produces:
  - `export type SiteLayout = 'docs' | 'reading'`
  - `export function isSiteLayout(v: unknown): v is SiteLayout`
  - `export function pageLayout(pageValue: unknown, siteValue: unknown): SiteLayout` (the precedence rule)
  - `export type LayoutInputs = { layout: SiteLayout; sidebarEnabled: boolean; pageShowsSidebar: boolean | undefined; showToc: boolean; tocStyle: TocStyle; pageTocStyle: TocStyle | undefined; tocHeadings: number; showGraph: boolean; pageShowsGraph: boolean | undefined }`
  - `export type ResolvedLayout = { sidebar: 'column' | 'drawer' | 'none'; toc: 'none' | 'panel' | 'rail-right' | 'rail-left'; showGraph: boolean; pageNav: boolean; railColumn: boolean; inlineTocStyle: TocStyle }`

`railColumn` and `inlineTocStyle` carry today's `page.tsx:828-830` values: `railColumn` is true for `rail-right` without the graph, and for `rail-left`; `inlineTocStyle` is `rail` when `railColumn`, else `panel` (so the inline Contents block hides from 1024px beside either rail).
  - `export function resolveLayout(i: LayoutInputs): ResolvedLayout`

`sidebarEnabled` is today's `showSidebar` result (frontmatter or site, then `sidebar.paths`). `pageShowsSidebar`, `pageTocStyle` and `pageShowsGraph` are the page frontmatter values only. `pageNav` is true when `sidebar` is `drawer`.

- [ ] **Step 1: Write the failing table test.** One `it.each` row per case, asserting the whole `ResolvedLayout`:

| Case | Inputs (differences from `docs`, sidebar on, toc on, rail style off, 5 headings, graph off) | Expected |
|---|---|---|
| docs default | — | `column`, `panel`, no graph, no pageNav |
| docs rail style | `tocStyle: 'rail'` | `column`, `rail-right` |
| docs rail, 2 headings | `tocStyle: 'rail', tocHeadings: 2` | `column`, `none` |
| docs rail with graph | `tocStyle: 'rail', showGraph: true` | `column`, `rail-right`, graph, `railColumn: false`, inline `panel` |
| docs, sidebar off | `sidebarEnabled: false` | `none`, `panel` |
| reading | `layout: 'reading'` | `drawer`, `rail-left`, pageNav |
| reading, site toc panel | `layout: 'reading', tocStyle: 'panel'` | `drawer`, `rail-left` |
| reading, page toc panel | `layout: 'reading', pageTocStyle: 'panel', tocStyle: 'panel'` | `drawer`, `panel` |
| reading, 2 headings | `layout: 'reading', tocHeadings: 2` | `drawer`, `none` |
| reading, sidebar off | `layout: 'reading', sidebarEnabled: false` | `none`, `rail-left`, no pageNav |
| reading, page sidebar on | `layout: 'reading', pageShowsSidebar: true` | `column`, `rail-right`, no pageNav |
| reading, toc off | `layout: 'reading', showToc: false` | `drawer`, `none` |
| reading, site graph on | `layout: 'reading', showGraph: true` | graph off |
| reading, page graph on | `layout: 'reading', showGraph: true, pageShowsGraph: true` | graph on, `rail-right` |

The last row: the graph lives in the right column, so the rail joins it on the right, as `docs` does today. Also test `pageLayout`: `('reading', 'docs')` → `reading`; `('list', 'reading')` → `reading`; `(undefined, 'nonsense')` → `docs`; `('docs', 'reading')` → `docs`.

- [ ] **Step 2:** Run `pnpm --filter flowershow exec vitest run lib/layout.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement. `docs` must reproduce today's `page.tsx` logic exactly (lines 818–833): rail only with style `rail` and three or more headings.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(layout): resolve docs and reading layouts`.

### Task 3: `docs` and `reading` keep posts, listings and changelogs

**Files:**
- Modify: `apps/flowershow/lib/post/route.ts` (`mayBePost`, `configures`, the `isSet(meta?.layout) && meta?.layout !== 'list'` check in `walk`)
- Modify: `apps/flowershow/lib/listing/route.ts:247` (`autoListingFor`)
- Modify: `apps/flowershow/lib/changelog.ts:108` (`isChangelogDir`), `apps/flowershow/lib/changelog-context.ts:53`
- Test: the existing `*.test.ts` beside each file

**Interfaces:**
- Consumes: `isSiteLayout` from Task 2. Each check treats a `layout` that `isSiteLayout` accepts as if no `layout` were set.

- [ ] **Step 1: Write failing tests**, one per check:
  - post: `resolvePostRoute` for `blog/2026-01-01-x.md` with `{ layout: 'reading', date: '2026-01-01' }` in a zero-config `blog/` → `{ kind: 'post' }`; `mayBePost({ layout: 'docs' })` → `true`; a folder host with `layout: reading` does not stop the walk (a dated page in `blog/sub/` whose `sub/README.md` says `layout: reading` is still a post of `blog`).
  - listing: `autoListingFor` for `blog/README.md` with `{ layout: 'reading' }` → not null.
  - changelog: `isChangelogDir('changelog', { layout: 'docs' })` → `true`; a `CHANGELOG.md` with `layout: reading` resolves to `{ kind: 'file' }`.
- [ ] **Step 2:** Run the three test files. Expected: the new cases FAIL.
- [ ] **Step 3:** Implement with a small helper in each file or one shared `ownLayout(meta)` that returns `undefined` for `docs`/`reading`; keep each file's idiom.
- [ ] **Step 4:** Run the three test files. Expected: PASS, no existing case changes.
- [ ] **Step 5:** Commit: `feat(layout): docs and reading don't opt pages out of posts, listings or changelogs`.

### Task 4: Config schema and types

**Files:**
- Modify: `apps/flowershow/lib/site-config-schema.ts` (add `layout: enumOrString(['docs', 'reading'])` beside `showSidebar`)
- Modify: the `SiteConfig` type and any key list the schema's sync test checks (run the test to find them), plus `content/flowershow-app/docs/reference/config-file.md` (one row: `layout`, `docs` or `reading`, link to the new docs page from Task 8)
- Test: the existing schema sync test

- [ ] **Step 1:** Add the key; run `pnpm --filter flowershow exec vitest run lib/site-config` and fix the sync failures it reports in the type and the docs.
- [ ] **Step 2:** Add a test that the strict schema rejects `"layout": "journal"` and the loose schema accepts it. Then find where the strict schema is enforced (`git grep -n "strict"` around the schema's callers): a site whose existing `config.json` already says `"layout": "wide"` must still publish and render. If strict validation would reject it at publish, use `z.string()` in both modes and validate the value only in `pageLayout`.
- [ ] **Step 3:** Run. Expected: PASS.
- [ ] **Step 4:** Commit: `feat(config): site layout key`.

### Task 5: Page-owned menu button and left rail

**Files:**
- Modify: `apps/flowershow/components/public/sidebar.tsx`
- Modify: `apps/flowershow/components/public/toc-rail.tsx` (a `side?: 'left' | 'right'` prop on `TocRail` and `TocRailView`, rendered as `data-side`)
- Modify: `apps/flowershow/styles/default-theme.css`, `apps/flowershow/styles/annotations.css`
- Test: `components/public/toc-rail.test.tsx`, a new `components/public/sidebar.test.tsx`

**Interfaces:**
- Produces: `export function SiteContentsMenu({ items }: { items: Node[] })`, a button `.site-contents-menu-button` (`aria-label="Site contents"`, lucide `MenuIcon`) that opens the same `Dialog` as `SidebarMobileNav`. The dialog markup moves into one shared `SidebarDrawer({ items, open, onClose })` used by both. `SidebarMobileNav` keeps its markup and classes.
- Produces: `.toc-rail[data-side="left"]`, whose outline opens with `left: 100%` instead of `right: 100%`.

- [ ] **Step 1: Failing tests.** `TocRailView` with `side="left"` renders `data-side="left"`, and defaults to `right`. `SiteContentsMenu` renders a button labelled "Site contents", and clicking it shows the site tree's link texts.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement the components.
- [ ] **Step 4:** CSS, in the inner layout section:
  - `.layout-inner.layout-reading` from 1024px: `grid-template-columns: 3rem minmax(0, 1fr) 3rem; column-gap: 4rem; max-width: 80rem;`. Below 1024px: one column, as `has-toc` is today. Do not cap the centre column itself: copy the post rule `:where(.post-layout) > :not(main), :where(.post-layout > main) > *` (`default-theme.css:4489-4497`) as `:where(.layout-reading .layout-inner-center) …`, so children are capped at `var(--post-max-width, var(--list-max-width, 44rem))` and centred, and grid and magazine listings keep their own widths (`default-theme.css:1825-1836`).
  - `.layout-inner.layout-reading.has-right-panel` (a page that brought back the panel or the graph): `grid-template-columns: 3rem minmax(0, 1fr) 240px` from 1280px; below that the right column hides, as today. Accepted: the text sits slightly off centre then.
  - `.layout-reading .layout-inner-left` is shown from 1024px and holds one wrapper, `.reading-rail`, with the menu button above the rail: the wrapper is `position: sticky; top: calc(var(--navbar-height) + 2rem); align-self: start`, as `.site-sidebar` is (`default-theme.css:1104`). The rail inside goes in a plain `<aside className="page-toc-container is-rail is-left">` whose own sticky rule (`default-theme.css:1427`) is reset to `position: static` there, so there are never two nested sticky boxes.
  - The drawer opened from the page button starts below the navbar only, with no subnav offset: scope it with a class on the `Dialog` (`.sidebar-drawer.is-page-menu`), plus a no-nav rule `:root:has(.site-layout.no-nav) .sidebar-drawer.is-page-menu .sidebar-drawer-panel { top: 0 }` (and the backdrop), which must outrank the rule at `default-theme.css:1190-1193`.
  - `annotations.css`: with comments open, `.layout-reading` keeps the left column and the text takes the remaining width. Copy the shape of the existing `.is-toc-rail.has-toc` rule, and add `html.fs-comments-open .layout-inner.layout-reading.has-right-panel { grid-template-columns: 3rem minmax(0, 1fr) 3rem }` because the right column is hidden then.
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(layout): site contents menu button and left rail`.

### Task 6: Previous and next pages from the site tree

**Files:**
- Create: `apps/flowershow/lib/page-sequence.ts`
- Test: `apps/flowershow/lib/page-sequence.test.ts`

**Interfaces:**
- Produces: `export function adjacentPages(tree: Node[], pagePath: string): { previous: { url: string; title: string } | null; next: { url: string; title: string } | null }`

Order is what the sidebar shows, read top to bottom: a depth-first walk of file nodes, where a folder's own page (the child file whose `urlPath` equals the folder's `urlPath`, see `site-tree.tsx:15`) comes first in that folder. `pagePath` matches a file node's `path`. `url` is the node's `urlPath` as `site-tree.tsx` uses it for `href`; `title` is its `label`. A page not in the tree gets `{ previous: null, next: null }`.

- [ ] **Step 1: Failing tests:** a tree `course/README.md`, `course/1-basics/README.md`, `course/1-basics/notes.md`, `course/2-next/README.md`: the next of `course/README.md` is `1-basics`, the next of `notes.md` is `2-next`, the previous of `course/README.md` is null, the next of the last page is null, an unknown path gets nulls.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(layout): previous and next pages from the site tree`.

### Task 7: Wire it into the page and test it end to end

**Files:**
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` (lines ~799–870 and ~934–1145)
- Create: `apps/flowershow/e2e/fixtures/test-site/docs/reading/README.md`, `docs/reading/essay.md`, `docs/reading/with-sidebar.md`, `docs/reading/few-headings.md` (under `docs/` because the fixture config limits `sidebar.paths` to `/docs`)
- Create: `apps/flowershow/e2e/specs/site-layouts.spec.ts`

**Interfaces:**
- Consumes: `pageLayout`, `resolveLayout` (Task 2), `SiteContentsMenu`, `TocRail side` (Task 5), `adjacentPages` (Task 6), `PostNav` from `components/public/layouts/post.tsx`.

- [ ] **Step 1:** In `page.tsx`, compute `layout = pageLayout(metadata?.layout, siteConfig?.layout)` and `resolved = resolveLayout(...)` from the existing values; keep `showSidebar` meaning "the page has site contents" (fetch the tree when `resolved.sidebar !== 'none'`, scoped exactly as today). Replace `showKnowledgeGraph`, `useRail`, `railColumn`, `showPanel` and `showRightColumn` with values read from `resolved`. Use `resolved.railColumn` and `resolved.inlineTocStyle` where the code uses `railColumn` and `inlineStyle` today. Classes on `.layout-inner`, by case:

| Layout and resolved | Classes |
|---|---|
| `docs`, any | exactly today's (`has-sidebar-and-toc`, `has-toc`, `has-sidebar`, `is-toc-rail` as now) |
| `reading`, sidebar `column` (page brought it back) | today's classes for a sidebar with that right column |
| `reading`, sidebar `drawer` or `none`, toc `rail-left` or `none` | `layout-reading` only |
| `reading`, sidebar `drawer` or `none`, toc `panel` or `rail-right`, or graph on | `layout-reading has-right-panel` (plus `is-toc-rail` for `rail-right`) |

Under `layout-reading`, render `<div className="layout-inner-left"><div className="reading-rail">` holding `<SiteContentsMenu>` (only when `sidebar === 'drawer'`) and the rail with `side="left"` (only when `toc === 'rail-left'`); the right column renders as today. Phones keep `SidebarMobileNav` whenever the sidebar is `column` or `drawer`. The centre gets `post-layout` sizing under `reading` through the CSS from Task 5, not by adding the `post-layout` class.
- [ ] **Step 2:** When `resolved.pageNav`, render `<PostNav>` only in the `BlogLayout` branch (`page.tsx:1076`): posts, changelog entries and listings already have their own navigation. Render it with `adjacentPages(sidebarItems, blob.path)` after `</main>`, with `aria-label="Previous and next pages"` (add an optional `label` prop to `PostNav`).
- [ ] **Step 3:** Fixtures: `docs/reading/README.md` has frontmatter `title: Reading` only (no `layout`, no list block) and one paragraph; `essay.md` has `layout: reading` and 5 h2s; `with-sidebar.md` adds `showSidebar: true`; `few-headings.md` has `layout: reading` and 2 h2s. The fixture site keeps no site-wide `layout`. The new pages add `/docs` sidebar items, so run `git grep -n "site-sidebar\|site-tree" apps/flowershow/e2e/specs` and update any spec that counts them.
- [ ] **Step 4: Spec**, at 1440×900 unless noted:
  - `essay`: rail left of the text (`railBox.x + railBox.width <= textBox.x`), no `.site-sidebar` visible, `.site-contents-menu-button` visible above the rail; hovering the rail opens the outline to the right of the rail; clicking the menu button shows the site tree; the text's centre is within 24px of the viewport's centre; previous and next links present.
  - `with-sidebar`: sidebar visible, rail right of the text, no menu button.
  - `few-headings`: no rail, text centred within 24px.
  - `essay` at 390×844: no rail, the closed Contents block and the subnav chevron as on any page.
  - A `docs` page (`toc-rail.md`) still passes `toc-rail.spec.ts` unchanged.
  - Scrolling `essay` by 1500px keeps the rail and menu button in view (sticky works).
- [ ] **Step 5:** Run `pnpm --filter flowershow test` and `pnpm --filter flowershow test:e2e -- site-layouts toc-rail`. Expected: PASS.
- [ ] **Step 6:** Commit: `feat(layout): reading layout on public pages`.

### Task 8: Docs, class reference and changelog

**Files:**
- Create: `content/flowershow-app/docs/site-layouts.md`
- Modify: `content/flowershow-app/docs/reference/theme-class-reference.md` (regenerated), `content/flowershow-app/docs/reference/sidebar.md` (one line pointing at `reading`)
- Create: `content/flowershow-app/changelog/<merge date>-reading-layout.md`, image in `content/flowershow-app/assets/`

- [ ] **Step 1:** Write the docs page with the `write-tutorial` skill. It opens with the recipes table from the spec ("Documenting it by result"): each recipe has a screenshot, one sentence on who it suits and the exact lines to copy, written so an agent can follow it alone. The two rules and the override list come after.
- [ ] **Step 2:** Run `pnpm docs:theme-classes` and `pnpm docs:theme-classes:check`. Expected: check passes.
- [ ] **Step 3:** Changelog entry, titled by what users can do ("Give essay and course sites a reading layout"), linking the docs page; screenshot taken from a throwaway `fl` preview site after deploy (the rail entry, `content/flowershow-app/changelog/` from 2026-11-08, may be the one to extend if it's within a few days).
- [ ] **Step 4:** Commit: `docs(layout): site layouts page and changelog`.

### Not in this plan

- The dashboard's "Show sidebar" toggle and a layout picker (spec, "Dashboard toggles"): logged as a follow-up bead, because the dashboard writes config through the API contract and deserves its own PR. The docs page says how the toggle behaves under `reading`.

## After the tasks

Open the PR (`Closes` nothing; references flowershow-otm), get the independent review from `docs/agents/review.md`, merge on green CI, then check the live site on a throwaway `fl` site at 1440, 1100 and 390 with `layout: reading` set site-wide. Close flowershow-otm. The course switch stays in flowershow-6e1.9.
