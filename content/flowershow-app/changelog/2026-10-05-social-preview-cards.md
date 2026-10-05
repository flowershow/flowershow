---
title: Every page gets its own social preview
date: 2026-10-05
description: Every page on your site now gets a generated social preview card with its title, description and site name, and a short description is computed when you haven't written one.
authors:
  - rufuspollock
image: "[[assets/changelog-social-preview-cards.webp]]"
showToc: false
---

Share any page and it now unfurls with its own preview card instead of a generic thumbnail. See [[seo-social-metadata|SEO and social media metadata]].

- **A card for every page:** a 1200×630 card with your logo (or a monogram), site name, page title, description and URL. Free sites include a small Flowershow mark; premium sites don't.
- **Your own image still wins on premium:** if you set an `image` on a page or your site, that image is used instead.
- **Protected sites stay private:** password-protected sites get a card with only the site name and tagline.
- **Descriptions when you haven't written one:** Flowershow uses the opening sentence of the page (up to 140 characters) for search results, previews, listings and RSS. It isn't repeated in the page header.

**Fixes**

- Premium pages without an image no longer produce a broken, empty image tag in their previews.
- Removed the stray `twitter:creator @flowershowapp` tag that was added to every user site.
