---
title: Semantic theme class reference
description: Stable Flowershow CSS hooks grouped by the UI areas that emit them.
---

Flowershow themes start with [custom properties](/docs/reference/custom-styles),
then use semantic classes when a component needs more specific treatment. This
page is generated from
[`default-theme.css`](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/default-theme.css)
and currently documents **358 styled class selectors**:
**356 stable semantic hooks** and **2 non-contract
compatibility utilities**.

## Stability contract

The semantic component, element, state, and variant hooks listed here are a
public theme-author API.
Removing or renaming one, or changing what UI element it represents, is a
breaking change for themes. Adding a hook is non-breaking. State and Variant
hooks are stable in name but only appear when their owning component enters
that state; do not assume every page renders every hook.

The list is exhaustive for classes styled by `default-theme.css`. The final
compatibility section is drift-checked but explicitly excluded from the public
API. Emitted-only class names and raw utility classes used inside component
source are not an authoring contract unless they appear in a semantic table on
this page.

Structural wrappers shown in DOM sketches but absent from their accompanying
tables provide nesting context only; they are not stable hooks. Structure is
still controlled by Flowershow core: these hooks change presentation, not which
components render or their order.

Kinds used below:

- **Hook** — component or semantic element.
- **Element** — BEM-style child written with `__`.
- **Variant** — alternative treatment written with `--`.
- **State** — conditional `is-*`, `has-*`, or `no-*` hook.
- **Compatibility** — styled utility retained for compatibility, not public API.

## Related non-class hooks

Callouts use data attributes rather than classes:

- `[data-callout]`
- `[data-callout-type="note"]` (and other callout types)
- `[data-callout-title]`
- `[data-callout-body]`

Scope callout overrides below `.rendered-mdx` so they outrank the base
attribute selectors without relying on source order.

## Site layout and page shell

Top-level site grid, responsive rails, and shell variants.

**DOM shape**

```text
.site-layout[.no-nav]
├─ .site-navbar (optional)
├─ .site-body (structural wrapper)
│  ├─ .site-subnav (optional)
│  ├─ .page-hero-container (optional)
│  └─ .layout-inner[.has-sidebar | .has-toc | .has-sidebar-and-toc]
│     ├─ .layout-inner-left
│     ├─ .layout-inner-center (structural wrapper)
│     │  └─ main.page-main (structural wrapper)
│     └─ .layout-inner-right
└─ .site-footer
```

| Class | Kind |
| --- | --- |
| <code>.layout-inner</code> | Hook |
| <code>.layout-inner-left</code> | Hook |
| <code>.layout-inner-right</code> | Hook |
| <code>.site-body</code> | Hook |
| <code>.site-layout</code> | Hook |

## Navbar and mobile navigation

Desktop navbar, dropdowns, mobile navigation, theme switch, and visitor controls.

**DOM shape**

```text
.site-navbar
├─ .site-navbar-inner
│  ├─ .site-navbar-site-name
│  ├─ .site-navbar-links-container
│  │  ├─ .site-navbar-link
│  │  └─ .site-navbar-dropdown
│  └─ .site-navbar-mobile-nav-button
└─ .mobile-nav
.site-navbar.site-navbar--custom (_navbar.html)
└─ .site-navbar-inner
   ├─ .site-navbar-custom
   ├─ .site-navbar-search-container (optional)
   └─ .site-navbar-theme-switch-container (optional)
```

