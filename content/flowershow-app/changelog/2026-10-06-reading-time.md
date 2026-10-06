---
title: Show reading time in the page header
date: 2026-10-06
description: Pages can show an estimated reading time, like "8 min read", next to the authors and date.
authors:
  - olayway
showToc: false
---

Long guides and essays can now tell readers up front how long they'll take. Turn on reading time and the page header shows an estimate like "8 min read", next to the authors and date.

- **Site-wide:** toggle **Show Reading Time** under **Settings → Content** in the dashboard, or set `"showReadingTime": true` in `config.json`. It's off by default.
- **Per page:** set `showReadingTime: true` or `false` in a page's frontmatter to override the site setting.
- **How it's calculated:** word count at 200 words per minute, rounded up.

See [[page-headers#reading-time|Page headers]] for details.
