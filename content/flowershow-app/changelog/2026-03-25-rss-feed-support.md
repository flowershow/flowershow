---
title: "RSS feed support"
date: 2026-03-25
description: Your Flowershow sites can now serve an RSS feed, so readers can subscribe to your content in their favorite feed reader.
authors:
  - olayway
---

Flowershow now supports RSS feeds for published sites. Enable it with a single toggle in your dashboard settings and your site will serve a standard RSS 2.0 feed at `/rss.xml`.

## How it works

1. Go to your site's **Settings** page in the dashboard
2. Toggle **RSS Feed** on
3. Your feed is live at `https://your-site/rss.xml`

Feed readers will auto-discover your feed thanks to a `<link rel="alternate" type="application/rss+xml">` tag added to every page.

## What's included in the feed

Only pages with a `date` field in their frontmatter are included -- this means blog posts and other dated content appear in the feed, while documentation and landing pages are excluded.

Each feed item includes the page title, publication date, description, and author(s) when available in frontmatter.

## Feed metadata

The feed title and description are pulled from your site's `config.json`. If no config is set, the feed title defaults to your project name.

For full details, see the [[rss-feed|RSS Feed documentation]].
