---
title: "New Feature: Light/Dark Theme Switch"
description: "Flowershow now supports light and dark theme switching with configurable defaults"
date: 2025-09-18
authors: ["olayway"]
image: /assets/light-dark-mode.png
---

We've just added support for light and dark theme switching. This feature allows your readers to choose their preferred theme mode, making your content more enjoyable to read in different lighting conditions.

## Setting Default Theme

You can set the default theme mode for your site using the `defaultMode` option:

```json
{
  "theme": {
    "defaultMode": "dark"  // or "light" or "system"
  }
}
```

This setting determines how your site will be displayed:
- `"light"`: Always use light theme (default if not specified)
- `"dark"`: Always use dark theme
- `"system"`: Follow the user's system preferences

## Adding Theme Switch Button

If you want to allow users to change the theme mode themselves, you can enable the theme switch button:

```json
{
  "theme": {
    "showModeSwitch": true
  }
}
```

You can also combine both options:

```json
{
  "theme": {
    "defaultMode": "system",
    "showModeSwitch": true
  }
}
```

## Compatibility with Official Flowershow Themes

The legacy API where `theme: string` was used to specify the name of the official Flowershow theme is still supported, but if you want to enable the light/dark mode switch, you need to use the new API, where the theme name to use is nested within the `theme` object:

```json
{
  "theme": {
    "theme": "superstack",
    "defaultMode": "light",
    "showModeSwitch": true
  }
}
```

>[!important]
>If you're using one of the official Flowershow themes (other than the default theme), check the [flowershow/themes](https://github.com/flowershow/themes) repository first to ensure your chosen theme supports dark mode in the first place.

## Full Configuration Interface

Here's the complete theme configuration interface:

```typescript
export interface ThemeConfig {
  theme?: string; // name of the official theme to use
  defaultMode?: "light" | "dark" | "system";
  showModeSwitch?: boolean;
}
```

## Custom CSS Support

If you're using custom CSS and want to support dark mode, you can use the `data-theme="dark"` attribute to style your dark theme. Here's an example:

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
> We're working on comprehensive documentation for CSS variables that you can use to easily customize colors for both light and dark themes. Stay tuned for updates!

[See it in action on our demo site](https://demo.flowershow.app/)

Try enabling the theme switch on your Flowershow site and let us know what you think! We're always looking for feedback to improve the user experience.
