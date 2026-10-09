---
title: Give your site a custom navbar and footer
description: Make your site look like your brand with your own navbar, footer, colors and fonts, using three small files.
date: 2026-10-09
authors:
  - rufuspollock
---

Flowershow's default navbar and footer are configured from `config.json`: a logo, some links, social icons. That covers most sites. When you want your site to look like the rest of your brand, you can replace both with your own HTML.

This guide builds a complete branded look for a fictional design studio, Juniper Studio, from three files at the root of your site:

- `custom.css`: brand colors, fonts and a few shared styles
- `_navbar.html`: the navbar content
- `_footer.html`: the footer content

> [!note]
> Custom navbars and footers are a ⭐️ Premium feature. On the free plan the two `.html` files are ignored and the default navbar and footer are shown. `custom.css` works on every plan. [See pricing](/pricing)

## What you'll need

- A Flowershow site on the Premium plan
- Some basic HTML and CSS. You can also paste this guide into ChatGPT or Claude along with your brand details and ask it to write the three files for you.
- Your logo as an image file (SVG or PNG) published with your site, for example at `assets/logo.svg`

## Step 1: Add the files

Put the three files at the root of your site, next to `config.json`:

```
my-site/
├── config.json
├── custom.css
├── _navbar.html
├── _footer.html
├── assets/
│   └── logo.svg
├── index.md
└── blog/
    └── ...
```

The names matter: Flowershow only picks up `_navbar.html` and `_footer.html` at the root, spelled exactly like this. They are never published as pages of their own.

> [!tip]
> If your `config.json` uses `contentInclude`, add `_navbar.html` and `_footer.html` to it, otherwise they won't be published.

## Step 2: Set your brand in `custom.css`

Start with the colors and fonts, so the navbar and footer can reuse them. Keep the brand color in one CSS variable and refer to it everywhere else.

```css
@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;500&display=swap");

:root {
  --brand: #2f5d50;
  --brand-ink: #ffffff;
  --font-heading: "Fraunces", serif;
  --font-body: "Inter", sans-serif;
  --navbar-height: 4.5rem;
}

/* A button style shared by the navbar and footer */
.cta {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: var(--brand);
  color: var(--brand-ink);
  font-weight: 500;
  text-decoration: none;
}
.cta:hover {
  opacity: 0.9;
}
```

A few things to note:

- **The `@import` must come first** in `custom.css`, or the browser ignores it. See [[custom-fonts|Custom fonts]] for using your own font files instead of Google Fonts.
- **`--navbar-height`** sets the height of the bar. The sidebar, table of contents and other sticky elements follow it, so change it here rather than styling the bar's height directly.
- **`--font-heading`** is also used for the navbar and other interface text, so your navbar picks up the heading font automatically.

## Step 3: Write `_navbar.html`

`_navbar.html` holds just what goes inside the bar: no `<html>`, `<head>` or `<body>`, and no `<nav>` of its own, because the bar is already a `<nav>`. This one has a logo, links on wider screens, a dropdown, a call-to-action button and a menu for phones:

```html
<a href="/" class="flex items-center gap-2 font-semibold">
  <img src="/assets/logo.svg" alt="" width="32" height="32">
  Juniper Studio
</a>

<ul class="hidden md:flex">
  <li><a href="/work">Work</a></li>
  <li>
    <details name="nav">
      <summary>Services</summary>
      <ul>
        <li><a href="/services/branding">Branding</a></li>
        <li><a href="/services/websites">Websites</a></li>
        <li><a href="/services/workshops">Workshops</a></li>
      </ul>
    </details>
  </li>
  <li><a href="/blog">Journal</a></li>
  <li><a href="/about">About</a></li>
</ul>

<a href="/contact" class="cta ml-auto hidden md:inline-block">Start a project</a>

<details name="nav" class="ml-auto md:hidden">
  <summary aria-label="Menu">☰</summary>
  <ul>
    <li><a href="/work">Work</a></li>
    <li><a href="/services/branding">Branding</a></li>
    <li><a href="/services/websites">Websites</a></li>
    <li><a href="/blog">Journal</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Start a project</a></li>
  </ul>
</details>
```

How this works:

