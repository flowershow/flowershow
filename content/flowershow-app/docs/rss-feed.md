---
title: RSS Feed
description: Enable an RSS feed for your site so readers can subscribe to your content.
---

## Enabling the RSS feed

To enable the RSS feed, turn on the "RSS Feed" toggle in your site's settings in the dashboard.

Once enabled, your feed will be available at:

```
https://your-site-url/rss.xml
```

A `<link rel="alternate" type="application/rss+xml">` tag will be automatically added to every page on your site, so feed readers can auto-discover your feed.

## Which pages are included?

Only pages that have a `date` field in their frontmatter are included in the RSS feed. This is designed to work naturally with blog posts and other dated content.

```yaml
---
title: My Blog Post
date: 2025-06-15
description: A short summary of the post.
authors:
  - alice
---
```

Pages without a `date` field (e.g. documentation pages, landing pages) are excluded.

## Feed metadata

The feed's title and description are taken from your site's [[config-file|config.json]]:

```json
{
  "title": "My Site",
  "description": "A site about interesting things"
}
```

If no config is set, the feed title defaults to your site's project name.

## Frontmatter fields used

| Field | Required | Used for |
|-------|----------|----------|
| `date` | Yes | Determines inclusion in feed and the item's publication date |
| `title` | No | Item title (falls back to file name) |
| `description` | No | Item summary |
| `authors` | No | Item author(s) |
