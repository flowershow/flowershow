---
title: "Sidebar: on by default, redesigned on mobile, and configurable per route"
date: 2026-03-04
description: The sidebar is now enabled for all new sites, has a dedicated slide-out drawer on mobile with breadcrumb navigation, and can be restricted to specific URL paths.
authors:
  - Ola Rubaj
image: "[[assets/sidebar-navigation.png]]"
---

We've shipped three improvements to sidebar navigation that make Flowershow sites easier to explore out of the box — especially on mobile — and give you more control over where the sidebar appears.

![Flowershow docs with sidebar](https://screenshotit.app/flowershow.app/docs)

## Sidebar enabled by default

New Flowershow sites now render the sidebar without any configuration. Previously, enabling it required opting in via `config.json`. Existing sites are not affected — your current settings continue to work as before.

## Redesigned mobile experience

On small screens, the sidebar previously shared space with the navbar in ways that made navigation cramped. It now gets its own dedicated slide-out drawer, toggled by a chevron icon in a breadcrumb bar that shows where you are in the site hierarchy. The breadcrumb updates as you navigate, so you always have context even when the sidebar is hidden.

## Route-specific sidebar visibility

For sites that mix documentation with landing pages or blogs, you can now restrict the sidebar to specific URL prefixes using the `sidebar.paths` option in `config.json`:

```json
{
  "sidebar": {
    "paths": ["/docs", "/guides"]
  }
}
```

The sidebar will appear only on routes that start with one of these prefixes. Per-page opt-out via `showSidebar: false` in frontmatter continues to work as before.
