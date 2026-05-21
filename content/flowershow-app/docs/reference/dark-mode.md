---
title: Dark Mode
description: Enable and configure light/dark theme switching for your Flowershow site.
---

Configure dark mode from the **Flowershow dashboard** under **Site Settings → Appearance**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!important]
> Dark mode support varies by theme. If you're using one of the official Flowershow themes (other than the default), check the [flowershow/themes](https://github.com/flowershow/themes) repository to confirm dark mode is supported before enabling it.

## Default color mode

Go to **Settings → Appearance → Default Color Mode** and choose one of:

- **System** — follows the user's system preference (dashboard default)
- **Light** — always display in light mode
- **Dark** — always display in dark mode

This setting works independently of the theme switch — you can force your site into dark mode without giving visitors any option to change it.

## Theme switch

Go to **Settings → Appearance → Show Mode Switch** and toggle it on to display a light/dark mode toggle button for your visitors.

> [!note]
> The visitor's selection persists across page reloads.

You can see the theme switch in action on the [demo site](https://demo.flowershow.app/).

## Custom CSS support

If you're using custom CSS, you can support dark mode by targeting the `data-theme="dark"` attribute:

```css
/* Light theme styles (default) */
.site-navbar {
  background-color: white;
  color: black;
}

/* Dark theme styles */
[data-theme="dark"] .site-navbar {
  background-color: black;
  color: white;
}
```

> [!note]
> We're working on comprehensive documentation for CSS variables that you can use to easily customize colors for both light and dark themes.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "theme": {
    "defaultMode": "system",
    "showModeSwitch": true
  }
}
```

- `theme.defaultMode`: Default color mode — `"light"`, `"dark"`, or `"system"`. Defaults to `"light"` if not set.
- `theme.showModeSwitch`: Set to `true` to show a toggle for visitors to switch between modes. Hidden if not set.