| Class | Kind |
| --- | --- |
| <code>.mobile-nav</code> | Hook |
| <code>.mobile-nav-cta-button</code> | Hook |
| <code>.mobile-nav-dropdown</code> | Hook |
| <code>.mobile-nav-dropdown-icon</code> | Hook |
| <code>.mobile-nav-dropdown-item</code> | Hook |
| <code>.mobile-nav-dropdown-panel</code> | Hook |
| <code>.mobile-nav-dropdown-trigger</code> | Hook |
| <code>.mobile-nav-link</code> | Hook |
| <code>.mobile-nav-links-container</code> | Hook |
| <code>.mobile-nav-social-link</code> | Hook |
| <code>.mobile-nav-social-links-container</code> | Hook |
| <code>.mobile-nav-tree</code> | Hook |
| <code>.mobile-nav-tree-container</code> | Hook |
| <code>.mobile-nav-tree-item-children</code> | Hook |
| <code>.mobile-nav-tree-item-icon</code> | Hook |
| <code>.mobile-nav-tree-item-self</code> | Hook |
| <code>.site-navbar</code> | Hook |
| <code>.site-navbar--custom</code> | Variant |
| <code>.site-navbar-cta-button</code> | Hook |
| <code>.site-navbar-custom</code> | Hook |
| <code>.site-navbar-dropdown</code> | Hook |
| <code>.site-navbar-dropdown-icon</code> | Hook |
| <code>.site-navbar-dropdown-item</code> | Hook |
| <code>.site-navbar-dropdown-panel</code> | Hook |
| <code>.site-navbar-dropdown-trigger</code> | Hook |
| <code>.site-navbar-inner</code> | Hook |
| <code>.site-navbar-link</code> | Hook |
| <code>.site-navbar-links-container</code> | Hook |
| <code>.site-navbar-mobile-nav-button</code> | Hook |
| <code>.site-navbar-mobile-nav-icon</code> | Hook |
| <code>.site-navbar-search-container</code> | Hook |
| <code>.site-navbar-site-logo</code> | Hook |
| <code>.site-navbar-site-name</code> | Hook |
| <code>.site-navbar-site-title</code> | Hook |
| <code>.site-navbar-social-link-icon</code> | Hook |
| <code>.site-navbar-social-links-container</code> | Hook |
| <code>.site-navbar-theme-switch-container</code> | Hook |
| <code>.theme-switch</code> | Hook |
| <code>.theme-switch-icon</code> | Hook |
| <code>.visitor-logout-button</code> | Hook |
| <code>.visitor-logout-button-icon</code> | Hook |

## Subnavigation, sidebar, and site tree

Breadcrumbs, desktop site tree, and the small-screen sidebar drawer.

**DOM shape**

```text
.site-subnav
├─ .site-subnav-breadcrumbs
└─ .site-subnav-menu-button
.layout-inner-left
└─ .site-sidebar
   └─ .site-tree
body (dialog portal)
└─ .sidebar-drawer-panel
   └─ .site-tree
```

| Class | Kind |
| --- | --- |
| <code>.sidebar-drawer-backdrop</code> | Hook |
| <code>.sidebar-drawer-close</code> | Hook |
| <code>.sidebar-drawer-close-icon</code> | Hook |
| <code>.sidebar-drawer-header</code> | Hook |
| <code>.sidebar-drawer-panel</code> | Hook |
| <code>.site-sidebar</code> | Hook |
| <code>.site-subnav</code> | Hook |
| <code>.site-subnav-menu-button</code> | Hook |
| <code>.site-subnav-menu-icon</code> | Hook |
| <code>.site-tree</code> | Hook |
| <code>.site-tree-disclosure-panel</code> | Hook |
| <code>.site-tree-item</code> | Hook |
| <code>.site-tree-item-children</code> | Hook |
| <code>.site-tree-item-icon</code> | Hook |
| <code>.site-tree-item-self</code> | Hook |
| <code>.site-tree-item-text</code> | Hook |

## Page header, hero, and rendered content

Page identity, hero content, Markdown body, code controls, images, and task-list hooks.

**DOM shape**

```text
.page-hero-container
└─ .page-hero[.has-image | .image-full]
main.page-main (structural wrapper)
├─ .page-header
│  ├─ .page-header-title (or .page-header-title-row > h1.page-header-title, .page-header-actions)
│  │  └─ .page-actions > button.page-actions-copy, button.page-actions-toggle, .page-actions-menu > .page-actions-item (showPageActions)
│  ├─ .page-header-description
│  └─ .page-header-metadata-container
└─ .page-body (structural wrapper)
   └─ .rendered-mdx[.is-plain]
```

