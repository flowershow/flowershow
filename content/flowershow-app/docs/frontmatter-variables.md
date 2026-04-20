---
title: Using Frontmatter Values in MDX Pages
description: Access frontmatter fields directly inside your MDX page content using the frontmatter object.
---

> [!important]
> This feature requires **MDX rendering**. It will not work in Markdown (`md`) mode.
> See [[syntax-mode|Syntax Mode Configuration]] for details on how to enable MDX rendering.

In MDX pages, all frontmatter fields are available as a `frontmatter` object. You can reference any custom field inline in your content using `{frontmatter.fieldname}`.

## Basic usage

```md
---
title: API Reference
version: "3.2.1"
status: stable
---
```

```mdx
> **Version:** {frontmatter.version} · **Status:** {frontmatter.status}
```

Renders as:

> **Version:** 3.2.1 · **Status:** stable

## Common use cases

### Reuse a custom field across the page

Useful when the same value appears in multiple places — change it once in frontmatter and it updates everywhere:

```mdx
---
title: Migration Guide
from_version: "2.x"
to_version: "3.0"
---

This guide covers migrating from {frontmatter.from_version} to {frontmatter.to_version}.

...

After completing these steps you will be running {frontmatter.to_version}.
```

### Render a list from a frontmatter array

```mdx
---
title: Reading List
books:
  - Deep Work
  - The Art of Doing Science and Engineering
  - Thinking, Fast and Slow
---

<ul>
  {frontmatter.books.map(book => <li key={book}>{book}</li>)}
</ul>
```

### Display a formatted date

```mdx
---
title: Release Notes
date: 2024-06-01
---

Released on {new Date(frontmatter.date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}.
```

## Notes

- This works for any custom frontmatter field — strings, numbers, booleans, and arrays.
- Standard fields like `title` and `description` are already rendered by Flowershow automatically; no need to use `{frontmatter.title}` in your content.
- The `frontmatter` variable is injected automatically by Flowershow in MDX mode.
