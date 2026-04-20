---
title: Using Frontmatter Values in MDX Pages
description: Access frontmatter fields directly inside your MDX page content using the frontmatter object.
---

> [!important]
> This feature requires **MDX rendering**. It will not work in Markdown (`md`) mode.
> See [[syntax-mode|Syntax Mode Configuration]] for details on how to enable MDX rendering.

In MDX pages, all frontmatter fields are available as a `frontmatter` object you can reference anywhere in your content using `{frontmatter.fieldname}`.

## Basic usage

```mdx
---
title: API Reference
version: "3.2.1"
status: stable
---

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
title: Getting Started
prerequisites:
  - Node.js 18+
  - A GitHub account
  - pnpm or npm
---

Before you begin, make sure you have the following:

<ul>
  {frontmatter.prerequisites.map((item) => (
    <li key={item}>{item}</li>
  ))}
</ul>
```

### Display a formatted date

For complex expressions, extract to a variable at the top of the file to keep the content readable:

```mdx
---
title: Release Notes
date: 2024-06-01
---

export const releaseDate = new Date(frontmatter.date).toLocaleDateString("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

Released on {releaseDate}.
```

## Missing or undefined fields

If you reference a frontmatter field that isn't defined, it renders as nothing — no error, just empty output. Double-check field names if a value isn't appearing as expected.
