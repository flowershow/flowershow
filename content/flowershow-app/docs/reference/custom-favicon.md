---
title: Custom favicon
description: Set a custom favicon for your site using an image file or an emoji.
---

> [!note]
> Custom favicons are a premium feature. See [pricing](/pricing) for details.

Add a `favicon` field to your `config.json`:

```json
{
  "favicon": "/assets/favicon.ico"
}
```

Place your favicon file in your site's repository (e.g. `/assets/favicon.ico`). Supported formats: `.ico`, `.png`, `.svg`. Use a square image, at least 32x32 pixels.

## Emoji favicons

For a quick alternative, pass an emoji directly:

```json
{
  "favicon": "🌸"
}
```

No image file needed — the emoji renders as your browser tab icon.
