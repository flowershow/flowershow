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

1. **CSS custom properties** (the primary theme API) — tokens like `--color-l-background`, `--font-heading`, `--font-size-base` that control the visual feel. Themes primarily work by swapping these values.

2. **Semantic CSS class names** (the stable contract) — classes like `site-navbar-link`, `mobile-nav-dropdown-trigger` that map to UI elements. These are the hooks theme authors can target. We treat these as a public API: changes are breaking changes.

3. **Cascade layers** (the override mechanism) — `default-theme.css` uses `@layer reset, base, components, utilities, overrides` so that user/theme CSS always wins without needing `!important`.

### What this means in practice

- **For users**: override CSS custom properties in a custom CSS file to change colors, fonts, and spacing. Target semantic class names for more specific tweaks.
- **For theme authors**: a theme is a CSS file that redefines custom properties and optionally restyling semantic classes. No JS, no components.
- **For us (maintainers)**: we can refactor components, swap underlying libraries (e.g. Headless UI → Radix), and restructure markup — as long as we preserve the semantic class names and custom properties, themes don't break.

### Why not shadcn/ui or similar

shadcn is designed for developers building custom UIs — the opposite of our use case. We'd be importing a component library only to hide it behind our own abstraction. Headless UI already provides the accessibility/interaction primitives we need; our semantic classes provide the styling contract. That's the right stack for a managed publishing platform.

## Current implementation

- **Design tokens**: defined in `apps/flowershow/styles/default-theme.css` under `@layer base`
- **Component styles**: semantic classes defined in the same file under `@layer components`
- **Component primitives**: `@headlessui/react` for interactive elements, `lucide-react` for icons
- **Tailwind**: v3, used internally but not exposed as the theme API

## Future direction

- Expand the CSS custom property surface (border-radius, spacing scale, navbar height, etc.) so themes can do more without touching selectors
- Ship 3–5 built-in themes as alternative CSS files that swap custom property values
- Keep the semantic class name set stable and document it as a public API
