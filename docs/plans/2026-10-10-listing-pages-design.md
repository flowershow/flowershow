# Listing pages in Flowershow: design

Status: proposal v5, 2026-10-10 (v5 answers two adversarial reviews: theme scoping, page-level SSR, widths, a `media`/`ratio` knob pair, date/author fallbacks, invisible notes, missing-folder errors, a revised B/B2 split; v4 folded in the listings moodboard: four views, `featured`/`group`/`image` knobs, a `fields` slot map, and a post-page spec for a follow-up PR; v3 added the zero-config blog folder, section 4.10, and makes the Markdown-only rule explicit), revised after independent review (`listing-design-review.md`) and against `docs/plans/2026-10-10-listing-pages-consolidation.md`. File paths are relative to `apps/flowershow/` unless stated otherwise. Closes the design question in beads `flowershow-sgw` / GH #924, #1120, #1008, #923.

## 1. Purpose and vision

A listing page is the front door of a collection. For most Flowershow sites that means the blog index, which is the second most visited page after the home page, and the one a visitor uses to decide whether the site is worth their time. Today that page needs an `.mdx` file, a JSX component with a `slots={{...}}` prop, a client-side fetch with a loading skeleton, and it silently renders nothing if the author writes it in `.md`. The alternative, Obsidian Bases, is a full query language that both humans and AI assistants find hard to get right for "a list of posts" (#1095).

The vision: **any folder is a collection, and any page can list it in plain Markdown with one line.** A blog index, a projects grid, a people directory, a podcast archive and "latest three posts" on the home page are all the same thing: a folder of pages with frontmatter, shown in one of a few good-looking views, with the right defaults so that the author does not have to think about sorting, dates, authors, drafts or pagination.

One-line pitch: *Put your posts in a `blog/` folder and `/blog` is a paginated, themeable blog index, with nothing else to write. Want it elsewhere or shaped differently? A ```` ```blog ```` or ```` ```list ```` block anywhere, or `layout: list` in a folder's README. Works in `.md`. No MDX, no components, nothing to learn.*

Who it serves, in priority order:

- Obsidian and plain-Markdown bloggers who cannot (or will not) edit `.mdx`, and who want their `/blog` to look like a real blog without configuration (#1120, #1008).
- Authors publishing through an AI assistant. The syntax must be guessable and verifiable: eleven flat YAML keys, with a visible error card when a key is wrong, so the assistant can fix it on the next turn.
- Sites with more than one collection: projects, people, residencies, podcasts, talks (#950, #952, #1222). Same syntax, a different folder, maybe a different view.
- Theme authors, who get stable semantic HTML and CSS custom properties, and who should not have to restyle anything when a site switches from the old `<List />` to the new engine.
- Dataview/Bases migrants (#170), who need filtering and sorting on arbitrary frontmatter fields without a programming language. This design covers the common 80% directly and leaves Bases in place for the rest.

## 2. Principles

- **Zero config is the headline.** `layout: list` in a folder index page, nothing else, must produce a page that a maintainer would happily screenshot for the changelog. Every default is chosen for a blog: newest first, title, description, date, authors with names and links, image if there is one, 20 per page.
- **Doing nothing is a feature.** Like the changelog (a `changelog/` folder just works), a `blog/` or `posts/` folder gets a good index page with no file at all, and a `blog/README.md` that is only prose gets the listing beneath it (section 4.10).
- **Fenced blocks and frontmatter only; never an MDX component.** The complete author-facing syntax is ```` ```list ````/```` ```blog ```` fences and frontmatter keys (`layout: list`, `list:`, `draft:`). No page ever needs JSX, an `.mdx` extension or `syntaxMode: mdx` to get a listing. The one React component involved (`ListingImage`, section 6) is an internal rendering detail that authors never write, see or configure. This is the Obsidian Bases authoring model (a fenced YAML block), not the `<List />` model.
- **Markdown first.** The syntax is a fenced code block and frontmatter, both legal in `.md`, in `.mdx` and in Obsidian (which shows the block as a code block and nothing breaks). There is exactly one implementation, a remark plugin registered in both pipelines, so there is no "works in MDX but not in MD" class of bug.
- **AI-writable.** Flat YAML, one level of nesting at most (`where`, `fields`), no expressions, no quoting rules, no JSX. Eleven keys, each with a blog-shaped default; key names are matched case-insensitively and the obvious guesses (`dir`, `folder`, `layout` for `view`, `cards`, `sortBy`) are accepted silently. An error card appears only when the engine cannot interpret the block (or the folder does not exist); harmless redundancies never reach visitors. Unknown keys and bad values produce an inline error card that names the key and suggests the fix. The most likely wrong guesses (`dir`, `folder`) are accepted silently. The whole reference fits in one screen of `llms.txt`.
- **Progressive disclosure.** The ladder is: ```` ```blog ```` or `layout: list` (zero config) → ```` ```list ```` with `from:` (any folder, anywhere) → `view:`, `limit:`, `pageSize:`, `featured:`, `group:`, `media:`, `ratio:` (shape) → `sort:`, `where:`, `fields:` (data) → Bases (full query language) → custom CSS on semantic classes (look). Each rung adds one idea.
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

Renders at `/blog`: the page header (title, description if any), the intro paragraph, then every page in `blog/` and its subfolders, newest first, 20 per page, with "Newer" and "Older" links. Each item shows its title, description, image (if any), and a meta line with the date and author names linked to their author pages. The listing is server-rendered in the page route, outside the Markdown/MDX body, so it is in the initial HTML for `.md` and `.mdx` alike (7.3).

```
┌──────────────────────────────────────────────────────────┐
│ Blog                                                      │
│ Notes on building things, roughly weekly.                 │
│                                                           │
│ Monospace theme is now available               ┌───────┐  │
│ Choose the compact Monospace theme from the    │ thumb │  │
│ dashboard or config. A two-line clamp of the…  │  3:2  │  │
│ Sep 18, 2026 · (◐◑) Ola Rubaj, Rufus Pollock   └───────┘  │
│ ───────────────────────────────────────────────────────── │
│ Currency symbols in prose no longer break math            │
│ Dollar signs in prose are now left alone unless they…     │
│ Aug 2, 2026 · Ola Rubaj                                   │
│ ───────────────────────────────────────────────────────── │
│ …                                                         │
│          ← Newer   1 2 3 [4] 5 6 … 12   Older →           │
└──────────────────────────────────────────────────────────┘
```

The whole page (header, intro and list) shares one centred 44rem column (6, "Widths"). The thumbnail sits on the left (`media: thumb right` moves it); a post without an image is a text-only row whose text lines up with the other rows' text.

### 3.1a A blog with no index file at all

A folder `blog/` (or `posts/`) full of posts and no `README.md`/`index.md`. `/blog` renders exactly the page in 3.1, titled "Blog" from the folder name, with pagination. Add a `blog/README.md` (or an Obsidian folder note `blog.md` beside the folder) with just a paragraph of prose and the listing appears beneath the prose. Section 4.10 has the rules.

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

### 3.4 Projects as a grid

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

Each project page has normal frontmatter plus a custom field, or is a folder of its own (`projects/alpha/index.md` with its images beside it); both forms are items.

```markdown
---
title: Project Alpha
description: A short summary of the project.
image: "[[alpha-cover.png]]"
status: In progress
---
```

Renders a responsive grid (3, 2, then 1 column at the default content width); `status` appears in the card's meta line. A project without an image gets a monogram tile (the title's first letter on a pale accent tint) so the row stays aligned; if no project has an image the cards are text only, like Vercel's text-only grid (4.9). `defaultImage:` gives such items an image instead, and `defaultImage: none` turns the tiles off.

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
view: people
sort: order
```
````

**One page per person in a folder** (`people/ada.md`, `people/grace.md`); a single `team.md` with a table cannot be listed, and `from: team.md` gets an error card that says so. The `people` view (PR B2) maps `avatar` (then `image`, `photo`) to a square portrait (initials on a tinted square when there is none), `title` to the name, `role` to the meta line and `bio` (then `description`) to a two-line summary. `sort: order` with an `order:` number in each page keeps a hand-chosen order (the default is by name). Author pages already carry `avatar:` (see `content/flowershow-app/people/olayway.md`). The item image falls back from `image` to `avatar`, so a people folder needs no extra fields.

### 3.6 Podcast episodes, filtered

````markdown
```list
from: podcast
where:
  type: episode
ratio: 1/1
fields:
  meta: [episode, duration]
pageSize: 25
```
````

`where` is a map of frontmatter field to value: scalars must equal, lists must contain. Meta values render without labels ("Sep 14, 2026 · 12 · 1h 02m"); a label is one line of CSS on the stable hook, `[data-field="episode"]::before { content: "Episode " }`, shown in the docs. Wiki links in meta values (`guests: ["[[Ada Lovelace]]"]`) render as links. Square thumbnails are the podcast convention (Acquired). `where: { date: upcoming }` (or `past`) keeps future (or past) items, which is what turns a folder of events into an events page.

### 3.7 Featured posts by tag, compact (PR B2)

````markdown
```blog
where:
  tags: featured
limit: 5
view: compact
```
````

Inline blocks are never grouped unless `group` is set, so this teaser has no year headings (`compact` groups by year by default only on `layout: list` and zero-config pages).

```
Sep 18, 2026   Monospace theme is now available
Aug 2, 2026    Currency symbols in prose no longer break math
Jul 29, 2026   Custom head code
```

### 3.8 When something is wrong

````markdown
```list
from: posts
perPage: 5
image: cover
```
````

On a site whose posts live in `blog/`, all three are reported together in an error card in place of the block, so the author or assistant sees it on the next look:

```
┌ List block has problems ──────────────────────────────────────────┐
│ • No folder "posts" with pages. Folders with pages: blog, notes.   │
│ • Unknown key "perPage". Use "pageSize".                           │
│ • Unknown key "image". Use "media: cover" (to choose which field   │
│   holds the image, use "fields: { image: <key> }").                │
│ Keys: from, view, sort, limit, pageSize, where, fields, media,     │
│ ratio.                                                             │
└───────────────────────────────────────────────────────────────────┘
```

What does **not** produce an error: `dir`/`folder` (read as `from`), `layout: cards` (read as `view: grid`), `pagesize` in any case, `fields: [title, date]` (the array form), `sort: -date`. A folder that exists but matches nothing renders "Nothing here yet." Harmless redundancies (`limit` with `pageSize`, a knob a view ignores) render the list and leave a machine-readable note in a `data-listing-notes` attribute and the server log, not on the page (4.12). The error card is public (visitors see it), exactly like `.obsidian-base-error` today; surfacing block errors in publish logs and the CLI is a follow-up.

## 4. The model

### 4.1 Where a listing can live

- **Folder index page**: `layout: list` in the frontmatter of `README.md`/`index.md`. The page body renders as the intro; the listing of that folder is appended. Options go in a `list:` map in the same frontmatter and use exactly the block schema. This mirrors `layout: changelog` (`lib/changelog-context.ts`, `lib/changelog.ts:isChangelogDir`). On a non-index page (`blog.md`, the Obsidian "folder note" pattern), `from` defaults to a sibling folder with the same name (`blog/`) if one exists; otherwise the error card says "add `list: { from: … }`".
- **Inline block**: a ```` ```list ```` or ```` ```blog ```` fence anywhere in any `.md` or `.mdx` page, including inside a `layout: list` page for a second list. `from` is required for ```` ```list ```` (no implicit folder, so nobody lists the whole site by accident) and defaults to `blog` for ```` ```blog ````. `from` is relative to the site root; a leading `./` makes it relative to the page's own folder.
- **Zero-config blog folder** (section 4.10): a README-less `blog/`/`posts/` folder gets a generated listing page; a prose-only README in such a folder, or a prose-only folder note (`blog.md` beside `blog/`), gets the listing appended.
- **Page-level vs inline.** `layout: list` and zero-config listings are *page-level*: the route renders them after the page body, outside the Markdown/MDX tree, so they are always server-rendered and their width matches the page (6, "Widths"). ```` ```list ````/```` ```blog ```` fences are *inline*: rendered inside the body by the remark plugin, server-side in `.md` and after hydration in `.mdx` (`MDXClient` is `ssr: false`).
- **Precedence with the changelog**: `lib/changelog.ts:isChangelogDir` already treats any `layout` other than `changelog` on the folder index as opting out, so `layout: list` on `changelog/README.md` renders a plain listing, not the timeline. Stated in the docs.

### 4.2 Options (the complete schema)

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `from` | folder path | `blog` for ```` ```blog ````; the index page's own folder (or the folder note's sibling folder) for page-level listings; required otherwise | Folder to list, relative to the site root (`rootDir` applied; leading slash optional), or to the page with `./`. Must be a folder: `from: team.md` is an error that says listings show one page per item. A folder with no pages is an error card listing the nearest folders that have pages. Silent aliases `dir`, `folder`. |
| `view` | `list` \| `grid` \| `compact` \| `people` | `list` | Visual shape (4.9). Silent aliases: `layout` (inside a block or `list:` map; the page-level `layout` key is a different key at a different level), `cards` → `grid`. |
| `sort` | `"<field> [asc\|desc]"` or `-<field>` | `date desc` (`title` for `people`) | `date` means the date slot (4.4), so `fields: { date: pubDate }` sorts by `pubDate`. Any other frontmatter field, or `title`, `path`. Direction defaults to `desc` for `date`, `asc` otherwise. Missing values sort last. Silent aliases `sortBy` + `sortDirection`. |
| `limit` | integer | none | Show at most N items, never paginate. For teasers. On a page-level listing it is an error that points to `pageSize` ("`limit` shows only the first N; for N per page use `pageSize`"). |
| `pageSize` | integer \| `none` | `20` on page-level listings; `none` for inline blocks | Items per page. The inline default keeps the recorded decision from #892 (pagination only when asked for) and stops a home-page teaser from claiming `?page`. |
| `where` | map of field → value or list of values | none | Keep items whose field equals the value (scalars) or contains it (lists); a list of values means any of them. Multiple keys are AND. `date: upcoming` / `date: past` compare the date slot with today. A strict subset of Bases filters (4.6). |
| `fields` | map of slot → key \| `none`, or a list of field names | per view (4.4) | Which frontmatter key fills each card slot: `eyebrow` (up to two keys), `title`, `summary`, `date`, `image`, `authors`, `meta` (up to two keys). Only the slots you name change. The list form (`fields: [title, date, description]`, the legacy `<List fields>` shape) turns on exactly those slots. |
| `media` | `none` \| `thumb` \| `cover`; `thumb` takes `left` (default) or `right` | `list`: `thumb left`; `grid`/`people`: `cover`; `compact`: `none` | How images are presented: a small thumbnail beside the text (left unless `media: thumb right`), a cover above it, or none. Named `media`, not `image`, so it never reads as "the `image` field"; a block-level `image:` key is an error that points to `media` and to `fields.image`. `left`/`right` with `cover` or `none` is an error. |
| `ratio` | `16/9` \| `3/2` \| `4/3` \| `1/1` \| `3/4` (also `16:9`) | `thumb`: `3/2`; `cover`: `16/9` (`people`: `1/1`) | Image box aspect ratio. |
| `defaultImage` | image path, `[[wikilink]]` or `none` | unset | (added 2026-10-11) Image for items without one, resolved against the listing page like item images. Distinct from `fields.image` (which frontmatter key holds an item's image) and `media` (how images are shown); ignored, with a note, under `media: none`. Unset, a mixed `grid` gives image-less cards a monogram tile; `none` turns the tiles off. A site-wide default is a follow-up. |
| `featured` | `0` \| `1` | `0` | (PR B2) `1` promotes one item on page 1 to a split hero above the rest: the first item (in sort order) with `featured: true` in its frontmatter, else the first item. It is not repeated in the list. `list` and `grid` only. |
| `group` | `none` \| `year` \| `month` \| `day` \| `folder` \| field name | `none`; `year` for `compact` on page-level listings | (PR B2) A heading before each group. Items are ordered by group first and by `sort` within a group, so every group appears once (4.5). `folder` groups by the first subfolder under `from`. |

Nothing else: ten keys in PR B, twelve with PR B2. Keys are camelCase in the docs and matched case-insensitively. Parsing is lenient on type (`pageSize: "5"`, `featured: true`) and strict on unknown keys (error card with a suggestion). Nested (dotted) keys such as `links.github` in `fields`, `where`, `sort` or `group` are an error until nested paths are supported. `readingTime` is computed on the post page, not stored, so it is not a listing field yet (an error says so; storing a word count at ingestion is a follow-up). Subfolders are always included; a `recursive` switch was cut.

### 4.3 Which pages are items

A page under `from` (at any depth) is listed when all of the following hold:

- it is `.md` or `.mdx` with an `appPath` (a published page; `.canvas` and raw assets are not listed);
- it is not the listed folder's **own** index (`README.md`/`index.md`, any case, directly in `from`). This matches what `getListComponentItems` does today. A nested index such as `projects/alpha/index.md` **is** an item: it represents its folder (Hugo-style page bundles, the common shape for projects, people and residencies), and when its title was computed from the file name the item title falls back to the folder name ("Alpha"), never "README";
- it is not the page containing the list;
- it does not have `publish: false` (such pages are already unreachable; today `getListComponentItems` does not check this, so a `publish: false` post is listed and links to a 404; `toChangelogEntries` and `lib/rss.ts:filterRssBlobs` do check it);
- it does not have `draft: true`. New convention: the page stays reachable by URL (unlisted), the behaviour people expect from `draft` in Jekyll, Hugo and Astro. In v1 a draft is also kept out of the RSS feed (`lib/rss.ts:filterRssBlobs`) and the sitemap, and its page gets `robots: noindex`; search exclusion (Typesense, indexed by the worker) is a follow-up.

`contentHide` does not exclude items (the `people` folder is hidden from the sidebar on flowershow.app yet must be listable). `contentExclude` never reaches the database.

### 4.4 Which frontmatter fields drive what (the `fields` slots)

Every view renders the same six slots in the same DOM order: image, eyebrow, title, summary, meta line (date · authors · meta values). The moodboard found no listing anywhere that needs more (findings §4.1). Default keys per view, with the built-in fallbacks used only while a slot keeps its default:

| Slot | `list` / `grid` default | `people` default | `compact` default | Source rules |
| --- | --- | --- | --- | --- |
| `title` | `title` | `title` | `title` | `title` frontmatter → first `# H1` → file name (ingestion records `computed: ['title']`). File-name titles go through `lib/changelog.ts:entryTitleFromPath`; a nested index uses its folder name. Cannot be `none`. Never line-clamped. |
| `summary` | `description` | `bio` → `description` | `none` | Includes the ingestion-computed opening sentence (`lib/page-description.ts:displayDescription` only suppresses it on the page itself). Line-clamped. |
| `date` | `date` → `pubDate` → `published` → `publishDate` → `created` → `YYYY-MM-DD` file-name prefix | `none` | as `list` | The one date of an item: displayed, sorted by (`sort: date`), grouped by and compared by `where: {date: upcoming}`. Rendered as `<time dateTime>` in the site locale (4.11). An explicit key (`fields: { date: published }`) reads only that key. |
| `image` | `image` → `cover` → `heroImage` → `thumbnail` → `avatar` | `avatar` → `image` → `photo` | `none` | Wiki links (quoted or the unquoted Obsidian form, which YAML reads as a nested list) and relative paths resolved against the item's own file. Only `http(s)` URLs and site assets with an image extension are used; anything else (a page link, `#hero`, `mailto:`) means no image. |
| `authors` | `authors` → `author` | `none` | `none` | Scalar or list; wiki links (`"[[olayway]]"`) unwrapped; resolved to author pages in one cached query per listing (4.7); unresolved values render as plain text, so `author: Jane Smith` is a plain-text byline. Avatar stack plus names, "and N others" after two. Never raw slugs (#895). |
| `eyebrow` | `none` | `none` | `none` | Up to two keys (`category`, `series`, `client`, `date`), list values joined with " · ". A key shown in the eyebrow is removed from the meta line, so `eyebrow: date` moves the date up instead of showing it twice. |
| `meta` | `[]` | `[role]` | `[]` | Up to two keys appended to the meta line (`duration`, `location`, `status`, `role`), each as `[data-field="<key>"]` for theming and labels. |
| `url` | (not a slot) `permalink` → `appPath` | | | Always a single leading slash (never protocol-relative). |

The list form `fields: [title, date, description, image]` turns on exactly the named slots (`description`/`summary` → summary, `image`/`media` → image, `author`/`authors` → authors); any other name goes to `meta` (up to two). The legacy `<List slots>` names `headline`, `media`, `footnote` are accepted inside the map (aliases of `title`, `image`, `meta`) so the 5.3 translation is mechanical.

Values are coerced and never throw (`title: 1984` is a number in YAML); `[[wiki links]]` in any slot are resolved by the plugin itself (remark-wiki-link never sees frontmatter); booleans render Yes/No; objects render nothing. `tags` are not a slot in v1 (no reference listing shows tag pills on cards); `fields: { eyebrow: tags }` shows them as text.

### 4.5 Sorting

Default `date desc`: dated items first, newest first, ties broken by path descending (same as `compareEntries` in `lib/changelog.ts`); undated items follow, sorted by title. `sort: title` is a locale-aware compare. `sort: <custom>` compares numbers numerically, dates chronologically, strings by locale, and puts missing values last regardless of direction. `sort: date` always means the date slot, so display, sort and grouping agree. With `group` set (PR B2), items are ordered by the group key first (date groups follow the date direction; field and folder groups ascend by locale, with "Other"/"Undated" last) and by `sort` within each group, so every heading appears exactly once. Sorting happens in memory after the folder query (the Prisma JSON column cannot be ordered reliably; the legacy `$queryRaw` `::timestamp` cast throws on a non-date `date`).

### 4.6 Filtering: `where` is a subset of Bases

`where` is deliberately defined in Bases terms so that a future string-expression form is a drop-in, not a third dialect:

| `where` entry | Bases equivalent | Notes |
| --- | --- | --- |
| `status: active` (scalar field) | `status == "active"` | Loose on type: `year: 2026` matches `"2026"`. |
| `guests: Ada` (list field) | `guests.contains("Ada")` | Scalar field with a list value also matches. |
| `tags: featured` | `file.hasTag("featured")` | Frontmatter and inline tags via the Tag table, with the nested-tag rule from `packages/core/src/tags.ts` (ADR-0012). |
| `tags: [a, b]` (list value) | `or: [...]` | Any of the values. |
| `date: upcoming` / `date: past` | `date >= today()` / `date < today()` | On the date slot, UTC day. The only comparison in v1. |
| several keys | `and: [...]` | |

Not in v1: `not`, general comparisons, date arithmetic. Those are Bases territory today and the deferred `where: '<expression>'` form (section 8) evaluated by `lib/bases-expr.ts`/`lib/bases-parse.ts`.

### 4.7 Author resolution

`resolveAuthors(siteId, handles, files)` does one `findMany` for all handles of the listing, matching a page whose path is exactly `<handle>.md(x)` or ends in `/<handle>.md(x)` (anchored; the legacy `getAuthors` `endsWith(handle + '.md')` also matches `mary-jane.md` for `jane`). When several pages match, a page under `people/` or `authors/` wins, then the shortest path. Handles come from the `authors` slot (`authors`, then `author`), may be wiki links (`authors: ["[[olayway]]"]`, used on flowershow.app's own blog) and are unwrapped with `extractWikiLinkTarget` as `getAuthors` does. Returns `{name: title, url, avatar}`; unresolved handles render as plain text. The cached part is the author rows; avatar URLs are resolved per request from the page's file list, so the cache never rescans the site. The tRPC `getAuthors` procedure switches to this function in the same PR (same inputs and outputs, strictly fewer false matches).

### 4.8 Pagination

- Server-rendered. Page N is `?page=N` on the page's **public** URL (permalink-aware, not `blob.path`); page 1 is the bare URL (links never emit `?page=1`). Other query parameters are dropped from generated links. `rel="prev"`/`rel="next"` on the links, `aria-current="page"` on the current number.
- Parsing: `parsePageParam` from `lib/changelog.ts`; `?page=abc`, `?page=0` and `?page=-1` render page 1 (never an error). An out-of-range page renders the empty text with the pagination strip.
- Controls: Newer/Older at the ends plus a numbered strip (first, last, current ±2, with **one** collapsed ellipsis per gap). At the ends the unavailable direction renders a disabled-looking `<span>` (not an omitted element), so themes have something to style.
- SEO: `generateMetadata` in the page route currently sets `alternates.canonical` to the bare URL on every request; for `page > 1` it reads `searchParams` and emits a self-referencing canonical so paginated pages are indexable.
- One page of results renders no pagination strip. On a page-level listing, an out-of-range `?page=N` renders the empty text with the strip and `robots: noindex` (the route knows the count from the cached index).
- One paginated listing per page. The page-level listing claims pagination; an inline block with `pageSize` on such a page gets the error card. A second block must use `limit` or stay unpaginated; otherwise it renders the error card ("Only one list per page can paginate; add `limit:` or remove `pageSize:` from this one."). With inline blocks defaulting to no pagination this is rare.

### 4.9 Views

Four views, from the moodboard (`moodboard/findings.md` §5): a list row, a grid card, a compact row, and a people card whose slot order and density differ. Everything else is a knob: `featured`, `group`, `media`, `ratio`. `magazine` is `grid` + `featured: 1`; `cards` is `grid`. PR B ships `list` and `grid`; PR B2 ships `compact`, `people`, `featured` and `group` (8).

**`list` (default): blog feed, notes, podcasts, events** (Substack list, Overreacted, Atlantic, Acquired).
- Row: thumbnail left, text right (`media: thumb`, `ratio` 3/2, `--list-thumb-width` 160px; 88px below 640px on the same side, never dropped on mobile), as in Ghost Edition/Headline, The Atlantic and Acquired. `media: thumb right` (or `thumb left`) picks the side; the root carries `data-media-side="left|right"` and the image's `order` is `var(--list-thumb-order, 0)` (right sets 2), so a theme can flip every list with one variable. The image is first in the DOM but `aria-hidden` and out of the tab order, so the title is read first. `media: cover` puts a 16/9 image above the text; `media: none` gives the Overreacted/PaperMod text row.
- Text block: eyebrow → title (1.25rem semibold, not clamped) → summary (1rem muted, 2-line clamp) → meta line (0.875rem muted; each segment unbreakable, wrapping between segments).
- Rows separated by a 1px rule (`--list-rule-color`), 1.5rem vertical padding.
- No image: the row collapses to full-width text (per row; Substack does this).
- Single column at every width; only the thumbnail size changes.

**`grid`: blog cards, projects, customers, docs index** (Linear Now, Vercel, Ghost Casper, Astro themes).
- Card: image (`cover`, 16/9 default, `--list-card-radius`, hairline border) → eyebrow → title (1.25rem, not clamped) → summary (0.9375rem muted, 3-line clamp) → meta line with avatar stack. No card background or border by default (`--list-card-bg: transparent`, `--list-card-border: none`, `--list-card-hover-bg: transparent`); themes set them for boxed cards. Whole card clickable; links inside the card (authors, meta links) are lifted above the overlay in the default stylesheet.
- Columns: `repeat(auto-fill, minmax(min(100%, var(--list-card-min, 17.5rem)), 1fr))`, which gives 3 at ≥1024px, 2 at ≥640px, 1 below at the default content width; gap `--list-gap` (2rem, 1.5rem below 640px). The grid takes its container's width (never the 44rem measure).
- No image (revised 2026-10-11, user decision: monogram tiles come back, all or nothing). `defaultImage: <path or [[wikilink]]>` (resolved against the listing page, like item images, through `ListingImage`) is used for any item without an image. Without it: when no item on the page has an image, the image slot collapses for the whole listing (text-only rows or cards, Vercel style); in a mixed `list` a row without an image is text only, its text aligned with the image rows' text when the thumbnail is on the left (list never uses monograms); in a mixed `grid` a card without an image gets a monogram tile: `.list-component-item-media.list-component-item-media--placeholder[aria-hidden]` tinted with the accent (`--list-media-placeholder`) carrying the title's first letter or digit (`span.list-component-item-monogram`, `--list-monogram-color`; an empty tile if the title has neither), the same size as the image media so rows align. Decorative: `aria-hidden`, no alt text. Not on a featured card. `defaultImage: none` turns the tiles off (mixed grid cards then have no media block). Below 640px (one column) the tiles are hidden. A site-wide default image (e.g. in `config.json`) is a deferred follow-up.
- `media: none` collapses the image slot; `media: thumb` is shown as `cover`.
- Projects: `fields: { date: none, eyebrow: client, meta: [status] }`, `ratio: 1/1` or `3/4`; the card is unchanged.

**`people` (PR B2): team, contributors, speakers** (Linear team, Obsidian, YC). One page per person in a folder.
- Card: square portrait (`cover`, `ratio` 1/1, `--list-avatar-shape` for circles) → name (1.0625rem semibold) → role (meta, 0.875rem muted) → bio (0.875rem, 2-line clamp). No portrait: initials (first letters of the name) on a tinted square of the same size. (2026-10-11, user decision: keep initials avatars for people without a photo, the standard UI convention; no change for B2.)
- Columns: 4 at ≥1024px, 3 at ≥768px, 2 below; gap 1.5rem. `media: thumb` renders avatar-left rows in one column (Obsidian mobile, YC). `group: team` (or any field) adds section headings, each team once (4.5). Default sort `title`; `sort: order` for a chosen order.

**`compact` (PR B2): archive, changelog, references, talks** (Bear, Gwern, Anthropic newsroom).
- Row: date (tabular numerals, 6.5em column, muted) → optional first `meta` value in a fixed second column (`--list-compact-meta-width`, 9em) → title; one line, title wraps with a hanging indent. No images, no summaries.
- On a page-level listing it groups by year by default (a year heading, 1.5rem bold, with a hairline per group); inline it is ungrouped unless `group` is set, so a three-item teaser has no headings.

**Featured (PR B2, `list` and `grid`).** `featured: 1` promotes the first item with `featured: true` (in sort order), else the first item, to a split hero on page 1 only: 16/9 image left (58%), eyebrow + title (2rem) + summary + meta right, vertically centred; stacks image-on-top below 768px; without an image it is a full-width text hero. The promoted item is removed from its normal position. With `group`, the hero sits above the first group heading and is not part of any group. In `list` the hero stays inside the measure.

**Grouping (PR B2, all views).** `group` inserts `h2.list-component-group-heading` (out of the ToC and anchors, like item titles) before each group: `year` "2026", `month` "September 2026", `day` "Sep 18, 2026" (from the date slot, in the site locale), `folder` (the first subfolder under `from`, titled with `entryTitleFromPath`), or the value of a frontmatter key (first value of a list). Items are ordered group-first (4.5). Undated items or items without the field form a final "Undated"/"Other" group. Headings are flat siblings of the items (grid roots span them with `grid-column: 1 / -1`) and repeat at the top of a page when a group continues across a page break.

**Mobile.** Nothing needs a separate mobile layout: list rows keep a small right thumbnail, grid cards stack to one column, people go 2-up, compact rows wrap.

**Deferred from the moodboard:** `featured` > 1 (Vercel's 3-up), tag/category chip filters and search, grid/list toggle, sticky day labels, a links row on people cards, a name-only long tail under people, newspaper/masonry/mixed-size layouts, "Most popular" rows (needs analytics), an automatic thumb-row treatment for grids on small screens. The page title area leaves room for a chip row later.

### 4.10 Zero-config blog folders

Modelled on the README-less changelog folder (`app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`, the `isChangelogDirName` fallback around line 106, and `lib/changelog-context.ts`).

**Which folders.** A folder whose last path segment is `blog` or `posts`, compared case-insensitively, at any depth (`/blog`, `/Blog`, `/notes/posts`). The slug must match the folder's real case, as for the changelog. Why these two: `blog` is the literal ask (#1008, #1120) and the name every guide uses; `posts` is the convention of Jekyll (`_posts`), Hugo and Astro (`content/posts`) and common in Obsidian vaults, so migrants get it for free. `articles`, `news`, `notes` and `writing` are left out on purpose: they are as often reference material or a digital garden as a dated feed, and `notes` in particular would hijack gardens. Others can opt in with `layout: list`.

**Case 1: no `README.md`/`index.md` in the folder.** If at least one `.md`/`.mdx` page exists anywhere under the folder, its URL renders a generated page: the page header with the folder name as the title ("Blog", "Posts", via `entryTitleFromPath`), then the default listing exactly as `layout: list` with no options would render it (list view, 20 per page, newest first). Everything else mirrors the changelog fallback: no sidebar, no ToC, no breadcrumbs, no hero; `<title>` is `Blog · <site name>` via `buildPageTitle`; the description is the site description; canonical is the bare URL, or the self-canonical for `?page=N > 1` (4.8). An empty folder still 404s, like the changelog. A real page at the same URL always wins (a page whose `permalink` is `/blog`; a folder note `blog.md` is case 3 below), as do tag pages and the changelog.

**Case 1 details.** The slug is matched against the folder's URL form (`encodeSlug(filePathToSlug(dir))`), so parent folders with spaces or non-ASCII names work, and the index rule matches ingestion's (`README`/`index` as `filePathToSlug` treats them). Not in v1: the generated page is not in the sitemap, search or the sidebar tree (the folder stays a non-link there); a follow-up adds it to the sitemap.

**Case 2: a `README.md`/`index.md` exists in such a folder** with **no `layout`** and **no listing of its own**. "No listing of its own" means the parsed body (remark, the same AST the plugin sees, so fences inside callouts and list items count) has no code node with language `list`, `blog` or `base` and no `<List` JSX/HTML element. Then the page renders as usual (header, body as the intro, ToC if on and the intro has headings, see 6, Widths) and the default listing is appended, as if it had `layout: list`. A `list:` map in its frontmatter is honoured.

**Case 3: an Obsidian folder note** `blog.md`/`posts.md` beside the folder (the Folder Notes plugin layout), under the same two conditions: rendered as the page with the folder's listing appended, exactly like case 2. A page with an explicit `permalink` that is not a folder note is never touched.

**Opt-out.** `list: false` in the README or folder-note frontmatter, or any `layout` (`layout: plain`, `layout: changelog`, `layout: list`, which already decides). A site that wants nothing at `/blog` keeps a README there with `list: false`.

**Back-compat, stated plainly.** Unchanged:
- every README that already lists posts with `<List />`, a list block or a Bases block (flowershow.app's own `blog/README.mdx` uses `<List />`);
- every README with any `layout`;
- every folder not named `blog`/`posts`.

What changes on deploy:
- a README-less `blog/` or `posts/` folder that used to 404 now has an index page;
- a prose-only `blog/README.md` or `posts/README.md`, or a prose-only `blog.md`/`posts.md` folder note, gains a listing under its prose.
- `posts` matches at any depth (`/notes/posts`, `/forum/posts`), which the changelog entry says.

The second case also hits a README that lists posts by hand with ordinary links: it will show both. The changelog entry calls this out with the one-line opt-out, and the docs repeat it. This is the intended default ("a blog page that just works"); it is a visible change, not a silent one.

### 4.11 Dates and locale

There is no locale setting today (`<html lang="en">` is hard-coded in the site layout, and `formatChangelogDate` is `en-US`). v1 adds one optional key to the site `config.json`, `locale` (a BCP 47 tag such as `de-DE`; default `en-US`), and the same key in page frontmatter as an override. Listing dates, month and day group labels use it through `Intl.DateTimeFormat` (invalid tags fall back to `en-US`); `<time datetime>` always carries the ISO date so themes can reformat. Wiring `<html lang>` to the same key is a one-line follow-up; the changelog keeps its own formatting.

### 4.12 Errors versus notes

- **Error card (visible):** the block cannot be interpreted: unknown keys, bad values, `from` is a file, the folder has no pages (with the nearest folders that do), a second paginated listing, `limit` on a page-level listing, more than ten listings on a page, unsupported nested keys or `readingTime`.
- **Note (invisible):** the block is fine but something is redundant: `limit` with `pageSize`, `featured` or `media` on a view that ignores it, `media: thumb` on `grid`. The list renders normally; the note is written to a `data-listing-notes` attribute on the `<section>` (inspectable, identical in `.md` and `.mdx`, unlike an HTML comment, which MDX drops) and to the server log. Authors who publish from Obsidian without previewing never see a note on their live home page. Publish-log/CLI surfacing for both is a follow-up.

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

1. **v1 release**: docs mark `<List />` legacy with a one-to-one translation table (`dir` → `from`, `slots` → `fields` slot for slot (`media` → `image`, `eyebrow` → `eyebrow`, `headline` → `title`, `summary` → `summary`, `footnote` → `authors` or `meta`), `pageSize` unchanged, the old `fields` array → which slots are left non-`none`). The component, procedure and classes are untouched apart from the two small fixes above.
2. **Shim in `.md`**: a remark step recognises `<List dir="…" pageSize="…" />` in `html` nodes of `.md` pages and treats it as a block through the engine. Kills the "silently missing in `.md`" footgun for tutorials in the wild.
3. **Shim in MDX**: the same step for `mdxJsxFlowElement` named `List` with static props (`slots={{…}}` is a literal object expression in the estree attribute value and can be evaluated statically). From this point the client fetch, skeleton and `getListComponentItems` are unused by content; the markup is the section 6 markup. This step is a changelogged behaviour change (nested indexes and drafts, sort tie-breaks).
4. **Removal**: delete `list.tsx`, `list-pagination.tsx`, the tRPC procedure and the skeleton CSS only after step 3 has shipped in a release with no reported rendering diffs.

Migration for an existing MDX blog index, available from v1: replace `<List dir="/blog" slots={{…}} pageSize={5} />` with ```` ```blog ```` + `pageSize: 5`, optionally rename the file from `.mdx` to `.md`. The look does not change.

## 6. Output HTML and CSS hooks

The class contract is the existing `.list-component-*` family, extended; there is no parallel `.fs-card*` family. Six official themes and every site's `custom.css` written against `<List />` already target these names, and a second vocabulary would double the contract themes must support. The moodboard's names map one to one: `.fs-listing` → `.list-component`, `.fs-listing--grid` → `.list-component--grid`, `.fs-card` → `.list-component-item`, `__image` → `-item-media`, `__eyebrow` → `-item-eyebrow`, `__title` → `-item-headline`, `__summary` → `-item-summary`, `__meta` → `-item-meta` (new), `__authors` → `-item-authors`, `.fs-card--featured` → `.list-component-item--featured` (new), `.fs-group-heading` → `.list-component-group-heading` (new).

**Themes and the new engine (the theming contract).** Five of the six official themes (all but Material) restyle `.list-component` and its items unconditionally and unlayered: Leaf makes the root a 3-column grid of bordered cards, Letterpress a 2-column grid with negative margins, Lessflowery/Letterpress/Superstack flip items with `row-reverse`, size media to 20–30% at 3/2 or 1/1, move the eyebrow with `order`, cap the root at `--width-list-component`, and Lessflowery hides media below 500px. Because themes are unlayered and the default stylesheet is layered, no default rule can win, so the contract is:

- Every root the new engine emits carries `data-view` (and `data-media`, `data-ratio`). Legacy `<List />` has none.
- `default-theme.css` writes every new rule through `:where()` (specificity of a single class or less), so any theme rule wins and the defaults never out-rank theme typography.
- The themes PR (C1) re-scopes each theme's legacy root/item layout rules to `.list-component:not([data-view])` and adds rules tuned per view (`.list-component[data-view="list"]`, `[data-view="grid"]`, …). It names, for each theme: root `display`, `grid-template-columns`, `max-width`, negative margins; item `flex-direction`, `border`, `align-items`; media `width`, `aspect-ratio`, `display: none`; eyebrow `order`. C1 is a prerequisite of PR B: merged and released (themes load from jsDelivr, so a bare theme name needs a new themes release tag) before PR B deploys. Sites pinned to an old themes version (`theme@x`) keep the old rules until they update; the changelog says so, and gives `custom.css` authors the `:not([data-view])` pattern.
- Storybook loads each official theme's CSS from the themes repo against the new views, so regressions are visible locally and in the PR.

**Widths.** The listing root never sets its own `max-width`. Page-level listings with `view: list` or `compact` constrain the whole page (header, intro and listing) to one centred column, `--list-max-width` (44rem), through a `.listing-page[data-view]` wrapper the route adds; grid and people page-level listings use the normal content width. Inline blocks inherit the column they sit in, so a block under a full-width intro is never narrower than its context. **ToC on page-level listings (2026-10-11, user decision):** item headings never enter the ToC, so a page-level listing (`layout: list`, a zero-config README or folder note) hides the ToC column unless the page's own content has a heading the ToC lists (h2-h6, `hasTocHeadings` in `lib/listing/route.ts`); without that column a grid page reaches 3 columns at 1280px.

Items and group headings are direct children of the root and pagination is the last child, as today, because `../themes/leaf/theme.css` makes `.list-component` a grid of its children. The root element changes from `div` to `section` and the empty state from `div` to `p`; all theme selectors are class-based, so this is cosmetic, but it is noted.

```html
<section class="list-component list-component--list not-prose" data-view="list" data-media="thumb" data-ratio="3-2" aria-label="Blog" data-listing-notes="&quot;pageSize&quot; is ignored because &quot;limit&quot; is set">   <!-- aria-label only on page-level listings; data-listing-notes only when there are notes -->
  <h2 class="list-component-group-heading" data-toc-ignore>2026</h2>                                      <!-- only with group -->
  <article class="list-component-item list-component-item--featured">                                       <!-- --featured: featured: 1, page 1 -->
    <div class="list-component-item-media">
      <a class="list-component-item-media-link" href="/blog/monospace-theme" tabindex="-1" aria-hidden="true"><img class="list-component-item-media-img" …></a>
    </div>
    <div class="list-component-item-content">
      <div class="list-component-item-eyebrow">Themes</div>                                                 <!-- only with fields.eyebrow -->
      <h3 class="list-component-item-headline" data-toc-ignore><a class="list-component-item-headline-link" href="/blog/monospace-theme">Monospace theme is now available</a></h3>
      <p class="list-component-item-summary">Choose the compact Monospace theme from the dashboard or config.</p>
      <div class="list-component-item-meta">
        <time class="list-component-item-date" datetime="2026-09-18">Sep 18, 2026</time>
        <span class="list-component-item-authors">
          <span class="list-component-item-avatars"><img class="list-component-item-author-avatar" …><img class="list-component-item-author-avatar" …></span>
          <a class="list-component-item-author" href="/people/olayway">Ola Rubaj</a>
          <span class="list-component-item-author">Guest Writer</span>
        </span>
        <span class="list-component-item-meta-value" data-field="readingTime">4 min read</span>
      </div>
    </div>
  </article>
  …
  <nav class="list-component-pagination" aria-label="Pages">… (unchanged: Newer/Older ends, `.is-disabled` spans, numbered strip with one ellipsis per gap) …</nav>
</section>
<p class="list-component-empty">Nothing here yet.</p>      <!-- instead of the section when there are no items -->
<div class="list-component-error list-component-error--block">…</div>   <!-- instead of the section when the block is invalid -->
```

(In the plugin, `hProperties` use hast names and string values only: `tabIndex: '-1'`, `ariaHidden: 'true'`, `dataTocIgnore: ''`, `dateTime`, `className`.)

Rules:

- Existing classes keep their names: `media`, `eyebrow`, `headline`, `summary`, `pagination-*`, `empty`, `error`. Two meaning shifts, noted for theme authors: `eyebrow` now holds the `fields.eyebrow` value (the date moved to the meta line, where every reference listing puts it), and `-item-footnote` is not emitted by the new engine (the meta line `-item-meta` replaces it; the legacy component keeps it). The e2e expectations in `e2e/specs/blog.spec.ts` (`.list-component-item-headline a`, `.list-component-item-summary`) hold.
- New classes are additive: `--list`/`--grid`/`--people`/`--compact` modifiers (plus `data-view`, `data-media`, `data-media-side`, `data-ratio`, `data-listing-notes` attributes), `-item--featured`, `-item-meta`, `-item-meta-value[data-field]`, `-item-date`, `-item-authors`, `-item-avatars`, `-item-author`, `-item-author-avatar`, `-item-media--placeholder` with `-item-monogram` (grid) or `-item-initials` (people, PR B2), `-group-heading`, `-error--block`, `.listing-page` (page wrapper), and `.is-disabled` on end-of-range pagination buttons. Meta-line and eyebrow separators (" · ") are CSS; segments never break internally, and the separator slot at the start of a wrapped line is clipped, so no line starts with "·".
- **Item and group headings stay out of the page's heading machinery.** `rehype-slug` and `rehype-autolink-headings` run on hast after `remark-rehype`, and `components/public/table-of-contents.tsx` collects `#mdxpage h2, h3, …` from the DOM. The renderer gives every listing heading a placeholder id (so `rehype-slug` skips it and real headings keep their slugs), a rehype step after `rehypeSlug` in both chains removes it, the autolink `test` skips listing headings, and the ToC selector excludes `[data-toc-ignore]`. A parity test asserts no `.heading-link` and no heading `id` inside `.list-component` in both pipelines.
- **Heading levels.** Items are `h3` and group headings `h2`, as in v4; adjusting levels to the surrounding outline is a follow-up (both are excluded from the ToC, so the only cost is an a11y heading-order warning on some pages).
- **Images go through `next/image` with real sizes.** `components/public/mdx/fs-image.tsx` optimises only `internal`-class images, so the renderer emits an internal `ListingImage` element (an MDX JSX element, lowercased to `listingimage` for `.md` exactly like `ObsidianBasesViews`) registered in both pipelines. String props only: `src`, `alt`, `sizes`, `variant` (`media` | `avatar`). `ListingImage` sits inside the MDX factory's error boundary. `sizes` per view and shape: list thumb `(min-width: 640px) 160px, 88px`; list cover `(min-width: 768px) 44rem, 100vw`; grid `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw`; people `(min-width: 1024px) 25vw, 50vw`; featured `(min-width: 768px) 58vw, 100vw`; avatars `20px`. It renders `next/image` with `fill` inside a box sized by `--list-media-ratio`, `objectFit: cover`, lazy, never zoomable. Authors never write it; it is an implementation detail with a parity test.
- Ratios are attributes, not inline styles: `data-ratio="3-2"` sets `--list-media-ratio: 3 / 2` in the default stylesheet, so a theme can still override the variable.

CSS custom properties (the moodboard's set, named in the existing `--list-*` convention like `--changelog-*`), set on `:root` or `.list-component`, each with a fallback in the stylesheet. Everything else (fonts, sizes, link colour) comes from the theme's existing tokens or from the semantic classes.

| Property | Default | Controls |
| --- | --- | --- |
| `--list-max-width` | `44rem` | Column width of page-level `list`/`compact` pages (header, intro and listing together) |
| `--list-gap` | `2rem` (`1.5rem` below 640px) for `grid`/`people`; `0` for `list` | Space between cards |
| `--list-card-min` | `17.5rem` | Minimum card width; drives the grid's column count |
| `--list-card-radius` | `0.5rem` | Image and card corner radius |
| `--list-card-border` | `none` | Card border (`1px solid …` for boxed cards) |
| `--list-card-bg` | `transparent` | Card background |
| `--list-media-ratio` | per `ratio` (`3 / 2`, `16 / 9`, `1 / 1`, …) | Image box aspect ratio; settable on `:root` (the stylesheet reads it through an internal `--_list-ratio` fallback) |
| `--list-thumb-order` | `0` (`2` with `media: thumb right`) | Side of the list thumbnail: `0` left, `2` right |
| `--list-media-placeholder` | a gradient from a 7% to a 16% accent tint | Grid monogram tiles (and the people initials square, PR B2) |
| `--list-monogram-color` | the accent at 70% over the background | Monogram letter colour |
| `--list-card-hover-bg` | `transparent` | Card background on hover (boxed-card themes) |
| `--list-compact-meta-width` | `9em` | Width of the optional second column in `compact` |
| `--list-thumb-width` | `160px` (`88px` below 640px) | List-view thumbnail width |
| `--list-avatar-shape` | `50%` | Border radius of people portraits and author avatars (20px avatars are one size, set once) |
| `--list-meta-color` | `var(--color-foreground-500)` | Meta line and date colour |
| `--list-eyebrow-color` | `var(--color-foreground-500)` | Eyebrow colour (themes often use the accent) |
| `--list-rule-color` | `var(--color-foreground-100)` | Hairline between list rows and under group headings |

`scripts/theme-class-reference.mjs` (repo root) holds the hand-written DOM tree for the reference and checks the stylesheet's classes, so the new classes land in `reference/theme-class-reference.md`.

Theme PR (C1), a prerequisite of PR B, all six official themes (`leaf`, `lessflowery`, `letterpress`, `superstack`, `monospace`, `material-draft`): re-scope the legacy layout rules listed above to `.list-component:not([data-view])`; add per-view rules; add `.is-disabled` beside each `:disabled` rule on `.list-component-pagination-button`; confirm the icon rules apply to the inline SVG; check rules that assumed `-item-eyebrow` holds a date or that style `-item-footnote`; span `-group-heading` across grid roots; check the thumbnail-left list row (and `thumb right`), text-only grid cards and (for B2) the featured hero.

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

Page-level listings use the same plugin through a second, standalone `processMarkdown('', { listing: { implicit } })` call made by the route (7.3), whose output is placed after the compiled body. That call is the `.md` pipeline, so it is server-rendered whatever the page's `renderMode`, and the MDX body never contains the main listing.

### 7.3 Request flow

1. The route calls a pure resolver, `resolveListingRoute({ slug, blob, metadata, content, siteFilePaths, changelogKind })`, which returns `none`, `virtual` (README-less folder: dir) or `page` (an implicit listing: options, default folder, source `layout` or `auto`, and the parsed view for the width wrapper). It encodes every precedence rule (changelog, tag pages and real pages win; `list: false`; any `layout`; AST-based "already has a listing") and is unit-tested as a table.
2. The route reads `?page` (`parsePageParam`, junk → 1), renders the body with `renderPageContent` (inline blocks only; told whether the page-level listing claims pagination), renders the page-level listing with the standalone `.md` call, and wraps both in `.listing-page[data-view]` when the view is `list`/`compact`. `generateMetadata` gains `searchParams`: self-canonical for `page > 1` on page-level listings, `noindex` when out of range or when the page is a draft.
3. For each listing the plugin calls `spec.ts` → `query.ts` → `authors.ts` → `render.ts`.
4. `query.ts` builds the **ordered index** once per site/folder/where/sort/date-slot/group: one `prisma.blob.findMany` (metadata only, plus `tags { tag }` when `where.tags` is used), item rules, filter, group-first sort, then caches only `{ ids, paths, featured flags, group keys }` (tagged `siteId`, `revalidate: 60`). A 5,000-item folder is a few hundred kilobytes, well under the 2 MB Data Cache item limit (a unit test pins this). Each request slices the index (self-exclusion, featured promotion, page) and fetches the 20-odd page rows by id with full metadata.
5. Author rows are cached per site and handle set; avatar URLs are resolved per request from the page's file list.

### 7.4 Pagination with SSR

The public page route is dynamic per request (no `generateStaticParams`), the middleware preserves the query string, and the changelog paginates this way in production today, so `?page=N` is read at request time and the server renders that slice. There is no client state; the "current page" is the URL. A 1,000-post blog renders 20 items per request, never the whole list.

### 7.5 Legacy `<List />` in v1

Untouched apart from two isolated fixes in their own small PR: `getListComponentItems` gains `AND ("metadata"->>'publish') IS DISTINCT FROM 'false'` (one line in the existing SQL), and `list-pagination.tsx` collapses runs of hidden pages into a single ellipsis. No delegation to `query.ts` in v1 (that is step 3 of 5.3), so no existing site changes output on deploy.

### 7.6 Tests

- Unit: `spec.ts` (every key, alias, preset, every error message), `query.ts` with a mocked Prisma client (rules in 4.3 including nested indexes and `draft`, sort in 4.5, `where` in 4.6), `authors.ts` (anchored matching, `people/` preference), `render.ts` snapshot of the HTML in section 6 for each view and for the disabled pagination ends.
- Pipeline parity: extend `lib/markdown-md-parity.test.tsx` so the same block renders the same HTML through `processMarkdown` and through MDX serialisation, and asserts (a) no `.heading-link` and no heading `id` inside `.list-component`, (b) `listingimage` resolves to the component in both.
- Route: a table test of `resolveListingRoute` (zero-config cases 1–3, opt-outs, changelog/tag/real-page precedence, encoded slugs).
- Cache: the cached index for 5,000 items stays under 1 MB and carries no metadata.
- Storybook: every view against every official theme; a play check that a grid at 1280px has 3 columns.
- e2e (CI only): a seeded listings site covering zero-config, page-level SSR on an `.mdx` README, pagination, errors, and (B2) compact/people/featured/grouping. `srcset` is a post-deploy check (`next/image` is unoptimised outside production).

## 8. Scope

### v1, PR B (engine, `list`, `grid`, zero-config)

- `lib/listing/*`, `lib/remark-listing.ts`, `lib/rehype-listing-headings.ts`, `components/public/mdx/listing-image.tsx`; registered in both pipelines; ToC selector and autolink test updated.
- ```` ```list ```` and ```` ```blog ```` blocks and `layout: list`, with nine keys (`from`, `view`, `sort`, `limit`, `pageSize`, `where`, `fields`, `media`, `ratio`), all aliases and the error/note rules of 4.12.
- Views `list` (thumbnail left, `media: thumb right`) and `grid` (monogram tiles in mixed grids, text-only cards when no item has an image; `defaultImage`, `defaultImage: none`); the `fields` slot map with fallbacks; `where` with list values and `upcoming`/`past`; `sort: date` = date slot.
- Zero-config blog folders, cases 1–3 (4.10), via the pure route resolver; page-level listings server-rendered in the route; page widths (6).
- Site/page `locale` for listing dates (4.11).
- Item rules (4.3) including `draft: true` (listings, RSS, sitemap, `noindex`).
- Batched, anchored, cached author resolution with `author` and wiki-link handles; `getAuthors` delegates to it (its own commit).
- Server-rendered pagination (4.8); cached ordered index (7.3).
- CSS through `:where()`, `data-view` on every root; Storybook stories per official theme.
- Prerequisite: the themes PR (C1) merged and released before PR B deploys.
- Docs for exactly what PR B ships (`list`, `grid`, zero-config), `llms.txt`, changelog entry with screenshot.

### v1, PR B2 (stacked, same release)

- Views `compact` and `people` (initials placeholder, one page per person), `featured: 0|1` (prefers `featured: true`), `group: none|year|month|day|folder|<field>` with group-first ordering. Docs and changelog bullets for them. Until B2 merges, PR B's parser answers `view: compact`/`people` with "not available yet; use list or grid".

### Separate small PR, merged

- `getListComponentItems`: `publish: false` filter. `list-pagination.tsx`: collapsed ellipsis. Merged as #1457 (`e8ea840f`).

### Deferred (in rough priority)

1. `<List />` shims in `.md` and MDX (5.3 steps 2 and 3), then removal (step 4).
2. Heading levels that follow the surrounding outline (6); `<html lang>` from `locale` (4.11); a word count stored at ingestion so `readingTime` becomes a listing field; the generated zero-config page in the sitemap; drafts excluded from search.
3. `where` as a string expression evaluated with the Bases engine (`lib/bases-expr.ts`/`lib/bases-parse.ts`); the Dataview bridge without a new language, drop-in because 4.6 is already a Bases subset.
4. Bases views rendered through `lib/listing/render.ts`: Bases `cards` and `list` views use the listing renderer (semantic classes instead of MUI; fixes #1198's sizing class of bug), Bases gains `view: compact`, pagination and author resolution, and Bases `limit` is honoured. This is how Bases "gains the views" (5.0).
5. Tag pages rendered through the listing renderer in `compact` view.
6. Changelog helpers relocated to `lib/listing/` and the changelog index rendered through the same item query (pure refactor, after both are stable).
7. `table` view (columns from `fields.meta`), `featured` > 1, chip filters/search, grid/list toggle, people links row and name-only long tail (moodboard deferrals, 4.9).
8. Virtual folder index for any folder (beyond `blog`/`posts`, which are in v1 per 4.10): a generated `layout: list` page at any README-less folder URL. Needs a product decision on sidebar and breadcrumbs for arbitrary folders, and on folders of reference notes that should not look like a feed.
9. A `template:` key naming a Markdown partial for bespoke item markup (the #950/#952/#1222 need), only if demand persists after CSS-on-semantic-classes has been tried.
10. `dateFormat` option; `recursive: false`; custom empty text; parallel, de-duplicated fetches for many blocks on one page; time-of-day sorting and timezone-aware dates.
11. Block errors and notes surfaced in publish logs and the CLI.
12. Per-listing RSS `<link rel="alternate">` (`flowershow-sgw` leaves RSS open).
13. An Obsidian plugin preview for the blocks (nice, not needed: Obsidian shows a harmless code block).

## 9. Risks and open questions

- **Official themes restyle `.list-component` unconditionally.** Five of six themes' unlayered rules would turn new views into broken grids (section 6). Mitigation: `data-view` on every new root, `:where()` defaults, and the themes PR (C1) that re-scopes legacy rules to `:not([data-view])`, merged and released before PR B deploys; Storybook stories per theme. Residual: sites pinned to an older themes version and `custom.css` written against `.list-component` (documented pattern in the changelog).
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

## 10. Post page layout (follow-up PR F, not in PR B)

The moodboard's post-page findings (§3, §6) are adopted as the spec for a separate PR after the listings ship. It changes `components/public/layouts/blog.tsx` and the page route for pages that are items of a collection (a page under a folder that is listed, or any page with `date`), and reuses the listing renderer for its footer cards.

- **Measure:** 44rem (~704px) at 1.125rem/1.65 body, centred column; matches the 680–728px cluster (Medium, Vercel, Ghost, Bear, Substack). Exposed as `--post-max-width`, shared with `--list-max-width` for `list`/`compact` so an index and its posts line up.
- **Header, top to bottom, left-aligned inside the measure:**
  1. eyebrow: category or breadcrumb (`Blog / Category`), 13px semibold, muted or accent; optional;
  2. title `h1`, 2.5–3rem with `clamp()`, tight leading; centred only if a theme opts in;
  3. dek: `description`, 1.25rem muted;
  4. byline: 40px avatar (stack for several authors) and names on line one, `date · N min read` (14px muted) on line two, role if present;
  5. hero: `image`, 16/9, inside the measure (`--post-hero-bleed` lets a theme widen it to ~70rem), caption from `imageCaption` or alt; optional;
  6. body.
- **Footer v1, in order:**
  1. tags row (existing `.tag-pill`);
  2. prev/next: two half-width links, "← Previous" / "Next →" with titles, in the collection's sort order (the changelog's `neighbours()` is the precedent);
  3. "Read more": three `grid` cards from the same collection (same tag first, else most recent), rendered by `lib/listing/render.ts`;
  4. author card (56px avatar, name, bio, links) only when the site has an authors collection (`people/` or `authors/` pages resolved by `resolveAuthors`), else nothing.
- **Later:** share buttons, subscribe/CTA block, comments placement, reading progress, floating ToC, per-post hero bleed, per-site reading-time toggle.

## Changes after moodboard

(Historical: the PR split, the `image` knob name and the `compact` grouping default below were revised in "Changes after adversarial review".)

Source: `moodboard/findings.md` (40+ listings, people, project, podcast, event, docs and post pages; screenshots in `moodboard/img`). Approved as the 80/20 recommendation.

- Views are `list` (default), `grid` (replaces `cards`; `cards` stays a silent alias), `people`, `compact` (4.9). `magazine` is not a view: it is `grid` + `featured: 1`.
- New knobs: `featured: 0|1`, `group: none|year|month|day|<field>` (pulled into v1; `compact` defaults to `year`), `image: "<none|thumb|cover> [ratio]"` (4.2).
- `show` is replaced by a `fields` slot map (eyebrow, title, summary, date, image, authors, meta[≤2]) with per-view defaults (4.4). It maps one to one onto the legacy `<List slots>`, whose names are accepted as aliases. Keys go from seven to ten.
- Card anatomy is one DOM for all views (image, eyebrow, title, summary, meta line: date · authors · meta), with the date moved from the eyebrow to the meta line and authors as an avatar stack (section 6).
- The class contract extends `.list-component-*` instead of adding `.fs-card*`; the moodboard's CSS variables are adopted under `--list-*` names (12 in total, replacing the earlier 12).
- Zero-config `blog`/`posts` folders are unchanged and use `list`.
- Post page layout becomes the spec for a follow-up PR F (section 10).
- Size: PR B splits into PR B (engine, `list`, `compact`, `group`, `image`, `fields`, zero-config) and PR B2 (`grid`, `people`, `featured`), stacked and released together. PR B's parser rejects `grid`/`people`/`featured` until B2 lands, so a deploy of B alone never renders a half-built view.

## Changes after adversarial review

Sources: `adv-review-ux.md` (layout and author experience) and `adv-review-tech.md` (layout system), both on v4. All BLOCKER and MAJOR items adopted.

- **Themes (UX B-1, tech M2/M3):** `data-view` on every new root; all new default rules through `:where()`; the themes PR re-scopes legacy rules to `.list-component:not([data-view])`, adds per-view rules, and is a prerequisite released before PR B deploys; Storybook stories per official theme (section 6, 9).
- **Widths (tech M1, UX M-15):** no `max-width` on the listing root; page-level `list`/`compact` pages share one 44rem column for header, intro and listing; grids take their container width; inline blocks inherit their column (section 6).
- **Split (UX M-16):** PR B = engine, `list`, `grid`, zero-config (including the folder-note case, UX M-3); PR B2 = `compact`, `group`, `people`, `featured`. PR B docs advertise only PR B (section 8).
- **Grouping (UX M-1, M-12, tech M4):** group-first ordering with `sort` as a stable secondary; `compact` groups by year only on page-level listings (4.2, 4.5, 4.9).
- **Dates and sort (tech M5, UX M-11, m-9):** `sort: date` is the date slot; date fallbacks `date → pubDate → published → publishDate → created → file name`; a site/page `locale` for listing dates (4.4, 4.11).
- **Authors (UX M-4):** `authors → author`, wiki-link handles unwrapped (4.4, 4.7).
- **Featured (UX M-6):** prefers `featured: true`, else the first item; not repeated; text hero without an image; above the first group (4.9).
- **Image knob (UX M-5):** `media: none|thumb|cover` plus `ratio:`; a block-level `image:` points to both (4.2).
- **fields (UX M-9, M-8, M-14):** list form accepted; `layout` alias of `view`; case-insensitive keys; eyebrow takes up to two keys and removes them from the meta line; `readingTime` is an error with an explanation (not available without storing a word count at ingestion, which is not cheap: existing pages would need republishing) (4.2, 4.4).
- **Errors and notes (UX M-10, M-13):** a missing folder is an error card with the nearest folders; a file in `from` is an error (UX M-7); redundancy notes go to `data-listing-notes` and the server log, never visible to visitors, because the alternatives are worse: a visible note stays on live pages of authors who do not preview, and an HTML comment cannot be emitted identically in MDX (4.12).
- **No images (UX M-2), revised twice on 2026-10-11 (user decisions):** first no generated placeholders; then monogram tiles back with an all-or-nothing rule: a mixed grid gives image-less cards a monogram tile, a grid with no images is text only, `list` never uses monograms, `defaultImage` overrides and `defaultImage: none` disables; people keep initials (PR B2, 4.9). The 3.1 mock now matches the spec.
- **SSR (tech M6):** page-level listings render in the route through the `.md` pipeline, outside the MDX tree; only inline blocks in `.mdx` render after hydration (4.1, 7.2).
- **Cache (tech M7):** the cache holds the ordered index (ids, paths, featured flags, group keys); page rows are fetched by id; payload size is unit-tested at 5,000 items (7.3).
- **Testability (tech M19):** a pure `resolveListingRoute` with a table test (7.3, 7.6).
- **Minors adopted:** UX m-2 (titles never clamped), m-3 (unbreakable meta segments), m-4 (links lifted above the card overlay), m-5 (documented thumb-left CSS), m-6 (compact meta column width), m-7 (no strip for one page), m-9 (date and image fallbacks), m-10 (draft also out of the sitemap and `noindex`), m-11 (`-date`, `sortBy`), m-12 (`where` list values are any-of), m-13 (`limit` on a page-level listing is an error pointing to `pageSize`), m-14 (meta label CSS documented), m-15 (`where: {date: upcoming|past}`), m-16 (`group: folder`), m-18 (`--list-card-hover-bg`), m-19 (aria-label only on page-level listings), m-20 (`posts` at any depth stated); tech 1 (AST-based detection), 2 (encoded slugs, ingestion's index rule), 3 (`UrlNormalizer` keeps `?page`), 4 (author cache without the site scan), 7 (unquoted wiki links), 8 (dotted keys are an error), 9 (image `src` restricted to images; error boundary), 10 (`--_list-ratio`), 11 (`is-disabled` owner in the class reference), 12 (featured keeps the measure), 14 (`noindex` out of range), 15 (`rebase --onto`), 16 (PR B docs), 17 (zero-config gaps stated), 18 (one avatar size), 19 (route resolver, theme stories).
- **Minors skipped, with reasons:** UX m-1 (legacy slot aliases kept: they make the `<List />` migration mechanical and cost no public vocabulary since the docs teach the seven slot names); UX m-8 and tech 13 (heading levels: excluded from the ToC; outline-aware levels are a follow-up because they need preceding-heading tracking in both pipelines); UX m-17 (automatic thumb rows for mobile grids: the references stack cards, and a theme can opt in); tech 5 (parallel, de-duplicated fetches: the 10-listing cap and the cached index bound the cost; follow-up); tech 6 (timezone-aware dates: shared with the changelog's `resolveEntryDate`; changing it belongs in its own PR).
