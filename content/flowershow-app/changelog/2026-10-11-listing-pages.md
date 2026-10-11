---
title: Blog indexes and lists of pages in plain Markdown
date: 2026-10-11
description: "A blog/ folder now lists itself, and a ```blog block or layout: list shows any folder as a blog index or a grid. Works in .md."
authors:
  - rufuspollock
image: "[[assets/changelog-listing-pages.webp]]"
showToc: false
---

You can now list the pages of any folder without MDX or components. Add `layout: list` to a folder's `README.md`, or put a ```` ```blog ```` block on any page:

- **A `blog/` or `posts/` folder lists itself**, at any depth: with no README, `/blog` is a paginated index; a README or Obsidian folder note with only prose gets the list underneath. If your `blog/README.md` already links to posts by hand, add `list: false` to its frontmatter to keep it as it was.
- **Zero config**: newest first, with images, dates, descriptions and author names, 20 per page.
- **Latest posts anywhere**: ```` ```blog ```` with `limit: 3` on your home page.
- **List and grid views**: thumbnails on the left (or `media: thumb right`), covers in the grid, and a letter tile for grid cards without an image (or your own `defaultImage`). `sort`, `where` and `fields` choose what each card shows.
- **Dates in your language** with the new `locale` setting.
- **Drafts**: `draft: true` keeps a page reachable but out of lists, the RSS feed and the sitemap.
- **Clear errors**: a wrong key shows a card that names it and suggests the fix.

**Themes:** the official themes were updated for the new layouts. If you pin a theme version (`theme: leaf@v0.1.8`), move to the latest; if your `custom.css` restyles `.list-component`, scope those rules to `.list-component:not([data-view])` to keep them on the old `<List />` only.

See [[listings|Listing pages]]. The `<List />` component keeps working; the docs show how to switch.

**Fixes**

- `<List />` no longer lists pages marked `publish: false`.
- `<List />` pagination shows one `...` per gap instead of one per hidden page.
- Author links no longer match a page whose name merely ends with the author handle (`jane` no longer links to `mary-jane`).
- The RSS feed no longer fails when a post has an unusual `title`, `author` or `description` (a number, or a wiki link).