| Class | Kind |
| --- | --- |
| <code>.contains-task-list</code> | Hook |
| <code>.heading-link</code> | Hook |
| <code>.page-actions</code> | Hook |
| <code>.page-actions-copy</code> | Hook |
| <code>.page-actions-external</code> | Hook |
| <code>.page-actions-icon</code> | Hook |
| <code>.page-actions-item</code> | Hook |
| <code>.page-actions-item-description</code> | Hook |
| <code>.page-actions-item-text</code> | Hook |
| <code>.page-actions-item-title</code> | Hook |
| <code>.page-actions-menu</code> | Hook |
| <code>.page-actions-toggle</code> | Hook |
| <code>.page-header</code> | Hook |
| <code>.page-header-actions</code> | Hook |
| <code>.page-header-author-avatar</code> | Hook |
| <code>.page-header-author-name</code> | Hook |
| <code>.page-header-authors-avatars-container</code> | Hook |
| <code>.page-header-authors-container</code> | Hook |
| <code>.page-header-breadcrumb-item</code> | Hook |
| <code>.page-header-breadcrumb-link</code> | Hook |
| <code>.page-header-breadcrumb-separator</code> | Hook |
| <code>.page-header-breadcrumbs</code> | Hook |
| <code>.page-header-breadcrumbs-list</code> | Hook |
| <code>.page-header-date</code> | Hook |
| <code>.page-header-date-icon</code> | Hook |
| <code>.page-header-description</code> | Hook |
| <code>.page-header-image</code> | Hook |
| <code>.page-header-image-container</code> | Hook |
| <code>.page-header-metadata-container</code> | Hook |
| <code>.page-header-reading-time</code> | Hook |
| <code>.page-header-reading-time-icon</code> | Hook |
| <code>.page-header-tags</code> | Hook |
| <code>.page-header-title</code> | Hook |
| <code>.page-header-title-row</code> | Hook |
| <code>.page-hero</code> | Hook |
| <code>.page-hero-container</code> | Hook |
| <code>.page-hero-content</code> | Hook |
| <code>.page-hero-content-container</code> | Hook |
| <code>.page-hero-cta</code> | Hook |
| <code>.page-hero-ctas-container</code> | Hook |
| <code>.page-hero-description</code> | Hook |
| <code>.page-hero-image</code> | Hook |
| <code>.page-hero-image-container</code> | Hook |
| <code>.page-hero-title</code> | Hook |
| <code>.pre-container</code> | Hook |
| <code>.pre-copy-button</code> | Hook |
| <code>.pre-icon</code> | Hook |
| <code>.pre-sr</code> | Hook |
| <code>.rendered-mdx</code> | Hook |

## Post pages

Individual posts: dated pages in a `blog/` or `posts/` folder, pages of a folder listed by its own `layout: list` page that is a dated feed, or pages with `layout: post`. The header keeps the `.page-header-*` classes; tags move to the article footer. Custom properties: `--post-max-width`, `--post-wide-max-width`, `--post-body-size`, `--post-hero-max-height`, `--post-hero-radius`, `--post-avatar-size`, `--post-meta-color`, `--post-eyebrow-color`, `--post-rule-color`.

**DOM shape**

```text
.layout-inner-center.post-layout
└─ main.page-main
   ├─ article.post-page[data-layout="post"]
   │  ├─ header.page-header.post-header
   │  │  ├─ nav.page-header-breadcrumbs.post-eyebrow (folders above the post)
   │  │  ├─ h1.page-header-title
   │  │  ├─ p.page-header-description.post-dek
   │  │  ├─ .page-header-metadata-container.post-byline[data-avatars]
   │  │  │  ├─ .page-header-authors-container.post-byline-authors
   │  │  │  │  ├─ .page-header-authors-avatars-container.post-byline-avatars > img.page-header-author-avatar.post-byline-avatar
   │  │  │  │  └─ .page-header-authors-names-container.post-byline-names > .page-header-author-name
   │  │  │  └─ .post-byline-meta > .page-header-date > time, .page-header-reading-time
   │  │  └─ figure.post-hero > img.post-hero-img, figcaption.post-hero-caption
   │  ├─ .page-body > .rendered-mdx#mdxpage
   │  └─ footer.post-footer > .page-header-tags.post-tags > .tag-pill
   ├─ nav.post-nav > a.post-nav-link.post-nav-link--prev | --next > .post-nav-label, .post-nav-title (or .post-nav-placeholder)
   └─ section.post-read-more > h2.post-read-more-title, section.list-component.list-component--grid (the listing grid cards)
```

