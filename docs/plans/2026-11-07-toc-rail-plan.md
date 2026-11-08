# Page Contents Tick Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "rail" style for the page contents (`toc: { style: "rail" }`): a column of ticks in the right column that opens an outline on hover or focus, plus a collapsible inline "Contents" block on narrow screens for both styles.

**Architecture:** One client hook collects headings and tracks the current section; three views use it: the existing panel (`TableOfContents`), a new `TocRail`, and a new `TocInline`. The page route resolves the style from frontmatter and site config, renders the rail in the existing right column instead of the panel, adds an `is-toc-rail` class to `.layout-inner` so CSS can narrow that column and show it from 1024px, and renders `TocInline` above the page body. Opt-in; the panel stays the default.

**Tech Stack:** Next.js (app router), React client components, Tailwind-free theme CSS (`styles/default-theme.css`), Zod (site config), Vitest + Testing Library (jsdom), Playwright e2e in CI.

**Spec:** `docs/plans/2026-11-07-toc-rail-design.md` (v2: rail on the right). Read it before starting.

## Global Constraints

- All paths below are relative to `apps/flowershow/` unless they start with `content/` or `docs/`.
- Config: site `config.json` key `toc: { style: "panel" | "rail" }`; frontmatter `toc: { style: rail }` overrides per page. Default `"panel"`. Any other value means `"panel"`.
- `showToc: false` turns all contents off (panel, rail and inline block), whatever the style.
- Rail and inline block appear only with **three or more** headings (h2 and h3 only).
- Rail shows from **1024px** wide; the panel keeps its 1280px threshold. The inline block shows below the threshold of the active style (below 1024px for rail, below 1280px for panel).
- The site sidebar stays on the left; no left rail anywhere.
- When `showKnowledgeGraph` is on, the right column keeps its current 240px width and grid; the rail sits under the graph where the panel sits today (no `is-toc-rail` class then).
- When the comments panel is open (`html.fs-comments-open`), the right column (and rail) hides, as today.
- Accessibility: WAI disclosure navigation pattern; `nav[aria-label="Contents"]`, a `button` with `aria-expanded` and `aria-controls`, a list of real `<a href="#id">` links; ticks `aria-hidden`. Escape closes and returns focus to the button. A grace delay of **300ms** before closing on pointer leave.
- No new dependencies.
- Respect `prefers-reduced-motion` (no smooth scroll, no fade).
- Style only through existing theme variables (`--color-foreground-*`, `--color-accent` or the theme's primary/accent variable, `--font-heading`), so themes and `custom.css` can restyle it. Class names: `toc-rail`, `toc-rail-button`, `toc-rail-ticks`, `toc-rail-outline`, `toc-inline`.

## Cut from the spec

- The axe accessibility scan: no axe dependency in the repo, and the plan adds no dependencies. Keyboard and ARIA behaviour are covered by unit and e2e tests instead.
- Auto-scrolling the ticks to keep the current one in view (the spec already marks it as later).

## Review Focus

- **Fewer than three headings, or none:** no rail, no inline block, and with the rail style the right column must not leave an empty gap (grid falls back to no right column, like a page with `showToc: false`). Test in Task 4 (unit) and Task 5 (e2e).
- **Headings that change after load** (client-rendered MDX, images loading and moving headings): current section must stay right after scrolling past an image. Test in Task 2 (re-measure on resize).
- **Pointer moving from ticks to the outline card:** must not close in the gap. Test in Task 3 (grace delay with fake timers).
- **Very long heading text and many headings (40+, as on the course site):** outline scrolls inside its own max height; titles wrap to two lines then clip. Covered by e2e fixture with 12 headings and one long title (Task 5); visual check in Task 7.
- **Duplicate or missing heading ids:** headings without an `id` are skipped (existing `collectHeadings` rule); keep it. Test in Task 2.

---

### Task 1: Config and style resolver

**Files:**
- Modify: `components/types.ts` (SiteConfig: add `toc?: { style?: 'panel' | 'rail' }` next to `showToc`)
- Modify: `lib/site-config-schema.ts` (add `tocSchema = obj({ style: enumOrString(['panel', 'rail']).optional() })` next to `sidebarSchema`, matching its read-side leniency; add `toc: tocSchema` after `showToc`. No sanitize branch needed: the generic path handles object keys, and frontmatter objects already reach `metadata`, as `hero` does)
- Modify: `server/api/types.ts` (PageMetadata: add `toc?: { style?: 'panel' | 'rail' }` after `showToc`)
- Create: `lib/toc-style.ts`
- Test: `lib/toc-style.test.ts`, `lib/site-config-schema.test.ts`

**Interfaces:**
- Produces: `export type TocStyle = 'panel' | 'rail'` and `export function resolveTocStyle(pageToc: unknown, siteToc: unknown): TocStyle` in `lib/toc-style.ts`; and `export function countTocHeadings(markdown: string): number` in `lib/listing/route.ts` next to `hasTocHeadings` (counts ATX `##` and `###` headings outside fenced code blocks, using the same parsing approach as `hasTocHeadings`). The page uses it on the server to decide whether the rail exists, so first paint already has the right grid.

- [ ] **Step 1: Write failing tests** in `lib/toc-style.test.ts`:
  - `resolveTocStyle(undefined, undefined)` → `'panel'`
  - `resolveTocStyle(undefined, { style: 'rail' })` → `'rail'`
  - `resolveTocStyle({ style: 'panel' }, { style: 'rail' })` → `'panel'` (page wins)
  - `resolveTocStyle({ style: 'rail' }, undefined)` → `'rail'`
  - `resolveTocStyle({ style: 'ticks' }, { style: 'rail' })` → `'rail'` (invalid page value ignored, falls through to site)
  - `resolveTocStyle('rail', null)` → `'panel'` (non-object ignored)
  - in `lib/listing/route.test.ts`: `countTocHeadings('## A\n\n### B\n\n#### C\n\n## D')` → 3; headings inside a ``` fence are not counted; `# Title` is not counted.

  In `lib/site-config-schema.test.ts`, following the existing "drops a malformed ... wholesale" test: `sanitizeSiteConfig({ toc: { style: 'rail' } })` keeps it; `sanitizeSiteConfig({ toc: { style: 'nope' } })` keeps it (the resolver turns it into `panel`); `sanitizeSiteConfig({ toc: { style: 5 } })` drops `toc`.
- [ ] **Step 2: Run** (from `apps/flowershow`) `pnpm vitest run --project=unit lib/toc-style lib/site-config-schema lib/listing/route` → FAIL.
- [ ] **Step 3: Implement** the types, schema entry and `resolveTocStyle`.
- [ ] **Step 4: Run** the same command → PASS. Also `pnpm tsc --noEmit -p .` (or the repo's typecheck script) → no new errors.
- [ ] **Step 5: Commit** `feat(toc): toc.style config (panel | rail)`.

### Task 2: Shared heading hook with fresh current-section tracking

**Files:**
- Modify: `components/public/table-of-contents.tsx`
- Test: `components/public/table-of-contents.test.ts` (rename to `.tsx` if it needs JSX)

**Interfaces:**
- Consumes: existing `TOC_HEADING_SELECTOR`, `collectHeadings`, `TocSection`.
- Produces (all exported from `components/public/table-of-contents.tsx`):
  - `export function useTocHeadings(): TocSection[]`: the heading-collection effect now inside `TableOfContents` (requestAnimationFrame + MutationObserver on `#mdxpage`, re-run on pathname change), moved out unchanged.
  - `export function flattenToc(sections: TocSection[], maxDepth = 2): Array<{ id: string; title: string; depth: 0 | 1 }>`: depth-first list; depth 0 for top-level sections, 1 for their children; deeper levels dropped.
  - `useTableOfContents(tableOfContents)` keeps its signature and return (current section id) but re-measures heading positions on window `resize` and when `document.body` changes size (`ResizeObserver`), so images loading don't leave it stale.
  - `TableOfContents` (the panel) uses `useTocHeadings()`; its markup is unchanged.

- [ ] **Step 1: Write failing tests:**
  - `flattenToc` on `[{id:'a',title:'A',level:'H2',children:[{id:'b',title:'B',level:'H3',children:[{id:'c',title:'C',level:'H4',children:[]}]}]}]` → `[{id:'a',title:'A',depth:0},{id:'b',title:'B',depth:1}]`.
  - `collectHeadings` skips a heading with no id (render `<h2>No id</h2><h2 id="x">X</h2>` into `#mdxpage`, collect via the selector) → one section, `x`.
  - `useTableOfContents` re-measures: render a hook test (`renderHook`) with two headings whose `getBoundingClientRect` you stub; change the stub so the second heading moves above the scroll line, fire `resize` and `scroll` → current becomes the second id.
- [ ] **Step 2: Run** `pnpm vitest run --project=unit components/public/table-of-contents` → FAIL.
- [ ] **Step 3: Implement** the hook extraction, `flattenToc` and re-measuring (a `measure()` called on mount, `resize`, and ResizeObserver callback; `onScroll` uses the latest measurements from a ref). Guard `typeof ResizeObserver !== 'undefined'` (jsdom lacks it) and treat a NaN `scrollMarginTop` as 0. Keep `useState([])` as the heading hook's initial value so the client's first render matches the server's.
- [ ] **Step 4: Run** → PASS; existing `TOC_HEADING_SELECTOR` test still passes.
- [ ] **Step 5: Commit** `refactor(toc): share heading collection; re-measure current section on resize`.

### Task 3: `TocRail` component

**Files:**
- Create: `components/public/toc-rail.tsx`
- Test: `components/public/toc-rail.test.tsx`

**Interfaces:**
- Consumes: `useTocHeadings`, `flattenToc`, `useTableOfContents` (Task 2).
- Produces: `export default function TocRail(): JSX.Element | null`, and for testing `export function TocRailView(props: { items: Array<{id:string;title:string;depth:0|1}>; currentId: string | null }): JSX.Element | null`. `TocRail` wires the hooks into `TocRailView`.

Markup of `TocRailView` (class names fixed, structure fixed for CSS and e2e):
```html
<nav class="toc-rail" aria-label="Contents" data-open="true|false">
  <button class="toc-rail-button" aria-expanded aria-controls="toc-rail-outline" aria-label="Contents">
    <span class="toc-rail-ticks" aria-hidden="true"><span class="toc-rail-tick" data-depth data-current? data-read?></span>…</span>
  </button>
  <div class="toc-rail-outline" id="toc-rail-outline" hidden={!open}>
    <ol><li data-depth data-current?><a href="#id">Title</a></li>…</ol>
  </div>
</nav>
```
`data-read` marks items before the current one.

Behaviour:
- Returns `null` when `items.length < 3`.
- Opens on `pointerenter` of the `nav` when `pointerType !== 'touch'`, and on `focus` within it (`onFocus` on the nav). Button click: for mouse, only opens (never closes, since hover already opened it); for touch (`pointerType === 'touch'` recorded on `pointerdown`), toggles. While open, a document `pointerdown` outside the nav closes it (tap outside).
- Closes: `pointerleave` of the nav after 300ms (cancelled by re-entry); `Escape` (then focus the button, and don't reopen from that focus: set a "suppress next focus-open" ref); focus leaving the nav (`onBlur` with `relatedTarget` outside); link click.
- The outline's own box: `max-height` with `overflow-y: auto`. If the ticks are taller than the screen, `.toc-rail-ticks` scrolls (overflow hidden, with CSS mask fades top and bottom).
- Link click: `preventDefault`, scroll the heading into view (`behavior: 'auto'` under reduced motion, else `'smooth'`), `history.replaceState` the hash, close, then focus the heading (set `tabIndex=-1` on it first if it has none).

- [ ] **Step 1: Write failing tests** (Testing Library, `vi.useFakeTimers()` where needed):
  - renders nothing for 2 items; renders `nav[aria-label="Contents"]` for 3.
  - outline hidden and `aria-expanded="false"` at rest; after `pointerEnter` on the nav: visible, `aria-expanded="true"`.
  - `pointerLeave` then advance 200ms: still open; `pointerEnter` again, advance 400ms: still open; `pointerLeave`, advance 300ms: closed.
  - focusing the first link opens; `keyDown Escape` closes and `document.activeElement` is the button, and the outline stays closed.
  - clicking a link closes the outline, calls `scrollIntoView` on the target heading, and focuses it.
  - the tick and the outline item for `currentId` carry `data-current`; earlier ones carry `data-read`.
  - a touch tap (`pointerDown` with `pointerType: 'touch'` then click) opens; a second tap closes; a `pointerDown` on `document.body` closes.
  - mouse: `pointerEnter` then click on the button leaves it open.
  - Stub `Element.prototype.scrollIntoView = vi.fn()` in the test setup (jsdom lacks it).
- [ ] **Step 2: Run** `pnpm vitest run --project=unit components/public/toc-rail` → FAIL.
- [ ] **Step 3: Implement** `toc-rail.tsx` (`'use client'`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(toc): tick rail component with hover/focus outline`.

### Task 4: `TocInline` component

**Files:**
- Create: `components/public/toc-inline.tsx`
- Test: `components/public/toc-inline.test.tsx`

**Interfaces:**
- Consumes: `useTocHeadings`, `flattenToc`.
- Produces: `export default function TocInline({ tocStyle }: { tocStyle: TocStyle }): JSX.Element | null` and `export function TocInlineView({ items, tocStyle })`.

Markup: `<details class="toc-inline" data-toc-style="panel|rail"><summary>Contents</summary><ol><li data-depth><a href="#id">Title</a></li>…</ol></details>`; closed by default.

- [ ] **Step 1: Write failing tests:** null for 2 items; 3 items → a closed `details` with summary "Contents" and three links in order with `data-depth`; clicking a link closes the `details` (sets `open=false`) before navigation (no `preventDefault`: the browser follows the hash, and headings already have `scroll-margin-top`).
- [ ] **Step 2: Run** `pnpm vitest run --project=unit components/public/toc-inline` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(toc): inline Contents block for narrow screens`.

### Task 5: Wire into the page, CSS, and e2e

**Files:**
- Modify: `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` (around lines 810–816, 928–936, 1007–1062, 1109–1117)
- Modify: `styles/default-theme.css` (`.layout-inner` grid block ~1000–1080; ToC block ~1405–1450)
- Modify: `styles/annotations.css` (~194–201)
- Modify: `lib/listing/route.ts` import only (from Task 1)
- Create: `e2e/fixtures/test-site/toc-rail.md`, `e2e/fixtures/test-site/docs/toc-rail.md`, `e2e/specs/toc-rail.spec.ts`

**Interfaces:**
- Consumes: `resolveTocStyle` (Task 1), `TocRail` (Task 3), `TocInline` (Task 4), `TableOfContents` (unchanged API).

Page wiring:
- `const tocStyle = resolveTocStyle(metadata?.toc, siteConfig?.toc);`
- `const useRail = showToc && tocStyle === 'rail' && countTocHeadings(pageContent ?? '') >= 3;` (server-side decision: no rail column at all when it would be empty, so nothing jumps)
- `const railColumn = useRail && !showKnowledgeGraph;` add `railColumn && 'is-toc-rail'` to the `.layout-inner` `clsx`. When the style is rail but `useRail` is false and the graph is off, `showRightColumn` must be false (no empty right column): fold this into the existing `showToc`/`showRightColumn` logic.
- Effective style for the inline block: `const inlineStyle: TocStyle = railColumn ? 'rail' : 'panel';` (with the graph on, the right column shows only from 1280px, so the inline block must stay until then).
- In the right column, render `<aside className="page-toc-container"><TocRail /></aside>` when `useRail`, else the existing `<TableOfContents />`.
- Render `{showToc && <TocInline tocStyle={inlineStyle} />}` as the first child inside both `PostLayout` and `BlogLayout` children, before `<div className="rendered-mdx" id="mdxpage">`. Not for listings, changelog or canvas (they already set `showToc` false or don't use these layouts).

CSS (in the existing `@layer`/nesting style of `default-theme.css`):
- `.layout-inner.is-toc-rail.has-toc`: from 1024px `grid-template-columns: minmax(0, 1fr) 3rem; padding-left: 3rem;` (the left padding mirrors the rail so the text stays centred).
- `.layout-inner.is-toc-rail.has-sidebar-and-toc`: from 1024px `grid-template-columns: var(--width-sidebar, 16rem) minmax(0, 1fr) 3rem;` (themes set `--width-sidebar`).
- `.layout-inner.is-toc-rail .layout-inner-right`: `display: block` from 1024px.
- Rail: give the aside a modifier class from the page (`page-toc-container is-rail`) rather than `:has()`; it drops the panel's padding and sets `overflow: visible` (the panel's `overflow-y: auto` would clip the outline); sticky as the panel is, `top` level with the first line of text (`calc(var(--navbar-height) + 2rem)`, as the panel). Ticks 2px high, 14px (depth 0) and 8px (depth 1), 8px apart; current tick 18px and accent colour; read ticks `--color-foreground-500`-ish, unread lighter. Outline: `position: absolute; right: 100%` of the rail (opens leftwards), width 17rem, `max-height: calc(100vh - var(--navbar-height) - 4rem); overflow-y: auto`, background `--color-background`, 0.5px border, soft shadow; rows 13px, titles `-webkit-line-clamp: 2`. Opacity transition 150ms unless reduced motion. Visible focus ring on the button.
- `.toc-inline`: hidden from 1024px when `[data-toc-style="rail"]`, from 1280px when `[data-toc-style="panel"]`; bordered box with "Contents" summary, depth-1 items indented 1rem; margin-bottom 1.5rem.
- `annotations.css`: the existing comments-open rules live in a ≥1280px media block. Add, in a ≥1024px block, `html.fs-comments-open .layout-inner.is-toc-rail .layout-inner-right { display: none; }`, `html.fs-comments-open .layout-inner.is-toc-rail.has-sidebar-and-toc { grid-template-columns: var(--width-sidebar, 16rem) minmax(0, 1fr); }` and `html.fs-comments-open .layout-inner.is-toc-rail.has-toc { grid-template-columns: minmax(0, 1fr); padding-left: 0; }`.

E2E fixtures: `toc-rail.md` with frontmatter `toc: { style: rail }` (YAML: `toc:\n  style: rail`), 8 h2 and 4 h3, one h2 with a 90-character title, enough paragraphs to scroll. `docs/toc-rail.md`: same content under `/docs`, so the sidebar shows.

- [ ] **Step 1: Write the failing e2e spec** `e2e/specs/toc-rail.spec.ts` (use `../helpers/fixtures` like `layout.spec.ts`):
  - at 1440×900 on `/toc-rail`: `nav.toc-rail` visible; `.toc` panel (`nav.toc`) not present; the rail's bounding box is right of `#mdxpage`'s box (`rail.x >= text.x + text.width`); 12 ticks.
  - hover `.toc-rail` → `.toc-rail-outline` visible; its box left edge < rail's left edge (opens leftwards).
  - keyboard: focus the button with Tab navigation (`page.keyboard.press('Tab')` until focused, or `button.focus()`), `aria-expanded="true"`; press Tab → a link in the outline is focused; press Escape → outline hidden, button focused.
  - click the third outline link → URL hash is that heading's id.
  - at 1440 on `/docs/toc-rail`: `.site-sidebar` visible and left of `#mdxpage`; rail right of `#mdxpage`.
  - at 1100×800 on `/toc-rail`: rail visible, `.toc-inline` hidden.
  - at 390×844 on `/toc-rail`: rail hidden, `details.toc-inline` visible and closed; open it, click a link → details closed and hash set.
  - at 390×844 on an existing page that has `showToc` and the panel style with ≥3 headings (pick one in the fixture site with headings, e.g. `basic-syntax`; confirm it has ≥3 h2/h3): `details.toc-inline` visible.
  - at 1440 on a panel page: `nav.toc` visible and `.toc-inline` hidden (no regression).
  - The inline block repeats heading titles in the DOM on every page with 3+ headings: grep existing specs for `getByText`/`getByRole('link'` lookups of heading titles and scope them to `#mdxpage` where they'd now match twice.
- [ ] **Step 2: Confirm the spec fails** where possible: run unit checks and typecheck locally; e2e needs the Docker stack, so it runs in CI (`.github/workflows/e2e.yml`). Do not set up Docker locally.
- [ ] **Step 3: Implement** the page wiring and CSS.
- [ ] **Step 3b: Theme class reference.** New classes must be documented: in `scripts/theme-class-reference.mjs` (repo root), add `is-toc-rail` to the `.layout-inner` modifiers in the `layout` group's `dom` and to the modifier map (next to `'has-toc': '.layout-inner'`), extend the `toc` group's `dom` with the rail (`.toc-rail > .toc-rail-button > .toc-rail-ticks`, `.toc-rail-outline`) and `.toc-inline`; then run `pnpm docs:theme-classes` from the repo root and commit the regenerated reference.
- [ ] **Step 4: Run** `pnpm vitest run --project=unit` (all unit tests), `npx tsc --noEmit -p apps/flowershow`, and from the repo root `pnpm lint` (includes `docs:theme-classes:check`) → pass. E2E is verified on the PR's CI run in Task 7.
- [ ] **Step 5: Commit** `feat(toc): rail style on the page; inline contents on narrow screens`.

### Task 6: Docs and changelog

**Files:**
- Modify: `content/flowershow-app/docs/reference/table-of-contents.md` (add "Choose the rail style" section with the `config.json` and frontmatter examples; note the inline Contents block on phones; note the rail is the newer option and may become the default)
- Modify: `content/flowershow-app/docs/reference/config-file.md` (add `toc.style` beside `showToc`)
- Create: `content/flowershow-app/changelog/2026-11-07-contents-rail.md` (title "Page contents as a tick rail", per AGENTS.md changelog template; authors: `rufuspollock` (as recent entries); **Fixes** bullet: "Phones now get a Contents block on long pages")
- Check: `apps/flowershow/README.md` for a config-options list; update if it lists `showToc`.

- [ ] **Step 1:** Write the docs and changelog (no hard wraps; one line per paragraph).
- [ ] **Step 2:** Screenshot is added after merge from a live `fl` site (Task 7); leave `image:` out for now.
- [ ] **Step 3: Commit** `docs(toc): rail style docs and changelog`.

### Task 7: PR, CI, and live check

- [ ] **Step 1:** Push `worktree-toc-layout`, open a PR to `main` titled "Page contents as a tick rail (opt-in)", body: what, why (link spec), how to try (`toc: { style: rail }`), screenshots not yet possible (Vercel previews are behind SSO), `Refs flowershow-6e1`, session link.
- [ ] **Step 2:** `gh pr checks <n> --watch` until Lint, test, e2e pass (the full e2e suite, not only the new spec). Fix failures (e2e failures: read the job log and the Playwright report artifact).
- [ ] **Step 3:** Independent review per `docs/agents/review.md` before asking Rufus to merge.
- [ ] **Step 4 (after Rufus merges, needs his yes):** publish a throwaway site with `fl` from the e2e fixture copy (two pages: with and without sidebar), check desktop 1440, 1100, phone 390, hover, keyboard, browser zoom 200%, comments panel open, and the rail starting level with the first line of text; repeat on the letterpress, lessflowery and superstack themes; screenshot ~1440px `.webp` into `content/flowershow-app/assets/` and add `image:` to the changelog entry; then switch the Collective Action site (`toc.style: rail`, drop the rail half of `house.js` and the grid overrides): that repo is Rufus's, so propose it as a PR there.
