---
title: Publish HTML, not just Markdown
date: 2026-09-30
description: HTML pages publish as-is with their CSS, JavaScript and data, side by side with Markdown. New guides cover what you can publish and how.
authors:
  - rufuspollock
image: "[[assets/changelog-file-types.webp]]"
showToc: false
---

Put Markdown, HTML, data, images and Obsidian Canvas files in one folder and publish it as one site. Markdown gets your theme and navigation; HTML is served exactly as written, so the report or dashboard you built keeps its own styles and scripts.

- **Supported file types:** what each file becomes, the URL it gets (`.html` URLs keep their extension) and publish limits. See [Supported file types](/docs/reference/supported-file-types).
- **Publishing HTML guide:** standalone HTML sites, and HTML inside Markdown pages. See [Publishing HTML](/docs/agents/html).

**Fixes**

- Updated CSS, JavaScript and images now show up right after you republish, instead of being cached for several minutes. Deleted files stop loading too. Works with every publishing method, including older CLI versions.
- The [Obsidian Canvas](/docs/reference/obsidian-canvas) docs now give the right URL for canvas pages (no `.canvas` extension).
