---
title: Redirect a whole folder with one rule
date: 2026-10-19
description: Moved or renamed a folder? One redirect rule now sends every page in it to its new address, and redirects no longer hide pages you still publish.
authors:
  - olayway
image: "[[assets/changelog-folder-redirects.webp]]"
showToc: false
---

When you move a section of your site, every old link to it used to need its own redirect. Now one rule covers the whole folder. End `from` with `/*`, and put `:splat` in `to` where the rest of the path should go:

```json
{
  "redirects": [
    { "from": "/notes/*", "to": "/garden/:splat" }
  ]
}
```

`/notes/recipes/bread` now goes to `/garden/recipes/bread`, and `/notes` goes to `/garden`. The target can be another site too, such as `"https://handbook.example.com/:splat"`. We used this ourselves to replace 28 redirect rules for our old Markdown guides with one.

- **Your pages always win.** A redirect now only applies when nothing is published at the old path. Before, a forgotten rule could hide a page you had since added back, so visitors never reached it. If you do want visitors sent away from a page, unpublish or delete it and the redirect takes over.
- **First match wins**, so a rule for one renamed page goes above the folder rule.

See [[redirects|URL redirects]] for all the options.