| Class | Kind |
| --- | --- |
| <code>.post-byline</code> | Hook |
| <code>.post-byline-authors</code> | Hook |
| <code>.post-byline-avatars</code> | Hook |
| <code>.post-byline-meta</code> | Hook |
| <code>.post-byline-names</code> | Hook |
| <code>.post-dek</code> | Hook |
| <code>.post-eyebrow</code> | Hook |
| <code>.post-footer</code> | Hook |
| <code>.post-header</code> | Hook |
| <code>.post-hero</code> | Hook |
| <code>.post-hero-caption</code> | Hook |
| <code>.post-hero-img</code> | Hook |
| <code>.post-layout</code> | Hook |
| <code>.post-nav</code> | Hook |
| <code>.post-nav-label</code> | Hook |
| <code>.post-nav-link</code> | Hook |
| <code>.post-nav-link--next</code> | Variant |
| <code>.post-nav-placeholder</code> | Hook |
| <code>.post-nav-title</code> | Hook |
| <code>.post-page</code> | Hook |
| <code>.post-read-more</code> | Hook |
| <code>.post-read-more-title</code> | Hook |
| <code>.post-tags</code> | Hook |

## Table of contents

The page ToC rail and recursively nested ToC items.

**DOM shape**

```text
.page-toc-container
└─ .toc
   ├─ .toc-title
   └─ .toc-item
      ├─ .toc-item-self
      └─ .toc-item-children
```

| Class | Kind |
| --- | --- |
| <code>.page-toc-container</code> | Hook |
| <code>.toc</code> | Hook |
| <code>.toc-item</code> | Hook |
| <code>.toc-item-children</code> | Hook |
| <code>.toc-item-self</code> | Hook |
| <code>.toc-title</code> | Hook |

## Lists, cards, skeletons, and pagination

Collection/blog listing cards, empty and error states, loading placeholders, and pagination controls.

**DOM shape**

```text
.layout-inner-center.listing-layout[data-view] (page-level listings: the page column)
└─ main.page-main > div.listing-page[data-view] (layout: list, zero-config blog/posts)
├─ header.page-header > .page-header-title-row > h1.page-header-title, .page-header-actions > a.listing-page-feed-link > svg.listing-page-feed-icon, span.listing-page-feed-label (feed link when the site has RSS on)
└─ .page-body > .rendered-mdx#mdxpage > .listing-page-intro (the page's own text), .listing-page-listing (the rule, then the listing)
section.list-component[.list-component--list | --grid | --compact | --people | --magazine][data-view][data-media][data-media-side][data-ratio][data-listing-notes]   (div without data-view for legacy <List />)
├─ .list-component-magazine-top[data-layout=solo|pair|trio|lead-more|full] (magazine, page 1)
│  ├─ article.list-component-item.list-component-item--featured (the hero)
│  ├─ .list-component-magazine-side > article.list-component-item.list-component-item--card
│  └─ .list-component-magazine-more > h2.list-component-section-heading, article.list-component-item.list-component-item--brief
├─ .list-component-magazine-rest (magazine: the remaining rows, after h2.list-component-section-heading)
├─ h2.list-component-group-heading (optional, with group)
├─ article.list-component-item[.list-component-item--featured] / .list-component-skeleton-item (legacy only)
│  ├─ .list-component-item-media > a.list-component-item-media-link > img.list-component-item-media-img (item image or defaultImage)
│  │  | .list-component-item-media.list-component-item-media--placeholder[aria-hidden] (empty accent-tinted tile: grid card, or list/magazine row when at least half the items have an image; off with defaultImage: none)
│  │  | .list-component-item-media.list-component-item-media--placeholder[aria-hidden] > span.list-component-item-initials (people view, no photo)
│  └─ .list-component-item-content
│     ├─ .list-component-item-eyebrow > span
│     ├─ .list-component-item-headline > a.list-component-item-headline-link
│     ├─ .list-component-item-summary
│     ├─ .list-component-item-meta
│     │  ├─ time.list-component-item-date
│     │  ├─ .list-component-item-authors > .list-component-item-avatars > img.list-component-item-author-avatar, .list-component-item-author, .list-component-item-authors-more
│     │  └─ .list-component-item-meta-value[data-field]
│     └─ .list-component-item-footnote (legacy only)
└─ nav.list-component-pagination
   ├─ .list-component-pagination-nav > .list-component-pagination-button[.is-disabled]
   └─ .list-component-pagination-pages
.list-component-empty (no matching pages)
.list-component-error[.list-component-error--block] (items failed to load / invalid block)
```

