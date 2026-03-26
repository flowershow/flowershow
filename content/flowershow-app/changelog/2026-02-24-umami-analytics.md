---
title: Umami analytics support
description: Add Umami analytics to your site with a single line in config.json.
image: "[[assets/umami-analytics.png]]"
showToc: false
---

You can now add [Umami](https://umami.is/) analytics to your Flowershow site.

Set your website ID in `config.json`:

```json
{
  "umami": "your-website-id"
}
```

Self-hosted Umami is also supported — use the extended form with a custom `src` URL.

See the [[umami|Umami analytics docs]] for full details.
