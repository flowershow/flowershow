---
title: Sidebar Configuration
description: Enable sidebar navigation that displays your site's structure.
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

## Mobile breadcrumbs

On mobile, the sidebar is replaced by a slide-out drawer with a breadcrumb bar showing your current location in the site tree. Folder names in the breadcrumbs are clickable links if the folder has an index page (e.g. `README.md` or `index.md` (or `.mdx`)). Folders without an index page are shown as plain text.

## Showing the sidebar only on specific routes

You can restrict the sidebar to specific sections of your site using the `sidebar.paths` option. When set, the sidebar will only appear on pages whose path starts with one of the listed prefixes, and will only display pages within those paths.

```json
{
  "showSidebar": true,
  "sidebar": {
    "paths": ["/docs", "/guides"]
  }
}
```

In this example, the sidebar will show on `/docs`, `/docs/getting-started`, `/guides/intro`, etc., but not on `/`, `/blog`, or other pages.

If `sidebar.paths` is not set, the sidebar shows on all pages (default behavior).

## Disabling the sidebar on a page

You can hide the sidebar on a specific page (e.g. the landing page) by adding this to the frontmatter:

```md
---
showSidebar: false
---
```

This overrides both the site-wide `showSidebar` setting and `sidebar.paths`.
