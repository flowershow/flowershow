# Theming Architecture

## Philosophy

Flowershow is a managed publishing platform, not a build-your-own-website toolkit. Think Substack or Ghost, not WordPress. We provide a design that works out of the box and looks elegant. Users who want full control should build their own Next.js site.

That said, we do want to support:

- **Custom CSS** — users can tweak colors, fonts, spacing to match their brand
- **Packaged themes** — curated sets of CSS that change the overall look
- **Our own built-in themes** — maintained by us, shipping with the product

We do **not** support users creating custom components or altering the component structure. The layout and component architecture is fixed; theming operates purely at the CSS level.

## Architecture

### Three layers

1. **CSS custom properties** — the primary theme API. Tokens like `--color-foreground`, `--color-background`, `--font-heading`, `--font-body`, and `--font-size-base` control the visual feel. Themes primarily work by overriding these values.

2. **Semantic CSS class names** — the stable styling contract. Classes like `site-navbar-link` and `mobile-nav-dropdown-trigger` map to Flowershow UI elements. Theme authors can target these classes when custom properties are not expressive enough. We treat these class names as a public API: removing or renaming them is a breaking change.

3. **Cascade layers** — the override mechanism. `default-theme.css` is written inside `@layer` blocks. Any rule written in plain CSS outside a `@layer` block automatically wins over layered default rules without needing `!important`. This is the primary override path: users and themes write normal CSS without a `@layer` wrapper.

### What this means in practice

- **For users**: write plain CSS, without a `@layer` wrapper, to override custom properties, semantic classes, or any other selector. It wins automatically over the default theme, without needing `!important`.
- **For theme authors**: a theme is a CSS file that redefines custom properties and can optionally restyle semantic classes. No JavaScript, no custom components.
- **For us, as maintainers**: we can refactor components, swap underlying libraries, and restructure internal markup as long as we preserve the semantic class names and custom properties that form the theme API.

### Why not shadcn/ui or similar

shadcn is designed for developers building custom UIs — the opposite of our use case. We would be importing a component library only to hide it behind our own abstraction.

Headless UI provides the accessibility and interaction primitives we need. Our semantic classes provide the styling contract. That is the right stack for a managed publishing platform.

## Current implementation

- **Design tokens**: defined in `apps/flowershow/styles/default-theme.css` under `@layer base` (and `apps/flowershow/styles/callouts.css`)
- **Component styles**: semantic classes defined in the same file under `@layer components`
- **Component primitives**: `@headlessui/react` for interactive elements, lucide-react for icons
- **Tailwind**: v3, used internally (currently only for `prose`) but not exposed as the theme API

## Color scale constraints

The foreground color scale, `--color-foreground-50` through `--color-foreground-900`, is generated with CSS relative color syntax using absolute OKLCH lightness values.

For example:

```css
 --color-foreground-50: oklch(from var(--color-foreground) 0.925 c h); --color-foreground-100: oklch(from var(--color-foreground) 0.825 c h); --color-foreground-200: oklch(from var(--color-foreground) 0.75 c h); --color-foreground-300: oklch(from var(--color-foreground) 0.675 c h); --color-foreground-400: oklch(from var(--color-foreground) 0.5 c h); --color-foreground-500: oklch(from var(--color-foreground) 0.425 c h);
 ...
```

This means:

- the source foreground lightness, l, is ignored;
- the source foreground chroma, c, is reused;
- the source foreground hue, h, is reused;
- each scale step sets its own absolute lightness value.

In other words, `--color-foreground` provides the tint of the scale, not its lightness range. If two foreground colors have the same chroma and hue but different lightness, they will produce the same generated scale.

### Chroma and gamut

Because the scale reuses the source foreground chroma, very colorful foreground colors can produce highly saturated scale steps. Some combinations of high chroma, hue, and lightness may fall outside the displayable color gamut. In those cases, browsers may gamut-map or clip the resulting color.

For this reason, `--color-foreground` should usually be a neutral or lightly tinted text color rather than a highly saturated brand color. Brand colors should use separate accent tokens.

## Official themes

Official themes live in the flowershow/themes repository. Each theme is a single CSS file.

### Load order

When a site has a theme selected, the platform loads three CSS files in this order:

1. `default-theme.css` — inside `@layer`, so it loses to anything outside a layer
2. <theme>.css — outside any `@layer`, wins over the default
3. User custom CSS, if any — outside any `@layer`, wins over both

This means users can stack their own custom CSS on top of an official theme. The cascade handles it without any special mechanism.

### What a theme can change

A theme is primarily a set of CSS custom property overrides: colors, fonts, border radius, spacing tokens, and related visual values. It may also override specific semantic class names, for example making the navbar transparent, when a variable alone cannot express the change.

A theme does not need to redeclare the full layout or component CSS. It inherits that from default-theme.css, and new components added in the future will automatically inherit the theme’s tokens as long as they use the same token system.

### Fonts

To change fonts, `@import` the font at the top of the theme CSS file, for example from Google Fonts, then override `--font-heading` and/or `--font-body` in `:root`.

This works because the theme is loaded outside @layer, and its :root declarations win over the defaults.

### Dark mode

Themes may support light mode only, dark mode only, or both. Wherever themes are listed, each theme must be clearly labelled with its supported color scheme or schemes.

A theme that only overrides light-mode variables will leave dark mode at the default, unless the platform explicitly disables dark mode for that theme.

## Future direction

- Keep the semantic class name set stable and document it as a public API.
- Document the supported custom properties as the main theming surface.
- Prefer new tokens over component-specific overrides when adding new visual options.
