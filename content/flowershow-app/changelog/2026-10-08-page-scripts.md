---
title: Add JavaScript to a single page
date: 2026-10-08
description: Premium sites can load their own JavaScript files on one page with the new scripts frontmatter field, and it runs on every visit.
authors:
  - olayway
showToc: false
---

You can now add interactivity to a single page, like a calculator, a toggle or a chart, without loading that code across your whole site. List your `.js` files in the page's frontmatter:

```yaml
---
title: Pricing calculator
scripts:
  - /js/calculator.js
---
```

- **Runs on every visit:** on a full page load, when readers navigate to the page from elsewhere on your site, and when they come back to it.
- **Your files or a CDN:** use paths from your site root or relative to the page, or `https://` URLs. Up to 10 scripts per page, run in order.
- **Works in `.md` and `.mdx` pages.**
- **Premium only.** On free sites the field is ignored.

See [[page-scripts|Page scripts]] for path rules and a script template that is safe to run on repeat visits.

**Fixes**

- The [Publishing HTML](/docs/agents/html) docs said `<script>` tags in Markdown pages don't run. They do run on a full page load, but not when readers reach the page by clicking a link within the site. The docs now say so and point to page scripts.