| Class | Kind |
| --- | --- |
| <code>.list-component</code> | Hook |
| <code>.list-component--compact</code> | Variant |
| <code>.list-component--grid</code> | Variant |
| <code>.list-component--list</code> | Variant |
| <code>.list-component--magazine</code> | Variant |
| <code>.list-component--people</code> | Variant |
| <code>.list-component-empty</code> | Hook |
| <code>.list-component-error</code> | Hook |
| <code>.list-component-error--block</code> | Variant |
| <code>.list-component-error-keys</code> | Hook |
| <code>.list-component-error-list</code> | Hook |
| <code>.list-component-error-title</code> | Hook |
| <code>.list-component-group-heading</code> | Hook |
| <code>.list-component-item</code> | Hook |
| <code>.list-component-item--brief</code> | Variant |
| <code>.list-component-item--card</code> | Variant |
| <code>.list-component-item--featured</code> | Variant |
| <code>.list-component-item-author</code> | Hook |
| <code>.list-component-item-author-avatar</code> | Hook |
| <code>.list-component-item-authors</code> | Hook |
| <code>.list-component-item-authors-more</code> | Hook |
| <code>.list-component-item-avatars</code> | Hook |
| <code>.list-component-item-content</code> | Hook |
| <code>.list-component-item-date</code> | Hook |
| <code>.list-component-item-eyebrow</code> | Hook |
| <code>.list-component-item-footnote</code> | Hook |
| <code>.list-component-item-headline</code> | Hook |
| <code>.list-component-item-headline-link</code> | Hook |
| <code>.list-component-item-initials</code> | Hook |
| <code>.list-component-item-media</code> | Hook |
| <code>.list-component-item-media--placeholder</code> | Variant |
| <code>.list-component-item-media-img</code> | Hook |
| <code>.list-component-item-media-link</code> | Hook |
| <code>.list-component-item-meta</code> | Hook |
| <code>.list-component-item-meta-value</code> | Hook |
| <code>.list-component-item-summary</code> | Hook |
| <code>.list-component-magazine-more</code> | Hook |
| <code>.list-component-magazine-rest</code> | Hook |
| <code>.list-component-magazine-side</code> | Hook |
| <code>.list-component-magazine-top</code> | Hook |
| <code>.list-component-pagination</code> | Hook |
| <code>.list-component-pagination-button</code> | Hook |
| <code>.list-component-pagination-button--next</code> | Variant |
| <code>.list-component-pagination-button--prev</code> | Variant |
| <code>.list-component-pagination-button-icon</code> | Hook |
| <code>.list-component-pagination-button-icon--next</code> | Variant |
| <code>.list-component-pagination-button-icon--prev</code> | Variant |
| <code>.list-component-pagination-ellipsis</code> | Hook |
| <code>.list-component-pagination-nav</code> | Hook |
| <code>.list-component-pagination-nav--end</code> | Variant |
| <code>.list-component-pagination-page-button</code> | Hook |
| <code>.list-component-pagination-page-button--current</code> | Variant |
| <code>.list-component-pagination-page-button--other</code> | Variant |
| <code>.list-component-pagination-pages</code> | Hook |
| <code>.list-component-section-heading</code> | Hook |
| <code>.list-component-skeleton</code> | Hook |
| <code>.list-component-skeleton-content</code> | Hook |
| <code>.list-component-skeleton-eyebrow</code> | Hook |
| <code>.list-component-skeleton-footnote</code> | Hook |
| <code>.list-component-skeleton-headline</code> | Hook |
| <code>.list-component-skeleton-item</code> | Hook |
| <code>.list-component-skeleton-media</code> | Hook |
| <code>.list-component-skeleton-media-placeholder</code> | Hook |
| <code>.list-component-skeleton-summary</code> | Hook |
| <code>.listing-layout</code> | Hook |
| <code>.listing-page</code> | Hook |
| <code>.listing-page-feed-icon</code> | Hook |
| <code>.listing-page-feed-link</code> | Hook |
| <code>.listing-page-intro</code> | Hook |
| <code>.listing-page-listing</code> | Hook |

