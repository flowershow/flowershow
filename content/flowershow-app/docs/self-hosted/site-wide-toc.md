---
title: Site-wide table of contents (LHS Sidebar)
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Flowershow supports adding a site-wide table of contents in a LFH sidebar to allow your users to easily navigate to other pages on your website.

![[site-toc.png]]

## Enabling / disabling the sidebar

The sidebar is disabled by default. You can enable it for all your pages in your `config.mjs` file, and then disable it for some of your pages, like e.g. your home page.

### For all pages

To show the sidebar on all the pages, simply set `showSidebar` variable to `true` in your config file as shown below:

```js
// config.mjs

const config = {
  showSidebar: true,
};
```

### For a single page

You can also enable/disable the sidebar for specific pages by setting `showSidebar` to `true` or `false` in the page's frontmatter like below.

```md
---
showSidebar: false
---
```

## 🚧 Configuring sidebar contents

Currently all the pages on your website (apart from pages marked as drafts) will be listed in the Sidebar, grouped by their top-level parent folders (i.e. first level subfolders of your content folder) and sorted alphabetically by their frontmatter's `title` field or their slug (if no `title` is set).

In the next iteration we'll enable configuring listed pages.
