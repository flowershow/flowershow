---
title: Post pages
description: "Every post in your blog gets a reading column, a header with the author and date, the cover image, and links to the previous, next and related posts. Nothing to configure."
---

Put a post in your `blog/` folder and it looks like a post: a centred reading column, a big title, your description underneath, the author with their photo, the date, your cover image, and at the end the post's tags, links to the previous and next posts, and three more posts to read.

![[assets/changelog-post-pages.webp]]

It works the same for `.md` and `.mdx` posts, and there is nothing to set up.

## Which pages are posts

A page gets the post layout when it has no `layout` of its own and it lives in:

- a folder named `blog` or `posts`, at any depth (`/blog`, `/notes/posts`), including subfolders such as `blog/2026/`. See [[listings#A blog with nothing to write|A blog with nothing to write]];
- or a folder whose `README.md`/`index.md` (or folder note) has `layout: list`, sorted by date (the default). A catalogue sorted by title or `order`, or a team page (`view: people`), is not a feed of posts, so its pages keep the normal layout.

The listing page itself (`blog/README.md`, or the generated `/blog`) is never a post. A page anywhere else can ask for the post layout with `layout: post`; it gets the header and tags, without previous/next or "Read more".

> [!note] Dated pages elsewhere stay as they are
> A `date` on its own does not make a page a post, so your docs or notes pages keep their normal layout.

## What's on a post page

From top to bottom, each from the post's frontmatter:

| What | From | Notes |
| --- | --- | --- |
| Section label | the folder | The breadcrumb trail above the title, e.g. **BLOG**, linking back to the index. Turn breadcrumbs off with `showBreadcrumbs: false`. |
| Title | `title` | Or the first `# heading`, or the file name. |
| Subtitle | `description` | Only the description you write; the automatic first sentence used for search results isn't shown. |
| Byline | `authors`, `date` | Author names with their photos (see [[page-authors\|Page authors]]), then the date in your site's `locale`, and the reading time if it's on ([[page-headers#Reading time\|Reading time]]). |
| Cover image | `image` | Shown under the byline, inside the reading column. |
| Tags | `tags` | As pills at the end of the post. |
| Previous / next | the folder | The posts before and after this one in the blog's order (for the default newest-first order, "Previous" is the older post). |
| Read more | the folder | Three posts from the same blog as cards: posts sharing a tag with this one first, then the most recent. |

```markdown
---
title: Growing tomatoes on a balcony
description: What worked, what didn't, and what I'd do differently next year.
date: 2026-09-18
authors:
  - ada
image: "[[tomatoes.jpg]]"
imageAlt: Three tomato plants in pots on a sunny balcony
imageCaption: The balcony in August.
tags:
  - garden
---

The post itself...
```

## The cover image

The `image` you set (it is also your page's social preview card) is shown as a cover under the byline. It keeps its own shape, between 4:3 and very wide (21:9); a taller image is cropped to 4:3. Add `imageAlt` for screen readers and `imageCaption` for a caption under it.

The cover is left out when:

- the post already shows the same image in its text, so it never appears twice;
- the post uses a full-width [[hero-sections|hero section]] (`showHero: true`), which already shows it;
- you set `showImage: false`, for example when `image` is a logo or a card made for social media. The image stays your social preview card.

Only image files are used: a link to a web page in `image` (for example a screenshot service URL) isn't shown as a cover.

## Previous, next and read more

Both follow the blog's own listing: the same folder, the same order and the same `where` filter as its index page (the `list:` settings of a `layout: list` page). Drafts (`draft: true`) are never linked. A post that is filtered out of the index still gets "Read more" cards, but no previous or next.

If your blog's README lists posts its own way (a ```` ```blog ```` block or `<List />` with a different `sort`), previous and next use the default newest-first order.

## Turning it off

- **One page:** give it any other `layout`, such as `layout: default`.
- **A whole folder:** add `postLayout: false` to the folder's `README.md`/`index.md` (or folder note). Its pages keep the normal layout, and the folder's listing is unchanged.
- **A blog folder entirely:** `list: false` on its README turns off the automatic listing and the post layout.

## Styling

The header keeps the usual page header classes (`.page-header-title`, `.page-header-description`, `.page-header-metadata-container`, `.page-header-author-avatar`, `.page-header-date`, `.tag-pill`), so themes that style page headers style posts too. The post adds its own hooks, all listed in the [[theme-class-reference#Post pages|theme class reference]]: `.post-page` on the `<article>`, `.post-header`, `.post-eyebrow`, `.post-dek`, `.post-byline`, `.post-hero`, `.post-footer`, `.post-nav` and `.post-read-more` (whose cards are the [[listings#Views|listing grid cards]]).

The default styles are easy to override, and these CSS variables change the most common things:

| Variable | Default | What it changes |
| --- | --- | --- |
| `--post-max-width` | `44rem` (same as `--list-max-width`) | The reading column |
| `--post-wide-max-width` | `64rem` | The width of "Read more" |
| `--post-body-size` | `1.125rem` | Body text size |
| `--post-hero-ratio` | the image's own shape | Cover image shape, e.g. `16 / 9` |
| `--post-hero-radius` | `0.5rem` | Cover image corners |
| `--post-avatar-size` | `40px` | Byline photos |
| `--post-meta-color` | muted text | Date, reading time, caption, "Previous"/"Next" |
| `--post-eyebrow-color` | your accent colour | The section label |
| `--post-rule-color` | a light hairline | The line above "Read more", previous/next borders |

```css
:root {
  --post-max-width: 40rem;
  --post-hero-ratio: 16 / 9;
}
```

The cover image is downloaded at the reading column's width; if you make `--post-max-width` much wider, covers may look slightly soft.
