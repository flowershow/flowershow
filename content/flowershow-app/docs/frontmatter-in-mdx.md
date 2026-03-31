---
title: Using Frontmatter Values in MDX Pages
description: Access frontmatter fields directly inside your MDX page content using the frontmatter object.
---

> [!important]
> This feature requires **MDX rendering**. It will not work in Markdown (`md`) mode.
> See [[syntax-mode|Syntax Mode Configuration]] for details on how to enable MDX rendering.

In MDX pages, all frontmatter fields are available as a `frontmatter` object. You can reference any field inline using `{frontmatter.fieldname}`.

## Basic usage

Given this frontmatter:

```md
---
title: My Recipe Book
description: A collection of family recipes from around the world.
date: 2024-06-01
---
```

You can reference those values anywhere in the page body:

```mdx
# {frontmatter.title}

_{frontmatter.description}_

Last updated: {frontmatter.date}
```

Renders as:

> # My Recipe Book
> _A collection of family recipes from around the world._
>
> Last updated: 2024-06-01

## Common use cases

### Show the description as a lead paragraph

Avoid duplicating your description in both frontmatter and the page body:

```mdx
---
title: Getting Started
description: Everything you need to publish your first Flowershow site.
---

{frontmatter.description}

## Step 1: ...
```

### Inline the page title in body text

```mdx
---
title: Privacy Policy
---

# {frontmatter.title}

This {frontmatter.title} was last updated on 1 January 2025.
```

### Render a list from a frontmatter array

Frontmatter arrays can be mapped over in JSX:

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

## Notes

- All frontmatter values are available — strings, numbers, booleans, and arrays.
- This is standard MDX behaviour — the `frontmatter` variable is injected automatically by Flowershow.
- Expressions like `{frontmatter.date}` render the raw value as a string. If you need formatting, use a JS expression: `{new Date(frontmatter.date).toLocaleDateString()}`.
