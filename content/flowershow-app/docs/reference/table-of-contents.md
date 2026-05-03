---
title: Table of contents
description: Control visibility of the page table of contents
---

The table of contents visible on the right hand side of the page is enabled by default.

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
