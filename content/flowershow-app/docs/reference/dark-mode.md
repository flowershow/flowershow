---
title: Dark Mode
description: Enable and configure light/dark theme switching for your Flowershow site.
---

## Setting Default Theme Mode

You can set the default theme mode for your site using the `defaultMode` option in your `config.json`:

```json
{
  "theme": {
    "defaultMode": "dark"  // or "light" or "system"
  }
}
```

This setting determines how your site will be displayed:
- `"light"`: Always use light theme
- `"dark"`: Always use dark theme
- `"system"`: Follow the user's system preferences (default if not specified)

## Enabling Theme Switch

If you want to allow users to change the theme mode, you can enable the theme switch button using the `showModeSwitch` option:

```json
{
  "theme": {
    "showModeSwitch": true
  }
}
```

You can combine both options to set a default theme and allow users to change it:

```json
{
  "theme": {
    "defaultMode": "system",
    "showModeSwitch": true
  }
}
```

## Official Theme Compatibility

> [!important]
> If you're using one of the official Flowershow themes (other than the default theme), check the [flowershow/themes](https://github.com/flowershow/themes) repository first to ensure your chosen theme supports dark mode.

When using an official theme with dark mode support, include the theme name in your configuration:

```json
{
  "theme": {
    "theme": "superstack",    // name of the official theme
    "defaultMode": "light",   // optional: set initial theme
    "showModeSwitch": true    // optional: allow theme switching
  }
}
```

## Full Configuration Interface

Here's the complete theme configuration interface:

```typescript
export interface ThemeConfig {
  theme?: string;            // name of the official theme to use
  defaultMode?: "light" | "dark" | "system";
  showModeSwitch?: boolean;
}
```

## Custom CSS Support

If you're using custom CSS, you can support dark mode by using the `data-theme="dark"` attribute selector. Here's an example:

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

## Default Behavior

- If `defaultMode` is not specified, the site uses light theme 
- If `showModeSwitch` is not specified, the theme toggle button is hidden
- The theme selection persists across page reloads

You can see the theme switch in action on our [demo site](https://demo.flowershow.app/).