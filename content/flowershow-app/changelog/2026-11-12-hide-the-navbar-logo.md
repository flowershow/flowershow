---
title: Hide the navbar logo
date: 2026-11-12
description: Turn the navbar logo off entirely, plus fixes for uploaded logos, replaced images and custom domain setup.
authors:
  - olayway
showToc: false
---

You can now show no logo at all in your navbar, not even the Flowershow logo that appears when you haven't set one. Turn off **Show Logo** under **Settings → Navigation**, or set `"showLogo": false` in `config.json`. See [[navbar|Navbar configuration]].

**Fixes**

- Logos uploaded in the dashboard keep their shape. They used to be cropped to a thin strip and stretched into a square, so they looked zoomed in. If you uploaded your logo before today, upload it again.
- Replacing a logo, favicon or social image in the dashboard shows the new image right away, instead of the old one for a while.
- Adding a custom domain no longer sends visitors of a public site to it before the domain works. Your pages stay reachable on the Flowershow address until your DNS is set up, then redirect to your domain.
