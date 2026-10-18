---
title: Fixed pages that never finished loading, and redirects on flowershow.me sites
date: 2026-10-18
description: Sites using the default theme could hang while loading, and config.json redirects showed a 404 on flowershow.me sites. Both are fixed.
authors:
  - rufuspollock
image: "[[assets/changelog-fixes-theme-hang-redirects.webp]]"
showToc: false
---

Two bugs this week stopped some sites working properly. Both are fixed, and you don't need to change anything.

**Fixes**

- **Pages that never finished loading.** If your `config.json` set `"theme": "default"`, your pages asked for a theme stylesheet that doesn't exist. Browsers waited for it, so pages could hang and per-page scripts never ran. Default, unknown and empty theme names no longer load a stylesheet. If you added `"theme": "default"` as a workaround, you can keep it or remove it.
- **Redirects on flowershow.me sites.** `redirects` in `config.json` sent visitors to a broken `/@user/site/...` address that showed a 404. They now go to the page you set. See [[redirects|Redirects]].
