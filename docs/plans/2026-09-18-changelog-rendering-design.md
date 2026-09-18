# Changelog Rendering Design

Date: 2026-09-18
Status: Approved (v1 folder case), 2026-09-18
Epic: beads `flowershow-v8x` (local, stealth-mode beads)
Research: [2026-09-18-changelog-rendering-research.md](2026-09-18-changelog-rendering-research.md)

## Goal

Any Flowershow site renders changelogs beautifully out of the box, with no components or configuration required. Two source shapes are supported:

1. A **`changelog/` folder** of dated entries, like a blog (v1).
2. A **single `CHANGELOG.md`** (or `changelog.md`), the common software-project convention (phase 2).

Both render through the same entry component and the same look.

## Decisions so far

| # | Decision | Notes |
|---|---|---|
| 1 | **Detection: auto-detect + override** | `changelog/` folder and `CHANGELOG.md` / `changelog.md` are detected automatically. Frontmatter `layout: changelog` opts any page or folder in, and another layout opts out. |
| 2 | **Single file → one rich page with anchors** | No per-version pages in phase 2. Each version gets an anchor permalink (e.g. `/changelog#v1-2-0`). |
| 3 | **Look: full-entry timeline** | Linear and Mintlify are the primary inspiration. The index shows entries in full (not excerpts), with a date/version column and permalinks. |
| 4 | **Folder index is automatic** | `/changelog` renders the timeline of folder entries, newest first, paginated. `changelog/README.md` or `index.md` (if present) provides the title and intro above the timeline. |
| 5 | **Don't use `<List>`** | Build a dedicated, server-rendered changelog renderer. The generic `<List>` component isn't good enough for this. |
| 6 | **Start simple with one case: the folder** | We have real test content in `content/flowershow-app/changelog/` (24 entries, the flowershow.app changelog). Get that right first, then add single-file support. |
| 7 | **Page design before implementation mechanics** | Mock up the page with real entries and agree on it before choosing internals. |
| 8 | **Authors via `people/`** | Reuse the blog author infrastructure: `authors: [olayway]` resolves through `people/olayway.md` to the full name, avatar and profile link (`site.getAuthors`, `server/api/routers/site.ts`). Make one batched call per index page covering every author on the page, because `getAuthors` scans the site's blob paths on each call. |
| 9 | **Full entries on the index** | Like Linear and Mintlify. No clamping or "Continue reading". |
| 10 | **No category badges in v1** | Someday/maybe. |
| 11 | **No month separators** | KISS. The date column is enough. |
| 12 | **10 entries per page** | Linear shows about 7 per page. Mintlify doesn't paginate (everything on one page). |

## Phasing

- **v1 (folder):** detection, timeline index, entry page, theming hooks, then dogfooding on flowershow.app/changelog. RSS and docs follow.
- **Phase 2 (single file):** parse Keep a Changelog, Changesets (version-only), date-only and Conventional Changelog headings into entries, and render them with the same entry component on one page with anchors.
- **Someday / maybe:** category badges (New / Improved / Fixed) and filters; a swimlane or time-series strip at the top of the index showing when entries shipped; per-version pages for single files; a `<Changelog>` embed component (e.g. latest 3 entries on a homepage); a richer subscribe affordance.

## Page design

Mockup (v2, beads `flowershow-v8x.1`): https://claude.ai/artifact/4WfPDCR2WtJBV4uNZqou53 (private). It shows the 10 newest real entries in the default theme, with authors resolved from `people/`.

