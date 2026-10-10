# Listing pages and blog archives: consolidated reference

Date: 2026-10-10
Status: Reference (not a design). Gathers everything that exists today about listing pages, blog archives, `<List />`, Obsidian Bases and collection templating, so a design can start from one place.
Umbrella: beads `flowershow-sgw` (mirrors GH #924).

## Summary

Flowershow has three separate mechanisms that produce "a page listing other pages", plus one unimplemented design:

1. **`<List />`** (MDX component, since March 2025, #687). Lists every `.md`/`.mdx` file under a folder, sorted by `date` desc then `title` asc, with five configurable "slots" (media, eyebrow, headline, summary, footnote) mapped to frontmatter fields, and optional client-side pagination. It requires MDX rendering. It fetches its data in the browser via tRPC. It does not resolve authors, filter, limit or change sort order. It has stable, documented CSS hooks (`.list-component-*`).
2. **Obsidian Bases** (```` ```base ```` YAML code blocks, alpha Nov 2025, beta Jan 2026, #861). A server-side reimplementation of Obsidian's query engine (filters, formulas, properties, sort) with table, cards and list views. Since 2026-10-10 (#1455, `flowershow-bzp`) it works in plain `.md` pages as well as `.mdx`. It ignores `limit` and `groupBy`, has no pagination, does not support `.base` file embeds or `this`, and its views are styled with MUI `sx` props rather than semantic theme classes.
3. **Changelog layout** (Sept 2026, beads `flowershow-v8x`). A dedicated, server-rendered, paginated listing for a `changelog/` folder or `CHANGELOG.md`, chosen automatically or via `layout: changelog` frontmatter. Its design explicitly decided not to use `<List>`. It is the only frontmatter/folder-driven listing layout that exists.
4. **Custom collection cards** (design + implementation plan 2026-03-29, #1222, not implemented). Frontmatter `collections: items: from: /projects` plus a `{% for item in items %}` loop around normal HTML in the page body.

The recurring need, mostly voiced by Rufus while building real sites (lifeitself.org, developmentalspaces.org, secondrenaissance), is a blog/listing page that looks great with almost no setup, can be customised, and is authored in a "markdown-y" way rather than with JSX. Bases is felt to be too hard for "I just want a blog listing or some cards" (#1095). External user reports are few but concrete: Dataview/Bases-style queries as a make-or-break migration feature (#170), grainy Bases card images on a blog homepage (#1198), and features missing from `.md` pages (`flowershow-bzp`).

Proposals on the table include a ```` ```list ```` / ```` ```blog ```` YAML block (#924, #1008, #1120), a frontmatter `layout: blog-list` (#1120), a `<Blog />`/`<BlogArchive />` preset (#923), making Bases the single engine behind `<List />` (`flowershow-sgw`), and the collection-templating loop (#1222). These overlap and partly contradict each other; see [Open questions and contradictions](#open-questions-and-contradictions).

## Current state

### `<List />` component

**What it does**

- Usage: `<List dir="/blog" slots={{ headline: "title", summary: "description", eyebrow: "date", footnote: "authors", media: "image" }} pageSize={5} />`.
- Props: `dir` (absolute folder, default `""` = site root), `slots` (default `{ headline: "title", summary: "description" }`), `pageSize` (optional; no pagination when unset, per #892), and a deprecated `fields` array (`title | description | authors | date | image`) that maps to fixed slots.
- Slots can map to any frontmatter key (added in #846, released Nov 2025).
- Data source: tRPC `site.getListComponentItems` (`apps/flowershow/server/api/routers/site.ts`, around line 1364). A raw SQL query on the `Blob` table: `path LIKE dir%`, extension `md`/`mdx`, `app_path IS NOT NULL`, excluding the folder's own `README.md(x)`/`index.md(x)` (#941). It is recursive (subfolders included). Order is `metadata->>'date'` desc nulls last, then `metadata->>'title'` asc. The media field is resolved from wiki links/relative paths to a site URL. The URL is `permalink || app_path`. Cached with `unstable_cache` (60s revalidate, tags `siteId` and `siteId-dir-catalog`).
- Rendering (`apps/flowershow/components/public/mdx/list.tsx`): a `'use client'` component. It calls `api.site.getListComponentItems.useQuery` in the browser, shows a `react-loading-skeleton` placeholder while loading, then renders `<article class="list-component-item">` per item with optional media (`next/image`, 1200x800, falling back to `https://r2-assets.flowershow.app/placeholder.png` when the media slot is set but the item has no image), eyebrow, `h3` headline link, summary and footnote. Values that look like ISO dates are printed `YYYY-MM-DD`. Arrays are joined with `, `. Other values are printed raw. An unused `applyFormat` (currency/date/number/percent/join/prefix/suffix) and a commented-out `slotsFormat`/`locale` API exist in the file.
- Pagination: client-side slicing of the full result by `?page=N` (`apps/flowershow/components/public/mdx/list-pagination.tsx`, uses `router.push`). The page-number strip shows page 1, the last page and current ±2. For every other page it renders its own `.list-component-pagination-ellipsis` span (they are not collapsed), so a large blog produces a long run of `...`. #1120 reports a problem with "the number of paginated pages shown for a large blog".
- Registration: `apps/flowershow/components/public/mdx/mdx-components-factory.tsx` (around line 66) injects `siteId` and wraps it in an error boundary. It is only registered for the MDX pipeline.
- Styling: stable classes documented in `content/flowershow-app/docs/reference/list-component.md` and `content/flowershow-app/docs/reference/theme-class-reference.md` ("Lists, cards, skeletons, and pagination"). Default styles are in `apps/flowershow/styles/default-theme.css` (around line 1511). The whole-card-clickable recipe (`.list-component-item-headline-link::after`) was documented in #1439 / `flowershow-16u` (closed 2026-10-08).
- Tests: `apps/flowershow/components/public/mdx/list.test.tsx`, `apps/flowershow/server/api/routers/__tests__/site.test.ts` (`site.getListComponentItems`), `apps/flowershow/e2e/specs/blog.spec.ts`, and a Storybook story at `apps/flowershow/stories/List.stories.tsx`.

**Limitations (factual, from code and issues)**

- MDX only: a page must be `.mdx` (with the default `syntaxMode: auto`) or set `syntaxMode: mdx` (docs callout in `list-component.md`, `content-catalogs.md`).
- No author resolution: `authors: [jane]` prints `jane`, not the `people/jane.md` title or a link (#895, open). Author resolution already exists elsewhere (`site.getAuthors`, used by the page header and changelog).
- No filter, tag/category, limit, offset or sort-order props. Sort is hard-coded.
- No layout variants (list vs cards vs grid): one markup shape, styled by CSS only.
- Fetched client-side. The list is not in the server-rendered HTML; a skeleton shows first.
- Pagination loads all items and slices them in the browser. The ellipsis rendering is not collapsed (see above).
- Date formatting is fixed to `YYYY-MM-DD`.
- The interactive docs link (`components.flowershow.app` Storybook) has failed to deploy since Feb 2026 (`flowershow-stg`).

### Obsidian Bases

**What it does**

- Syntax: a fenced ```` ```base ```` code block containing Obsidian Bases YAML (`filters`, `formulas`, `properties`, `views`).
- Transform: `apps/flowershow/lib/remark-obsidian-bases.ts` (about 1,600 lines) collects `code` nodes with `lang === 'base'`, parses the YAML, and runs one query per view against Prisma at render time on the server. Filters compile to a Prisma `where` where possible, with an in-memory post-filter for the rest. Formulas are evaluated in memory. Sorting by `file.name` happens in the DB; other sorts happen in memory. It replaces the code node with an `mdxJsxFlowElement` named `ObsidianBasesViews` whose props are JSON strings (`viewData`, `siteHostname`, and `allSitePaths`, which lists every blob path on the site). On error it emits `<div class="obsidian-base-error">`.
- Expression engine: `apps/flowershow/lib/bases-parse.ts` (jsep → AST) and `apps/flowershow/lib/bases-expr.ts` (AST types).
- Views (`apps/flowershow/components/public/mdx/`): `obsidian-bases-views.tsx` (client; a MUI `Select` view switcher when there are several views), `obsidian-base-table.tsx`, `obsidian-base-cards.tsx`, `obsidian-base-list.tsx`. No views given defaults to a table of `file.name`.
- Cards: `cardSize` (default 200), `image`, `imageFit`, `imageAspectRatio`, and hex colours as card backgrounds. Table: built-in summaries.
- Supported surface (user doc `content/flowershow-app/docs/reference/obsidian-bases.md`, changelog `content/flowershow-app/changelog/2026-09-18-obsidian-bases-improvements.md`): and/or/not filters; arithmetic/comparison/boolean operators; date + duration arithmetic; most global/string/number/date/object functions; `file.name/basename/path/folder/ext/size/ctime/mtime/tags/links/backlinks`; `file.hasTag/hasLink/inFolder/hasProperty`; an empty `filters` returns the whole vault. `sort` is a Flowershow-specific extension (not in the official spec); `order` is the fallback.
- Internal audit against the official spec: `docs/obsidian-bases-syntax-reference.md` (audited 2026-09-09, before #1378 added tag/link filters).
- .md and .mdx: registered in both `processMarkdown` (`apps/flowershow/lib/markdown.ts`, around line 125, only when `siteId` is passed) and `getMdxOptions` (around line 342). Plain `.md` support landed in #1455 on 2026-10-10 (`flowershow-bzp`, a user-reported bug).
- Tests: `apps/flowershow/lib/remark-obsidian-bases.test.ts`, `apps/flowershow/lib/markdown-md-parity.test.tsx`, `apps/flowershow/e2e/specs/bases.spec.ts`, `apps/flowershow/e2e/specs/tables.spec.ts`.

**Limitations**

- `limit` and `groupBy` are never read (`docs/obsidian-bases-syntax-reference.md`). There is no pagination.
- No `.base` file embeds (`![[x.base]]`) (#1133, open). No `this` context. No `map/filter/reduce`, regex, `file()`, `link()`, or custom summaries (#1009 remaining items). No map view or row height.
- Styling uses MUI components and `sx` props. The only class hooks are `not-prose` and `obsidian-base-error`, so there is no semantic class contract comparable to `.list-component-*` or `.changelog-*`.
- Card images use `sizes={cardSize + "px"}` (200 by default) while the grid stretches cards (`minmax(cardSize, 1fr)`), so `next/image` requests about 256w and the image is upscaled (#1198, external user).
- Plain-text cell values are not autolinked (#1153, open, agent brief written).
- No author resolution in views.
- Documentation gaps: the reference page has no "how to add a base block" example and says nothing about `.md`/`.mdx`. The alpha/beta blog posts and the 2025-11-25 changelog still say Bases require MDX, which has been untrue since #1455. Rufus (#1095): "our own documentation is weak… Saying that users can go to Obsidian isn't sufficient… Claude got totally confused."

### Blog layout (`blog.tsx`)

- `apps/flowershow/components/public/layouts/blog.tsx` exports `BlogLayout`. Despite the name, it is the **default page layout for every ordinary page** (not a listing). It renders the page header: breadcrumbs, `h1.page-header-title`, description, resolved author avatars and names, date, reading time and tag pills. It is used in `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` (around line 704) for pages that are not canvas, `layout: plain`, or changelog.
- `apps/flowershow/components/public/layouts/index.ts` maps `{ blog: BlogLayout }` but is not imported anywhere.
- Known defects (#1343, open): a literal `.is-linked` class (`className="page-header-author-name .is-linked"`), Tailwind `mr-1`/`mx-1` in semantic markup, and several emitted classes that are not styled or documented.
- There is no blog *archive/index* layout. A blog index today is a page (often `blog/README.md`) containing `<List />` (guides `content/flowershow-app/docs/guides/publish-blog.md`, `turn-obsidian-vault-into-a-blog.md`, `content-catalogs.md`).

### Frontmatter layouts

- `PageMetadata.layout?: 'plain' | 'changelog' | (string & {})` (`apps/flowershow/server/api/types.ts`, around line 128).
- `layout: plain` drops the prose column, header and typography styles (page route, around line 500).
- `layout: changelog` on a folder `README.md`/`index.md`, or on a single page, opts into the changelog renderer. `layout: default` opts out (`apps/flowershow/lib/changelog-context.ts`; docs `content/flowershow-app/docs/reference/changelog.md`). Folder detection is automatic for folders named `changelog`, including a generated index when the folder has no README.
- Changelog renderer: `apps/flowershow/components/public/changelog/*`, tRPC `site.getChangelogEntries` (modelled on `getListComponentItems`), server-rendered, 10 per page via `?page=N`, authors via `people/`, stable `.changelog-*` classes, and an RSS feed.
- No other values of `layout` have behaviour today. Unknown values fall through to the default layout.

### Code-block → component transform mechanism

- The only code-fence → component transform today is ```` ```base ```` (plus ```` ```mermaid ```` via `mdx-mermaid`, and math). Pattern: a remark plugin visits `code` nodes by `lang`, does async server work, and replaces the node with an `mdxJsxFlowElement`.
- MDX pipeline (`getMdxOptions`, `apps/flowershow/lib/markdown.ts`, around line 291, rendered by `next-mdx-remote-client`): JSX elements map to the component registry in `mdx-components-factory.tsx` / `mdx-client-components.tsx`.
- MD pipeline (`processMarkdown`, around line 84, bare `unified`): `remarkMdxJsxToElement` (around line 177) turns `mdxJsxFlowElement` nodes into hast elements named after the component in **lowercase**, passing **only string-valued attributes**. `rehypeToReact` then maps a fixed set of names (`img`, `pre`, `mermaid`, `iframe`, `obsidianbasesviews`) to React components. Any new block component must serialise its props as strings and be added to both registries to work in `.md`.
- Rendering choice: `apps/flowershow/lib/render-page-content.tsx` (around line 104). MD is used when `renderMode === 'md'`, or when it is `auto` and the file is `.md`. Otherwise MDX is used. `renderMode = frontmatter syntaxMode ?? site syntaxMode`. The site default is `auto` (`apps/flowershow/lib/site-config.ts`). Configuration came from #917 (`syntaxMode: md | mdx | auto` in `config.json`/dashboard, per-page `syntaxMode: md | mdx`). Docs: `content/flowershow-app/docs/reference/syntax-mode.md`.
- The remark plugin chain is otherwise shared between the two pipelines (wiki links, GFM, callouts, tags, etc.). `remarkChangelog` runs last because it restructures the tree.

### .md vs .mdx parity

| Feature | `.md` | `.mdx` |
| --- | --- | --- |
| `<List />` | No (JSX) | Yes |
| ```` ```base ```` | Yes (since #1455, 2026-10-10) | Yes |
| Changelog layout | Yes | Yes |
| Mermaid, code copy, PDF embeds | Yes (since #1455) | Yes |
| MDX variables / JSX loops (#950, `content/flowershow-app/docs/reference/frontmatter-variables.md`) | No | Yes (static variables only; you cannot inject query functions into the MDX scope) |

Obsidian cannot edit `.mdx` files (olayway, #917), which is why the per-page `syntaxMode` frontmatter exists.

### Other related listing surfaces

- Tags index and tag pages (`apps/flowershow/components/public/tags/`, #1395/#1396).
- RSS feed: includes every page with a `date` (`content/flowershow-app/docs/reference/rss-feed.md`).
- The "uses/blogs" landing page (`content/flowershow-app/uses/blogs.md`, #1102) markets "One line sets up a listing of your posts… Paginated if you want" and links to the List docs.

## User needs and pain points

### Reported by external users

- **Dataview-style queries are make-or-break for migration.** kianenigma, #170 (2024-07-22): "dataview support is the main make or break it feature I need". This was closed in favour of Bases.
- **Bases cards used as a blog "Featured posts" section look grainy.** marcusyoung, #1198 (2026-03-15), on backtobasic.dev: images "served at 256px wide and zoomed in to fill the card". This shows a real user building a blog homepage listing with Bases cards.
- **Features silently missing from `.md` pages.** User report captured in `flowershow-bzp` (2026-10-10): code copy, Mermaid, PDF and Bases did not work in `.md`, and "users were told to switch to MDX". Now fixed for Bases; `<List />` remains MDX-only.

### Reported by the maintainer/team while using Flowershow on real sites (dogfooding)

- **A blog listing page should be elegant and very easy to set up.** Rufus, #1120 (2026-02-28), building lifeitself.org/blog: "I would like to make this really elegant and easier to set up… a few options for layout, or even just the basic option of a list, but to do it really nicely… a nice HTML structure that can then be easily customised in design." An AI session using `<List />` "worked pretty well out of the box", with two issues: pagination on a large blog, and "Not sure why dates and images not nicely shown".
- **Bases is too heavy for simple listings.** Rufus, #1095 (2026-02-23): "it is really hard to use… I often just want things like a blog listing or a bunch of cards listing something, and it's hard going and not very elegant." He also noted friction on non-Obsidian sites, a bug suggesting Bases had not been used with MDX, and that AI assistants struggle with the Bases docs.
- **Needing to know whether all slots must be set.** Rufus, #923: "Do i have to set all these fields? If I don't have them what happens?"
- **Custom layouts from query results.** Rufus, #952 / #950 (Nov 2025): "access to the underlying query results so that inside an MDX page I can iterate in JSX and build my own layouts — for lists of residencies, initiatives, posts… list 3 blog posts on the front page."
- **Custom frontmatter fields in listings.** Rufus, #846, for ecosystem.secondrenaissance.net/pip (done via `slots`).
- **Turning pagination off.** Rufus, #892, developmentalspaces.org/examples (fixed: pagination only when `pageSize` is set).
- **Authors shown as raw slugs.** olayway, #895.
- **Theming hooks.** #1338, #1439 / `flowershow-16u` (done for List), #1343 (blog header defects). The theming contract is semantic CSS classes plus custom properties; "Tailwind… used internally but not exposed as the theme API" (`docs/theming.md`).
- **Content-type variety.** Listings are needed for blog posts, projects, people, residencies, initiatives, podcasts and recipes (#1222 design doc, #950, #952, `content-catalogs.md`), and a blog template for "art/humanities content with elegant images" (#883, olayway, empty body).
- **The changelog needed more than `<List>`.** `docs/plans/2026-09-18-changelog-rendering-research.md`: the old List-based changelog "works, but it's a list of links rather than a changelog experience".

## Proposals already on the table

| Proposal | Source | Status |
| --- | --- | --- |
| YAML code block instead of JSX components that "*internally* converts into components in the way that Bases work", e.g. ```` ```list ```` with `dir: /blog` | Rufus, #917 comment, carried into #924 (opened by olayway) | Open; restated in `flowershow-sgw` ask 1 |
| ```` ```blog ```` shorthand for blog archives with "very little configurability", expecting date, title, description and image; "just works"; reuses List or Bases internally | Rufus, #924 (2025-11-02) | Rufus doubted it in the same comment (see contradictions) |
| ```` ```blog ```` with the folder as body, defaulting to `blog/`: "If you want something more fancy use Bases" | Rufus, #1008 (closed as duplicate of #923/#1120), repeated in #1120 | Open via #1120 |
| Frontmatter-driven blog index: `layout: blog-list` plus a `blog: { folder: posts, layout: list }` frontmatter block, **or** a ```` ```blog ```` block with `folder` / `layout: list` | Rufus, #1120 | Open |
| A `<Blog />` or `<BlogArchive />` component with slot defaults preset | Rufus, #923 | Open (inbox) |
| Rename the `eyebrow` slot to `date` | Rufus, #923 | Rejected by olayway: "eyebrow is whatever you put there, not always date" |
| Prioritise a basic Bases that covers what List does | Rufus, #924 | Partly happened (Bases shipped) |
| Deprecate `<List />` in favour of the Bases engine: list blocks and `<List />` (kept for back-compat) "get replaced behind the scenes by the Bases engine, so there is one listing engine" | Rufus, `flowershow-sgw` ask 2 (2026-10-10) | Open |
| An elegant default blog archive (date, title, description, image) with near-zero config, a few layout options (list, cards…), and clean semantic HTML that themes can restyle | Rufus, `flowershow-sgw` ask 3; #1120 | Open |
| `flowershowQuery(dir=…, limit=…, sort=…)` callable in MDX, with results iterated in JSX; or evidence.dev-style YAML blocks that inject variables | Rufus, #950 | Query function not possible in the MDX scope (olayway); static MDX variables work |
| Expose the List "query part" separately from its "render part" | Rufus, #950 | Reflected in the #1222 plan (shared collection loader) |
| Frontmatter `collections: { items: { from, sortBy: date\|title, sortDirection } }` plus a Markdoc-style `{% for item in items %}…{{ item.field }}…{% /for %}` around normal HTML in the page body; must work in `.md`; no pagination, conditionals or nested loops in v1 | Rufus, #1222; `docs/plans/2026-03-29-collection-listing-templating-design.md` and `-implementation.md`; draft tutorial `content/flowershow-app/docs/guides/custom-collection-cards.md` (published with a "not yet implemented" warning) | "Selected direction for now", not implemented |
| Evaluate adopting Markdoc (wholesale, partial, or a narrow compatible subset) | #1222 design doc | Undecided |
| Offer a couple of List themes | Rufus, #766 | Deferred by olayway ("wouldn't bother with themes for now") |
| `<Changelog>` embed component (e.g. latest 3 on a homepage) | Changelog design doc, "someday/maybe" | Not planned |
| Bases launch/docs: full on-site docs (even duplicating Obsidian's), a landing page, walkthroughs, bolder announcements; position it as "Notion-style databases for Markdown" | Rufus, #1095 | Open |

## Decisions already made

- **No namespacing on block names**: ```` ```list ````, not ```` ```flowershow-list ````. Rufus, #924: "i think not. do the simplest thing possible." Recorded in `flowershow-sgw`.
- **List slot defaults** are `{ headline: "title", summary: "description" }`. olayway, #923, and docs.
- **The `eyebrow` slot is location-named on purpose.** olayway, #923. Rufus has not replied on the record.
- **Pagination only when `pageSize` is set.** #892.
- **`slots` replaces `fields`** (with `fields` still accepted and marked deprecated). #846, `list.tsx`.
- **Bases instead of Dataview.** #170 closed 2025-11-17 "as we're implementing Bases support instead"; #861.
- **Bases is reimplemented server-side**, because Obsidian's plugin API cannot execute base queries outside a view (olayway, #861). Rufus asked for an **80/20 approach**: not all functions, add file metadata incrementally (#861).
- **Syntax mode**: `md | mdx | auto` per site, `md | mdx` per page. Rufus wanted `auto` as the default (#917), and `apps/flowershow/lib/site-config.ts` defaults to `auto`.
- **No query functions in the MDX scope** (olayway, #950). Static MDX variables are supported (docs PR #1213).
- **Changelog does not use `<List>`**; it uses a dedicated server-rendered renderer, auto-detection plus a `layout: changelog` override, 10 per page, authors via `people/`, and stable classes (`docs/plans/2026-09-18-changelog-rendering-design.md`, decisions 1, 4, 5, 8, 12). This was approved and shipped.
- **Collection templating, "selected direction for now"** (#1222 design doc). Collections are bound in frontmatter, and custom markup lives in the page body. HTML inside a YAML `template:` string in a fenced block was rejected as worse for humans and AI. Inline query code fences (evidence.dev style) were considered weaker. Predefined layouts alone were judged insufficient. In v1, custom collection cards have no pagination ("use `List` when you want pagination"), and the feature "does not replace `List`".
- **Bases must work in `.md`** (fixed in #1455). `flowershow-sgw` acceptance criteria: the listing solution must work in `.md` and `.mdx`.
- **`flowershow-sgw` acceptance criteria**: a shaped design note choosing the syntax and the engine; a blog archive that looks great with zero or near-zero config; a documented deprecation/alias plan for `<List />`; works in `.md` and `.mdx`.

## Open questions and contradictions

- **Bases as the single engine vs "Bases is too hard".** `flowershow-sgw` proposes putting `<List />` and list blocks on the Bases engine. #1095 says Bases is hard to use for simple listings, and in #1120 Rufus says: "I don't really want to use, I think, the basis functionality; I want to use something super simple". These are compatible only if the Bases *engine* is hidden behind a simpler *syntax*. That has not been stated or decided.
- **Simple preset vs powerful version first.** In #924 Rufus proposes a ```` ```blog ```` shorthand and then writes: "I'm not sure this is worth it vs the more complex version people can copy and paste (i'd least start with more powerful version…)". Later, in #1008 and #1120, he asks for the simple ```` ```blog ```` block that "just works".
- **Is `list` the general form and `blog` the preset, or the reverse?** Open in `flowershow-sgw`.
- **Frontmatter-driven (`layout: blog-list`) vs an in-body block, or both?** Open (#1120, `flowershow-sgw`). The changelog is a shipped precedent for the frontmatter/folder approach.
- **Deprecating `<List />` vs the #1222 plan.** The #1222 plan keeps `List` as the answer for pagination and says collection cards do "not replace `List`". `flowershow-sgw` proposes deprecating `List`.
- **Pagination ownership.** List paginates client-side, Bases has none, changelog paginates server-side, and collection cards exclude it in v1. Whether the unified solution paginates, and how (server vs client, URL shape), is open. Also open in `flowershow-sgw`: tag/category filtering and RSS.
- **Engine features a blog listing would need that Bases lacks today**: `limit` (ignored), pagination, author resolution, semantic class hooks, and responsive image sizing (#1198). List lacks filtering and sort control. Neither renders the list server-side in plain HTML (List is client-fetched; Bases serialises JSON props into client components).
- **Bases vs Obsidian fidelity.** Bases aims to match Obsidian syntax (`docs/obsidian-bases-syntax-reference.md`), while `sort` is a Flowershow-only extension. If listing presets compile to Bases, it is undecided whether any new keys become further non-standard extensions.
- **Markdoc adoption** (#1222): adopt, borrow syntax, or implement a narrow subset. This is undecided. It would be an architectural change to a unified + `next-mdx-remote-client` stack.
- **What values a template or listing can access** (built-in page properties beyond frontmatter, date formatting, missing-field behaviour): "Still to be specified" in the #1222 design doc.
- **Migration path for existing `<List />` users**: `flowershow-sgw` suggests keeping it as an alias compiling to the same engine. Existing sites use `.mdx` pages with `<List />`.
- **Documentation inconsistencies found while consolidating:**
  - `content/flowershow-app/docs/reference/syntax-mode.md` shows `<List path="notes" />`, but the prop is `dir`.
  - Bases blog posts and the 2025-11-25 changelog still say Bases require MDX.
  - The List docs link to the broken Storybook site.
  - The Bases reference page has no block-usage example.
  - `docs/plans/2026-03-29-collection-listing-templating-design.md` contains a stray `kkkkkkkkkkk` line.
  - The custom-collection-cards tutorial is published in the docs tree although the feature does not exist.
- **#948 "List / Catalog improvements"** is linked from #923 but does not resolve on GitHub (it is neither an issue nor a PR). It may have been deleted or transferred.
- **flowershow/product#81** ("Flowershow for Blogs" landing page) is accessible but only concerns marketing: acceptance items are feature highlights, a demo video and demo sites. It contains no listing requirements.

## Index of sources

### GitHub issues (flowershow/flowershow)

- #170 Support obsidian dataview (or equivalent): https://github.com/flowershow/flowershow/issues/170 (closed; replaced by Bases)
- #687 Blog support in Cloud (and lists/queries in general): https://github.com/flowershow/flowershow/issues/687 (closed; origin of List)
- #766 Blog / List component v1.1: https://github.com/flowershow/flowershow/issues/766 (closed; pagination, images, fields)
- #846 Allow use of custom frontmatter fields in the List component: https://github.com/flowershow/flowershow/issues/846 (closed; `slots`)
- #861 Support obsidian new Bases syntax: https://github.com/flowershow/flowershow/issues/861 (closed)
- #883 Blog template for art/humanities content: https://github.com/flowershow/flowershow/issues/883 (open, empty)
- #892 How do i have List component with no pagination?: https://github.com/flowershow/flowershow/issues/892 (closed)
- #895 List component should resolve authors: https://github.com/flowershow/flowershow/issues/895 (open)
- #896, #941, #944 List style, README listing and pagination fixes (closed)
- #917 Support normal markdown (no JSX): https://github.com/flowershow/flowershow/issues/917 (closed; syntax mode; origin of the YAML-block idea)
- #923 [inbox] List / Blog v1.1: https://github.com/flowershow/flowershow/issues/923 (open epic)
- #924 Yaml block components: https://github.com/flowershow/flowershow/issues/924 (open; mirrored by `flowershow-sgw`)
- #948 List / Catalog improvements: not resolvable
- #950 Can we use MDX variables (and run queries): https://github.com/flowershow/flowershow/issues/950 (closed); docs PR #1213
- #952 Flowershow for LifeItself.org: https://github.com/flowershow/flowershow/issues/952 (closed)
- #1008 I can type ```` ```blog ```` and get a blog: https://github.com/flowershow/flowershow/issues/1008 (closed as duplicate)
- #1009 Bases Support V2: https://github.com/flowershow/flowershow/issues/1009 (open)
- #1095 Next steps on Bases: https://github.com/flowershow/flowershow/issues/1095 (open)
- #1102 Use Case: Blogs (polished): https://github.com/flowershow/flowershow/issues/1102 (closed)
- #1120 Have an amazing listing page that is super easy to setup: https://github.com/flowershow/flowershow/issues/1120 (open)
- #1133 Base embedding `![[offer.base]]`: https://github.com/flowershow/flowershow/issues/1133 (open)
- #1153 Links don't render as links in base tables: https://github.com/flowershow/flowershow/issues/1153 (open)
- #1166 Theme: product combo site (landing + blog + docs): https://github.com/flowershow/flowershow/issues/1166 (open; links #1164, #1165, #856)
- #1180 [moc] Bases feature: https://github.com/flowershow/flowershow/issues/1180 (open)
- #1198 Flowershow bases image bug: https://github.com/flowershow/flowershow/issues/1198 (open; external user)
- #1222 Clarify collection-driven page templating: https://github.com/flowershow/flowershow/issues/1222 (open)
- #1338, #1439 theme class contract and List hooks (closed)
- #1343 blog.tsx className defects: https://github.com/flowershow/flowershow/issues/1343 (open)
- #1384 Render changelogs nicely (closed); #1395 / #1396 tags
- #1455 .md parity for Mermaid, Bases, PDF, code copy (merged 2026-10-10)
- flowershow/product#81 "Flowershow for Blogs" landing page improvements (open; marketing only)

### Beads

- `flowershow-sgw`: umbrella epic, Great listing/blog pages (open)
- `flowershow-16u`: Stable CSS hooks for List cards (closed, #1442)
- `flowershow-bzp`: .md pages missing Bases/Mermaid/PDF/copy (closed, #1455)
- `flowershow-stg`: Document data components incl. List; retire Storybook (open)
- `flowershow-v8x`: Changelog rendering epic (closed), including `v8x.4` (`layout: changelog`) and `v8x.12` (research)

### Plan and reference docs

- `docs/plans/2026-03-29-collection-listing-templating-design.md`
- `docs/plans/2026-03-29-collection-listing-templating-implementation.md`
- `docs/plans/2026-09-18-changelog-rendering-design.md`
- `docs/plans/2026-09-18-changelog-rendering-research.md`
- `docs/plans/2026-02-21-changelog-page-design.md` (earlier Bases-based changelog plan, superseded)
- `docs/obsidian-bases-syntax-reference.md`
- `docs/theming.md`

### User docs (`content/flowershow-app/`)

- `docs/reference/list-component.md`
- `docs/guides/content-catalogs.md`
- `docs/guides/publish-blog.md`, `docs/guides/turn-obsidian-vault-into-a-blog.md`
- `docs/guides/custom-collection-cards.md` (draft for an unimplemented feature)
- `docs/reference/obsidian-bases.md`
- `docs/reference/syntax-mode.md`
- `docs/reference/changelog.md`
- `docs/reference/theme-class-reference.md`
- `docs/reference/frontmatter-variables.md`, `docs/reference/rss-feed.md`
- `blog/announcing-obsidian-bases-alpha-support.md`, `blog/announcing-obsidian-bases-beta.md`, `changelog/2025-11-25-obsidian-bases.md`, `changelog/2026-09-18-obsidian-bases-improvements.md`
- `uses/blogs.md`

### Code (`apps/flowershow/`)

- `components/public/mdx/list.tsx`, `list-pagination.tsx`, `list.test.tsx`; `stories/List.stories.tsx`
- `components/public/mdx/mdx-components-factory.tsx` (List registration), `mdx-client-components.tsx`
- `server/api/routers/site.ts` (`getListComponentItems`, `getChangelogEntries`, `getAuthors`)
- `lib/remark-obsidian-bases.ts`, `lib/bases-parse.ts`, `lib/bases-expr.ts`, `lib/remark-obsidian-bases.test.ts`
- `components/public/mdx/obsidian-bases-views.tsx`, `obsidian-base-table.tsx`, `obsidian-base-cards.tsx`, `obsidian-base-list.tsx`
- `lib/markdown.ts` (`processMarkdown`, `getMdxOptions`, `remarkMdxJsxToElement`), `lib/render-page-content.tsx`, `lib/markdown-md-parity.test.tsx`
- `components/public/layouts/blog.tsx`, `components/public/layouts/index.ts` (unused)
- `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` (layout selection)
- `server/api/types.ts` (`PageMetadata.layout`, `syntaxMode`), `lib/site-config.ts`
- `lib/changelog-context.ts`, `components/public/changelog/*`
- `styles/default-theme.css` (List styles)
- `e2e/specs/blog.spec.ts`, `bases.spec.ts`, `tables.spec.ts`, `changelog.spec.ts`
