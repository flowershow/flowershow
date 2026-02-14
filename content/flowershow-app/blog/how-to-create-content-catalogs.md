---
title: How to Create Content Catalogs and Listing Pages with the List Component
description: Flowershow's new List component makes it super easy to create blog index pages and other kind of listing pages for tutorials, recipes, and more.
date: 2025-03-25
modified: 2025-06-03
authors:
  - olayway
image: /assets/Pasted%20image%2020250325124121.png
---

Whether you're managing a blog, tutorials, or any other collection of markdown files, the `List` component makes it easy to display them in a clean, organized way.

## Quick Start (2-Minute Setup)

1. Create a new markdown file (or pick one you already have)
2. Change it's extension to `.mdx` (or set `syntaxMode: mdx` in the frontmatter)
3. Add this single line:
```jsx
<List dir="/blog"/> // replace `/blog` with path to your folder 
```

That's it! You now have a beautifully formatted list of all the markdown files within the specified directory. By default, it will display their title and descriptions only. Read on to learn how to customize it further.

> [!important]
> Using the `List` component requires MDX rendering, since it uses JSX (like `<List />`).
> Make sure to switch to MDX rendering for this page by changing its extension to `.mdx` (if you're using "auto" syntax mode) or by adding `syntaxMode: mdx` in the frontmatter.
> 📚 Read more about different syntax rendering modes and how to enable them: https://flowershow.app/blog/announcing-syntax-mode-configuration

## Configuration Options

The List component supports several configuration options:

```markdown
<List
  dir="/blog"
  slots={{
    headline: "title",
    summary: "description",
    eyebrow: "date",
    footnote: "authors",
    media: "image"
  }}
  pageSize={5}
/>
```

### Slots

The `slots` prop lets you decide what information should appear in each part of the list item. Each slot can be connected to a field from your page's frontmatter:

- **media** → usually an image (e.g., `image`)
- **eyebrow** → small text shown above the title (e.g., `date`)
- **headline** → the main title (e.g., `title`)
- **summary** → a short description (e.g., `description`)
- **footnote** → small text shown below (e.g., `authors`)

By default, `headline: "title"` and `summary: "description"` are set.

### Pagination

The `pageSize` prop controls how many items are displayed per page. If not provided, all items are shown without pagination.

## Example Usage

```markdown
---
title: Welcome to My Blog
description: Welcome to my collection of thoughts and ideas
---

Here are all my blog posts:

<List
  dir="/blog"
  slots={{
    headline: "title",
    summary: "description",
    eyebrow: "date",
    footnote: "authors"
  }}
  pageSize={5}
/>
```

## Important Notes

- The `dir` prop must be an absolute path (in respect to your site's root directory)
- The component won't list home (aka index) pages (`README.md` or `index.md` files)
- Files are sorted by date (newest first) if dates are provided in frontmatter, otherwise they are sorted by title
- The component is recursive - it will show files in subdirectories

By using the List component effectively, you can create organized, easy-to-navigate content collections that your readers will love. It's a simple yet powerful way to showcase your markdown content in a professional and user-friendly manner.
