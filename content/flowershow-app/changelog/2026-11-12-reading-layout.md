---
title: Give essays and courses a reading layout
date: 2026-11-12
description: Set "layout": "reading" to centre the text, put the page contents on the left as a rail and move the site contents behind a menu button.
authors:
  - rufuspollock
showToc: false
---

Your site can now have a reading layout. Add `"layout": "reading"` to `config.json` and every page gets a centred reading column, its page contents as a rail of ticks at the far left, and the site contents behind a menu button at the top left. Pages that are not posts get previous and next links, so readers can move through a course or a set of essays without opening the menu.

The default layout, now called `docs`, is unchanged: site contents on the left, page contents on the right. Set `layout: docs` or `layout: reading` in a page's frontmatter to change one page. For a home page that keeps the site contents while the pages behind it use the reading layout, set the site to `reading` and the home page to `docs`.

See [[site-layouts|Site layouts]] for the recipes and the rules.
