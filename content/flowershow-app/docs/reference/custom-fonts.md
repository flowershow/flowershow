---
title: Custom fonts
description: Change your site's fonts using Google Fonts and CSS.
---

Import fonts from Google Fonts in your `custom.css` file, then apply them with CSS.

## Quick start

1. Pick fonts at [fonts.google.com](https://fonts.google.com) and copy the `@import` code
2. Create or open `custom.css` in your site root
3. Add the import and font rules:

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap');

/* Headings */
article :is(h1, h2, h3, h4, h5, h6) {
  font-family: 'Playfair Display', Georgia, serif !important;
}

/* Body text */
article :not(h1, h2, h3, h4, h5, h6) {
  font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif !important;
}
```

You can also use the CSS variables from [[custom-styles|Custom Styles]] instead:

```css
:root {
  --font-heading: 'Playfair Display', Georgia, serif;
  --font-body: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

## Tips

- Use `!important` to override the default theme styles
- Include system font fallbacks after your Google Font name
- Stick to 2-3 fonts for performance
- Import the full weight range to preserve bold/italic styling from the typography plugin
- Use semantic selectors (`h1`, `article`) not Tailwind classes — they're more stable

> [!info]
> For a detailed walkthrough with screenshots, see the [[blog/how-to-set-custom-fonts|custom fonts tutorial]].
