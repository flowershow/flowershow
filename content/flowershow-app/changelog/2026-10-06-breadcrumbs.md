---
title: Show breadcrumbs above the page title
date: 2026-10-06
description: Pages now show a breadcrumb trail like "Guides › Install" above the title, on desktop and mobile.
authors:
  - olayway
showToc: false
image: "[[assets/changelog-breadcrumbs.webp]]"
---

Readers can now see where a page sits in your site and jump back up a level. The page header now shows a trail like **Guides › Advanced › Tuning** above the title. Until now breadcrumbs were only shown on mobile, in the sidebar bar; they now sit above the title on every screen size.

- **On by default:** to turn breadcrumbs off, toggle **Show Breadcrumbs** under **Settings → Content** in the dashboard, or set `"showBreadcrumbs": false` in `config.json`.
- **Per page:** set `showBreadcrumbs: true` or `false` in a page's frontmatter to override the site setting.
- **Flat sites:** set `section: Use it` in a page's frontmatter to show **Use it › Page title** when your folders don't express the grouping.
- **Styling:** the trail uses the `.page-header-breadcrumbs` class.

See [[page-headers#breadcrumbs|Page headers]] for details.
