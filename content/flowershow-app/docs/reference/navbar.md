---
title: Navbar configuration
description: Set logo, title, links and socials in your navigation bar, replace its content with your own HTML, or hide it on a page.
---

Configure your site's navigation bar from the **Flowershow dashboard**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> The navbar is only displayed if at least one of the following is configured: nav title, nav links, CTA, social links, or full text search, or if your Premium site has a [custom navbar](#custom-navbar).

## Logo and title

Go to **Settings → Navigation** and set:

- **Logo** — upload an image file
- **Nav Title** — the text shown next to the logo in the navbar

If you don't set a nav title, your site name (from **Settings → General → Name**) is shown next to the logo by default — unless you've uploaded your own logo, in which case the logo stands alone. Set a nav title to override this with different text.

> [!note]
> To use a file path, external URL, or emoji as your logo, use `config.json` — the dashboard logo field accepts image uploads only.

## Navigation links

Go to **Settings → Navigation → Nav Links** and enter your links as a JSON array:

```json
[
  { "href": "/blog", "name": "Blog" },
  { "href": "/about", "name": "About" }
]
```

Each link requires:

- `href`: URL or path the link points to
- `name`: Display text for the link

### Dropdown menus

To group links under a dropdown, use a `links` array instead of `href`. On desktop, the dropdown opens on hover; on mobile, it expands as a collapsible section. Only one level of nesting is supported.

```json
[
  { "href": "/blog", "name": "Blog" },
  { "href": "/about", "name": "About" },
  {
    "name": "Docs",
    "links": [
      { "href": "/docs/getting-started", "name": "Getting Started" },
      { "href": "/docs/config", "name": "Configuration" },
      { "href": "/docs/themes", "name": "Themes" }
    ]
  }
]
```

A dropdown item has:

- `name`: Label displayed as the dropdown trigger
- `links`: Array of plain links (each with `href` and `name`)

> [!tip]
> If you want the dropdown label to also link to a page (e.g. "Docs" linking to `/docs`), add it as the first item in the `links` array.

## Social links

Go to **Settings → Navigation → Social Links** and enter your links as a JSON array. Social links appear in both the navbar and footer.

See [[social-links]] for the full field reference and list of supported platforms.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "logo": "logo.jpeg",
  "social": [
    {
      "label": "github",
      "name": "GitHub Profile",
      "href": "https://github.com/yourusername"
    },
    {
      "label": "twitter",
      "name": "Follow me on Twitter",
      "href": "https://twitter.com/yourusername"
    }
  ],
  "nav": {
    "title": "My Digital Garden",
    "links": [
      { "href": "/blog", "name": "Blog" },
      {
        "name": "Docs",
        "links": [
          { "href": "/docs/getting-started", "name": "Getting Started" },
          { "href": "/docs/config", "name": "Configuration" }
        ]
      },
      { "href": "/about", "name": "About" }
    ]
  }
}
```

- `logo`: Path to your logo file (relative to site root), external URL, or an emoji character (root-level key)
- `social`: Array of social link objects (root-level key, shared with footer) — see [[social-links]]
- `nav.title`: Text displayed as your site title
- `nav.links`: Array of navigation link objects (same format as the dashboard JSON editor)

## Custom navbar

> [!note]
> The custom navbar is a ⭐️ Premium feature.

To replace the navbar content with your own, add a file called `_navbar.html` at the root of your site (next to `config.json` and `custom.css`). It holds an HTML fragment: just what goes inside the bar, with no `<html>`, `<head>` or `<body>`, and no `<nav>` of its own (the navbar is already a `<nav>`). It works like the [[footer#custom-footer|custom footer]]: Tailwind classes work, relative links and images resolve from your site root, and a pasted full HTML document is reduced to its `<body>`.

This example has a logo, a row of links on wider screens and a menu button on phones:

```html
<a href="/" class="flex items-center gap-2 font-bold">
  <img src="/assets/logo.svg" alt="" width="28" height="28">
  Acme
</a>

<ul class="hidden md:flex">
  <li><a href="/blog">Blog</a></li>
  <li><a href="/docs">Docs</a></li>
  <li>
    <details>
      <summary>Products</summary>
      <ul>
        <li><a href="/products/notes">Notes</a></li>
        <li><a href="/products/sync">Sync</a></li>
      </ul>
    </details>
  </li>
  <li><a href="/about">About</a></li>
</ul>

<a href="/signup" class="ml-auto hidden md:inline-block rounded bg-black px-3 py-1.5 text-white">Sign up</a>

<details class="ml-auto md:hidden">
  <summary aria-label="Menu">☰</summary>
  <ul>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/docs">Docs</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/signup">Sign up</a></li>
  </ul>
