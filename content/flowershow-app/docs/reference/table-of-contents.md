---
title: Table of contents
description: Control visibility of the page table of contents
---

The table of contents visible on the right hand side of the page is enabled by default.

> [!tip] Dashboard
> The table of contents can be toggled in the [Flowershow dashboard](https://cloud.flowershow.app) under **Site Settings → Content** — no `config.json` edits needed. Values set in `config.json` take precedence over dashboard settings.

To disable it globally, set the `showToc` variable to `false` in your [[config-file|`config.json`]]:

```json
showToc: false
```

You can also disable it on per-page basis or override your global config, by setting `showToc` to **true** or **false** in the frontmatter, like so:

```md
---
showToc: false
---

Page content
```
