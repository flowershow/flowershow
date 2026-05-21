---
title: Custom favicon
description: Set a custom favicon for your site using an image file or an emoji.
---

Configure a custom favicon from the **Flowershow dashboard** under **Site Settings → General**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> Custom favicons are a premium feature. See [pricing](/pricing) for details.

## Favicon

Go to **Settings → General → Favicon** and upload a PNG, JPG, WebP, or SVG image to use as your browser tab icon.

> [!note]
> To use an emoji as your favicon, use `config.json`.

## Tips

- Keep designs simple — favicons are small and fine detail won't be visible.
- Ensure good contrast so the icon is recognizable at small sizes.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "favicon": "/assets/favicon.png"
}
```

Place your favicon file in your site's repository (e.g. `/assets/favicon.png`). Supported formats: `.png`, `.svg`. Use a square image, at least 32x32 pixels.

For a quick alternative, pass an emoji directly:

```json
{
  "favicon": "🌸"
}
```

No image file needed — the emoji renders as your browser tab icon.

- `favicon`: Path to your favicon file (relative to site root), or an emoji character.