## Tag index and per-tag pages

Generated navigation pages for the `/tags` index and each `/tags/{tag}` listing, plus the inline tag pill emitted in rendered content.

**DOM shape**

```text
.tags-page (structural wrapper)
├─ .tags-page-header
│  └─ .tags-page-title
├─ .tags-page-empty (empty state)
├─ ul.tag-index (/tags index)
│  └─ .tag-index-item
│     ├─ .tag-pill
│     └─ .tag-index-count
└─ ol.tag-page-list (/tags/{tag})
   └─ .tag-page-list-item
      └─ .tag-page-list-description
```

| Class | Kind |
| --- | --- |
| <code>.tag-index</code> | Hook |
| <code>.tag-index-count</code> | Hook |
| <code>.tag-index-item</code> | Hook |
| <code>.tag-page-list</code> | Hook |
| <code>.tag-page-list-description</code> | Hook |
| <code>.tag-page-list-item</code> | Hook |
| <code>.tag-pill</code> | Hook |
| <code>.tags-page-empty</code> | Hook |
| <code>.tags-page-header</code> | Hook |
| <code>.tags-page-title</code> | Hook |

## Changelog

Built-in changelog timeline for changelog/ folders (or folders with layout: changelog), single CHANGELOG.md files (or pages with layout: changelog), and the single-entry page.

**DOM shape**

```text
.changelog
├─ .changelog-header
│  ├─ .changelog-title
│  └─ .changelog-intro
├─ ol.changelog-entries
│  └─ li.changelog-entry[.is-unreleased]
│     ├─ .changelog-entry-meta
│     │  └─ .changelog-entry-meta-inner
│     │     ├─ .changelog-entry-date
│     │     ├─ .changelog-entry-compare (CHANGELOG.md)
│     │     ├─ .changelog-entry-version
│     │     └─ .changelog-entry-authors
│     │        └─ .changelog-entry-author
│     └─ .changelog-entry-content
│        ├─ .changelog-entry-title
│        ├─ .changelog-entry-description
│        ├─ .changelog-entry-media
│        └─ .changelog-entry-body.rendered-mdx
└─ .changelog-pagination
   └─ .changelog-pagination-inner
      └─ .changelog-pagination-count
article.changelog-single (entry page)
├─ .changelog-back
├─ .changelog-entry-meta
└─ .changelog-entry-title … .changelog-entry-body
.changelog-entry-nav
├─ .changelog-entry-nav-older
└─ .changelog-entry-nav-newer
```

| Class | Kind |
| --- | --- |
| <code>.changelog</code> | Hook |
| <code>.changelog-back</code> | Hook |
| <code>.changelog-entries</code> | Hook |
| <code>.changelog-entry</code> | Hook |
| <code>.changelog-entry-author</code> | Hook |
| <code>.changelog-entry-authors</code> | Hook |
| <code>.changelog-entry-body</code> | Hook |
| <code>.changelog-entry-compare</code> | Hook |
| <code>.changelog-entry-content</code> | Hook |
| <code>.changelog-entry-date</code> | Hook |
| <code>.changelog-entry-description</code> | Hook |
| <code>.changelog-entry-media</code> | Hook |
| <code>.changelog-entry-meta</code> | Hook |
| <code>.changelog-entry-meta-inner</code> | Hook |
| <code>.changelog-entry-nav</code> | Hook |
| <code>.changelog-entry-nav-newer</code> | Hook |
| <code>.changelog-entry-title</code> | Hook |
| <code>.changelog-entry-version</code> | Hook |
| <code>.changelog-header</code> | Hook |
| <code>.changelog-intro</code> | Hook |
| <code>.changelog-pagination</code> | Hook |
| <code>.changelog-pagination-count</code> | Hook |
| <code>.changelog-pagination-inner</code> | Hook |
| <code>.changelog-single</code> | Hook |
| <code>.changelog-title</code> | Hook |

## Search button and modal

Search launch control, modal shell, result states, and hit content.

**DOM shape**

```text
.search-button
.search-modal
├─ .search-modal-backdrop
└─ .search-modal-card-container
   └─ .search-modal-card
      ├─ .search-modal-input-container
      └─ .search-modal-results
```

