---
title: Content Catalogs and Listing Pages
description: Create blog index pages and other listing pages for tutorials, recipes, projects and more, with a few lines of plain Markdown.
date: 2025-03-25
modified: 2026-10-11
authors:
  - olayway
image: /assets/Pasted%20image%2020250325124121.png
---

Whether you're managing a blog, tutorials, or any other collection of markdown files, Flowershow's listing pages make it easy to display them in a clean, organized way. It's all fenced blocks and frontmatter: no MDX, no components, and it works the same in `.md` and `.mdx` files.

## Quick Start (2-Minute Setup)

**A blog:** put your posts in a folder named `blog` (or `posts`). That's it. `/blog` lists every post in the folder, newest first, 20 per page.

**Any other folder:** pick a page (new or existing) and add a `list` block that says which folder to list:

````markdown
```list
from: tutorials
```
````

That's it! You now have a beautifully formatted list of all the markdown files within that folder and its subfolders, with each page's title, description, image, date and authors. Read on to learn how to customize it.

> [!tip] Lists for a blog
> A ```` ```blog ```` block is a ```` ```list ```` block with `from: blog` filled in. Use it to show your latest posts anywhere, e.g. `limit: 3` on your home page.

## A Whole Page as a Listing

To turn a folder's `README.md` (or `index.md`) into its listing page, add `layout: list` to its frontmatter. It lists its own folder, under the page title and any intro you write:

```markdown
---
title: Recipes
layout: list
---

Everything I cook more than once.
```

Options go in a `list:` map in the same frontmatter, using the same keys as a block.

## Configuration Options

The most useful options:

````markdown
```list
from: tutorials
view: grid
sort: title
pageSize: 12
fields:
  date: none
  eyebrow: level
```
````

### Views

The `view` key sets the overall look:

- **list** (the default) → one column of rows with a small thumbnail
- **grid** → a grid of cards with cover images
- **compact** → one line per item: date and title (great for archives)
- **people** → portraits with name, role and bio (for team pages)

Add `featured: 1` to a `list` or `grid` to show one item as a large hero above the rest: the first page with `featured: true` in its frontmatter, otherwise the latest.

### Fields

Each card has the same parts: an image, an eyebrow above the title, the title, a summary, and a meta line (date · authors · extra values). By default they come from the `image`, `title`, `description`, `date` and `authors` frontmatter fields. The `fields` key changes only the parts you name:

- `none` hides a part, e.g. `date: none` for projects or recipes
- `eyebrow: category` shows a field above the title
- `meta: [status]` adds a field to the meta line

### Filtering, sorting and grouping

- `where` keeps only matching items, e.g. `where: { tags: [vegetarian] }`
- `sort` orders items, e.g. `sort: title` or `sort: date asc` (default: newest first)
- `group` adds headings, e.g. `group: year` or `group: category`

### Pagination

`pageSize` sets how many items show per page (default 20 on `layout: list` and zero-config pages). `limit` shows only the first few and never paginates, which is handy for teasers.

## Example Usage

````markdown
---
title: Welcome to My Blog
description: Welcome to my collection of thoughts and ideas
---

Here are my latest posts:

```blog
limit: 5
fields:
  eyebrow: date
```

[All posts →](/blog)
````

## Important Notes

- `from` is relative to your site's root (a leading `/` is optional), or to the page's own folder with `./`
- The folder's own `README.md` or `index.md` isn't listed, but a subfolder's `README.md`/`index.md` is (titled after the subfolder)
- Pages with `draft: true` or `publish: false` are left out
- Items are sorted by date (newest first) by default; undated items go last, by title
- Listing is recursive: it includes pages in subfolders
- On a `blog/` folder whose `README.md` already links to posts by hand, add `list: false` to its frontmatter to turn off the automatic list

For every option, see [[listings|Listing pages]]. The older [[list-component|`<List />` component]] still works in MDX pages, but listing blocks are the recommended way.
