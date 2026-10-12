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

**Polish**

- Listing pages keep the title, description and intro together above the rule, with a small RSS button when your site has a feed (`"enableRss": true`).
- Posts without an image get a soft tile in your accent colour instead of a grey letter; magazine stories without one are clean text-only cards.
- Covers get a hairline edge, and in dark mode they are dimmed slightly so white screenshots don't glare.
- Titles and summaries are plain text: no stray ```` ``` ```` or code ticks, and code text is kept, so sentences stay whole. Text like `Array<string>` and `<https://…>` links are kept too.
- Author names in "More posts" wrap onto a second line instead of being cut short.
- A magazine page's title uses the same serif as its stories, and "Recent posts" lines up with the front page above it.
- Listing pages no longer show the site-wide comments box or leave a blank gap above the footer.
- **For themes and `custom.css`:** on listing pages your intro is now wrapped in `.listing-page-intro` and the list in `.listing-page-listing` (which draws the rule), and the title sits in `.page-header-title-row` with `.page-header-actions` when there is a feed link. `--list-rest-max-width` no longer defaults to `48rem`: the magazine's lower rows follow the front page grid, and the variable only caps them when you set it.

See [A magazine front page](/docs/reference/listings#a-magazine-front-page-magazine) and [Styling](/docs/reference/listings#styling) in [[listings|Listing pages]].

**Themes:** Leaf, Lessflowery and Letterpress set their own corner radius, so their images stay rounded. Lessflowery and Letterpress also give every listing title the same size, so the magazine hero is no bigger than the other titles there. On Lessflowery, Letterpress and Superstack a magazine page is narrower than the default theme's for now, so it shows the tablet layout. These will change when the themes are updated. If your `custom.css` sets `--list-card-radius`, it still wins.
