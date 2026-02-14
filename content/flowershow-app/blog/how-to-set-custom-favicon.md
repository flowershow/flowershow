---
title: How to Set a Custom Favicon
description: Learn how to set a custom favicon for your Flowershow site
date: 2025-06-12
authors:
  - olayway
image: /assets/custom-favicon.png
---

> [!note]
> Custom favicons are a premium feature. Check out our [pricing page](https://flowershow.app/pricing) to learn more about premium features.

A favicon is a small icon that appears in your browser's address bar, tabs, and bookmarks. It helps users identify your site quickly and adds a professional touch to your web presence. Premium Flowershow sites can now set custom favicons.

## Setting up your favicon

1. First, prepare your favicon file. Common formats include .`ico`, `.png`, and `.svg`. Make sure your icon is square and at least 16x16 pixels (32x32 or 64x64 are recommended for better quality).

2. Add your favicon file to your site's repository. For example, you might place it at `/assets/favicon.ico`.

3. Configure your favicon in your [[config-file|`config.json` file]] by adding the `favicon` field:

```json
{
  "favicon": "/assets/favicon.ico"
}
```

That's it! After your next deployment, your custom favicon will appear in browser tabs and bookmarks.

## Using Emoji Favicons

For a quick and fun way to set your favicon, you can use an emoji! Simply pass the emoji character directly to the `favicon` field in your `config.json`:

```json
{
  "favicon": "🐶"
}
```

This is a great option if you want to quickly set a distinctive favicon without creating image files.

## Tips for creating a good favicon

- Keep it simple - favicons are small, so complex designs won't be visible
- Ensure good contrast - your icon should be recognizable even at small sizes
- Test different sizes - your favicon should look good both in browser tabs and bookmarks
- Consider using .ico format for best browser compatibility
