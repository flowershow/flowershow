---
title: Listing pages
description: "A blog index, a grid of projects or the latest posts on your home page, from any folder, in plain Markdown."
---

Everything on this page is fenced blocks and frontmatter. You don't need MDX or components, and it works the same in `.md` and `.mdx` pages.

## A blog with nothing to write

A folder named `blog` or `posts` (any case, at any depth, so `/notes/posts` counts too) lists itself:

- **No `README.md` or `index.md` in the folder:** `/blog` shows every page in the folder and its subfolders, newest first, 20 per page, titled after the folder ("Blog").
- **A `README.md` (or `index.md`) with only prose:** the list appears under your prose.
- **An Obsidian folder note** (`blog.md` beside `blog/`) with only prose: the same, the list appears under the note.

Pages that already decide for themselves are left as they are: any page with a `layout`, and any page that already has a list block, an Obsidian Bases block or a `<List />` component.

If your `blog/README.md` links to its posts by hand and you don't want a second list under it, add `list: false` to its frontmatter:

```markdown
---
title: Blog
list: false
---
```

## A blog index in one line

Add `layout: list` to a folder's `README.md` to list that folder:

```markdown
---
title: Blog
layout: list
---

Notes on building things, roughly weekly.
```

The page shows its title, your intro, then every page in `blog/` and its subfolders, newest first, 20 per page, with "Newer" and "Older" links. Each item shows its title, description, image (if it has one), date and authors. Page-level options go in a `list:` map in the same frontmatter and use the same keys as a block (see [Options](#options)):

```markdown
---
title: Projects
layout: list
list:
  view: grid
  sort: title
---
```

On an Obsidian folder note (`blog.md` beside `blog/`), `layout: list` lists the sibling folder.

Or put a ```` ```blog ```` block anywhere on any page. It lists `blog/`:

````markdown
```blog
```
````

A ```` ```blog ```` block is a ```` ```list ```` block with `from: blog` filled in. For any other folder, use ```` ```list ```` and say which one:

````markdown
```list
from: notes
```
````

`from` is relative to the site root (a leading `/` is optional), or to the page's own folder with `./` (`from: ./drafts`).

## Latest posts on your home page

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

`limit` shows the first three and never paginates.

## Options

Every key works in a ```` ```list ```` or ```` ```blog ```` block and in a `list:` map on a `layout: list` page.

| Key | Values | Default | What it does |
| --- | --- | --- | --- |
| `from` | folder path | `blog` for ```` ```blog ````; the page's own folder for `layout: list`; required for ```` ```list ```` | The folder to list, including its subfolders. Must be a folder, not a page. |
| `view` | `list`, `grid` | `list` | Rows with a small thumbnail, or a grid of cards. See [Views](#views). |
| `sort` | `<field> [asc\|desc]` or `-<field>` | `date desc` | Order of items. `date` means the item's date (see [fields](#choosing-what-each-card-shows-fields)). `title`, `path` or any frontmatter field. |
| `limit` | number | none | Show at most this many items and never paginate. For teasers. |
| `pageSize` | number or `none` | `20` on `layout: list` and zero-config pages; none in blocks | Items per page. |
| `where` | map of field to value(s) | none | Keep only matching items. See [Filtering](#filtering-with-where). |
| `fields` | map of slot to field, or a list | per view | Which frontmatter field fills each part of a card. See [fields](#choosing-what-each-card-shows-fields). |
| `media` | `thumb`, `thumb right`, `cover`, `none` | `thumb` in `list` (on the left), `cover` in `grid` | How images are shown: a thumbnail beside the text (left unless you write `thumb right`), a cover above it, or no images. |
| `ratio` | `16/9`, `3/2`, `4/3`, `1/1`, `3/4` | `3/2` for thumbnails, `16/9` for covers | Shape of the image box. `16:9` works too. |
| `defaultImage` | image path, `[[wikilink]]` or `none` | unset | Image for items that don't have one, found relative to the listing page. `none` turns off the letter tiles in a grid (see [Views](#views)). |

Keys are case-insensitive (`pagesize` works). A few natural guesses are read silently: `dir` and `folder` mean `from`, `layout` inside a block means `view`, `cards` means `grid`, `sortBy` with `sortDirection` means `sort`, and `sort: -date` means newest first.

## Choosing what each card shows (`fields`)

Each card has the same parts: an image, an eyebrow above the title, the title, a summary, and a meta line (date · authors · extra values). By default they come from these frontmatter fields:

| Slot | Default field | If that is missing |
| --- | --- | --- |
| `title` | `title` | the first `# heading`, then the file name |
| `summary` | `description` | the page's opening sentence |
| `date` | `date` | `pubDate`, `published`, `publishDate`, `created`, then a `YYYY-MM-DD` prefix in the file name |
| `image` | `image` | `cover`, `heroImage`, `thumbnail`, `avatar` |
| `authors` | `authors` | `author` |
| `eyebrow` | none | |
| `meta` | none | |

Change only the slots you name:

````markdown
```list
from: projects
view: grid
fields:
  date: none
  eyebrow: client
  meta: [status]
```
````

- `none` hides a slot (the title can't be hidden). Projects usually want `date: none`.
- `eyebrow` and `meta` take up to two fields each: `eyebrow: [date, category]`. A field in the eyebrow leaves the meta line, so `eyebrow: date` moves the date up.
- Naming a field replaces the fallbacks: `fields: { date: published }` reads only `published`.
- The list form turns on exactly the named slots: `fields: [title, date, description]`. `description` fills the summary, `image` the image, `author`/`authors` the authors; any other name goes in the meta line.

Authors show as small avatars and names linked to their author pages (see [[page-authors|Page authors]]); a name without an author page is plain text. Wiki links in any field (`guests: ["[[Ada Lovelace]]"]`) become links. Images can be wiki links or paths relative to the item's own file; only real images (an image file on your site, or an `http(s)` URL) are shown.

`readingTime` isn't available in listings yet.

## Views

**`list`** (the default) is one column of rows. The thumbnail sits on the left; `media: thumb right` puts it on the right. On a `layout: list` page the header, intro and list share one reading-width column. A row without an image is text only, lined up with the other rows' text. `media: cover` shows a wide image above each row's text; `media: none` gives plain text rows.

**`grid`** shows cards in three columns on wide screens, two on tablets and one on phones. A `layout: list` grid page uses the full content width.

How a grid handles items without an image:

- **No item has an image:** text-only cards, with no image boxes.
- **Some items have images:** the others get a tile tinted with your theme's accent colour, showing the first letter of the title, so the rows stay aligned. The tile is decorative (screen readers skip it). On phones, where the grid is one column, the tiles are hidden.
- **`defaultImage: "[[cover.png]]"`** shows that image instead of the tile.
- **`defaultImage: none`** turns the tiles off: those cards are text only.

````markdown
```list
from: projects
view: grid
ratio: 4/3
defaultImage: "[[assets/project-placeholder.png]]"
```
````

Quote a wiki link value (`"[[cover.png]]"`) to keep it valid YAML in other tools; unquoted works too.

## Which pages are listed

A page is listed when it is in the `from` folder or any folder below it, and:

- it is a `.md` or `.mdx` page (not a canvas or an asset);
- it isn't the folder's own `README.md`/`index.md`. A `README.md` or `index.md` in a **subfolder** is listed, titled after its folder: `projects/alpha/index.md` is the item "Alpha", with its images beside it;
- it isn't the page the list is on;
- it doesn't have `publish: false`;
- it doesn't have `draft: true`.

A **draft** stays reachable at its URL (so you can share it for review) but is left out of lists, the RSS feed and the sitemap, and asks search engines not to index it.

Pages hidden from the sidebar with `contentHide` are still listed.

## Sorting

`sort: date` (the default, newest first) uses the item's date as described in [fields](#choosing-what-each-card-shows-fields), so what you see, the order and the filter all agree. Undated items come last, by title. `sort: title` sorts alphabetically; `sort: <field>` sorts numbers as numbers and dates as dates, with missing values last. Add `asc` or `desc` (`sort: title desc`), or prefix a minus for descending (`sort: -order`).

## Filtering with `where`

````markdown
```list
from: podcast
where:
  type: episode
  guests: Ada
```
````

- A plain field must equal the value (`year: 2026` matches `"2026"`); a list field must contain it.
- A list of values means any of them: `tags: [design, research]`.
- `tags` matches frontmatter and inline tags, including nested tags.
- `date: upcoming` keeps items dated today or later, `date: past` items before today. Handy for events.
- Several keys must all match.
- Values are case-sensitive.

For anything more (`or`, `not`, comparisons, formulas), use [[obsidian-bases|Obsidian Bases]].

## Pagination

Pages are `?page=2`, `?page=3` and so on; page 1 is the plain URL. A `layout: list` or zero-config page shows 20 per page; a block shows everything unless you set `pageSize`. Only one list per page can paginate: give any other list a `limit`. On a `layout: list` page, use `pageSize`, not `limit`.

Lists on `layout: list` and zero-config pages are always in the page's HTML when it loads. A block in an `.mdx` page appears after the page loads, like other MDX content, so prefer `.md` for pages that list things.

## Dates in your language

Dates use the site's `locale` in `config.json` (default `en-US`), and a page can override it with `locale` in its frontmatter:

```json
"locale": "de-DE"
```

With `de-DE`, a date shows as "18. Sept. 2026". An unknown locale falls back to `en-US`.

## The table of contents

Item titles never appear in the table of contents. A `layout: list` or zero-config page whose own text has no headings therefore hides the table of contents column (which would be empty), so a grid gets the full width. Add a `##` heading to the intro and the table of contents comes back.

## When something is wrong

If a block can't be read, it is replaced with a card listing every problem and the keys you can use:

```text
List block has problems
• No folder "posts" with pages. Folders with pages: blog, notes.
• Unknown key "perPage". Use "pageSize".
• Unknown key "image". Use "media: cover" (to choose which field holds the image, use "fields: { image: <key> }").
Keys: from, view, sort, limit, pageSize, where, fields, media, ratio, defaultImage.
```

Other messages you may see:

- `"from" must be a folder; "team.md" is a page. Listings show one page per item, e.g. one page per person in "people/".`
- `"limit" shows only the first 5 items and hides the rest; for 5 per page use "pageSize: 5".` (on a `layout: list` page)
- `Only one list per page can paginate; add "limit:" or remove "pageSize:" from this one.`
- `Unknown key "filter". Use "where".`

A folder that exists but has nothing to list shows "Nothing here yet."

Harmless redundancies, such as `limit` together with `pageSize`, still render the list and leave a note in a `data-listing-notes` attribute on the list's `<section>` instead of a visible message. To see it, inspect the list in your browser's developer tools.

## List block or Obsidian Bases?

| Use | When |
| --- | --- |
| A list block or `layout: list` | You want a blog index, a grid of projects or the latest posts from a folder, with dates, authors, images and pagination. |
| [[obsidian-bases\|Obsidian Bases]] | You want a table, formulas, `or`/`not` filters or comparisons, or exactly what you see in Obsidian. |

## Coming from the List component

The [[list-component|`<List />` component]] keeps working. To switch:

| `<List />` | List block |
| --- | --- |
| `<List dir="/blog" />` in `.mdx` | ```` ```list ```` with `from: blog` (or ```` ```blog ````), works in `.md` |
| `pageSize={5}` | `pageSize: 5` |
| `fields={["title", "description", "date", "image"]}` | `fields: [title, description, date, image]` |
| `slots={{ media: "cover" }}` | `fields: { image: cover }` |
| `slots={{ eyebrow: "date" }}` | `fields: { eyebrow: date }` (the date moves up and leaves the meta line) |
| `slots={{ headline: "name" }}` | `fields: { title: name }` |
| `slots={{ summary: "dek" }}` | `fields: { summary: dek }` |
| `slots={{ footnote: "authors" }}` | the default: authors show as avatars and linked names |
| `slots={{ footnote: "status" }}` | `fields: { meta: [status] }` |
| relative `image:` paths resolved from the site root | resolved from the item's own file |

For example, this `blog/index.mdx`:

```mdx
<List dir="/blog" pageSize={5} slots={{ eyebrow: "date" }} />
```

becomes a `blog/README.md`:

````markdown
```blog
pageSize: 5
fields:
  eyebrow: date
```
````

or, for the whole page, `layout: list` with `list: { pageSize: 5, fields: { eyebrow: date } }` in the frontmatter.

## Styling

Lists use the same `.list-component-*` classes as `<List />`, plus attributes that say which view and image style a list uses:

```text
section.list-component.list-component--list|--grid[data-view][data-media][data-media-side][data-ratio]
  article.list-component-item
    .list-component-item-media            (image, or the letter tile: .list-component-item-media--placeholder > .list-component-item-monogram)
    .list-component-item-content
      .list-component-item-eyebrow
      h3.list-component-item-headline
      .list-component-item-summary
      .list-component-item-meta           (time, .list-component-item-authors, .list-component-item-meta-value[data-field])
  nav.list-component-pagination
```

Most of the look is set with custom properties, in your `custom.css`:

```css
:root {
  --list-card-radius: 0;          /* square images */
  --list-thumb-width: 120px;      /* smaller list thumbnails */
  --list-thumb-order: 2;          /* every list thumbnail on the right */
  --list-card-min: 14rem;         /* narrower grid cards, more columns */
  --list-media-placeholder: #f3efe6; /* letter tile background */
  --list-monogram-color: #8a6d3b; /* letter colour */
}
```

The full list: `--list-max-width`, `--list-gap`, `--list-card-min`, `--list-card-radius`, `--list-card-border`, `--list-card-bg`, `--list-card-hover-bg`, `--list-media-ratio`, `--list-media-placeholder`, `--list-monogram-color`, `--list-thumb-width`, `--list-thumb-order`, `--list-avatar-shape`, `--list-meta-color`, `--list-eyebrow-color`, `--list-rule-color`.

Meta values show without labels. Add one with CSS:

```css
.list-component-item-meta-value[data-field="episode"]::before {
  content: "Episode ";
}
```

If your `custom.css` restyles `.list-component` for the old `<List />`, scope those rules to `.list-component:not([data-view])` so they don't apply to the new lists. Every class is listed in the [[theme-class-reference|Theme class reference]].

## Good to know

- `layout: list` on your `changelog/README.md` renders a plain list, not the changelog timeline.
- If your site has a `rootDir`, a `from` that starts with that folder's name has it removed, so `from: content/blog` and `from: blog` both work.
- A page can have at most 10 lists.
