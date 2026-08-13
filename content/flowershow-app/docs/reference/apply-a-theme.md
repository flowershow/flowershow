---
title: Apply a theme
description: Apply one of Flowershow's themes from the dashboard or config.json, and customize it further.
---

A theme sets your site's overall look — typography, colors, and spacing — in one line of config. Browse the options and preview them live on the [Themes](/docs/reference/themes) page, then apply your pick using either method below.

## Apply a theme

**From the dashboard:** go to **Site Settings → Appearance → Theme** and choose a theme from the dropdown. Your site uses it on the next publish.

**From `config.json`:** set the `theme` key. Values in `config.json` take precedence over the dashboard, so this is the best option if you want to version-control your settings or let an editor's AI agent manage them.

```json
{
  "theme": "letterpress"
}
```

## Customizing further

Themes are a starting point. To tweak colors, fonts, or spacing on top of a theme, add a `custom.css` file — see [Custom styles](/docs/reference/custom-styles) for the available CSS variables and examples. For light and dark mode behavior, see [Dark mode](/docs/reference/dark-mode).
