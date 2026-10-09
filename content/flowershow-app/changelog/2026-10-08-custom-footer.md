---
title: Customize your site even more
date: 2026-10-08
description: Premium sites can replace the default footer and navbar with their own HTML, any page can hide the navbar or footer, and brand fonts, tag colors and list cards are easier to style.
authors:
  - rufuspollock
image: "[[assets/changelog-customize-your-site.webp]]"
showToc: false
---

Your site can now look even more like the rest of your brand. Add a `_footer.html` file at the root of your site and it replaces the default footer on every page; add a `_navbar.html` and it replaces the navbar content. For landing pages that bring their own header, you can hide the site navbar and footer page by page.

> ⭐️ **Custom footers and navbars are Premium features.** Premium is $5/month or $50/year per site. [See pricing](/pricing)

- **Custom footer (Premium):** write `_footer.html` as an HTML fragment, with links, images and Tailwind classes. Relative `href` and `src` paths resolve from your site root on every page (in pages they resolve from the page's own folder). It replaces the whole default footer, and it's never served as a page of its own.
- **Custom navbar (Premium):** write `_navbar.html` the same way to replace the navbar content (logo, links, dropdowns, CTA) with your own. The bar stays sticky and keeps search and the dark-mode toggle if you've turned them on. Page links navigate instantly, the current page is marked, and a `<details>` element gives you a dropdown or a mobile menu with no JavaScript.
- **Hide the navbar or footer on a page (all plans):** set `showNavbar: false` and/or `showFooter: false` in a page's frontmatter. Pair them with `layout: plain` for a fully bespoke landing page. You can also set them in `config.json` to hide the navbar or footer site-wide.

Follow the step-by-step guide [[custom-navbar-and-footer|Give your site a custom navbar and footer]], or see [[footer|Footer configuration]] and [[navbar|Navbar configuration]] for details.

**More ways to style your site**

- **Brand fonts without a giant `custom.css`:** publish your `.woff2` files alongside your site and point to them from `custom.css`, or import Google Fonts. See [[custom-fonts|Custom fonts]].
- **Tag pill colors:** recolor tag pills with four CSS variables (`--color-tag-pill-text`, `-bg`, `-text-hover`, `-bg-hover`). See [[tags|Tags]].
- **List cards:** the `<List>` component has documented, stable class names, including new hooks for item links and the empty and error states. See [[list-component|List component]].
- **Full-width plain pages:** `layout: plain` pages already span the full width, so full-bleed sections need no `100vw` workaround. See [Custom styles](/docs/reference/custom-styles).

**Fixes**

- `custom.css` now loads as a stylesheet the browser caches, instead of being copied into every page, so pages are smaller and repeat visits are faster. Relative `url()` paths in `custom.css` (like `url('fonts/Brand.woff2')`) now resolve from your site root; previously they resolved against each page's URL and broke on nested pages.
- The custom styles docs said Flowershow uses CSS cascade layers so `custom.css` always wins. It doesn't: `custom.css` loads after the theme, so a rule with equal or higher specificity wins. The docs now say so.
- Setting `--navbar-height` in your CSS now actually changes the navbar's height, and heading anchor links and the changelog's sticky date follow it too. Before, only the sidebar and table of contents moved.
