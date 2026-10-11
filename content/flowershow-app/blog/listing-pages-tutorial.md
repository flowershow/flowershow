---
title: "How to create great listing pages: a blog index, a project portfolio and a team page"
description: "Turn a folder of Markdown pages into a blog index, a grid of projects or a team page on Flowershow, with no code: a folder name or one line of frontmatter."
date: 2026-10-11
authors:
  - rufuspollock
image: "[[assets/blog-listing-pages-tutorial.webp]]"
---

> [!tip] Using an AI assistant?
> Give it this page as Markdown: https://flowershow.app/blog/listing-pages-tutorial.md. Or install the Flowershow skill so it knows how to build listing pages for you: tell your agent "Install the Flowershow skill from https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md" (more options in [[skills|Skills]]). The whole site is indexed at https://flowershow.app/llms.txt.

You have a folder of pages (posts, projects, people) and you want a page that lists them: a blog index at `/blog`, a portfolio at `/projects`, a team page at `/team`. On Flowershow the folder does most of the work. A `blog/` folder lists itself, and any other folder's `README.md` becomes its index with one line of frontmatter.

(If you only want a few items *inside* another page, like your three latest posts on the home page, see [[show-a-list-of-pages-anywhere|Show a list of pages anywhere]]: it's one block.)

## What you'll build

Three index pages, each made from a folder of ordinary Markdown pages:

1. **A blog index** at `/blog`: every post, newest first, 20 per page, with "Newer" and "Older" links. The blog you're reading is one: [flowershow.app/blog](/blog).
   ![A blog index: the title, then posts with a thumbnail on the left and their description, date and authors](/assets/docs-listings-zero-config-blog.webp)
2. **A project portfolio** at `/projects`: a grid of cards with cover images.
   ![A grid of cards, each with a cover image, or a letter tile when there is none, above the title and description](/assets/docs-listings-grid-blog.webp)
3. **A team page** at `/team`: portraits with names, roles and short bios. Here is a live one, listing the `people/` folder of this site:

```list
from: people
view: people
sort: order
```

You'll learn that a folder of pages is all a listing needs, how `layout: list` turns a folder's `README.md` into its index, and how `view` changes the look.

**You'll need:** a Flowershow site you can add files to and publish. **Time:** about 15 minutes.

## Step 1: Put your posts in a `blog/` folder

Create a folder called `blog` at the top of your site and put your posts in it, one Markdown file each:

```text
blog/
  notes-from-the-garden.md
  first-frost.md
```

Give each post a `title`, a `date` and, if you like, a `description` and an `image`:

```markdown
---
title: Notes from the garden
description: What worked this year, and what the slugs ate.
date: 2026-10-11
image: "[[garden.jpg]]"
---

The tomatoes did better than expected...
```

Publish, then open `/blog` on your site. You should see an index of your posts, newest first, titled "Blog", even though you haven't written an index page. A folder named `blog` or `posts` (at any depth) always lists itself.

## Step 2: Add an intro above the posts

Create `blog/README.md` with a title and a sentence or two, and nothing else:

```markdown
---
title: Blog
---

Notes on compilers and gardening, roughly weekly.
```

Publish and reload `/blog`. You should see your intro, then the same list of posts under it.

## Step 3: Make a project portfolio with `layout: list`

Folders with other names don't list themselves; you tell them to. Create a `projects/` folder with one page per project:

```markdown
---
title: Seed library
description: A lending library for heritage vegetable seeds.
image: "[[seed-library.jpg]]"
---
```

A project can also be a folder of its own (`projects/seed-library/README.md`, with its images beside it); it's listed as one item.

Then create `projects/README.md`:

```markdown
---
title: Projects
layout: list
list:
  view: grid
  sort: title
  fields:
    date: none
---

Things I'm building, or have built.
```

`layout: list` makes this page the index of its own folder. The settings under `list:` choose cards (`view: grid`), alphabetical order (`sort: title`) and no dates (`date: none`). Publish and open `/projects`. You should see a grid of cards: three across on a wide screen, one on a phone. If some projects have an image and others don't, the others get a tile with their first letter, so the rows stay lined up.

## Step 4: Make a team page with `view: people`

Create a `team/` folder with one page per person (`team/ada.md`, `team/grace.md`). Each page has the person's photo, role and a short bio:

```markdown
---
title: Ada Lovelace
avatar: "[[ada.jpg]]"
role: Analyst
bio: Wrote the first published program, for a machine that was never built.
---
```

Then create `team/README.md`:

```markdown
---
title: Team
layout: list
list:
  view: people
---
```

Publish and open `/team`. You should see square portraits with each person's name, role and bio, sorted by name. Someone without a photo gets their initials. To choose the order yourself, give each person an `order: 1`, `order: 2` and so on, and add `sort: order` under `list:` (that's what the live team list above does).

That's the whole pattern: a folder of pages, plus a `README.md` with `layout: list` and, if you want, a `view`.

## Troubleshooting

- **My `blog/README.md` already links to every post, and now there's a second list under it.** Add `list: false` to its frontmatter.
- **The page shows "Nothing here yet."** The folder has nothing to list. Pages with `draft: true` or `publish: false` are left out, and so is the folder's own `README.md`.
- **A "List block has problems" card, or a message like `"limit" shows only the first 5 items and hides the rest`.** A key is wrong; the message says what to use. On a `layout: list` page, use `pageSize` (items per page), not `limit`.
- **My team page is one `team.md` with a table, and it can't be listed.** A listing shows one page per item: give each person their own page.
- **The posts are in the wrong order.** Lists sort by each page's `date` (or, if it has none, `pubDate`, `published`, `publishDate`, `created`, or a `YYYY-MM-DD` at the start of the file name). Undated pages go last.

## Next steps

Each of these is one or two lines under `list:`; the [[listings|Listing pages]] reference has every key and default.

- **An archive**, one line per post under a heading per year: `view: compact` on an `archive.md` with `from: blog`.
- **A featured post** as a large hero above the rest: `featured: 1`.
- **Headings per group**: `group: year`, or `group: status` for projects.
- **What each card shows**: `fields`, e.g. `eyebrow: category` or `meta: [status]`.
- **Styling**: CSS custom properties such as `--list-card-radius` in your `custom.css`; see [Styling](/docs/reference/listings#styling).
- **A few items inside another page**: [[show-a-list-of-pages-anywhere|Show a list of pages anywhere]].

## If you already have a Flowershow site

Three changes that came with listing pages could affect an existing site:

- A `blog/` or `posts/` `README.md`, `index.md` or folder note with only prose now gets a list under it. Add `list: false` to keep it as it was.
- A code block marked `list` or `blog` now renders as a list. To show one as code, put four backticks around it instead of three.
- `draft: true` now hides a page from lists, the RSS feed and the sitemap. If you imported posts from Hugo, Jekyll or Astro, check none are still marked as drafts.

The `<List />` component keeps working; to switch, see [Coming from the List component](/docs/reference/listings#coming-from-the-list-component). If your site pins a theme version in `config.json`, move to `v0.1.9` or later for the new views.
