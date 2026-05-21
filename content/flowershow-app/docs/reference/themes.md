---
title: Themes
description: Change the look of your site in one line of config.
---

Configure your site's theme from the **Flowershow dashboard** under **Site Settings → Appearance**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

## Available themes

| Theme           | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| **Letterpress** | Clean, modern theme with balanced typography and whitespace |
| **Superstack**  | Inspired by Substack's visual design                        |
| **LessFlowery** | Inspired by LessWrong's visual style                        |
| **Leaf**        | Nature-inspired theme with subtle green colors              |

Browse all themes with previews on the [flowershow/themes](https://github.com/flowershow/themes) repository.

## Select a theme

Go to **Settings → Appearance → Theme** and choose a theme from the dropdown. Your site will use the selected theme on next publish.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "theme": "letterpress"
}
```

- `theme`: Name of the theme to apply. One of `letterpress`, `superstack`, `lessflowery`, `leaf`.

## Customizing further

Want to tweak colors, fonts, or spacing beyond what a theme provides? Create a `custom.css` file in your site root. See [[custom-styles|Custom Styles]] for available CSS variables and examples.

For light/dark mode configuration, see [[dark-mode|Dark Mode]].
