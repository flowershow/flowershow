---
title: "URL Redirects"
date: 2025-10-20
description: "Flowershow now supports URL redirects, making it easier to manage your content's URLs and maintain backwards compatibility."
authors:
  - olayway
---

We're excited to announce that Flowershow now supports URL redirects This feature allows you to easily redirect old URLs to new ones, helping you maintain backwards compatibility when restructuring your content.

## How It Works

Redirects are configured in your `config.json` file using a simple format. Each redirect consists of a `from` path (the old URL) and a `to` path (the new URL). When a user visits the old URL, they'll be automatically redirected to the new one.

Here's how to set up redirects in your `config.json`:

```json
{
  "redirects": [
    { "from": "/old-path", "to": "/new-path" },
    { "from": "/another-old-path", "to": "/another-new-path" }
  ]
}
```

## Use Cases

URL redirects are useful in several scenarios:

1. **Content Restructuring**: When you reorganize your documentation or blog posts, redirects ensure old bookmarks and links continue to work.
2. **URL Cleanup**: If you want to improve your URL structure for SEO or readability, redirects help maintain the user experience during the transition.
3. **Content Consolidation**: When merging multiple pages into one, redirects help users find the new consolidated content.

## Example

Here's a real example from our own config.json:

```json
{
  "redirects": [
    { "from": "/docs/site-wide-toc", "to": "/docs/sidebar" }
  ]
}
```

In this case, we've renamed some documentation page to better reflect their content. Thanks to redirects, all existing links to these pages will automatically forward users to the new locations.