- **Index (`/changelog`):** a two-column timeline. The left column is sticky and holds the date (with an accent dot, linking to the entry's anchor), an optional version pill and the authors. The right column has the title (linking to the entry page), the description (as a lead), the hero `image`, and the full body. Entries are separated by hairlines. The intro above comes from `changelog/README.md`. A pagination footer reads "Showing 10 of N updates · Older updates →", and there's an RSS link in the header.
- **Entry page (`/changelog/<slug>`):** a single reading column with a "← Changelog" back link, a meta row, the title, description, hero and body, then previous/next cards.
- **Mobile:** it collapses to one column, and the meta sits in a row above the title.
- **Proposed theme classes:** `.changelog`, `.changelog-header`, `.changelog-title`, `.changelog-intro`, `.changelog-entries`, `.changelog-entry`, `.changelog-entry-meta`, `.changelog-entry-date`, `.changelog-entry-version`, `.changelog-entry-authors`, `.changelog-entry-title`, `.changelog-entry-description`, `.changelog-entry-media`, `.changelog-entry-body`, `.changelog-pagination`, `.changelog-single`, `.changelog-entry-nav`.

The page-design open questions are settled by decisions 9–12 above.

## Entry model

A changelog entry, as seen by the renderer:

```ts
type ChangelogEntry = {
  path: string;          // blob path, e.g. "changelog/2026-08-21-monospace-theme.md"
  url: string;           // permalink || appPath
  anchor: string;        // id on the index page, derived from the filename slug
  title: string;         // frontmatter title, else filename slug without the date prefix
  date: string | null;   // frontmatter date, else YYYY-MM-DD filename prefix, else null
  version?: string;      // optional frontmatter `version`
  description?: string;
  image?: string;        // resolved exactly like <List> media (wiki link → site URL)
  authors: Author[];     // resolved via people/ (site.getAuthors)
  body: string;          // raw markdown; compiled with the normal page pipeline
};
```

Folder entry sources:
- **Entries** are all `.md`/`.mdx` files directly inside the changelog folder, excluding `README.*` and `index.*`, and excluding `publish: false`. Subfolders are ignored in v1.
- **Sort order:** date descending, with undated entries last, then path descending. This is the same pattern as `getListComponentItems`, plus the filename-date fallback.

## Detection

A folder is a changelog folder when either:
1. its last path segment is `changelog` (case-insensitive), or
2. its `README.md`/`index.md` has frontmatter `layout: changelog`.

Opt-out: a `README.md`/`index.md` in a `changelog/` folder with any other explicit `layout` (e.g. `layout: default`, `layout: plain`) disables changelog rendering.

Requests are handled as follows:
- **The folder URL** (e.g. `/changelog`): render the changelog index. If the folder has a README/index, its title, description and body become the header and intro. If it has none, the index still renders, with title "Changelog", instead of 404ing.
- **A file inside the folder** (e.g. `/changelog/2026-08-21-monospace-theme`): render the changelog entry layout. An entry's own `layout:` frontmatter still wins.

## Architecture

Everything happens at render time in the Next app. There are no worker, sync or database schema changes.

- **Page route** (`app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`): after the blob lookup, resolve the changelog context. If the slug is a changelog folder, render `<ChangelogIndex>`. If the blob sits in one, wrap the content in `<ChangelogEntryLayout>` instead of `BlogLayout`. The route reads `searchParams.page` for pagination.
- **tRPC `site.getChangelogEntries({ siteId, dir, page, pageSize })`:** a paginated listing modelled on `getListComponentItems`. It returns `{ entries: ChangelogEntry-without-body-and-authors, total, page, pageCount }` and is cached with `unstable_cache` using the same tags.
- **Pure helpers** (`lib/changelog.ts`) with unit tests: `isChangelogDir`, `entryDateFromPath`, `entryTitleFromPath`, `sortEntries`, `paginate`.
- **Body compilation:** the index fetches the page's entry bodies (`getBlobContent`) and compiles each one with the same markdown/MDX pipeline as normal pages. This logic is extracted from `page.tsx` into a reusable `renderPageContent()` so the index and normal pages share one code path.
- **Authors:** one `site.getAuthors` call with the union of the page's author handles, then mapped back per entry.
- **Components** (`components/public/changelog/`): `ChangelogIndex`, `ChangelogEntry` (used by both the index and the entry page, with a `variant: 'index' | 'page'` prop), `ChangelogPagination`, and `ChangelogEntryNav` (prev/next, computed from the same sorted listing).

## Theming

These classes are a stable, documented contract. Themes override them rather than Tailwind utilities.

`.changelog`, `.changelog-header`, `.changelog-title`, `.changelog-intro`, `.changelog-entries`, `.changelog-entry`, `.changelog-entry-meta`, `.changelog-entry-date`, `.changelog-entry-version`, `.changelog-entry-authors`, `.changelog-entry-author`, `.changelog-entry-title`, `.changelog-entry-description`, `.changelog-entry-media`, `.changelog-entry-body`, `.changelog-pagination`, `.changelog-single`, `.changelog-entry-nav`

- Default styles live in `styles/default-theme.css` inside `@layer components`, using existing tokens (`--font-heading`, `--color-accent`, `--radius`, foreground scale).
- Entry bodies reuse the existing prose styles (`.rendered-mdx` / prose), so themes' typography applies automatically.
- The official themes (leaf, letterpress, lessflowery, monospace, superstack, material-draft) get checked in the themes repo, with fixes where needed.
- The classes are documented in the theme class reference.

## Error handling

- An entry with a bad date: treat it as undated and sort it last. Never crash the index.
- An entry that fails to compile: render that entry's `ErrorMessage` inline and keep the rest of the page.
- A page out of range (`?page=99`): 404.
- An author with no `people/` file: show the raw handle with no avatar, as blog pages do today.

## Testing

- **Unit** (vitest): helpers in `lib/changelog.test.ts` covering detection, date and title fallbacks, sorting and pagination. Router tests for `getChangelogEntries` alongside `server/api/routers/__tests__/site.test.ts`.
- **Component:** `ChangelogEntry` renders its meta, title, description, media and body, with the index and page variants.
- **E2E** (Playwright): a fixture site with a `changelog/` folder (with and without README), checking the index, pagination, the entry page and prev/next.
- **Dogfood:** publish `content/flowershow-app` to a private site with `fl` and compare it with the mockup.

## Out of scope for v1

- Single-file `CHANGELOG.md`: phase 2, planned separately.
- Category badges, a time-series strip, filters, per-version pages, and a `<Changelog>` embed component (see Phasing).
