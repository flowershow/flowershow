---
title: Page contents as a tick rail
date: 2026-11-07
description: A quieter table of contents, a column of ticks that opens an outline on hover, plus a Contents block on phones.
authors:
  - rufuspollock
showToc: false
---

You can now show the page contents as a rail: a column of short ticks in the right-hand column, one per heading. The current section's tick is longer and in the accent colour. Hover or focus the rail to open the outline, then click a title to jump.

The rail is opt-in. Set `"toc": { "style": "rail" }` in `config.json`, or `toc: { style: rail }` in a page's frontmatter. See [[table-of-contents|Table of contents]].

**Fixes**

- Phones now get a Contents block on long pages