| Class | Kind |
| --- | --- |
| <code>.search-button</code> | Hook |
| <code>.search-icon</code> | Hook |
| <code>.search-modal</code> | Hook |
| <code>.search-modal-backdrop</code> | Hook |
| <code>.search-modal-card</code> | Hook |
| <code>.search-modal-card-container</code> | Hook |
| <code>.search-modal-close-button</code> | Hook |
| <code>.search-modal-close-icon</code> | Hook |
| <code>.search-modal-error-icon</code> | Hook |
| <code>.search-modal-error-icon-text</code> | Hook |
| <code>.search-modal-highlight</code> | Hook |
| <code>.search-modal-hit-content</code> | Hook |
| <code>.search-modal-hit-link</code> | Hook |
| <code>.search-modal-hit-title</code> | Hook |
| <code>.search-modal-hits-item</code> | Hook |
| <code>.search-modal-hits-list</code> | Hook |
| <code>.search-modal-input</code> | Hook |
| <code>.search-modal-input-container</code> | Hook |
| <code>.search-modal-loading-spinner</code> | Hook |
| <code>.search-modal-results</code> | Hook |
| <code>.search-modal-results-container</code> | Hook |
| <code>.search-modal-stalled-spinner</code> | Hook |
| <code>.search-modal-status-container</code> | Hook |
| <code>.search-modal-status-content</code> | Hook |
| <code>.search-modal-status-icon</code> | Hook |
| <code>.search-modal-status-message</code> | Hook |
| <code>.search-modal-status-submessage</code> | Hook |
| <code>.search-placeholder</code> | Hook |
| <code>.search-shortcut-hint</code> | Hook |

## Footer

Publication identity, navigation groups, social links, and copyright, or a custom footer rendered from `_footer.html` (Premium).

**DOM shape**

```text
.site-footer
└─ .site-footer-inner
   └─ .site-footer-content-grid
      ├─ .site-footer-publication-section
      └─ .site-footer-navigation-section
.site-footer.site-footer--custom (_footer.html)
└─ .site-footer-inner
   └─ .site-footer-custom
```

| Class | Kind |
| --- | --- |
| <code>.site-footer</code> | Hook |
| <code>.site-footer-content-grid</code> | Hook |
| <code>.site-footer-copyright</code> | Hook |
| <code>.site-footer-custom</code> | Hook |
| <code>.site-footer-inner</code> | Hook |
| <code>.site-footer-navigation-grid</code> | Hook |
| <code>.site-footer-navigation-group</code> | Hook |
| <code>.site-footer-navigation-link</code> | Hook |
| <code>.site-footer-navigation-list</code> | Hook |
| <code>.site-footer-navigation-section</code> | Hook |
| <code>.site-footer-navigation-title</code> | Hook |
| <code>.site-footer-publication-name</code> | Hook |
| <code>.site-footer-publication-section</code> | Hook |
| <code>.site-footer-social-icon</code> | Hook |
| <code>.site-footer-social-link</code> | Hook |
| <code>.site-footer-social-links</code> | Hook |

## Backlinks, edit controls, and comments

Blocks rendered after the main page content.

**DOM shape**

```text
.layout-inner-center (structural wrapper)
├─ main.page-main (structural wrapper)
├─ .page-edit-button-container
├─ .page-backlinks-container
│  └─ .page-backlinks-list
└─ .page-comments-container
```

| Class | Kind |
| --- | --- |
| <code>.page-backlinks-container</code> | Hook |
| <code>.page-backlinks-item</code> | Hook |
| <code>.page-backlinks-list</code> | Hook |
| <code>.page-backlinks-title</code> | Hook |
| <code>.page-comments-container</code> | Hook |
| <code>.page-edit-button</code> | Hook |
| <code>.page-edit-button-container</code> | Hook |

## Graph, canvas, PDF, image lightbox, and media embeds

Graph panels/modals and document/media rendering surfaces.

**DOM shape**

```text
.graph-mini-panel / .graph-modal
.canvas-node-content
.image-lightbox-trigger (zoomable image)
.image-lightbox (dialog)
.pdf-viewer
├─ .pdf-header
└─ .pdf-scroll-area
   └─ .pdf-page
```

