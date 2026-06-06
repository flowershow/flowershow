---
title: Custom styles
description: Customize the appearance of your site with CSS.
---

## Creating the file

1. Create a new file named `custom.css` in the root of your repository (or the root directory of your site if you're publishing from a subfolder)
2. Add your CSS rules to customize colors, fonts, layouts, and more
3. Publish it along with your content.

Flowershow uses CSS cascade layers, so any rule you write in `custom.css` wins over the default theme without needing `!important`.

## Theme variables

Flowershow exposes CSS custom properties (variables) in `:root`.
You can override them in `custom.css` without touching app code.

The variables below are drawn from two source files in the Flowershow repository — browse them directly for the full picture:

- [default-theme.css](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/default-theme.css) — layout, typography, colors, border radius
- [callouts.css](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/callouts.css) — callout color tokens

### Colors

Set the base colors for light and dark themes:

```css
:root {
  /* Light theme */
  --color-l-background: #ffffff;
  --color-l-foreground: #525252;
  --color-l-accent: #fb923c;

  /* Dark theme */
  --color-d-background: #0c0a09;
  --color-d-foreground: #d6d3d1;
  --color-d-accent: #fb923c;
}
```

`--color-foreground`, `--color-background`, and `--color-accent` are resolved from these automatically depending on the active theme.

#### Foreground shade scale

Flowershow derives a 10-step shade scale from `--color-foreground`. These are used across navigation, content, borders, and interactive states:

- `--color-foreground-50` — subtlest (borders, hover backgrounds)
- `--color-foreground-100` … `--color-foreground-800`
- `--color-foreground-900` — strongest (headings, high-contrast text)

You generally should **not** override these directly. Change the base `--color-l-*` / `--color-d-*` values instead and let Flowershow derive the scale.

#### Accent shades

- `--color-accent-lighter`
- `--color-accent-darker`

Same advice applies: prefer changing `--color-l-accent` / `--color-d-accent`.

#### Semantic state colors

```css
:root {
  --color-danger: #dc2626;
  --color-warning: #d97706;
}
```

Used in error cards and warning indicators.

#### Code block backgrounds

```css
:root {
  --color-code-bg: #fafafa; /* light mode */
  --color-code-bg-dark: #2f2f2f; /* dark mode  */
}
```

#### CTA button colors

The navbar call-to-action button is unstyled by default (inherits foreground tones). Override these to brand it:

```css
:root {
  --color-cta-bg:       /* defaults to --color-foreground-700 */ --color-cta-bg-hover:
    /* defaults to --color-foreground-500 */
    --color-cta-text: /* defaults to #ffffff               */;
}
```

### Typography

#### Font families

```css
:root {
  --font-heading: "Inter", sans-serif;
  --font-body: "Inter", sans-serif;
}
```

#### Font sizes

All sizes are derived from `--font-size-base`. Override the base to scale everything proportionally, or override individual steps.

```css
:root {
  --font-size-base: 1rem;
  --font-size-xxs: calc(var(--font-size-base) * 0.5); /* 0.5rem  */
  --font-size-xs: calc(var(--font-size-base) * 0.75); /* 0.75rem */
  --font-size-sm: calc(var(--font-size-base) * 0.85); /* 0.85rem */
  --font-size-lg: calc(var(--font-size-base) * 1.125); /* 1.125rem */
  --font-size-xl: calc(var(--font-size-base) * 1.25); /* 1.25rem */
  --font-size-2xl: calc(var(--font-size-base) * 1.5); /* 1.5rem  */
  --font-size-3xl: calc(var(--font-size-base) * 1.75); /* 1.75rem */
  --font-size-4xl: calc(var(--font-size-base) * 2.25); /* 2.25rem */
  --font-size-5xl: calc(var(--font-size-base) * 2.6); /* 2.6rem  */
  --font-size-6xl: calc(var(--font-size-base) * 3.1); /* 3.1rem  */
}
```

#### Font weights

```css
:root {
  --font-weight-thin: 100;
  --font-weight-extralight: 200;
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  --font-weight-black: 900;
}
```

#### Line heights

```css
:root {
  --line-height-none: 1;
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;
}
```

### Border radius

Set `--radius` to `0` for sharp corners everywhere, or to a larger value for rounder components. The derived steps scale with it.

```css
:root {
  --radius: 0.375rem;
  --radius-xs: calc(var(--radius) * 0.67);
  --radius-md: calc(var(--radius) * 1.33);
  --radius-lg: calc(var(--radius) * 2);
  --radius-xl: calc(var(--radius) * 2.67);
}
```

### Layout heights

Used for sticky positioning of the navbar, sidebar, and TOC. Override if you change the navbar height or add a banner above it.

```css
:root {
  --navbar-height: 4rem;
  --subnav-height: 3rem; /* mobile breadcrumb/sidebar toggle bar */
}
```

### Callout colors

Each callout type maps to one of these tokens. Override them to retheme all callouts of that category at once.

```css
:root {
  --callout-note-color: oklch(0.623 0.214 259); /* blue   */
  --callout-tip-color: oklch(0.714 0.143 215); /* cyan   */
  --callout-success-color: oklch(0.723 0.219 142); /* green  */
  --callout-warning-color: oklch(0.705 0.191 55); /* orange */
  --callout-danger-color: oklch(0.627 0.258 29); /* red    */
  --callout-example-color: oklch(0.627 0.265 303); /* purple */
  --callout-quote-color: oklch(0.554 0.014 286); /* zinc   */
}
```

Callout type → color token mapping:

| Token                     | Types                                                        |
| ------------------------- | ------------------------------------------------------------ |
| `--callout-note-color`    | `note`, `info`, `todo`                                       |
| `--callout-tip-color`     | `tip`, `hint`, `important`, `abstract`, `summary`, `tldr`    |
| `--callout-success-color` | `success`, `check`, `done`                                   |
| `--callout-warning-color` | `warning`, `caution`, `attention`, `question`, `help`, `faq` |
| `--callout-danger-color`  | `danger`, `error`, `bug`, `failure`, `fail`, `missing`       |
| `--callout-example-color` | `example`                                                    |
| `--callout-quote-color`   | `quote`, `cite`                                              |

## Practical examples

### Change the accent color

```css
:root {
  --color-l-accent: #0ea5e9;
  --color-d-accent: #38bdf8;
}
```

### Bigger, more readable body text

```css
:root {
  --font-size-base: 1.0625rem;
  --line-height-normal: 1.65;
}
```

### Custom heading font

```css
:root {
  --font-heading: "Space Grotesk", sans-serif;
}
```

### Sharp corners throughout

```css
:root {
  --radius: 0;
}
```

### Custom CTA button

```css
:root {
  --color-cta-bg: #0ea5e9;
  --color-cta-bg-hover: #0284c7;
  --color-cta-text: #ffffff;
}
```

### Retheme warning callouts

```css
:root {
  --callout-warning-color: oklch(0.65 0.18 80); /* amber instead of orange */
}
```

> [!tip]
> Keep overrides in `:root` where possible. This gives you broad, consistent changes with less CSS.

> [!info]
> For a detailed guide including examples and step-by-step instructions, check out [[how-to-customize-style|this blog post]].
