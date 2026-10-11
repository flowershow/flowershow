---
title: "Listing pages: a blog, a projects grid and a team page in plain Markdown"
description: "A step-by-step tutorial for Flowershow's new listing pages: a blog index with nothing to write, latest posts on your home page, a projects grid, a team page, an archive and a featured post, all in plain .md files."
date: 2026-10-11
authors:
  - rufuspollock
image: "[[assets/blog-listing-pages-tutorial.webp]]"
---

Most sites built from a folder of notes end up needing the same few pages: a blog index, "latest posts" on the home page, a grid of projects, a team page, an archive. On Flowershow, until now, each of those meant an `.mdx` file and a `<List />` component with JSX props. Write the same thing in a `.md` file and nothing showed up.

Today we're shipping listing pages. You describe a list in a few lines of settings inside an ordinary Markdown file, in a code block, the same way you write an Obsidian Bases block:

````markdown
```blog
limit: 3
```
````

That's a complete list: the three newest posts. There are no components and no MDX, and it works in `.md`. Obsidian just shows the block as a code block, so nothing breaks in your vault. And if your posts are already in a `blog/` folder, `/blog` is a blog index before you write anything.

If you already have a Flowershow site, see [what to check](#if-you-already-have-a-site) at the end. This post walks through building a small personal site from nothing: a blog, a home page, projects, a team page and an archive. Each step shows the Markdown, then what it looks like. The full list of options is in the [[listings|Listing pages]] reference.

## Why it looks the way it does

When designing this we looked at how the best blogs and publications lay out their indexes: Substack, Ghost's themes, Linear, Bear Blog and others. Almost all of them use one of three shapes: a list row (title, summary, date, a small image beside it), a grid card (image on top), or a compact one-line row (date, then title) for archives. Team pages are a fourth, with portraits instead of thumbnails. Everything else, like a big featured post at the top or headings per year, is an option on top of those.

So that is what Flowershow gives you: four views (`list`, `grid`, `compact`, `people`) and a dozen options, with defaults chosen for a blog so most pages need no options at all.

## 1. A blog with nothing to write

Put your posts in a folder called `blog` (or `posts`, at any depth):

```text
blog/
  2026-09-18-first-post.md
  2026-10-02-second-post.md
  2026-10-11-third-post.md
```

Each post is a normal Markdown page. The frontmatter you probably already have is enough:

```markdown
---
title: Notes from the garden
description: What worked this year, and what the slugs ate.
date: 2026-10-11
authors:
  - jane-smith
image: "[[garden.jpg]]"
---
```

Publish, and `/blog` is a blog index: every post in the folder and its subfolders, newest first, 20 per page with "Newer" and "Older" links, titled "Blog" after the folder. Each post shows its title, description, image (if it has one), date and authors.

![A blog/ folder with no README: a generated, paginated blog index](/assets/docs-listings-zero-config-blog.webp)

None of those fields are strictly required. A post without a `description` shows its opening sentence; without a `date`, Flowershow tries `pubDate`, `published`, `publishDate`, `created` and finally a `YYYY-MM-DD` at the start of the file name. Posts with `draft: true` are left out of the list, but they're still reachable at their URL (so you can share them for review) and still show in search, tag pages and the sidebar. Use `publish: false` to keep a page off the site entirely.

Want an intro above the list? Add a `blog/README.md` (or an Obsidian folder note, `blog.md` beside the folder) with only some prose. The list appears under it:

```markdown
---
title: Blog
---

Notes on compilers and gardening, roughly weekly.
```

If your existing `blog/README.md` already links to its posts by hand and you don't want a second list underneath, add `list: false` to the settings at the top of the file (the frontmatter, between the `---` lines):

```markdown
---
title: Blog
list: false
---
```

Folders with other names don't list themselves. For those, add `layout: list` to the folder's `README.md`, and that page lists its own folder:

```markdown
---
title: Notes
layout: list
---
```

## 2. Latest posts on your home page

Your home page is the site's root `README.md` (or `index.md`). Put a `blog` code block wherever you want the posts to appear:

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

![A home page with the three latest posts under a "Latest posts" heading](/assets/docs-listings-latest-three.webp)

A `blog` block lists the `blog/` folder. `limit: 3` shows the three newest and never adds page links, which is what you want for a teaser. A block without `limit` or `pageSize` shows every post (up to 200) on one page; `pageSize: 10` adds page links instead. Only one list per page can have page links, so if you put several lists on your home page, give the others a `limit`. For any other folder, use a `list` block and say which folder with `from`:

````markdown
```list
from: notes
limit: 5
```
````

## 3. A grid of projects

Make a `projects/` folder with one page per project. A project can be a single file (`projects/seed-library.md`) or a folder of its own (`projects/seed-library/README.md`, with its images beside it; it takes its `title:`, or the folder name if it has none); both count as one item. Give each one whatever fields make sense, for example `projects/seed-library.md`:

```markdown
---
title: Seed library
description: A lending library for heritage vegetable seeds.
image: "[[seed-library.jpg]]"
status: In progress
---
```

Then turn `projects/README.md` into a grid:

```markdown
---
title: Projects
layout: list
list:
  view: grid
  sort: title
  fields:
    date: none
    meta: [status]
---

Things I'm building, or have built.
```

Settings for a `layout: list` page go under `list:` in the frontmatter. Here `view: grid` gives cards with a cover image, three columns on wide screens, two on tablets and one on phones. `sort: title` orders them alphabetically instead of by date. `fields` hides the date (projects rarely need one) and shows the `status` field in the line under each summary.

![The grid view, shown here with blog posts: a cover image, or a letter tile when a post has none, above each title, description, date and authors](/assets/docs-listings-grid-blog.webp)

Not every project has a picture. When some cards have images and others don't, the others get a tile in your theme's accent colour with the first letter of the title, so the rows stay lined up (on phones, where there's one column, the tiles are hidden). If you'd rather use a placeholder image, set `defaultImage: "[[project-placeholder.png]]"`; `defaultImage: none` turns the tiles off. If no project has an image, you get clean text-only cards. Use `ratio: 4/3` (or `1/1`, `3/2`, `3/4`, `16/9`) to change the shape of the image box.

## 4. A team page

Make one page per person in a folder:

```text
team/
  README.md
  ada.md
  grace.md
  ola.md
```

Each person's page has their photo, role and a short bio:

```markdown
---
title: Ada Lovelace
avatar: "[[ada.jpg]]"
role: Analyst
bio: Wrote the first published program, for a machine that was never built.
team: Engineering
---
```

Then `team/README.md`:

```markdown
---
title: Team
layout: list
list:
  view: people
  group: team
---
```

![A team page: square portraits with name, role and a short bio under each, grouped under Engineering and Leadership headings; a person without a photo gets their initials](/assets/docs-listings-people-team.webp)

`view: people` shows square portraits, up to four across (two on phones), with the name, role and two lines of bio. Someone without a photo gets their initials on a tinted square. `group: team` puts everyone under a heading for their `team` field. People are sorted by name; to choose the order yourself, give each page an `order: 1`, `order: 2` and so on, and add `sort: order`.

The photo can be in `avatar`, `image` or `photo`, and the bio in `bio` or `description`. One thing that doesn't work: a single `team.md` with a table of people. A list shows one page per item, so each person needs their own page.

## 5. An archive

Long-running blogs want a page where you can see everything at once. Create `archive.md` at the top of your site, next to your home page:

```markdown
---
title: Archive
layout: list
list:
  from: blog
  view: compact
  pageSize: 50
---
```

![A compact archive: one line per post, the date in a column on the left and the title beside it, under a heading per year](/assets/docs-listings-compact-archive.webp)

`from: blog` is needed here because the page isn't inside the `blog/` folder. `view: compact` is one line per post: the date, then the title. No images, no summaries. On a `layout: list` page it's grouped under a heading per year without you asking. `pageSize: 50` puts 50 posts on each page instead of 20 (on a `layout: list` page, use `pageSize` rather than `limit`).

If your posts have a `category` field, you can give it its own column between the date and the title (hidden on phones):

```markdown
---
title: Archive
layout: list
list:
  from: blog
  view: compact
  pageSize: 50
  fields:
    meta: [category]
---
```

## 6. A featured post, and grouping

A magazine-style home page is a grid with one big post on top:

````markdown
## Latest

```blog
view: grid
featured: 1
limit: 7
fields:
  eyebrow: category
```
````

![A magazine-style home page: a featured post with a large image on the left and its category, title, description, date and author on the right, above a grid of cards](/assets/docs-listings-grid-featured.webp)

`featured: 1` shows one post as a large hero: image on one side, title, summary, date and authors on the other (stacked on phones). By default that's the newest post. To pick a different one, add `featured: true` to that post's frontmatter. A post without an image gets a full-width text block instead. The hero isn't repeated in the grid below. `eyebrow: category` puts each post's `category` field in the eyebrow, the small line above the title. `featured` works in the `list` and `grid` views.

`group` adds a heading before each group of items, and each heading appears once:

- `group: year`, `group: month` or `group: day` group by date, newest first, with undated items last under "Undated".
- `group: folder` groups by subfolder, which is handy if your notes are filed in `notes/books/`, `notes/films/` and so on.
- Any other name groups by that field: `group: status` gives "In progress", "Shipped" and so on, in alphabetical order, with items that don't have the field last under "Other".

````markdown
```list
from: projects
view: grid
group: status
```
````

## 7. Choosing what each card shows, and filtering

Every card has the same parts: an image, a small line above the title (the "eyebrow"), the title, a summary, and a meta line with the date, authors and anything else you add. `fields` says which frontmatter field fills each part, and you only name the parts you want to change:

````markdown
```blog
fields:
  summary: subtitle
  eyebrow: date
  meta: [category]
```
````

- `none` hides a part: `date: none`. (The title can't be hidden.)
- `eyebrow` and `meta` take up to two fields each. Moving the date to the eyebrow takes it out of the meta line.
- Naming a field replaces the fallbacks. `date: published` reads only `published`.
- Wiki links in any field become links, so `guests: ["[[Ada Lovelace]]"]` links to Ada's page. Authors show as small avatars with names linked to their [[author-pages|author pages]]; a name without an author page is plain text.

`where` keeps only the pages that match:

````markdown
```list
from: events
where:
  date: upcoming
sort: date asc
```
````

That's an events page: only events dated today or later, soonest first. Some other things `where` can do:

- `type: episode` keeps pages whose `type` field is `episode`.
- `tags: [design, research]` keeps pages tagged with either tag, including inline `#tags` in the text.
- `date: past` keeps everything before today.
- Several keys must all match. Values are case-sensitive.

`sort` takes any field: `sort: title`, `sort: order`, `sort: date asc` for oldest first, or `sort: -order` for descending. Numbers sort as numbers and dates as dates; pages missing the field go last.

If you need `or`, `not`, comparisons or formulas, that's what [[obsidian-bases|Obsidian Bases]] are for, and they keep working too. Listing pages cover the common case; Bases cover the rest.

If you get a key wrong, you won't get a blank page. The block is replaced with a card that names the problem and suggests the fix, for example `Unknown key "perPage". Use "pageSize".` Handy when an AI assistant writes your pages: the message tells it what to fix.

## 8. Styling and themes

All the official themes have been updated for the new views. If you pin a theme version in `config.json` (for example `"theme": "leaf@v0.1.8"`), move to `v0.1.9` or later.

To adjust the look yourself, most of it is a few CSS settings you can paste into your site's `custom.css` (see [Custom styles](/docs/reference/custom-styles)):

```css
:root {
  --list-card-radius: 0;          /* square corners on images */
  --list-thumb-width: 120px;      /* smaller list thumbnails */
  --list-thumb-order: 2;          /* thumbnails on the right */
  --list-card-min: 14rem;         /* narrower grid cards, more columns */
  --list-avatar-shape: 50%;       /* round team portraits */
}
```

You can also move the thumbnails to the right for a single list with `media: thumb right`, or turn images off with `media: none`. Values in the meta line show without labels; to add one, target the field:

```css
.list-component-item-meta-value[data-field="episode"]::before {
  content: "Episode ";
}
```

The full list of properties and classes is in the [reference](/docs/reference/listings#styling) and the [[theme-class-reference|theme class reference]].

## 9. Coming from `<List />`

The `<List />` component keeps working, so nothing on your site breaks. When you want to switch, this `blog/index.mdx`:

```mdx
<List dir="/blog" pageSize={5} slots={{ eyebrow: "date" }} />
```

becomes a `blog/README.md` (replace the `index.mdx`, don't keep both):

````markdown
```blog
pageSize: 5
fields:
  eyebrow: date
```
````

`slots` becomes `fields` (with some renames), and the reference has [the full table](/docs/reference/listings#coming-from-the-list-component). One difference to check: a relative `image:` path in a post is now found relative to the post's own file, not the site root.

If your `custom.css` restyles `.list-component` for the old component, scope those rules to `.list-component:not([data-view])` so they don't apply to the new lists.

## If you already have a site

Three things changed that could affect an existing site:

- A `blog/` or `posts/` README, index page or folder note with only prose now gets a list under it. Add `list: false` to its frontmatter (the settings between the `---` lines at the top) to keep it as it was.
- A code block marked `list` or `blog` now renders as a list. To show one as code, as this post does, put four backticks around it instead of three.
- `draft: true` now hides a page from lists, the RSS feed and the sitemap. If you imported posts from Hugo, Jekyll or Astro, check none are still marked as drafts. Drafts still appear in search, tag pages, the sidebar and the old `<List />` component; use `publish: false` to hide a page everywhere.

## Try it

This blog is a listing page: [flowershow.app/blog](/blog) is a `README.mdx` with `layout: list` and `pageSize: 15` in its frontmatter. It's `.mdx` only because of the newsletter signup form under the intro; the list itself needs nothing more. If you have a `blog/` folder, publish and look at `/blog`. Then try a `blog` block on your home page.

Everything here, and every option and default, is in the [[listings|Listing pages]] reference. If something doesn't look right, or you need a view we don't have, open an issue on [GitHub](https://github.com/flowershow/flowershow/issues).
