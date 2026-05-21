---
title: Sidebar Configuration
description: Enable sidebar navigation that displays your site's structure.
---

Configure the sidebar from the **Flowershow dashboard** under **Site Settings → Content**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> The sidebar is enabled by default and automatically generates navigation based on your content directory structure.

## Showing and hiding the sidebar

Go to **Settings → Content → Show Sidebar** and set it to `true` or `false`.

You can also hide the sidebar on a specific page (e.g. a landing page) by adding `showSidebar: false` to that page's frontmatter:

```md
---
showSidebar: false
---
```

This overrides both the site-wide **Show Sidebar** setting and **Sidebar Paths**.

## Sorting sidebar items

Go to **Settings → Content → Sidebar Order** and choose how items are sorted:

- **Path** — sort items alphabetically by their file path/name
- **Title** — sort items alphabetically by their document title

## Showing the sidebar only on specific routes

Go to **Settings → Content → Sidebar Paths** and enter a JSON array of path prefixes. When set, the sidebar only appears on pages whose path starts with one of the listed prefixes, and only displays content within those paths.

```json
["/docs", "/guides"]
```

With this configuration, the sidebar shows on `/docs`, `/docs/getting-started`, `/guides/intro`, etc., but not on `/`, `/blog`, or other pages.

If **Sidebar Paths** is not set, the sidebar shows on all pages (default behavior).

## Hiding paths from the sidebar

To hide specific subfolders from the sidebar tree, use the **Content Hide** setting under **Settings → Content**. Hidden pages are still accessible by URL — they just won't appear in the sidebar navigation or search results.

See [[content-filtering|Content Filtering]] for details.

## Mobile breadcrumbs

On mobile, the sidebar is replaced by a slide-out drawer with a breadcrumb bar showing your current location in the site tree. Folder names in the breadcrumbs are clickable links if the folder has an index page (e.g. `README.md` or `index.md`). Folders without an index page are shown as plain text.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "showSidebar": true,
  "sidebar": {
    "orderBy": "title",
    "paths": ["/docs", "/guides"]
  }
}
```

- `showSidebar`: Set to `false` to hide the sidebar site-wide
- `sidebar.orderBy`: Sort order for sidebar items — `"title"` (alphabetical by document title) or `"path"` (alphabetical by file path)
- `sidebar.paths`: Array of path prefixes — when set, the sidebar only appears on pages matching one of the listed prefixes

To disable the sidebar on a single page, add `showSidebar: false` to that page's frontmatter — this works regardless of how you configure the site-wide setting.
