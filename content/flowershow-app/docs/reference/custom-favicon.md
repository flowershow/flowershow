---
title: Custom favicon
description: Set a custom favicon for your site using an image file or an emoji.
---

> [!note]
> Custom favicons are a premium feature. See [pricing](/pricing) for details.

> [!tip] Dashboard
> You can upload a favicon image in the [Flowershow dashboard](https://cloud.flowershow.app) under **Site Settings → General** — no `config.json` edits needed. For emoji favicons or `.ico` files, use `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

Add a `favicon` field to your `config.json`:

```json
{
  "favicon": "/assets/favicon.ico"
}
```

Place your favicon file in your site's repository (e.g. `/assets/favicon.ico`). Supported formats: `.ico`, `.png`, `.svg`. Use a square image, at least 32x32 pixels. Prefer `.ico` for broadest browser compatibility.

## Emoji favicons

For a quick alternative, pass an emoji directly:

```json
{
  "favicon": "🌸"
}
```

No image file needed — the emoji renders as your browser tab icon.

## Tips

- Keep designs simple — favicons are small and fine detail won't be visible.
- Ensure good contrast so the icon is recognizable at small sizes.
