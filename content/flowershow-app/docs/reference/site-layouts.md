---
title: Site layouts
description: 'Choose what sits beside your text. Keep the site contents beside the page for docs, or set "layout": "reading" for a centred column with the page contents on the left, for essays, papers and courses.'
---

> [!tip] Using an AI assistant?
> Give it this page as Markdown: https://flowershow.app/docs/reference/site-layouts.md. For all of Flowershow, point it at https://flowershow.app/llms.txt, or install the Flowershow skill: tell your agent "Install the Flowershow skill from https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md" (or see [[skills|Skills]]).

A layout decides what sits beside your text: the **site contents** (the tree of your pages, also called the sidebar) and the **page contents** (the headings of the page you are on). Your theme decides how it all looks. Flowershow has two layouts, `docs` and `reading`. You pick one for the whole site in `config.json` and can change it on any page in its frontmatter.

Start from the result you want. Each recipe below has the exact lines to copy. The rules behind them come after.

## Recipes

| You want | In `config.json` | In page frontmatter |
| --- | --- | --- |
| [Docs or a knowledge base](#docs-or-a-knowledge-base) | nothing (the default) | nothing |
| [Essays, papers or a course](#essays-papers-or-a-course) | `"layout": "reading"` | nothing |
| [A front page with site contents, reading pages behind it](#a-front-page-with-site-contents-reading-pages-behind-it) | `"layout": "reading"` | `layout: docs` on the home or section page |
| A blog or magazine | Coming later | |

### Docs or a knowledge base

For documentation, wikis and notes, where readers move between many pages and want to see where they are. This is the `docs` layout and the default: site contents on the left, text in the middle, page contents on the right.

There is nothing to add. If your site has `"layout": "reading"` and you want this back, remove that line or set `"layout": "docs"`.

### Essays, papers or a course

For long pages read one at a time: an essay, an article, a paper, the chapters of a course. This is the `reading` layout.

In `config.json`:

```json
{
  "layout": "reading"
}
```

On screens 1024px and wider, readers now see:

- The text centred in a reading column, the same width as a blog post (44rem, unless your theme or `custom.css` sets `--post-max-width`; see [[post-pages#styling|Post pages]]).
- A menu button at the top left of the page. It opens the site contents in a drawer.
- The page contents as a rail of ticks at the far left, one tick per heading. Hover over the rail, or tab to it, to open the outline. The rail appears on pages with three or more headings, as it does on the right in `docs`.
- Previous and next links at the bottom of each page, in the order of the site contents. Posts, listing pages and changelog pages keep their own navigation.

Phones look the same as before: the Contents block under the title, and the site contents in a drawer opened from the bar at the top.

### A front page with site contents, reading pages behind it

For a site whose home page or section page is a map of what is inside, while the pages behind it are for reading. Readers get the whole site tree on the front page and a clear reading column everywhere else. LessWrong works this way.

Set the site to `reading`, then set the front page to `docs`.

In `config.json`:

```json
{
  "layout": "reading"
}
```

In the front page's frontmatter (`README.md` at the root of your site, or `course/README.md` for a section):

```md
---
layout: docs
---
```

If the front page already has a `layout`, such as `layout: list` for a blog index or `layout: changelog`, keep it and add `showSidebar: true` instead:

```md
---
layout: list
showSidebar: true
---
```

With `showSidebar: true` the page contents show as a rail on the right; add `toc: { style: panel }` for the panel.

### A blog or magazine

A layout for blogs and magazines is coming later. Posts already get a reading column of their own, with previous and next links; see [[post-pages|Post pages]].

## The two layouts side by side

| | `docs` | `reading` |
| --- | --- | --- |
| For | Docs, knowledge bases | Essays, papers, courses |
| Site contents | Permanent, on the left | Behind a menu button at the top left |
| Page contents | On the right, as a panel or a rail (`toc.style`) | A rail at the far left |
| Text | Between the two columns | Centred, at the post column width |
| Previous and next links | Posts only | Every page without its own navigation |

## Setting the layout

**For the site:** `"layout": "docs"` or `"layout": "reading"` in `config.json`. The layout is not in the dashboard yet, so set it in `config.json`. Any other value means `docs`.

**For a page:** `layout: docs` or `layout: reading` in its frontmatter. The page's value wins over the site's. Other `layout` values on a page, such as `layout: list`, leave the site's layout in place.

```md
---
layout: reading
---
```

`layout: docs` and `layout: reading` do not change what a page is. A dated post in `blog/` stays a post, a folder `README.md` keeps its automatic listing, and a changelog folder stays a changelog. Other `layout` values do opt a page out of those; see [[post-pages#turning-it-off|Post pages]] and [[listings|Listing pages]].

## The two rules

1. **A left rail never sits beside the site contents.** If a page brings the site contents back under `reading`, its page contents move to the right, as in `docs`.
2. **A layout only moves things.** It never turns on something you have switched off. With `showSidebar: false` there is no drawer, no menu button and no previous and next links; with `showToc: false` there is no rail. `sidebar.paths` still decides which pages have site contents at all.

## Page keys that win over the layout

Under `reading`, these frontmatter keys bring an element back on one page:

| On the page | What happens under `reading` |
| --- | --- |
| `showSidebar: true` | Permanent site contents on the left. The page contents move to the right (rule 1). |
| `toc:` with `style: panel` | The classic contents panel on the right, instead of the left rail. |
| `showKnowledgeGraph: true` | The knowledge graph on the right. The page contents rail sits under it. |

The site-wide `toc.style` and `showKnowledgeGraph` settings do not apply under `reading`; only a page can bring those back. So `"layout": "reading"` is enough on its own, whatever else `config.json` says about the table of contents.

## Pages with their own template

| Page | Under `reading` |
| --- | --- |
| `layout: plain` and canvas pages | Unchanged. |
| Listing and changelog pages with a page of their own (`README.md`, `index.md` or a folder note) | No permanent site contents. To keep them, add `showSidebar: true` to that page. |
| Listings with no page of their own | Unchanged. |
| Posts | Keep the post header and footer. The page contents rail moves to the left and the site contents go into the drawer. |
| Hero sections | Unchanged. They sit above the columns. |

## The dashboard's Show Sidebar setting

**Settings → Content → Show Sidebar** still decides whether readers get the site contents at all. Off removes them on every page that doesn't set `showSidebar: true`, under both layouts. On means permanent under `docs` and in the drawer under `reading`. See [[sidebar|Sidebar configuration]].

## Troubleshooting

- **Nothing changed after setting `"layout": "reading"`.** Check the spelling: any other value means `docs`. The reading layout also only differs from 1024px wide; on a phone or a narrow window both layouts look the same.
- **No menu button and no previous and next links.** The site contents are off for that page: `showSidebar` is `false` on the page or the site, or the page is outside `sidebar.paths`. Turn them on and the button and links come back.
- **The page contents are on the right, or missing.** The page has `showSidebar: true`, `showKnowledgeGraph: true` or `toc: { style: panel }`, which move them right (rule 1). A page with fewer than three headings has no rail at all, under either layout.

## Using config.json

```json
{
  "layout": "reading"
}
```

- `layout`: `"docs"` (default) or `"reading"`. Pages override it with `layout: docs` or `layout: reading` in frontmatter.

See also [[table-of-contents|Table of contents]], [[sidebar|Sidebar configuration]] and [[config-file|config.json]].
