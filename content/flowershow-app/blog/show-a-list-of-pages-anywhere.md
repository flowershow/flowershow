---
title: "Show a list of pages anywhere: your latest posts on your home page in one block"
description: "Put your three newest blog posts on your home page, or a list of projects on your about page, with one Markdown block. And when to use Obsidian Bases instead."
date: 2026-10-11
authors:
  - rufuspollock
image: "[[assets/docs-listings-latest-three.webp]]"
---

> [!tip] Using an AI assistant?
> Give it this page as Markdown: https://flowershow.app/blog/show-a-list-of-pages-anywhere.md. Or install the Flowershow skill so it knows how to write list blocks for you: tell your agent "Install the Flowershow skill from https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md" (more options in [[skills|Skills]]). The whole site is indexed at https://flowershow.app/llms.txt.

You want a short list of pages inside a page you already have: your three latest posts on the home page, your projects on your about page, related posts at the end of a post. On Flowershow that's one small block of Markdown, and it works on **any page**: the home page, an about page, a docs page, a blog post.

(If you want a whole page that *is* the index, like `/blog` or a team page, see [[listing-pages-tutorial|How to create great listing pages]].)

## What you'll build

Here is the block you'll write:

````markdown
```blog
limit: 3
```
````

And here it is, running on this page. These are the three newest posts on this blog (a list never includes the page it's on, so this post isn't in it):

```blog
limit: 3
```

You'll learn how to put a list like this on any page, how to point it at a folder other than `blog/`, and when to reach for Obsidian Bases instead.

**You'll need:** a Flowershow site with a few posts in a `blog/` folder, each with a `title` and a `date` in its frontmatter. **Time:** about 5 minutes.

## Step 1: Open the page where the list should go

Open the Markdown file for that page in your editor (Obsidian, VS Code, GitHub, anything). Your home page is the `README.md` (or `index.md`) at the top of your site. It can be a `.md` or an `.mdx` file.

## Step 2: Add a `blog` block with `limit: 3`

Where you want the posts to appear, add this to the file. A heading above it and a link to the rest below it are optional but help readers:

````markdown
## Latest posts

```blog
limit: 3
```

[All posts →](/blog)
````

A ```` ```blog ```` block lists the `blog/` folder (and its subfolders), newest first. `limit: 3` shows only the first three and never adds page links.

## Step 3: Publish and look at the page

Publish or sync your site as you normally do, then open the page. You should see your three newest posts, each with its title, description, image (if it has one), date and authors:

![A home page with the three latest posts under a "Latest posts" heading](/assets/docs-listings-latest-three.webp)

In Obsidian the block stays a plain code block, so nothing breaks in your vault.

## Step 4: List a different folder

To list any other folder, use a ```` ```list ```` block and say which folder with `from`. For example, on your about page, your projects as cards:

````markdown
## What I'm working on

```list
from: projects
view: grid
limit: 6
fields:
  date: none
```
````

`from` is the folder's path from the top of your site (`from: notes/books` works too). `view: grid` shows cards, and `date: none` hides dates, which projects rarely need. Publish again: you should see up to six project cards on the page.

That's the fast path: a ```` ```blog ```` block for posts, a ```` ```list ```` block for anything else.

## When you need more: Obsidian Bases

List blocks cover lists from a folder: newest first or sorted by a field, simple filters with `where` (`tags: [design]`, `date: upcoming`), and a few views. If you need more than that, use an [[obsidian-bases|Obsidian Bases]] block instead. Flowershow renders ```` ```base ```` blocks in `.md` pages too.

| Use a list block when you want | Use an Obsidian Bases block when you want |
| --- | --- |
| The latest posts, a grid of projects, a team page | A table with columns, or summaries like sums and averages |
| Dates, authors, images and page links styled for a blog | `or` and `not` filters, comparisons (`>`, `<`), formulas |
| A few lines you can write from memory | The same view you built in Obsidian's Bases editor |

For example, this block lists the posts in `blog/` whose file name contains "bases" **or** "listing" (something a list block's `where` can't do) as a table:

````markdown
```base
filters:
  and:
    - file.inFolder("blog")
    - or:
        - file.name.contains("bases")
        - file.name.contains("listing")
views:
  - type: table
    name: Posts about lists
    order:
      - file.name
      - date
```
````

And here it is, live:

```base
filters:
  and:
    - file.inFolder("blog")
    - or:
        - file.name.contains("bases")
        - file.name.contains("listing")
views:
  - type: table
    name: Posts about lists
    order:
      - file.name
      - date
```

If you built a base in Obsidian, open the `.base` file, copy its contents into a ```` ```base ```` block on your page, and publish. The full list of supported filters, functions and views is in the [[obsidian-bases|Obsidian Bases]] reference.

## Troubleshooting

- **The block shows as code on the live page.** Check the fence: three backticks and the word `blog`, `list` or `base` on the first line, with nothing else after it.
- **You see a "List block has problems" card.** A key or folder name is wrong. The card says what to fix, for example `Unknown key "perPage". Use "pageSize".` or `No folder "posts" with pages. Folders with pages: blog, notes.`
- **"Nothing here yet."** The folder exists but has nothing to list. Pages with `draft: true` or `publish: false` are left out.
- **The posts are in the wrong order.** Lists sort by each page's `date` (or, if it has none, `pubDate`, `published`, `publishDate`, `created`, or a `YYYY-MM-DD` at the start of the file name). Posts without a date go last.
- **"Only one list per page can paginate".** More than one list on the page has a `pageSize`. Keep `pageSize` on one list and use `limit` on the others.

## Next steps

- One line per post instead of cards: add `view: compact`. A big featured post on top: `view: grid` and `featured: 1`. See [[listings|Listing pages]].
- Only some posts: `where: { tags: [garden] }`. Choose what each card shows: `fields`. Both in [[listings|Listing pages]].
- A whole page that lists a folder (`/blog`, a portfolio, a team page): [[listing-pages-tutorial|How to create great listing pages]].
- Setting up a blog from scratch: [[publish-blog|Publishing a blog]].
