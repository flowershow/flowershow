---
title: Blog setup
description: Add a blog section to your Flowershow site with post listings, authors, and navigation.
---

## Create a blog directory

Create a `/blog` folder in your site root. Add markdown files for each post:

```
blog/
├── README.md          # Blog landing page
├── hello-world.md
└── second-post.md
```

## Add frontmatter to posts

Each post should have frontmatter with at least a title and date:

```yaml
---
title: Hello World
description: My first post on Flowershow.
date: 2025-06-20
image: "[[hero.png]]"
authors:
  - jane-smith
---
```

## Create the landing page

Create `blog/README.md` with the List component to display all posts:

```markdown
---
title: Blog
description: Latest posts
showToc: false
syntaxMode: mdx
---

<List
  dir="/blog"
  slots={{
    headline: "title",
    summary: "description",
    eyebrow: "date",
    media: "image"
  }}
/>
```

> [!important]
> The `List` component requires `syntaxMode: mdx` in the frontmatter.

See [[list-component|List component]] for all available slots and options.

## Add blog to navigation

In your `config.json`:

```json
{
  "nav": {
    "links": [
      { "href": "/blog", "name": "Blog" }
    ]
  }
}
```

## Control what gets published

Exclude drafts site-wide in `config.json`:

```json
{
  "contentExclude": ["/blog/drafts"]
}
```

Or per-page with frontmatter:

```yaml
---
publish: false
---
```

See [[content-filtering|Content filtering]] for more options.

## Set up authors

Create author profile pages (e.g. `team/jane-smith.md`) and reference them in post frontmatter. See [[page-authors|Page authors]] for details.

> [!info]
> For a full video walkthrough covering themes, forms, and more, see the [[blog/how-to-publish-blog|blog setup tutorial]].