- **Tailwind classes work.** `hidden md:flex` shows the links only on wider screens, and `md:hidden` shows the menu only on phones. There is no built-in hamburger menu, so you choose what appears at each width.
- **`<details>` makes menus without JavaScript.** Clicking the `<summary>` opens a panel under the bar. Menus close when a link is followed, when you click outside, when you press Escape and when you move to another page. Giving every menu the same `name="nav"` means opening one closes the others.
- **Write links as paths** (`/work`, `/about`). Links to your own pages then load instantly, like the default navbar, and the link to the current page is marked with `aria-current="page"`. Full URLs to your own site (`https://juniper.example/work`) count as external and open in a new tab.
- **It is HTML, not Markdown.** Markdown syntax is shown as plain text. Relative `href` and `src` paths resolve from your site root on every page, so `src="/assets/logo.svg"` works on deeply nested pages too.

## Step 4: Write `_footer.html`

The footer works the same way, and replaces the whole default footer, including the copyright line and social icons. Put back anything you want to keep:

```html
<div class="grid gap-8 py-6 md:grid-cols-4">
  <div class="md:col-span-2">
    <a href="/" class="flex items-center gap-2 font-semibold">
      <img src="/assets/logo.svg" alt="" width="28" height="28">
      Juniper Studio
    </a>
    <p class="mt-3 max-w-sm">Brand and web design for small, thoughtful organisations.</p>
    <a href="/contact" class="cta mt-4">Start a project</a>
  </div>
  <nav aria-label="Studio">
    <strong>Studio</strong>
    <ul class="mt-2 space-y-1">
      <li><a href="/work">Work</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/blog">Journal</a></li>
    </ul>
  </nav>
  <nav aria-label="Elsewhere">
    <strong>Elsewhere</strong>
    <ul class="mt-2 space-y-1">
      <li><a href="https://www.linkedin.com/">LinkedIn</a></li>
      <li><a href="https://www.instagram.com/">Instagram</a></li>
      <li><a href="mailto:hello@juniper.example">hello@juniper.example</a></li>
    </ul>
  </nav>
</div>
<p class="border-t pt-4 text-xs">© 2026 Juniper Studio. All rights reserved.</p>
```

## Step 5: Fine-tune the styling

Flowershow applies only light defaults to your navbar and footer: links inherit the text color, a top-level list in the navbar is a row without bullets, and `<details>` panels get a background, border and shadow. Your Tailwind classes and `custom.css` rules always win over these defaults. Add finishing touches to `custom.css`:

```css
/* Navbar: brand color on hover and for the current page */
.site-navbar-custom a:hover,
.site-navbar-custom a[aria-current="page"] {
  color: var(--brand);
}
.site-navbar-custom .cta,
.site-navbar-custom .cta:hover {
  color: var(--brand-ink);
}

/* Footer: a dark band in the brand color */
.site-footer--custom {
  background: var(--brand);
  color: var(--brand-ink);
}
.site-footer-custom a {
  color: inherit;
}
.site-footer-custom .cta {
  background: var(--brand-ink);
  color: var(--brand);
}
```

Tailwind's `dark:` prefix doesn't work in these files, because Flowershow switches themes with a `data-theme` attribute. To show a different logo in dark mode, see [[navbar#styling-the-custom-navbar|Styling the custom navbar]].

## Step 6: Publish and check

Publish your site, then check:

1. **A nested page**, such as a blog post: the logo and links should work from deep in the site.
2. **A phone-sized window**: the ☰ menu should appear, open and close.
3. **Dark mode**, if your site offers the theme switch.
4. **Keyboard use**: Tab through the navbar and open the menu with Enter.

If the navbar or footer doesn't change, check that the files are at the root, named exactly `_navbar.html` and `_footer.html`, and that your site is on the Premium plan. If a file has an error that stops it rendering, Flowershow shows the default navbar or footer instead, so your pages never break.

## Going further

- **A bespoke landing page.** Combine `layout: plain` with `showNavbar: false` and `showFooter: false` in a page's frontmatter to give one page its own full-width design. See [[navbar#hide-the-navbar-on-a-page|Hide the navbar on a page]].
- **Search and the dark-mode toggle** stay in your custom navbar if you turn them on in `config.json`. You can move them with CSS `order`; see [[navbar#custom-navbar|Custom navbar]].
- **Tag and list styling.** Recolor tag pills and style `<List>` cards to match. See [[tags|Tags]] and [[list-component|List component]].

Full details: [[navbar#custom-navbar|Custom navbar reference]], [[footer#custom-footer|Custom footer reference]], [Styling your site](/docs/guides/custom-styles).
