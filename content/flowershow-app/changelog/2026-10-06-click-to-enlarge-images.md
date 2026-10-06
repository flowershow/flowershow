---
title: Click an image to see it full size
date: 2026-10-06
description: Clicking an image on a page now opens the original file full size in a lightbox.
authors:
  - olayway
showToc: false
---

Clicking an image on a page now opens it full size on a black background. Click again or press Esc to close it.

- **Supported syntax:** `![]()`, `![[...]]` and `<img>` tags in `.md` and `.mdx` files. No configuration needed.
- **Original file:** the lightbox shows the original image, not the resized version used on the page.
- **Keyboard:** images can be focused with Tab and opened with Enter or Space.

**Fixes**

- `width` and `height` on an HTML `<img>` tag in a `.md` file are no longer dropped.
