---
title: Custom styles
description: Customize the appearance of your site with CSS.
---

## Creating the file

1. Create a new file named `custom.css` in the root of your repository (or the root directory of your site if you're publishing from a subfolder)
2. Add your CSS rules to customize colors, fonts, layouts, and more
3. Commit and sync your site to apply the changes

## Theme variables you can override

Flowershow exposes CSS custom properties (variables) in `:root`.
You can override them in `custom.css` without touching app code.

### Core color variables

```css
:root {
  --color-l-background: #ffffff;
  --color-l-foreground: #525252;
  --color-l-accent: #fb923c;

  --color-d-background: #0c0a09;
  --color-d-foreground: #d6d3d1;
  --color-d-accent: #fb923c;
}
```

- `--color-l-*`: light theme palette
- `--color-d-*`: dark theme palette
- `--color-foreground`, `--color-background`, and `--color-accent` are computed from these values automatically.

### Typography variables

```css
:root {
  --font-heading: "Inter", sans-serif;
  --font-body: "Inter", sans-serif;

  --font-size-base: 1rem;
  --font-size-h1: calc(var(--font-size-base) * 2.25);
  --font-size-h2: calc(var(--font-size-base) * 1.75);

  --line-height-normal: 1.5;
  --font-weight-normal: 400;
  --font-weight-bold: 700;
}
```

Available font-related tokens include:

- `--font-heading`, `--font-body`
- Weights: `--font-weight-thin` … `--font-weight-black`
- Sizes: `--font-size-xxs`, `--font-size-xs`, `--font-size-sm`, `--font-size-h5`, `--font-size-h4`, `--font-size-h3`, `--font-size-h2`, `--font-size-h1`, `--font-size-xl`, `--font-size-xxl`
- Line heights: `--line-height-none`, `--line-height-tight`, `--line-height-snug`, `--line-height-normal`, `--line-height-relaxed`, `--line-height-loose`

### Semantic shades

Flowershow generates extra shades from your foreground/accent colors.
These are used across navigation, content, borders, and interactive states:

- `--color-foreground-50` … `--color-foreground-900`
- `--color-accent-lighter`
- `--color-accent-darker`

You usually should **not** override these directly. Prefer changing the base values (`--color-l-*` / `--color-d-*` / `--color-*-accent`) and let Flowershow derive the rest.

## Practical examples

### Example 1: change the accent color in both themes

```css
:root {
  --color-l-accent: #0ea5e9;
  --color-d-accent: #38bdf8;
}
```

### Example 2: bigger readable body text

```css
:root {
  --font-size-base: 1.0625rem;
  --line-height-normal: 1.65;
}
```

### Example 3: custom heading font only

```css
:root {
  --font-heading: "Space Grotesk", sans-serif;
}
```

> [!tip]
> Keep overrides in `:root` where possible. This gives you broad, consistent changes with less CSS.

> [!info]
> For a detailed guide including examples and step-by-step instructions, check out [[how-to-customize-style|this blog post]].
