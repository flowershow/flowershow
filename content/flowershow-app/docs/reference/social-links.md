---
title: Social links
description: Add social media icons to your site's navbar and footer.
---

Configure social links from the **Flowershow dashboard** under **Site Settings → Navigation**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> Social links appear in both the navbar and footer. Configure them once and they'll show in both locations.

## Adding social links

Go to **Settings → Navigation → Social Links** and enter your links as a JSON array:

```json
[
  { "label": "github", "name": "GitHub Profile", "href": "https://github.com/yourusername" },
  { "label": "twitter", "name": "Follow me on Twitter", "href": "https://twitter.com/yourusername" },
  { "label": "linkedin", "name": "LinkedIn", "href": "https://linkedin.com/in/yourusername" }
]
```

Each link requires:
- `label`: Platform identifier (see supported platforms below)
- `href`: Your social media profile URL

Optional:
- `name`: Text label (used in sidebar mode)

## Supported platforms

- `bluesky` (or `bsky`)
- `discord`
- `facebook`
- `github`
- `instagram`
- `linkedin`
- `mastodon`
- `pinterest`
- `reddit`
- `spotify`
- `substack`
- `telegram`
- `threads`
- `tiktok`
- `twitter` (or `x`)
- `whatsapp`
- `youtube`

> [!info] Missing your favorite platform?
> If your platform isn't listed, skip the `label` and Flowershow will display a generic 🌐 icon. Consider submitting an issue to request support for your platform!

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "social": [
    { "label": "github", "name": "GitHub Profile", "href": "https://github.com/yourusername" },
    { "label": "twitter", "name": "Follow me on Twitter", "href": "https://twitter.com/yourusername" }
  ]
}
```

- `social`: Root-level array of social link objects (same format as the dashboard JSON editor)
