---
title: RSS Feed
description: Enable an RSS feed for your site so readers can subscribe to your content.
---

Configure the RSS feed for your site from the **Flowershow dashboard** under **Site Settings → Features**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

## Enabling the RSS feed

Go to **Settings → Features → RSS Feed** and toggle it on.

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

The feed's title and description are taken from your site's name and description settings. The feed title is your site name (**Settings → General → Name**, or `siteName` in `config.json`).

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "enableRss": true,
  "siteName": "My Site",
  "description": "A site about interesting things"
}
```

- `enableRss`: Set to `true` to enable the RSS feed
- `siteName`: Feed title — your site's name (defaults to your project name). `title` is still accepted as a deprecated alias.
- `description`: Feed description

## Frontmatter fields used

| Field         | Required | Used for                                                     |
| ------------- | -------- | ------------------------------------------------------------ |
| `date`        | Yes      | Determines inclusion in feed and the item's publication date |
| `title`       | No       | Item title (falls back to file name)                         |
| `description` | No       | Item summary                                                 |
| `authors`     | No       | Item author(s)                                               |
