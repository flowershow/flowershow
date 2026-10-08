---
title: Brand your site with a custom footer
date: 2026-10-08
description: Premium sites can replace the default footer with their own Markdown, and any page can hide the navbar or footer.
authors:
  - rufuspollock
showToc: false
---

Your footer can now look like the rest of your brand, with no custom code. Add a `_footer.md` file at the root of your site and it replaces the default footer on every page. And for landing pages that bring their own header, you can now hide the site navbar and footer page by page.

- **Custom footer (Premium):** write `_footer.md` like any page, with links, wiki links, images and HTML with Tailwind classes. It replaces the whole default footer, and it's never published as a page of its own.
- **Hide the chrome on a page (all plans):** set `showNavbar: false` and/or `showFooter: false` in a page's frontmatter. Pair them with `layout: plain` for a fully bespoke landing page. You can also set them in `config.json` to hide the navbar or footer site-wide.

See [[footer|Footer configuration]] and [[navbar|Navbar configuration]] for details.