| Class | Kind |
| --- | --- |
| <code>.canvas-control-btn</code> | Hook |
| <code>.canvas-controls</code> | Hook |
| <code>.canvas-fullwidth</code> | Hook |
| <code>.canvas-node</code> | Hook |
| <code>.canvas-node-content</code> | Hook |
| <code>.canvas-page</code> | Hook |
| <code>.canvas-world</code> | Hook |
| <code>.graph-mini-panel</code> | Hook |
| <code>.graph-mini-panel__action-btn</code> | Element |
| <code>.graph-mini-panel__actions</code> | Element |
| <code>.graph-mini-panel__label</code> | Element |
| <code>.graph-mini-panel--loading</code> | Variant |
| <code>.graph-modal</code> | Hook |
| <code>.graph-modal__close</code> | Element |
| <code>.graph-modal__header</code> | Element |
| <code>.graph-modal__inner</code> | Element |
| <code>.graph-modal__title</code> | Element |
| <code>.image-lightbox</code> | Hook |
| <code>.image-lightbox-spinner</code> | Hook |
| <code>.image-lightbox-trigger</code> | Hook |
| <code>.pdf-error</code> | Hook |
| <code>.pdf-filename</code> | Hook |
| <code>.pdf-header</code> | Hook |
| <code>.pdf-loading</code> | Hook |
| <code>.pdf-page</code> | Hook |
| <code>.pdf-page-count</code> | Hook |
| <code>.pdf-scroll-area</code> | Hook |
| <code>.pdf-viewer</code> | Hook |

## Error and not-found pages

Public error cards, diagnostic stacks, and 404 presentation.

**DOM shape**

```text
.error-page / .not-found
└─ *-inner
   ├─ *-title
   ├─ *-subtitle
   └─ *-description
```

| Class | Kind |
| --- | --- |
| <code>.error-card</code> | Hook |
| <code>.error-card-icon</code> | Hook |
| <code>.error-card-link</code> | Hook |
| <code>.error-card-message</code> | Hook |
| <code>.error-card-stack</code> | Hook |
| <code>.error-card-title</code> | Hook |
| <code>.error-page</code> | Hook |
| <code>.error-page-description</code> | Hook |
| <code>.error-page-inner</code> | Hook |
| <code>.error-page-subtitle</code> | Hook |
| <code>.error-page-title</code> | Hook |
| <code>.not-found</code> | Hook |
| <code>.not-found-description</code> | Hook |
| <code>.not-found-hint</code> | Hook |
| <code>.not-found-inner</code> | Hook |
| <code>.not-found-subtitle</code> | Hook |
| <code>.not-found-title</code> | Hook |

## Shared states and layout variants

Conditional presence, open/current, image, and layout modifiers.

**DOM shape**

```text
Owning semantic hook
└─ .is-* / .has-* / .no-* / .image-full
```

| Class | Kind | Owner |
| --- | --- | --- |
| <code>.has-image</code> | State | .page-hero |
| <code>.has-sidebar</code> | State | .layout-inner |
| <code>.has-sidebar-and-toc</code> | State | .layout-inner |
| <code>.has-toc</code> | State | .layout-inner |
| <code>.image-full</code> | Variant | .page-hero |
| <code>.is-canvas</code> | State | undefined |
| <code>.is-collapsible</code> | State | .site-tree-item-self / .mobile-nav-tree-item-self |
| <code>.is-current</code> | State | .site-tree-item-self / .mobile-nav-tree-item-self |
| <code>.is-disabled</code> | State | .list-component-pagination-button |
| <code>.is-open</code> | State | navigation dropdowns and collapsible tree items |
| <code>.is-plain</code> | State | .rendered-mdx |
| <code>.is-scrolled</code> | State | .site-navbar |
| <code>.is-unreleased</code> | State | .changelog-entry |
| <code>.no-nav</code> | State | .site-layout |

## Compatibility utilities (not public API)

Selectors retained for exhaustive drift tracking but excluded from the semantic theme-author contract.

**CSS layer**

```text
@layer utilities
├─ .prose
└─ .overflow-hidden
```

| Class | Kind |
| --- | --- |
| <code>.overflow-hidden</code> | Compatibility |
| <code>.prose</code> | Compatibility |

---

Generated by `node scripts/theme-class-reference.mjs --write`. Run
`pnpm docs:theme-classes:check` to verify that this page matches the current
stylesheet.
