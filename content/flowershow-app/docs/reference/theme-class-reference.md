---
title: Semantic theme class reference
description: Stable Flowershow CSS hooks grouped by the UI areas that emit them.
---

Flowershow themes start with [custom properties](/docs/reference/custom-styles),
then use semantic classes when a component needs more specific treatment. This
page is generated from
[`default-theme.css`](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/default-theme.css)
and currently documents **230 styled class selectors**:
**228 stable semantic hooks** and **2 non-contract
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
| <code>.site-navbar-cta-button</code> | Hook |
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
| <code>.site-subnav-breadcrumb-item</code> | Hook |
| <code>.site-subnav-breadcrumb-link</code> | Hook |
| <code>.site-subnav-breadcrumbs</code> | Hook |
| <code>.site-subnav-menu-button</code> | Hook |
| <code>.site-subnav-menu-icon</code> | Hook |
| <code>.site-subnav-separator</code> | Hook |
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
└─ .page-hero[.has-image]
main.page-main (structural wrapper)
├─ .page-header
│  ├─ .page-header-title
│  ├─ .page-header-description
│  └─ .page-header-metadata-container
└─ .page-body (structural wrapper)
   └─ .rendered-mdx[.is-plain]
```

| Class | Kind |
| --- | --- |
| <code>.contains-task-list</code> | Hook |
| <code>.heading-link</code> | Hook |
| <code>.image-full</code> | Hook |
| <code>.page-header</code> | Hook |
| <code>.page-header-author-avatar</code> | Hook |
| <code>.page-header-author-name</code> | Hook |
| <code>.page-header-authors-avatars-container</code> | Hook |
| <code>.page-header-authors-container</code> | Hook |
| <code>.page-header-date</code> | Hook |
| <code>.page-header-date-icon</code> | Hook |
| <code>.page-header-description</code> | Hook |
| <code>.page-header-image</code> | Hook |
| <code>.page-header-image-container</code> | Hook |
| <code>.page-header-metadata-container</code> | Hook |
| <code>.page-header-title</code> | Hook |
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

Collection/blog listing cards, loading placeholders, and pagination controls.

**DOM shape**

```text
.list-component
├─ .list-component-item / .list-component-skeleton-item
│  ├─ *-media
│  └─ *-content
└─ .list-component-pagination
   ├─ .list-component-pagination-nav
   └─ .list-component-pagination-pages
```

| Class | Kind |
| --- | --- |
| <code>.list-component</code> | Hook |
| <code>.list-component-item</code> | Hook |
| <code>.list-component-item-content</code> | Hook |
| <code>.list-component-item-eyebrow</code> | Hook |
| <code>.list-component-item-footnote</code> | Hook |
| <code>.list-component-item-headline</code> | Hook |
| <code>.list-component-item-media</code> | Hook |
| <code>.list-component-item-media-img</code> | Hook |
| <code>.list-component-item-summary</code> | Hook |
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
| <code>.list-component-skeleton</code> | Hook |
| <code>.list-component-skeleton-content</code> | Hook |
| <code>.list-component-skeleton-eyebrow</code> | Hook |
| <code>.list-component-skeleton-footnote</code> | Hook |
| <code>.list-component-skeleton-headline</code> | Hook |
| <code>.list-component-skeleton-item</code> | Hook |
| <code>.list-component-skeleton-media</code> | Hook |
| <code>.list-component-skeleton-media-placeholder</code> | Hook |
| <code>.list-component-skeleton-summary</code> | Hook |

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

Publication identity, navigation groups, social links, and copyright.

**DOM shape**

```text
.site-footer
└─ .site-footer-inner
   └─ .site-footer-content-grid
      ├─ .site-footer-publication-section
      └─ .site-footer-navigation-section
```

| Class | Kind |
| --- | --- |
| <code>.site-footer</code> | Hook |
| <code>.site-footer-content-grid</code> | Hook |
| <code>.site-footer-copyright</code> | Hook |
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

## Graph, canvas, PDF, and media embeds

Graph panels/modals and document/media rendering surfaces.

**DOM shape**

```text
.graph-mini-panel / .graph-modal
.canvas-node-content
.pdf-viewer
├─ .pdf-header
└─ .pdf-scroll-area
   └─ .pdf-page
```

| Class | Kind |
| --- | --- |
| <code>.canvas-node-content</code> | Hook |
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

## Shared states

Conditional presence, open/current, image, and layout states.

**DOM shape**

```text
Owning semantic hook
└─ .is-* / .has-* / .no-*
```

| Class | Kind | Owner |
| --- | --- | --- |
| <code>.has-image</code> | State | .page-hero |
| <code>.has-sidebar</code> | State | .layout-inner |
| <code>.has-sidebar-and-toc</code> | State | .layout-inner |
| <code>.has-toc</code> | State | .layout-inner |
| <code>.is-collapsible</code> | State | .site-tree-item-self / .mobile-nav-tree-item-self |
| <code>.is-current</code> | State | .site-tree-item-self / .mobile-nav-tree-item-self |
| <code>.is-open</code> | State | navigation dropdowns and collapsible tree items |
| <code>.is-plain</code> | State | .rendered-mdx |
| <code>.is-scrolled</code> | State | .site-navbar |
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
