---
title: Styling your site
description: Customize your site's appearance — colors, fonts, and more — using CSS variables and a single custom.css file.
date: 2026-06-09
authors:
  - olayway
---

> [!info]
> Looking for a quick style change without writing CSS? Check out the [[themes|official themes]] — you can switch your site's look in one line of config.

Flowershow gives you a single file — `custom.css` — where all your style overrides live. There are three levels of customization, depending on how much you need to change:

1. **CSS variables** — the easiest path. Flowershow exposes variables for colors, fonts, border radius, and more. Changing a variable affects the whole site consistently.
2. **CSS rules** — for tweaking specific elements that variables don't cover (e.g. navbar).
3. **Custom components** — write HTML directly in your markdown and style it from scratch.

> [!tip]
> Want help writing the CSS? Install the [[skills|Flowershow skill]] and your AI assistant can generate styles for you.

## Create custom.css

Create a file named `custom.css` in the root of your repository (or your site's root directory if you publish from a subfolder). Add your CSS there and publish it alongside your content.

---

## The common cases

### Change background and text colors

The foreground color drives the full shade scale used across text, borders, and subtle backgrounds — so changing it affects more than just body text. `--color-l-*` variables apply in light mode, `--color-d-*` in dark mode.

```css
:root {
  /* Light theme */
  --color-l-background: #faf9f7;
  --color-l-foreground: #374151;

  /* Dark theme */
  --color-d-background: #0f0f0f;
  --color-d-foreground: #d1d5db;
}
```

### Change the accent color

The accent color is used for links, active states, and highlighted UI.

```css
:root {
  --color-l-accent: #0ea5e9; /* light theme */
  --color-d-accent: #38bdf8; /* dark theme  */
}
```

### Change fonts

Set separate fonts for headings and body text. The values are passed directly to `font-family`, so any valid CSS font stack works — including system fonts:

```css
:root {
  --font-heading: "Georgia", serif;
  --font-body: "system-ui", sans-serif;
}
```

To use a Google Font, add an `@import` at the top of `custom.css` before your `:root` block:

```css
@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3&display=swap");

:root {
  --font-heading: "Playfair Display", serif;
  --font-body: "Source Sans 3", sans-serif;
}
```

### Increase readability

Make body text slightly larger and give it more breathing room:

```css
:root {
  --font-size-base: 1.0625rem; /* 17px instead of 16px */
  --line-height-normal: 1.65;
}
```

All font size steps (`--font-size-sm`, `--font-size-lg`, etc.) scale with `--font-size-base`, so this one change proportionally adjusts the whole type scale.

### Other available variables

Flowershow exposes variables for border radius, callout colors, navbar height, and more. See the [[custom-styles|Custom styles reference]] for the full list, or browse the source files directly:

- [default-theme.css](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/default-theme.css) — layout, typography, colors, border radius
- [callouts.css](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/callouts.css) — callout color tokens

> [!note]
> Flowershow uses CSS cascade layers, so rules in `custom.css` automatically win over the default theme. You don't need `!important`.

---

## Going further

Beyond variables, there are two more levels of customization.

### Overriding existing element styles

You can write CSS rules that target Flowershow's own HTML elements directly — useful when no variable covers what you want to change.

For example, giving the navbar a distinct background color:

```css
.site-navbar {
  background-color: #1e293b;
}
```

For other elements, you'll need to find the selector first:

> [!tip]
> Use your browser's built-in developer tools to find the right selectors. Right-click any element and choose **Inspect** (or press `Cmd+Shift+C` / `Ctrl+Shift+C` to enter hover-inspect mode). The Styles panel lets you experiment live before committing to `custom.css`.

### Styling your own custom components

You can write raw HTML anywhere in your markdown files and style it however you like. This is for things that don't exist in Flowershow at all — you're building and styling the component yourself.

#### Example: hero section

For a full-width welcome section on your home page, add HTML directly to your `README.md`:

```html
<div class="hero">
  <h1 class="hero-title">My Site</h1>
  <p class="hero-description">A short description of what this is about.</p>
  <a href="/blog" class="hero-button">Read the blog</a>
</div>
```

Then style it in `custom.css`:

```css
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 2rem;
  background-color: var(--color-accent);
  color: #fff;
}

.hero-title {
  display: block; /* required when using h1 inside a custom component */
  font-size: 3rem;
}

.hero-description {
  margin-top: 0.5rem;
}

.hero-button {
  margin-top: 1.5rem;
  padding: 0.6rem 1.4rem;
  background: #fff;
  color: #333;
  border-radius: var(--radius);
  text-decoration: none;
  font-weight: 600;
}
```

---

## Troubleshooting

**Changes not showing up?**

- Make sure `custom.css` is published (committed and synced)
- Hard-refresh your browser: `Cmd+Shift+R` / `Ctrl+F5`
- Check that the file is in the correct root directory

**A rule still being overridden?**  
Open DevTools and check which stylesheet is winning in the Styles panel. In rare cases involving third-party component styles you may need to increase specificity with a more targeted selector rather than `!important`.
