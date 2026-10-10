# Listing pages in Flowershow: design

Status: proposal v3, 2026-10-10 (v3 adds the zero-config blog folder, section 4.10, and makes the Markdown-only rule explicit), revised after independent review (`listing-design-review.md`) and against `docs/plans/2026-10-10-listing-pages-consolidation.md`. File paths are relative to `apps/flowershow/` unless stated otherwise. Closes the design question in beads `flowershow-sgw` / GH #924, #1120, #1008, #923.

## 1. Purpose and vision

A listing page is the front door of a collection. For most Flowershow sites that means the blog index, which is the second most visited page after the home page, and the one a visitor uses to decide whether the site is worth their time. Today that page needs an `.mdx` file, a JSX component with a `slots={{...}}` prop, a client-side fetch with a loading skeleton, and it silently renders nothing if the author writes it in `.md`. The alternative, Obsidian Bases, is a full query language that both humans and AI assistants find hard to get right for "a list of posts" (#1095).

The vision: **any folder is a collection, and any page can list it in plain Markdown with one line.** A blog index, a projects grid, a people directory, a podcast archive and "latest three posts" on the home page are all the same thing: a folder of pages with frontmatter, shown in one of a few good-looking views, with the right defaults so that the author does not have to think about sorting, dates, authors, drafts or pagination.

One-line pitch: *Put your posts in a `blog/` folder and `/blog` is a paginated, themeable blog index, with nothing else to write. Want it elsewhere or shaped differently? A ```` ```blog ```` or ```` ```list ```` block anywhere, or `layout: list` in a folder's README. Works in `.md`. No MDX, no components, nothing to learn.*

Who it serves, in priority order:

- Obsidian and plain-Markdown bloggers who cannot (or will not) edit `.mdx`, and who want their `/blog` to look like a real blog without configuration (#1120, #1008).
- Authors publishing through an AI assistant. The syntax must be guessable and verifiable: seven flat YAML keys, with a visible error card when a key is wrong, so the assistant can fix it on the next turn.
- Sites with more than one collection: projects, people, residencies, podcasts, talks (#950, #952, #1222). Same syntax, a different folder, maybe a different view.
- Theme authors, who get stable semantic HTML and CSS custom properties, and who should not have to restyle anything when a site switches from the old `<List />` to the new engine.
- Dataview/Bases migrants (#170), who need filtering and sorting on arbitrary frontmatter fields without a programming language. This design covers the common 80% directly and leaves Bases in place for the rest.

## 2. Principles

- **Zero config is the headline.** `layout: list` in a folder index page, nothing else, must produce a page that a maintainer would happily screenshot for the changelog. Every default is chosen for a blog: newest first, title, description, date, authors with names and links, image if there is one, 20 per page.
- **Doing nothing is a feature.** Like the changelog (a `changelog/` folder just works), a `blog/` or `posts/` folder gets a good index page with no file at all, and a `blog/README.md` that is only prose gets the listing beneath it (section 4.10).
- **Fenced blocks and frontmatter only; never an MDX component.** The complete author-facing syntax is ```` ```list ````/```` ```blog ```` fences and frontmatter keys (`layout: list`, `list:`, `draft:`). No page ever needs JSX, an `.mdx` extension or `syntaxMode: mdx` to get a listing. The one React component involved (`ListingImage`, section 6) is an internal rendering detail that authors never write, see or configure. This is the Obsidian Bases authoring model (a fenced YAML block), not the `<List />` model.
- **Markdown first.** The syntax is a fenced code block and frontmatter, both legal in `.md`, in `.mdx` and in Obsidian (which shows the block as a code block and nothing breaks). There is exactly one implementation, a remark plugin registered in both pipelines, so there is no "works in MDX but not in MD" class of bug.
- **AI-writable.** Flat YAML, one level of nesting at most, no expressions, no quoting rules, no JSX. Seven keys. Unknown keys and bad values produce an inline error card that names the key and suggests the fix. The most likely wrong guesses (`dir`, `folder`) are accepted silently. The whole reference fits in one screen of `llms.txt`.
- **Progressive disclosure.** The ladder is: ```` ```blog ```` or `layout: list` (zero config) → ```` ```list ```` with `from:` (any folder, anywhere) → `view:`, `limit:`, `pageSize:` (shape) → `sort:`, `where:`, `show:` (data) → Bases (full query language) → custom CSS on semantic classes (look). Each rung adds one idea.
- **Server-rendered, no client JavaScript.** Items, author names and pagination links are plain HTML produced at render time. No skeleton, no tRPC round-trip, no hydration, crawlable pagination. Same approach as the changelog (`components/public/changelog/changelog-index-page.tsx`, `changelog-pagination.tsx`).
- **One engine, several faces, converged incrementally.** Blocks and `layout: list` share one "folder → items" query from day one. Legacy `<List />`, the changelog, tag pages and Bases cards converge on it in later, individually changelogged steps, never silently.
- **Themes keep working.** The existing `.list-component-*` classes are the public contract (`docs/theming.md` at repo root; all six official themes in `../themes/*/theme.css` target them). The new engine emits the same classes and adds modifiers and custom properties; it does not rename anything.
- **Frontmatter is the schema.** No new config file, no collection registry. The folder is the collection, the frontmatter fields are the columns.

## 3. Author experience

Everything below is typed exactly as an author (or an assistant) would write it.

### 3.1 A blog, zero config

`blog/README.md` (or `index.md`):

```markdown
---
title: Blog
layout: list
---

Notes on building things, roughly weekly.
```

Renders at `/blog`: the page header (title, description if any), the intro paragraph, then every page in `blog/` and its subfolders, newest first, 20 per page, with "Newer" and "Older" links. Each item shows its image (if any), date, title, description and author names linked to their author pages.

```
┌────────────────────────────────────────────────────────────────────┐
│ Blog                                                                │
│ Notes on building things, roughly weekly.                           │
│                                                                      │
│ ┌──────────┐  SEP 18, 2026                                           │
│ │          │  Monospace theme is now available                       │
│ │  image   │  Choose the compact Monospace theme from the dashboard  │
│ │          │  or config. A short, two-line clamp of the description… │
│ └──────────┘  Ola Rubaj · Rufus Pollock                              │
│ ──────────────────────────────────────────────────────────────────── │
│               AUG 2, 2026                                             │
│               Currency symbols in prose no longer break math          │
│               Dollar signs in prose are now left alone unless they… │
│               Ola Rubaj                                               │
│ ──────────────────────────────────────────────────────────────────── │
│ …                                                                    │
│                                                                      │
│            ← Newer   1 … 2 3 [4] 5 6 … 12   Older →                  │
└────────────────────────────────────────────────────────────────────┘
```

### 3.1a A blog with no index file at all

A folder `blog/` (or `posts/`) full of posts and no `README.md`/`index.md`. `/blog` renders exactly the page in 3.1, titled "Blog" from the folder name, with pagination. Add a `blog/README.md` with just a paragraph of prose and the listing appears beneath the prose. Section 4.10 has the rules.

### 3.2 The same blog, as a block (the #1008 ask)

Anywhere in any page, including a `README.md` that is not inside the blog folder:

````markdown
```blog
```
````

That is the whole thing. ```` ```blog ```` is ```` ```list ```` with `from: blog` pre-filled; every other key works identically. If the folder is called something else: ```` ```blog ```` with `from: posts`.

### 3.3 Latest three posts on the home page

`README.md`:

````markdown
---
title: Jane Smith
---

I write about compilers and gardening.

## Latest posts

```blog
limit: 3
```

[All posts →](/blog)
````

Renders three items in the default list view. Inline blocks never paginate unless `pageSize` is set.

### 3.4 Projects as cards

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

Each project page has normal frontmatter plus a custom field, or is a folder of its own (`projects/alpha/index.md` with its images beside it); both forms are items.

```markdown
---
title: Project Alpha
description: A short summary of the project.
image: "[[alpha-cover.png]]"
status: In progress
---
```

Renders a responsive grid; `status` appears as a small labelled field under the description.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│    image     │ │    image     │ │    image     │
│──────────────│ │──────────────│ │──────────────│
│ Alpha        │ │ Beta         │ │ Gamma        │
│ A short      │ │ Another      │ │ Yet another  │
│ summary…     │ │ summary…     │ │ summary…     │
│ In progress  │ │ Shipped      │ │ Paused       │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 3.5 People directory

````markdown
```list
from: people
view: cards
sort: title
show: [image, title, role]
```
````

Author pages already carry `avatar:` (see `content/flowershow-app/people/olayway.md`). The item image falls back from `image` to `avatar`, so a people folder needs no extra fields.

### 3.6 Podcast episodes, filtered

````markdown
```list
from: podcast
where:
  type: episode
show: [date, title, description, duration, guests]
pageSize: 25
```
````

`where` is a map of frontmatter field to value: scalars must equal, lists must contain. Wiki links in shown values (`guests: ["[[Ada Lovelace]]"]`) render as links.

### 3.7 Featured posts by tag, compact

````markdown
```blog
where:
  tags: featured
limit: 5
view: compact
```
````

```
Sep 18, 2026   Monospace theme is now available
Aug 2, 2026    Currency symbols in prose no longer break math
Jul 29, 2026   Custom head code
```

### 3.8 When something is wrong

````markdown
```list
dir: blog
pagesize: 5
layout: cards
```
````

`dir` is accepted silently as `from`. The other two produce an inline error card in place of the block, so the author or assistant sees it immediately:

```
┌ List block has problems ─────────────────────────────────────┐
│ • Unknown key "pagesize". Did you mean "pageSize"?            │
│ • Unknown key "layout". Use "view: cards".                    │
│ Keys: from, view, sort, limit, pageSize, show, where.         │
└──────────────────────────────────────────────────────────────┘
```

A folder with no matching pages renders "Nothing here yet." (`.list-component-empty`) rather than an error. The error card is public (visitors see it), exactly like `.obsidian-base-error` today; surfacing block errors in publish logs and the CLI for AI loops that do not look at the page is a follow-up.

## 4. The model

### 4.1 Where a listing can live

- **Folder index page**: `layout: list` in the frontmatter of `README.md`/`index.md`. The page body renders as the intro; the listing of that folder is appended. Options go in a `list:` map in the same frontmatter and use exactly the block schema. This mirrors `layout: changelog` (`lib/changelog-context.ts`, `lib/changelog.ts:isChangelogDir`). On a non-index page (`blog.md`, the Obsidian "folder note" pattern), `from` defaults to a sibling folder with the same name (`blog/`) if one exists; otherwise the error card says "add `list: { from: … }`".
- **Inline block**: a ```` ```list ```` or ```` ```blog ```` fence anywhere in any `.md` or `.mdx` page, including inside a `layout: list` page for a second list. `from` is required for ```` ```list ```` (no implicit folder, so nobody lists the whole site by accident) and defaults to `blog` for ```` ```blog ````.
- **Zero-config blog folder** (section 4.10): a README-less `blog/`/`posts/` folder gets a generated listing page; a prose-only README in such a folder gets the listing appended.
- **Precedence with the changelog**: `lib/changelog.ts:isChangelogDir` already treats any `layout` other than `changelog` on the folder index as opting out, so `layout: list` on `changelog/README.md` renders a plain listing, not the timeline. Stated in the docs.

### 4.2 Options (the complete schema)

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `from` | folder path | `blog` for ```` ```blog ````; the index page's own folder for `layout: list`; required otherwise | Folder to list, relative to the site root (`rootDir` applied). Leading slash optional. `dir` and `folder` are accepted as silent aliases (legacy `<List dir>`, #924, #1120). |
| `view` | `list` \| `cards` \| `compact` | `list` | Visual shape. Named `view`, not `layout`, so it cannot be confused with the page-level `layout` key, and to match Bases vocabulary (`views: - type: cards`). |
| `sort` | `"<field> [asc\|desc]"` | `date desc` | Any frontmatter field, or `title`, `date`, `path`. Direction defaults to `desc` for `date`, `asc` for everything else. Items missing the field sort last. |
| `limit` | integer | none | Show at most N items, never paginate. For teasers. |
| `pageSize` | integer \| `none` | `20` on `layout: list` pages; `none` for inline blocks | Items per page. The inline default keeps the recorded decision from #892 (pagination only when asked for) and stops a home-page teaser from claiming `?page`. |
| `show` | list of field names | `[image, date, title, description, authors]` | Which fields to render, in a fixed layout order (not list order). Any frontmatter field is allowed; unknown ones render as labelled fields. `tags` renders pills. |
| `where` | map of field → value | none | Keep items whose field equals the value (scalars) or contains it (lists). Multiple keys are AND. Semantics are a strict subset of Bases filters (4.6). |

Nothing else. Keys are camelCase to match existing frontmatter (`showToc`, `pageSize`). Parsing is lenient on type (`pageSize: "5"` and `limit: "3"` work) and strict on key names (unknown key → error card with a suggestion). `limit` together with `pageSize` is reported ("`pageSize` is ignored when `limit` is set"). Subfolders are always included; a `recursive` switch was cut (no reported need; trivial to add).

### 4.3 Which pages are items

A page under `from` (at any depth) is listed when all of the following hold:

- it is `.md` or `.mdx` with an `appPath` (a published page; `.canvas` and raw assets are not listed);
- it is not the listed folder's **own** index (`README.md`/`index.md`, any case, directly in `from`). This matches what `getListComponentItems` does today. A nested index such as `projects/alpha/index.md` **is** an item: it represents its folder (Hugo-style page bundles, the common shape for projects, people and residencies), and when its title was computed from the file name the item title falls back to the folder name ("Alpha"), never "README";
- it is not the page containing the list;
- it does not have `publish: false` (such pages are already unreachable; today `getListComponentItems` does not check this, so a `publish: false` post is listed and links to a 404; `toChangelogEntries` and `lib/rss.ts:filterRssBlobs` do check it);
- it does not have `draft: true`. New convention: the page stays reachable by URL (unlisted), the behaviour people expect from `draft` in Jekyll, Hugo and Astro. The same rule is added to `lib/rss.ts:filterRssBlobs` in v1 so a draft never reaches the feed. Making `draft` also `noindex` is a follow-up.

`contentHide` does not exclude items (the `people` folder is hidden from the sidebar on flowershow.app yet must be listable). `contentExclude` never reaches the database.

### 4.4 Which frontmatter fields drive what

| Item field | Source, in order | Notes |
| --- | --- | --- |
| `title` | `title` frontmatter → first `# H1` → file name | Ingestion already does this (`apps/cloudflare-worker/src/queue-consumer.js:parseMarkdown`, which records `computed: ['title']`). When the title is computed from a file name, apply `lib/changelog.ts:entryTitleFromPath` (strip `YYYY-MM-DD-` prefix, dashes to spaces, capitalise); for a nested index use the folder name. |
| `url` | `permalink` → `appPath` | As everywhere else. |
| `date` | `date` → `YYYY-MM-DD` prefix of the file name → none | Same rule as the changelog (`resolveEntryDate`). Rendered as `<time dateTime>` in "Sep 18, 2026" format (`formatChangelogDate`), consistent with the changelog and page header. |
| `description` | `description` (including the ingestion-computed opening sentence) | Lists want the computed description; only the page's own header suppresses it (`lib/page-description.ts:displayDescription`). Clamped by CSS (`--list-summary-lines`). |
| `image` | `image` → `avatar` → `cover` | Wiki links and relative paths resolved with `extractWikiLinkTarget` + `matchLinkTarget` + `resolveContentLink`, using the `files`/`permalinks` the plugin already receives (no rescans of the site path list). |
| `authors` | `authors` (scalar or list, via `lib/utils.ts:normalizeAuthors`) | Resolved in one `findMany` per listing (4.7). Rendered as names with avatars, linked when a page exists. Never raw slugs (#895). |
| `tags` | frontmatter `tags` | Only when `show` includes `tags`; rendered with the existing `.tag-pill` class and `tagToHref`. |
| anything else | the frontmatter value | Strings, numbers, booleans, dates and lists are stringified sensibly; `[[wiki links]]` are resolved by the plugin itself (remark-wiki-link has already run and never sees frontmatter); rendered as a labelled field (`Status: In progress`). Every value is coerced and never throws (`title: 1984` is a number in YAML). |

### 4.5 Sorting

Default `date desc`: dated items first, newest first, ties broken by path descending (same as `compareEntries` in `lib/changelog.ts`); undated items follow, sorted by title. `sort: title` is a locale-aware compare. `sort: <custom>` compares numbers numerically, dates chronologically, strings by locale, and puts missing values last regardless of direction. Sorting happens in memory after the folder query (the Prisma JSON column cannot be ordered reliably; the legacy `$queryRaw` `::timestamp` cast throws on a non-date `date`).

### 4.6 Filtering: `where` is a subset of Bases

`where` is deliberately defined in Bases terms so that a future string-expression form is a drop-in, not a third dialect:

| `where` entry | Bases equivalent | Notes |
| --- | --- | --- |
| `status: active` (scalar field) | `status == "active"` | Loose on type: `year: 2026` matches `"2026"`. |
| `guests: Ada` (list field) | `guests.contains("Ada")` | Scalar field with a list value also matches. |
| `tags: featured` | `file.hasTag("featured")` | Frontmatter and inline tags via the Tag table, with the nested-tag rule from `packages/core/src/tags.ts` (ADR-0012). |
| several keys | `and: [...]` | |

Not in v1: `or`, `not`, comparisons, dates. Those are Bases territory today and the deferred `where: '<expression>'` form (section 8) evaluated by `lib/bases-expr.ts`/`lib/bases-parse.ts`.

### 4.7 Author resolution

`resolveAuthors(siteId, handles, files)` does one `findMany` for all handles of the listing, matching a page whose path is exactly `<handle>.md(x)` or ends in `/<handle>.md(x)` (anchored; the legacy `getAuthors` `endsWith(handle + '.md')` also matches `mary-jane.md` for `jane`). When several pages match, a page under `people/` or `authors/` wins, then the shortest path. Returns `{name: title, url, avatar}`; unresolved handles render as plain text. The tRPC `getAuthors` procedure switches to this function in the same PR (same inputs and outputs, strictly fewer false matches).

### 4.8 Pagination

- Server-rendered. Page N is `?page=N` on the page's **public** URL (permalink-aware, not `blob.path`); page 1 is the bare URL (links never emit `?page=1`). Other query parameters are dropped from generated links. `rel="prev"`/`rel="next"` on the links, `aria-current="page"` on the current number.
- Parsing: `parsePageParam` from `lib/changelog.ts`; `?page=abc`, `?page=0` and `?page=-1` render page 1 (never an error). An out-of-range page renders the empty text with the pagination strip.
- Controls: Newer/Older at the ends plus a numbered strip (first, last, current ±2, with **one** collapsed ellipsis per gap). At the ends the unavailable direction renders a disabled-looking `<span>` (not an omitted element), so themes have something to style.
- SEO: `generateMetadata` in the page route currently sets `alternates.canonical` to the bare URL on every request; for `page > 1` it reads `searchParams` and emits a self-referencing canonical so paginated pages are indexable.
- One paginated listing per page. A second block must use `limit` or stay unpaginated; otherwise it renders the error card ("Only one list per page can paginate; add `limit:` or remove `pageSize:` from this one."). With inline blocks defaulting to no pagination this is rare.

### 4.9 Views

- `list`: vertical stack, hairline rules, thumbnail on the left at large widths, text column with date, title, summary, authors. This is the current `.list-component-item` design in `styles/default-theme.css` lines 1506 to 1620, unchanged. The media column is reserved only when at least one item on the page has an image, so an image-less blog does not get an empty gutter; the legacy placeholder image is not used.
- `cards`: responsive grid (`repeat(auto-fill, minmax(var(--list-card-min), 1fr))`), image on top with a fixed aspect ratio, title, summary, meta below. Whole card clickable (the `.list-component-item-headline-link::after` recipe from `reference/list-component.md`, applied by default in cards only).
- `compact`: one line per item, date in a fixed-width column then title; no image, no summary unless explicitly in `show`. Suited to archives, notes and sidebars. Cheap enough to keep in v1; first to cut if the PR grows.

### 4.10 Zero-config blog folders

Modelled on the README-less changelog folder (`app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`, the `isChangelogDirName` fallback around line 106, and `lib/changelog-context.ts`).

**Which folders.** A folder whose last path segment is `blog` or `posts`, compared case-insensitively, at any depth (`/blog`, `/Blog`, `/notes/posts`). The slug must match the folder's real case, as for the changelog. Why these two: `blog` is the literal ask (#1008, #1120) and the name every guide uses; `posts` is the convention of Jekyll (`_posts`), Hugo and Astro (`content/posts`) and common in Obsidian vaults, so migrants get it for free. `articles`, `news`, `notes` and `writing` are left out on purpose: they are as often reference material or a digital garden as a dated feed, and `notes` in particular would hijack gardens. Others can opt in with `layout: list`.

**Case 1: no `README.md`/`index.md` in the folder.** If at least one `.md`/`.mdx` page exists anywhere under the folder, its URL renders a generated page: the page header with the folder name as the title ("Blog", "Posts", via `entryTitleFromPath`), then the default listing exactly as `layout: list` with no options would render it (list view, 20 per page, newest first). Everything else mirrors the changelog fallback: no sidebar, no ToC, no breadcrumbs, no hero; `<title>` is `Blog · <site name>` via `buildPageTitle`; the description is the site description; canonical is the bare URL, or the self-canonical for `?page=N > 1` (4.8). An empty folder still 404s, like the changelog. A real page at the same URL always wins (a `blog.md` with a permalink, a folder note), as do tag pages and the changelog.

**Case 2: a `README.md`/`index.md` exists in such a folder** with **no `layout`** and **no listing of its own**. "No listing of its own" means the body has no ```` ```list ````, ```` ```blog ```` or ```` ```base ```` fence (backticks or tildes) and no `<List` tag. Then the page renders as usual (header, body as the intro, ToC if on) and the default listing is appended, as if it had `layout: list`. A `list:` map in its frontmatter is honoured.

**Opt-out.** `list: false` in the README frontmatter, or any `layout` (`layout: plain`, `layout: changelog`, `layout: list`, which already decides). A site that wants nothing at `/blog` keeps a README there with `list: false`.

**Back-compat, stated plainly.** Unchanged:
- every README that already lists posts with `<List />`, a list block or a Bases block (flowershow.app's own `blog/README.mdx` uses `<List />`);
- every README with any `layout`;
- every folder not named `blog`/`posts`.

What changes on deploy:
- a README-less `blog/` or `posts/` folder that used to 404 now has an index page;
- a prose-only `blog/README.md` or `posts/README.md` gains a listing under its prose.

The second case also hits a README that lists posts by hand with ordinary links: it will show both. The changelog entry calls this out with the one-line opt-out, and the docs repeat it. This is the intended default ("a blog page that just works"); it is a visible change, not a silent one.

## 5. Relationship to `<List />`, Bases, the changelog and #1222

### 5.0 The list block is the simple Bases

```` ```list ```` is deliberately Bases-shaped: the same authoring model (a fenced YAML block in a Markdown page, harmless in Obsidian), the same idea of a query over the vault's frontmatter, and `where`/`sort` defined as a strict subset of Bases semantics (4.6), so anything a list block means, Bases means too. What it adds is on the render side: `view: list | cards | compact`, blog-aware defaults (dates, authors with avatars, images, drafts), pagination and a stable theme contract. Bases keeps the full query language (formulas, `or`/`not`, comparisons, tables). The direction of travel is one renderer: Bases views will render through `lib/listing/render.ts` too (deferred item 4), so Bases gains the same views, pagination and theming, and the two differ only in how much query language you write.

### 5.1 Why a new simple engine and not "compile to Bases"

`flowershow-sgw` ask 2 proposes Bases as the single listing engine behind `<List />` and list blocks. This design rejects that for v1, deliberately. The Bases *render* layer (`lib/remark-obsidian-bases.ts:createViewsNode`, `components/public/mdx/obsidian-bases-views.tsx`, `obsidian-base-cards.tsx`) emits client components whose props are JSON strings, including `allSitePaths` (every blob path on the site), styles with MUI `sx` and exposes no semantic classes, ignores `limit`, has no pagination, no author resolution and the under-sized card images of #1198. Every one of those would need rewriting to meet the acceptance criteria, so "reuse Bases" means reusing only its query layer, and the query a blog index needs (one folder, a few equality filters, one sort) is forty lines over Prisma. The *expression engine* (`lib/bases-expr.ts`, `lib/bases-parse.ts`) is the reusable part, and section 4.6 keeps `where` a strict subset of Bases semantics so that the deferred expression form plugs it in. Convergence then happens at the renderer: a Bases `cards` view rendering through `lib/listing/render.ts` (section 8). That gives one look, one theme contract and one set of defaults without forcing the simple case through the complex syntax, which is exactly the "simple syntax over a shared engine" reconciliation the consolidation doc says has never been stated.

### 5.2 What happens to each existing thing

| Thing | Verdict | Detail |
| --- | --- | --- |
| A `blog/`/`posts/` folder, no index or a prose-only README | **New, the zero-config path** | Section 4.10. Generated page or appended listing; opt out with `list: false`. |
| ```` ```list ```` / ```` ```blog ```` + `layout: list` | **New, the recommended path** | `list` is the general form, `blog` is the preset (answers the open question in `flowershow-sgw`). All docs and guides (`content/flowershow-app/docs/guides/publish-blog.md`, `content-catalogs.md`, `turn-obsidian-vault-into-a-blog.md`, `reference/list-component.md`, `uses/blogs.md`) switch their examples to it. |
| `<List dir="/blog" slots={{…}} pageSize={5} />` | **Kept, legacy, on its own query in v1** | Still works in MDX exactly as today; no site changes on deploy. Two small fixes ship separately from the engine PR: the one-line `publish: false` filter in its SQL, and the collapsed-ellipsis fix in `list-pagination.tsx` (#1120's "number of paginated pages"). Deprecation path in 5.3. |
| `.list-component-*` CSS classes | **Kept and extended** | The new engine emits the same class family so themes and `custom.css` written against `<List />` apply unchanged. New modifiers and custom properties are additive (section 6). |
| Obsidian Bases (```` ```base ````) | **Kept, unchanged in v1; the power tool** | Bases stays the answer for formulas, multi-view tables, expression filters and Obsidian fidelity. Docs gain a "Which one?" box: list block for "a list or grid of pages from a folder", Bases for "a query with formulas or a table". |
| `layout: changelog` | **Kept as-is; shares helpers by import** | The engine imports `entryTitleFromPath`, `resolveEntryTitle`, `resolveEntryDate`, `formatChangelogDate`, `paginate`, `parsePageParam` from `lib/changelog.ts` where they live now. No move, no behaviour change. A later PR may relocate them to `lib/listing/` once both callers are stable. |
| `layout: plain` | **Untouched** | Orthogonal. |
| Tag pages (`getPagesByTag`, `components/public/tags/tag-views.tsx`) | **Unchanged in v1** | Follow-up: render `/tags/<tag>` through the listing renderer in `compact` view. |
| RSS (`lib/rss.ts`) | **One-line change in v1** | `filterRssBlobs` also skips `draft: true` (R7). |
| Collection templating (#1222, `docs/plans/2026-03-29-collection-listing-templating-*.md`, draft tutorial `content/flowershow-app/docs/guides/custom-collection-cards.md`) | **Superseded by this design; decision recorded here** | #1222 chose "collections in frontmatter + a `{% for %}` loop" as the direction. This design replaces it: a template language is the wrong rung for a managed platform whose theming contract is CSS-only (`docs/theming.md`), and `show` + labelled `data-field` elements + three views cover the project-card and people-card cases that plan lists. v1 removes the published tutorial (it describes a feature that will not exist) with a redirect to the new listings page. **Known gap, stated honestly:** the #950/#952 ask ("iterate query results in JSX and build my own layout") is not covered. CSS on semantic classes gets most of the way; truly bespoke markup does not. If demand persists, the right follow-up is a renderer hook (a `template:` key naming a Markdown partial), not a loop syntax; it is listed as deferred, not promised. |

### 5.3 `<List />` deprecation path

1. **v1 release**: docs mark `<List />` legacy with a one-to-one translation table (`dir` → `from`, `slots.media/eyebrow/headline/summary/footnote` → `show` entries, `pageSize` unchanged, `fields` → `show`). The component, procedure and classes are untouched apart from the two small fixes above.
2. **Shim in `.md`**: a remark step recognises `<List dir="…" pageSize="…" />` in `html` nodes of `.md` pages and treats it as a block through the engine. Kills the "silently missing in `.md`" footgun for tutorials in the wild.
3. **Shim in MDX**: the same step for `mdxJsxFlowElement` named `List` with static props (`slots={{…}}` is a literal object expression in the estree attribute value and can be evaluated statically). From this point the client fetch, skeleton and `getListComponentItems` are unused by content; the markup is the section 6 markup. This step is a changelogged behaviour change (nested indexes and drafts, sort tie-breaks).
4. **Removal**: delete `list.tsx`, `list-pagination.tsx`, the tRPC procedure and the skeleton CSS only after step 3 has shipped in a release with no reported rendering diffs.

Migration for an existing MDX blog index, available from v1: replace `<List dir="/blog" slots={{…}} pageSize={5} />` with ```` ```blog ```` + `pageSize: 5`, optionally rename the file from `.mdx` to `.md`. The look does not change.

## 6. Output HTML and CSS hooks

The root keeps the existing class and gains a view modifier. Items are direct children of the root and pagination is the last child, as today, because `../themes/leaf/theme.css` makes `.list-component` a grid of its children and spans the pagination across it. The root element changes from `div` to `section` and the empty state from `div` to `p`; all theme selectors are class-based, so this is cosmetic, but it is noted.

```html
<section class="list-component list-component--list not-prose" data-view="list" aria-label="Blog">
  <article class="list-component-item">
    <div class="list-component-item-media">
      <a class="list-component-item-media-link" href="/blog/monospace-theme" tabindex="-1" aria-hidden="true">
        <img class="list-component-item-media-img" src="…" alt="" loading="lazy" sizes="(min-width: 1024px) 16rem, 100vw" width="1600" height="1067">
      </a>
    </div>
    <div class="list-component-item-content">
      <div class="list-component-item-eyebrow">
        <time class="list-component-item-date" datetime="2026-09-18">Sep 18, 2026</time>
      </div>
      <h3 class="list-component-item-headline" data-toc-ignore>
        <a class="list-component-item-headline-link" href="/blog/monospace-theme">Monospace theme is now available</a>
      </h3>
      <p class="list-component-item-summary">Choose the compact Monospace theme from the dashboard or config.</p>
      <dl class="list-component-item-fields">
        <div class="list-component-item-field" data-field="status"><dt>Status</dt><dd>In progress</dd></div>
      </dl>
      <ul class="list-component-item-tags"><li><a class="tag-pill" href="/tags/featured">#featured</a></li></ul>
      <div class="list-component-item-footnote list-component-item-authors">
        <a class="list-component-item-author" href="/people/olayway"><img class="list-component-item-author-avatar" src="…" alt="" width="24" height="24">Ola Rubaj</a>
        <span class="list-component-item-author">Guest Writer</span>
      </div>
    </div>
  </article>
  …
  <nav class="list-component-pagination" aria-label="Pages">
    <div class="list-component-pagination-nav">
      <span class="list-component-pagination-button list-component-pagination-button--prev is-disabled" aria-disabled="true"><svg class="list-component-pagination-button-icon list-component-pagination-button-icon--prev" …/>Newer</span>
    </div>
    <div class="list-component-pagination-pages">
      <a class="list-component-pagination-page-button list-component-pagination-page-button--current" aria-current="page" href="/blog">1</a>
      <a class="list-component-pagination-page-button list-component-pagination-page-button--other" href="/blog?page=2">2</a>
      <span class="list-component-pagination-ellipsis">…</span>
      <a class="list-component-pagination-page-button list-component-pagination-page-button--other" href="/blog?page=12">12</a>
    </div>
    <div class="list-component-pagination-nav list-component-pagination-nav--end">
      <a class="list-component-pagination-button list-component-pagination-button--next" rel="next" href="/blog?page=2">Older<svg class="list-component-pagination-button-icon list-component-pagination-button-icon--next" …/></a>
    </div>
  </nav>
</section>
<p class="list-component-empty">Nothing here yet.</p>      <!-- instead of the section when there are no items -->
<div class="list-component-error">…</div>                   <!-- instead of the section when the block is invalid -->
```

(The HTML above is the rendered output; in the plugin, `hProperties` use hast names: `tabIndex`, `ariaHidden`, `ariaCurrent`, `ariaDisabled`, `dateTime`, `className`.)

Rules:

- Existing classes keep their meaning: `eyebrow` wraps the date, `footnote` wraps the authors, `headline`, `summary`, `media` as before. The e2e expectations in `e2e/specs/blog.spec.ts` (`.list-component-item-headline a`, `.list-component-item-summary`) hold.
- New classes are additive: `--list`/`--cards`/`--compact` modifiers (plus `data-view` for attribute selectors), `-item-date`, `-item-authors`, `-item-author`, `-item-author-avatar`, `-item-fields`, `-item-field[data-field]`, `-item-tags`, and `.is-disabled` on end-of-range pagination buttons. The `-skeleton-*` classes stay in the stylesheet for the legacy component and are not emitted by the new engine.
- **Item headings stay out of the page's heading machinery.** `rehype-slug` and `rehype-autolink-headings` run on hast after `remark-rehype`, so an `hName: 'h3'` is an ordinary heading to them, and `components/public/table-of-contents.tsx` collects `#mdxpage h2, h3, …` from the DOM. Without care a home page with three teasers gets three ToC entries and each post title gets an anchor icon and an id that can shadow a real heading. v1 therefore: extends the `test` in `lib/markdown.ts:rehypeAutolinkHeadingsConfig` to skip `.list-component-item-headline` (the same mechanism as `isChangelogTitle`); adds a five-line rehype step after `rehypeSlug` in both chains that removes the `id` from those headings, so items have no anchors; and changes the ToC selector to exclude `[data-toc-ignore]`. A unit test asserts no `.heading-link`, no `id` on any heading, inside `.list-component` in both pipelines.
- **Images go through `next/image` with real sizes.** `components/public/mdx/fs-image.tsx` optimises only elements carrying the `internal` class (added by remark-wiki-link); everything else becomes a plain full-size `<img>`, which for a 20-item index is a regression from legacy `<List />` and the mirror image of #1198. So the renderer does not emit `img` elements; it emits a dedicated `listingimage` element mapped to a small `ListingImage` component registered in both pipelines (`rehypeToReact`'s map in `lib/markdown.ts` and `mdx-components-factory.tsx`), the same mechanism as `obsidianbasesviews`. String props only: `src`, `alt`, `sizes` (per view: `(min-width: 1024px) 16rem, 100vw` for list thumbnails, `(min-width: 640px) var(--list-card-min)…` resolved to pixels for cards, `24px` for avatars), and the intrinsic `width`/`height` from the `imageDimensions` map the page already loads (for aspect ratio; falls back to the view's `--list-media-aspect`). It renders `next/image` with `fill`, `objectFit: cover`, lazy loading, and is never zoomable. This is an admitted exception to "no component to register": one leaf component for images, in both registries, with a parity test.
- `compact` emits the same item structure minus media and summary, so one theme rule set covers all views.
- Default CSS must size `.list-component-item-author-avatar` (24px, round, inline) because no theme does and intrinsic-size avatars would be very visible.

CSS custom properties, following the `--changelog-*` convention in `styles/default-theme.css` (around line 1933), set on `:root` or `.list-component`, each with a fallback in the stylesheet:

| Property | Default | Controls |
| --- | --- | --- |
| `--list-gap` | `0` (list), `1.5rem` (cards) | Space between items |
| `--list-item-spacing` | `2rem` | Vertical padding of a list row |
| `--list-rule-color` | `var(--color-foreground-100)` | Hairline between list rows |
| `--list-media-width` | `16rem` | Thumbnail column width in the list view at large widths |
| `--list-media-aspect` | `3 / 2` | Thumbnail and card image aspect ratio |
| `--list-media-radius` | `var(--radius-xl)` | Image corner radius |
| `--list-card-min` | `16rem` | Minimum card width; the grid fills as many columns as fit |
| `--list-card-radius` | `var(--radius-lg)` | Card corner radius |
| `--list-card-border` | `1px solid var(--color-foreground-100)` | Card border (`none` for borderless) |
| `--list-summary-lines` | `2` | Line clamp of the description |
| `--list-title-size` | `var(--font-size-lg)` | Item title size |
| `--list-date-column` | `8rem` | Date column width in the compact view |

`scripts/theme-class-reference.mjs` (repo root) generates the class reference from the stylesheet, so the new classes land in `reference/theme-class-reference.md` automatically.

Theme audit, same release, all six official themes (`leaf`, `lessflowery`, `letterpress`, `superstack`, `monospace`, `material-draft`): add `.is-disabled` beside each `:disabled` rule on `.list-component-pagination-button` (lessflowery, letterpress and superstack have them; `<a>`/`<span>` cannot match `:disabled`); confirm the icon rules still apply to the inline SVG; check that nothing assumes `.list-component-item-footnote` is a `<p>` of text.

## 7. Technical architecture

### 7.1 Where code lives

```
lib/listing/
  spec.ts          parse + validate a block, a `list:` map, or the blog preset → ListingSpec (pure, unit tested; produces the error messages and alias handling)
  query.ts         queryListingItems(prisma, {siteId, rootDir, spec, currentPath, files, permalinks}) → ListingItem[] (folder scan, item rules, where, sort; imports helpers from lib/changelog.ts)
  authors.ts       resolveAuthors(prisma, siteId, handles, files) → batched {name,url,avatar} (4.7); getAuthors tRPC delegates to it
  render.ts        ListingSpec + ListingItem[] + page → mdast nodes with data.hName/hProperties (the HTML in section 6), including `listingimage` nodes
lib/remark-listing.ts         the remark plugin: finds ```list / ```blog code nodes (and, for layout: list pages, appends an implicit one), runs query + authors, replaces the node with render.ts output; on error replaces it with the error card
lib/rehype-listing-headings.ts  strips ids from `.list-component-item-headline` after rehype-slug (both chains)
components/public/mdx/listing-image.tsx   the one leaf component (next/image), registered in both maps
```

### 7.2 Both pipelines, one plugin

`remark-listing` is registered in `lib/markdown.ts` twice, next to `remarkObsidianBases`: in the `processMarkdown` unified chain (before `remarkMdxJsxToElement` and `remarkChangelog`) and in `getMdxOptions().mdxOptions.remarkPlugins`. It is async and does Prisma queries at render time, the precedent set by `lib/remark-obsidian-bases.ts` (which receives `siteId`, `siteHostname`, `rootDir` through the same options object). The plugin additionally receives `files`, `permalinks`, `imageDimensions`, `currentPath`, `page` and, for `layout: list` pages, the implicit spec.

The plugin emits **generic mdast nodes with `data.hName`/`data.hProperties`**, the technique `lib/remark-changelog.ts` already uses in both pipelines, not an `mdxJsxFlowElement`. That sidesteps the two MD-pipeline constraints for everything except images: there is no component to register in `rehypeToReact`'s map or in `mdx-components-factory.tsx`, and there is no string-only-props limit, because the output is already HTML. `remark-rehype` turns the nodes into hast in both pipelines. The one exception, `listingimage`, is a real component in both registries with string props, by the `obsidianbasesviews` precedent. Author links and pagination links are ordinary `<a>` elements with absolute site paths, which `rehypeResolveHtmlUrls`/`rehypeResolveExplicitJsxUrls` leave alone.

Error handling follows Bases: a thrown error inside one block replaces only that block with `.list-component-error`; the rest of the page renders.

### 7.3 Request flow

1. `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` already reads `searchParams.page` for the changelog (line 321). It reads it unconditionally (`parsePageParam`, `null` → 1) and passes `listing: { page, currentPath, publicUrl, implicit }` into `renderPageContent` → `processMarkdown`/`getMdxOptions`. `generateMetadata` gains `searchParams` and emits a self-canonical for `page > 1`.
2. The plugin, for each block (and the implicit one), calls `spec.ts` → `query.ts` → `authors.ts` → `render.ts`.
3. `query.ts` does one `prisma.blob.findMany` scoped by `siteId` and `path startsWith <folder>/`, selecting only `id, path, appPath, permalink, metadata` (plus `tags { tag }` when `where.tags` is used, as Bases does per ADR-0012), applies the item rules in memory, sorts, then slices to the requested page. Metadata JSON for a few thousand pages is a few megabytes at most; this is what `getChangelogEntries` and Bases already do.
4. Caching is split in two: the **folder result** (key `siteId + from + where + sort + currentPath`, tagged `siteId`, `revalidate: 60`) and the per-page slice computed from it, so an uncached `?page=7` does not re-read the folder. `revalidateTag(site.id)` is already called from `app/api/internal/revalidate/route.ts` and `server/api/routers/site.ts` (lines 444, 502) on publish, so the existing invalidation path applies.

### 7.4 Pagination with SSR

The public page route is dynamic per request (no `generateStaticParams`), the middleware preserves the query string, and the changelog paginates this way in production today, so `?page=N` is read at request time and the server renders that slice. There is no client state; the "current page" is the URL. A 1,000-post blog renders 20 items per request, never the whole list.

### 7.5 Legacy `<List />` in v1

Untouched apart from two isolated fixes in their own small PR: `getListComponentItems` gains `AND ("metadata"->>'publish') IS DISTINCT FROM 'false'` (one line in the existing SQL), and `list-pagination.tsx` collapses runs of hidden pages into a single ellipsis. No delegation to `query.ts` in v1 (that is step 3 of 5.3), so no existing site changes output on deploy.

### 7.6 Tests

- Unit: `spec.ts` (every key, alias, preset, every error message), `query.ts` with a mocked Prisma client (rules in 4.3 including nested indexes and `draft`, sort in 4.5, `where` in 4.6), `authors.ts` (anchored matching, `people/` preference), `render.ts` snapshot of the HTML in section 6 for each view and for the disabled pagination ends.
- Pipeline parity: extend `lib/markdown-md-parity.test.tsx` so the same block renders the same HTML through `processMarkdown` and through MDX serialisation, and asserts (a) no `.heading-link` and no heading `id` inside `.list-component`, (b) `listingimage` resolves to the component in both.
- e2e: a sibling of `e2e/specs/blog.spec.ts` where the fixture's `blog/README.md` is a `.md` with `layout: list`, asserting the same selectors, pagination links, no ToC entries for items, and a `next/image` `srcset` on thumbnails.

## 8. Scope

### v1 (the engine PR)

- `lib/listing/*`, `lib/remark-listing.ts`, `lib/rehype-listing-headings.ts`, `components/public/mdx/listing-image.tsx`; registered in both pipelines; ToC selector and autolink test updated.
- Zero-config blog folders (4.10): generated page for README-less `blog/`/`posts/`, listing appended to a prose-only README there, `list: false` opt-out.
- ```` ```list ```` and ```` ```blog ```` blocks with the seven keys in 4.2 (plus `dir`/`folder` aliases); `layout: list` with the `list:` frontmatter map and the sibling-folder rule for folder notes.
- Views `list` and `cards`; `compact` if the PR stays small.
- Item rules (4.3: own-index-only exclusion, nested index as item, `publish: false`, `draft: true`); frontmatter mapping (4.4); default and custom-field sorting (4.5); `where` map (4.6).
- Batched, anchored author resolution; `getAuthors` delegates to it.
- Server-rendered pagination (4.8) with self-canonical, robust parsing, public-URL links, disabled-state ends, collapsed ellipsis; inline blocks unpaginated by default.
- CSS: modifiers, new item classes, `.is-disabled`, avatar sizing and the custom properties in section 6 added to `styles/default-theme.css`; no existing rule changed. Theme audit across the six official themes.
- `lib/rss.ts`: skip `draft: true`.
- Docs: new `reference/listings.md` (schema, presets, error card, "list block vs Bases", translation table from `<List />`); `reference/list-component.md` marked legacy; `guides/publish-blog.md`, `turn-obsidian-vault-into-a-blog.md`, `content-catalogs.md`, `uses/blogs.md` switched to the block; `guides/custom-collection-cards.md` removed with a redirect; `llms.txt` and the Flowershow publishing agent skill updated; changelog entry with screenshot; #1222 commented with the decision.
- Tests as in 7.6.

### Separate small PR, same release

- `getListComponentItems`: `publish: false` filter. `list-pagination.tsx`: collapsed ellipsis.

### Deferred (in rough priority)

1. `<List />` shims in `.md` and MDX (5.3 steps 2 and 3), then removal (step 4).
2. `group: year` (and `group: <field>`) with `h2` group headings; the classic blog archive.
3. `where` as a string expression evaluated with the Bases engine (`lib/bases-expr.ts`/`lib/bases-parse.ts`); the Dataview bridge without a new language, drop-in because 4.6 is already a Bases subset.
4. Bases views rendered through `lib/listing/render.ts`: Bases `cards` and `list` views use the listing renderer (semantic classes instead of MUI; fixes #1198's sizing class of bug), Bases gains `view: compact`, pagination and author resolution, and Bases `limit` is honoured. This is how Bases "gains the views" (5.0).
5. Tag pages rendered through the listing renderer in `compact` view.
6. Changelog helpers relocated to `lib/listing/` and the changelog index rendered through the same item query (pure refactor, after both are stable).
7. `table` view (columns from `show`).
8. Virtual folder index for any folder (beyond `blog`/`posts`, which are in v1 per 4.10): a generated `layout: list` page at any README-less folder URL. Needs a product decision on sidebar and breadcrumbs for arbitrary folders, and on folders of reference notes that should not look like a feed.
9. A `template:` key naming a Markdown partial for bespoke item markup (the #950/#952/#1222 need), only if demand persists after CSS-on-semantic-classes has been tried.
10. `dateFormat`/locale option; `image: <field>` override; `recursive: false`; custom empty text.
11. `draft: true` honoured by search and `noindex`; block errors surfaced in publish logs and the CLI.
12. Per-listing RSS `<link rel="alternate">` (`flowershow-sgw` leaves RSS open).
13. An Obsidian plugin preview for the blocks (nice, not needed: Obsidian shows a harmless code block).

## 9. Risks and open questions

- **Theme CSS can fight the `cards` modifier.** `../themes/leaf/theme.css` sets `.list-component { display: grid }` and styles `.list-component-item` as a card. Themes load outside cascade layers and win over the default stylesheet (`docs/theming.md`), so a Leaf site using `view: list` gets Leaf's grid (fine, that is the theme's intent) but a Lessflowery site using `view: cards` could get mixed rules. Mitigation: the modifier rules in `default-theme.css` only set grid/aspect properties, and the theme audit in section 6 happens in the same release.
- **Shared `?page` parameter.** Resolved by the one-paginated-list-per-page rule plus unpaginated inline blocks by default; the error card makes the constraint discoverable.
- **Out-of-range pages cannot 404 from inside a remark plugin.** They render the empty state with the strip and a self-canonical. For `layout: list` index pages the route could compute the count first and `notFound()` like the changelog; that doubles the query. Accept the empty state in v1.
- **The image exception.** One component in two registries is one more thing to keep in parity; the parity test pins it. If `FsImage` later gains an opt-in for non-wiki-link sources, `listingimage` can collapse into it.
- **Large folders at the root.** `from: /` on a 10k-page vault fetches 10k metadata rows per uncached request. Acceptable (Bases does it with no filters), but `query.ts` must select only the listed columns and never load bodies.
- **`draft: true` semantics.** Listing-and-feed exclusion while the URL stays reachable is a new convention. The alternative, treating `draft` exactly like `publish: false`, would surprise users whose vaults already carry `draft` for other reasons. Open question for the maintainer; the design errs on "unlisted but reachable".
- **Default `pageSize: 20` for index pages versus the changelog's 10.** Changelog entries show full bodies; list items are a few lines. Open to tuning after seeing real sites.
- **`blog` as a fence name.** It is exactly the #1008 ask, and an unknown fence language is harmless in every renderer, but a site that already has a code sample with ```` ```blog ```` (unlikely) would see it transformed. No namespacing, per the recorded #924 decision.
- **Zero-config listing on existing blogs.** A prose-only `blog/README.md` that lists posts by hand will show both its own links and the generated listing after deploy. Mitigation: only folders named `blog`/`posts`, only READMEs with no `layout` and no listing fence/`<List`, a one-line opt-out (`list: false`), called out in the changelog entry.
- **Non-string frontmatter.** User YAML is untyped (`title: 1984` is a number; see the coercion notes in `getPagesByTag` and `lib/site-config.ts:buildPageTitle`). `render.ts` coerces every displayed value and never throws; this is the most common class of 500 in the current listings and is covered by unit tests.
- **Author matching change in `getAuthors`.** Anchoring the match strictly reduces false positives, but a site that relied on a loose suffix match (`authors: [jane]` resolving `mary-jane.md`) would see that author unlinked. Judged a bug fix; noted in the changelog entry.

## Changes after review

Adopted every item from `listing-design-review.md`:

- B1: item headings excluded from autolink, slug ids and the ToC, with a parity test (section 6, 7.6).
- B2: images via a `listingimage` component in both registries using `next/image` with per-view `sizes` and intrinsic dimensions; avatars never zoomable; the "no component to register" claim now has one admitted exception (section 6, 7.2).
- B3: only the listed folder's own index is excluded; a nested index is an item for its folder with a folder-name title (4.3).
- B4: v1 no longer re-points `getListComponentItems` or moves changelog helpers; legacy `<List />` gets only the `publish: false` and ellipsis fixes in a separate small PR (5.2, 7.5, 8).
- R1: inner key renamed `view` (4.2). R2: ```` ```blog ```` preset with `from: blog` default; `dir`/`folder` accepted as silent aliases; `collection`/`pages` aliases dropped (3.2, 4.2). R3: "Why not compile to Bases" section and `where` defined as a Bases subset (5.1, 4.6). R4: four-step `<List />` deprecation path and the ellipsis bug fixed now (5.3). R5: self-canonical for `page > 1`, `?page=abc` → 1, public-URL links, other params dropped, disabled-state ends (4.8). R6: `.is-disabled` spans, inline SVG icons, avatar sizing, element changes noted, all six themes audited (section 6). R7: RSS skips drafts in v1 (4.3). R8: #1222 superseded explicitly, tutorial removed with redirect, #950/#952 gap acknowledged (5.2). R9: inline blocks unpaginated by default, index pages 20; #892 cited (4.2). R10: anchored, batched author matching with `people/` preference (4.7).
- Nits: script path corrected; hast property names; frontmatter wiki links resolved by the plugin with the page's `files`/`permalinks`; folder query cached separately from the page slice; `layout: list` on a folder note defaults to the sibling folder; changelog precedence stated; image-less list view collapses the media column; error card public with CLI surfacing deferred; per-listing RSS deferred; `llms.txt` and agent skill in v1 docs; `limit` + `pageSize` reported; `recursive` and `empty` cut (seven keys).

## Changes in v3 (user requirement, 2026-10-10)

- Author-facing syntax is fenced blocks and frontmatter only; no MDX component is ever required (section 2).
- Zero-config blog folders pulled into v1 for `blog` and `posts` (4.10, 3.1a), with the back-compat behaviour and opt-out spelled out; generic virtual folder index stays deferred (item 8).
- "The list block is the simple Bases" (5.0); deferred item 4 widened so Bases views render through the listing renderer.
