---
title: Themes
description: Change the look of your site in one line of config.
showHero: true
---

Flowershow comes with official themes you can apply instantly. Each theme is a CSS file served from CDN — no installation required.

## Available Themes

| Theme | Description |
|-------|-------------|
| **Letterpress** | Clean, modern theme with balanced typography and whitespace |
| **Superstack** | Inspired by Substack's visual design |
| **LessFlowery** | Inspired by LessWrong's visual style |
| **Leaf** | Nature-inspired theme with subtle green colors |

Browse all themes with previews on the [flowershow/themes](https://github.com/flowershow/themes) repository.

## Quick Start

Add a `theme` field to your `config.json`:

```json
{
  "theme": "letterpress"
}
```

That's it. Your site will use the selected theme on next publish.

## Customizing Further

Want to tweak colors, fonts, or spacing beyond what a theme provides? Create a `custom.css` file in your site root. See [[custom-styles|Custom Styles]] for available CSS variables and examples.

For light/dark mode configuration, see [[dark-mode|Dark Mode]].
