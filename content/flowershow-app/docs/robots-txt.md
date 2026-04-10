---
title: Custom robots.txt
description: Control how search engines crawl your Flowershow site by publishing a robots.txt file from your vault.
---

By default, Flowershow serves an auto-generated `robots.txt` that allows all crawlers and links to your sitemap. If you publish a `robots.txt` file in your vault, it will be used instead.

## How to use

Add a `robots.txt` file to the root of your content (or your configured `rootDir`) and publish your site. Flowershow will automatically serve it at `yourdomain.com/robots.txt`.

**Example `robots.txt`:**

```
User-agent: *
Allow: /

User-agent: GPTBot
Disallow: /

Sitemap: https://yourdomain.com/sitemap.xml
```

## Default behavior

If no `robots.txt` is found in your published content, Flowershow serves this default:

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://yourdomain.com/sitemap.xml
```

## Notes

- The file must be named exactly `robots.txt` (lowercase)
- It must be at the root of your published content — placing it in a subfolder won't work
- If you use `rootDir`, put the file inside that directory
- Changes take effect after your next publish/sync
