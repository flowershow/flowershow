---
title: Customize your site even more
date: 2026-10-08
description: Premium sites can replace the default footer with their own Markdown, any page can hide the navbar or footer, and brand fonts, tag colors and list cards are easier to style.
authors:
  - rufuspollock
image: "[[assets/changelog-customize-your-site.webp]]"
showToc: false
---

Your site can now look even more like the rest of your brand. Add a `_footer.md` file at the root of your site and it replaces the default footer on every page. For landing pages that bring their own header, you can hide the site navbar and footer page by page.

> ⭐️ **Custom footers are a Premium feature.** Premium is $5/month or $50/year per site. [See pricing](/pricing)

- **Custom footer (Premium):** write `_footer.md` like any page, with links, wiki links, images and HTML with Tailwind classes. It replaces the whole default footer, and it's never published as a page of its own.
- **Hide the navbar or footer on a page (all plans):** set `showNavbar: false` and/or `showFooter: false` in a page's frontmatter. Pair them with `layout: plain` for a fully bespoke landing page. You can also set them in `config.json` to hide the navbar or footer site-wide.

See [[footer|Footer configuration]] and [[navbar|Navbar configuration]] for details.

**More ways to style your site**

- **Brand fonts without a giant `custom.css`:** publish your `.woff2` files alongside your site and point to them from `custom.css`, or import Google Fonts. See [[custom-fonts|Custom fonts]].
- **Tag pill colors:** recolor tag pills with four CSS variables (`--color-tag-pill-text`, `-bg`, `-text-hover`, `-bg-hover`). See [[tags|Tags]].
- **List cards:** the `<List>` component has documented, stable class names, including new hooks for item links and the empty and error states. See [[list-component|List component]].
- **Full-width plain pages:** `layout: plain` pages already span the full width, so full-bleed sections need no `100vw` workaround. See [Custom styles](/docs/reference/custom-styles).

**Fixes**

- `custom.css` now loads as a stylesheet the browser caches, instead of being copied into every page, so pages are smaller and repeat visits are faster. Relative `url()` paths in `custom.css` (like `url('fonts/Brand.woff2')`) now resolve from your site root; previously they resolved against each page's URL and broke on nested pages.
- The custom styles docs said Flowershow uses CSS cascade layers so `custom.css` always wins. It doesn't: `custom.css` loads after the theme, so a rule with equal or higher specificity wins. The docs now say so.
- Setting `--navbar-height` in your CSS now actually changes the navbar's height, and heading anchor links and the changelog's sticky date follow it too. Before, only the sidebar and table of contents moved.
