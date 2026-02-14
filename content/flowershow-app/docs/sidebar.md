---
title: Sidebar Configuration
description: Enable sidebar navigation that displays your site's structure and links to all pages.
---

## Enabling the sidebar globally

To enable the sidebar navigation, add the `showSidebar` property to your `config.json` file in the root of your repository:

```json
{
  "showSidebar": true
}
```

The sidebar will automatically generate the navigation structure based on your content directory structure.

## Sorting sidebar items

By default, sidebar items are sorted by their title. You can change the sorting order using the `sidebar.orderBy` option:

```json
{
  "showSidebar": true,
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
