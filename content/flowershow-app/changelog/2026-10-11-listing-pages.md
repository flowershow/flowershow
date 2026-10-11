---
title: Blog indexes and lists of pages in plain Markdown
date: 2026-10-11
description: "A blog/ folder now lists itself, and a ```blog block or layout: list shows any folder as a blog index, a grid, a compact archive or a team page. Works in .md."
authors:
  - rufuspollock
image: "[[assets/changelog-listing-pages.webp]]"
showToc: false
---

You can now list the pages of any folder without MDX or components. Add `layout: list` to a folder's `README.md`, or put a ```` ```blog ```` block on any page:

- **A `blog/` or `posts/` folder lists itself**, at any depth: with no README, `/blog` is a paginated index; a README or Obsidian folder note with only prose gets the list underneath.
- **Zero config**: newest first, with images, dates, descriptions and author names, 20 per page.
- **Latest posts anywhere**: ```` ```blog ```` with `limit: 3` on your home page.
- **List and grid views**: thumbnails on the left (or `media: thumb right`), covers in the grid, and a letter tile for grid cards without an image (or your own `defaultImage`). `sort`, `where` and `fields` choose what each card shows.
- **Compact archives**: `view: compact` gives one line per post (date, then title), grouped by year on a `layout: list` page.
- **Team pages**: `view: people` shows a folder of people as portraits with name, role and bio; people without a photo get their initials.
- **A featured post**: `featured: 1` puts the post marked `featured: true` (or the latest) in a large hero above the rest; with `view: grid` that's a magazine-style home page.
- **Grouping**: `group: year`, `month`, `folder` or any field (`group: team`) adds a heading before each group.
- **Dates in your language** with the new `locale` setting.
- **Clear errors**: a wrong key shows a card that names it and suggests the fix.

**Themes:** the official themes were updated for the new layouts. If you pin a theme version (`theme: leaf@v0.1.8`), move to `v0.1.9` or later; if your `custom.css` restyles `.list-component`, scope those rules to `.list-component:not([data-view])` to keep them on the old `<List />` only.

See [[listings|Listing pages]]. The `<List />` component keeps working; the docs show how to switch.

**⚠️ Check your site**

- A `blog/` or `posts/` README, index page or folder note with only prose now gets a generated list under it, in a reading-width column. Add `list: false` to its frontmatter to keep it as before. See [A blog with nothing to write](/docs/reference/listings#a-blog-with-nothing-to-write).
- ```` ```list ```` and ```` ```blog ```` code blocks now render as lists. To show one as code, wrap it in four backticks.
- `draft: true` in frontmatter now hides a page from listings, the RSS feed and the sitemap, and asks search engines not to index it. Worth checking if you imported posts from Hugo, Jekyll or Astro that still carry it. See [Which pages are listed](/docs/reference/listings#which-pages-are-listed).
- Author names link only to a page whose name matches exactly, preferring `people/` and `authors/` folders. See [Author pages](/docs/guides/author-pages).

**Fixes**

- `<List />` no longer lists pages marked `publish: false`.
- `<List />` pagination shows one `...` per gap instead of one per hidden page.
- The RSS feed no longer fails when a post has an unusual `title`, `author` or `description` (a number, or a wiki link).
