---
title: Sidebar Configuration
description: Enable sidebar navigation that displays your site's structure and links to all pages.
---

## Overview

The sidebar is enabled by default. It automatically generates navigation based on your content directory structure.

To disable it, set `showSidebar` to `false` in your `config.json`:

```json
{
  "showSidebar": false
}
```

## Sorting sidebar items

By default, sidebar items are sorted by their title. You can change the sorting order using the `sidebar.orderBy` option:

```json
{
  "sidebar": {
    "orderBy": "path"
  }
}
```

Available values:

- `"title"` (default) - Sort items alphabetically by their document title
- `"path"` - Sort items alphabetically by their file path/name

## Disabling the sidebar on a page

You can hide the sidebar on some page (e.g. the landing page) by adding this to the frontmatter:

```md
---
showSidebar: false
---
```
