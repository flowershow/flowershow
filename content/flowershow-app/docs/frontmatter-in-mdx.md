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
author: Theo
version: "2.1"
---
```

You can use the values anywhere in your MDX content:

```mdx
# {frontmatter.title}

Written by **{frontmatter.author}** · Version {frontmatter.version}
```

Renders as:

> # My Recipe Book
> Written by **Theo** · Version 2.1

## Common use cases

### Repeat the page title

Avoid hardcoding the title in both frontmatter and the first heading:

```mdx
---
title: API Reference
---

# {frontmatter.title}

Welcome to the {frontmatter.title} page.
```

### Display a description

```mdx
---
title: Getting Started
description: Everything you need to publish your first site.
---

> {frontmatter.description}
```

### Render a list from a frontmatter array

Frontmatter arrays can be mapped over in JSX:

```mdx
---
title: Tech Stack
tags: [React, TypeScript, Tailwind]
---

Technologies used:

<ul>
  {frontmatter.tags.map(tag => <li key={tag}>{tag}</li>)}
</ul>
```

### Conditional content

Show or hide content based on a frontmatter flag:

```mdx
---
title: My Page
draft: true
---

{frontmatter.draft && <p>⚠️ This page is a draft.</p>}
```

## Notes

- All frontmatter values are available — strings, numbers, arrays, booleans, and objects.
- Numeric and boolean values are used as-is in JSX expressions.
- String values can be embedded directly in text with `{frontmatter.field}`.
- This is a standard MDX feature — the `frontmatter` variable is injected automatically by Flowershow.
