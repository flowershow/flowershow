---
title: Restyle tag pills and List cards with stable CSS hooks
date: 2026-10-08
description: Recolor every tag pill with four CSS variables, target List cards and their empty and error states by name, and build full-width plain pages without width hacks.
authors:
  - rufuspollock
image: "[[assets/changelog-brand-tags-and-lists.webp]]"
showToc: false
---

Branding your site in `custom.css` no longer means copying internal selectors or reaching for `!important`. The parts people most often restyle now have documented hooks.

- **Tag pill colors:** set `--color-tag-pill-text`, `--color-tag-pill-bg` and their `-hover` variants on `:root` to recolor every tag pill: the page-header row, inline `#tags` and the `/tags` pages. A plain `:root` override works in light and dark mode. Sites that set nothing still get the same pink pills. See [Tag pill colors](/docs/reference/custom-styles#tag-pill-colors).
- **List cards:** the [[list-component|List component]] now has named classes for the headline and image links (`.list-component-item-headline-link`, `.list-component-item-media-link`) and for its "No items found" and error messages (`.list-component-empty`, `.list-component-error`). Nothing changes visually. See [List component styling](/docs/reference/list-component#styling) for a whole-card-clickable recipe.
- **Full-width plain pages:** content on `layout: plain` pages spans the full width, with no max-width, padding or margin, and this is now documented and covered by tests. Build edge-to-edge bands without a `100vw` breakout. See [Full-width sections](/docs/reference/custom-styles#full-width-sections).

All hooks are listed in the [[theme-class-reference|theme class reference]].
