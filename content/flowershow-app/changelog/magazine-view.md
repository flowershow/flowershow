---
title: A magazine front page for your blog
date: 2026-10-12
description: "view: magazine turns a blog index into a newspaper-style front page: a big hero, two stories, a More posts column, then the rest. Blog lists also get larger, square thumbnails and tidier meta lines."
authors:
  - rufuspollock
image: "[[assets/changelog-magazine-view.webp]]"
showToc: false
---

Your blog index can now open like a newspaper front page. Add `view: magazine` to a `layout: list` page or a ```` ```blog ```` block:

```markdown
---
title: Blog
layout: list
list:
  view: magazine
---
```

- **A front page on page 1**: a big hero in the middle (your `featured: true` post, or the latest), two stories with large images on the left, and a "More posts" column with small thumbnails on the right, divided by thin rules. The rest follow under "Recent posts", with pages.
- **Looks right with any number of posts**: one, two, three or five posts each get a layout of their own, and posts without images still fit.
- **Phones and tablets**: the hero goes on top, then the columns; on a phone everything is one column.
- **Serif titles** from your site's body font. Rename or hide the two headings with `headings: { more: Latest, recent: none }`.

Every list looks better too, with nothing to change:

- Larger 3:2 thumbnails (180px wide) with square corners, in lists, grids and post covers.
- When most posts have an image, the others get a quiet placeholder tile, so titles stay lined up.
- Dates and authors in small uppercase letters (`--list-meta-transform: none` turns that off); group headings (`group: year`) in your accent colour.
- `--list-title-font` switches every listing title to another font, e.g. a serif, from your `custom.css`.

See [A magazine front page](/docs/reference/listings#a-magazine-front-page-magazine) and [Styling](/docs/reference/listings#styling) in [[listings|Listing pages]].

**Themes:** the official themes support the magazine view from `v0.1.10`: square images, the full three-column front page and properly sized hero titles. Leaf keeps a 2px corner on its bordered grid cards. If you pin a theme version (`theme: leaf@v0.1.9`), move to `v0.1.10` or later. If your `custom.css` sets `--list-card-radius`, it still wins.