</details>
```

How it works:

- **It replaces the navbar content, not the bar.** The logo, nav title, nav links, dropdowns, social icons, CTA button and the built-in mobile menu are no longer shown. The bar itself stays: it is still sticky at the top of the page, still hidden by `showNavbar: false`, and its height is still set by `--navbar-height`.
- **Search and the dark-mode toggle stay if you turn them on.** Both are off unless you enable full-text search (`enableSearch`) or the theme switch (`theme.showModeSwitch`) in [[config-file|config.json]]. When on, they sit at the end of the bar, after your content. To move them, set `order` on `.site-navbar-search-container` or `.site-navbar-theme-switch-container` in `custom.css` (your content is `.site-navbar-custom`, `order: 0`).
- **Use `<details>` for dropdowns and the mobile menu.** A `<details>` with a `<summary>` opens a panel under the bar, with no JavaScript needed. Open menus close when a link is followed, when you click outside them, and when you press Escape. The last menu in the bar opens towards the left so it stays on screen; other menus open to the right (add `right-0 left-auto` to the panel to change that). Give an icon-only `<summary>` an `aria-label`.
- **There is no built-in hamburger menu.** Use Tailwind's responsive prefixes to choose what shows at each width, as in the example: `hidden md:flex` for the desktop links and `md:hidden` for the menu. A top-level list of links that's too wide for a phone scrolls sideways instead of overflowing, unless it contains a `<details>` menu. The page itself never scrolls sideways because of the navbar.
- **Page links are fast.** Links to pages on your site (`/blog`, `about`) navigate without a full page reload, like the default navbar. Links to files (`/rss.xml`, `/notes.md`, `/assets/guide.pdf`) and external links are ordinary links; external links open in a new tab.
- **The current page is marked.** The link to the page being viewed gets `aria-current="page"` and is shown in bold. Style it with `.site-navbar-custom a[aria-current="page"]`.
- **It is HTML, not Markdown,** and it is handled like the custom footer: Markdown syntax is shown as plain text, only `href` and `src` are rewritten, `<style>` blocks work, inline `<script>` tags run only on a full page load, and images in the navbar don't open in a lightbox.
- **Need a taller bar?** Set `--navbar-height` in `custom.css`. The sidebar, table of contents and other sticky elements follow it. Images in the navbar are capped at the bar height minus `1rem`.
- **It is not a page.** `_navbar.html` is not served at `/_navbar.html` and doesn't appear in the sidebar, the sitemap or as your home page. Its content is shown on every page, so don't put anything private in it.
- **An empty file keeps the default navbar.** So does a file with only whitespace or HTML comments. If it fails to render, the default navbar is shown instead.
- **Only the root file counts.** The name is exact and case-sensitive: `_Navbar.html` or `docs/_navbar.html` are ordinary HTML files. A `_navbar.md` is an ordinary Markdown page.
- **It follows your content filters.** If you use `contentInclude`, add `_navbar.html` to it.
- **Free plan:** `_navbar.html` is ignored and the default navbar is shown. It is still never served as a page.

### Styling the custom navbar

Your content sits inside `nav.site-navbar.site-navbar--custom` and `.site-navbar-custom`, a flex row with a `1rem` gap. Only light defaults are applied: links inherit the text colour, a top-level list is a horizontal row without bullets, and `<details>` panels get a background, border and shadow. Add your own styles with Tailwind classes in `_navbar.html`, or in `custom.css`:

```css
.site-navbar-custom a:hover {
  color: var(--color-accent);
}
/* Put search before your content */
.site-navbar--custom .site-navbar-search-container {
  order: -1;
}
```

Tailwind's `dark:` prefix doesn't work in `_navbar.html`, because Flowershow switches themes with a `data-theme` attribute rather than a `dark` class. To show a different logo in dark mode, add both images with classes and switch them in `custom.css`:

```html
<a href="/">
  <img class="logo-light" src="/assets/logo.svg" alt="Acme">
  <img class="logo-dark" src="/assets/logo-white.svg" alt="Acme">
</a>
```

```css
.site-navbar-custom .logo-dark {
  display: none;
}
:root[data-theme="dark"] .site-navbar-custom .logo-light {
  display: none;
}
:root[data-theme="dark"] .site-navbar-custom .logo-dark {
  display: inline-block;
}
```

See [[custom-styles]] and the [[theme-class-reference|theme class reference]].

## Hide the navbar on a page

Set `showNavbar: false` in a page's frontmatter to hide the site navbar on that page. This works on all plans. Combine it with `showFooter: false` and `layout: plain` for a fully bespoke landing page that draws its own header:

```yaml
---
title: Welcome
layout: plain
showNavbar: false
showFooter: false
---
```

With the navbar hidden, the sidebar, table of contents and other sticky elements move up to the top of the page.

To hide the navbar on every page, set `"showNavbar": false` in `config.json`. A page can then bring it back with `showNavbar: true`.

## Troubleshooting

Common issues and solutions:

1. **Logo not displaying**
   - Verify the logo path is correct relative to your site's root directory
   - Ensure the image file exists at the specified path

2. **Social icons not showing**
   - Confirm you're using supported platform labels
   - Check that the `label` value matches exactly (case-sensitive)
   - If you have a `_navbar.html`, it replaces the navbar's social icons on Premium sites

3. **Custom navbar (`_navbar.html`) not showing**
   - Check the site is on the Premium plan
   - Make sure the file is at the root of your site (inside your root directory, if you set one) and named exactly `_navbar.html` (not `_navbar.md`)
   - If you use `contentInclude`, add `_navbar.html` to it
   - Republish after editing; changes can take up to a minute to appear
