---
title: Footer configuration
description: Customize your site footer with navigation links and social icons, replace it with your own HTML, or hide it on a page.
---

Configure your site footer from the **Flowershow dashboard** under **Site Settings → Navigation**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> The footer automatically displays your site name and a copyright notice. The site name comes from **Settings → General → Name** (or `siteName` in `config.json`). The year updates automatically.

## Social media links

Go to **Settings → Navigation → Social Links** and enter your links as a JSON array. Social links appear in both the navbar and footer.

See [[social-links]] for the full field reference and list of supported platforms.

## Footer navigation

Go to **Settings → Navigation → Footer Navigation** and enter your navigation groups as a JSON array:

```json
[
  {
    "title": "Resources",
    "links": [
      { "name": "Documentation", "href": "/docs" },
      { "name": "Guides", "href": "/guides" },
      { "name": "Blog", "href": "/blog" }
    ]
  },
  {
    "title": "Company",
    "links": [
      { "name": "About", "href": "/about" },
      { "name": "Contact", "href": "/contact" },
      { "name": "Privacy Policy", "href": "/privacy" }
    ]
  }
]
```

Each group requires:

- `title`: Heading for the group
- `links`: Array of link objects, each with `name` (display text) and `href` (URL or path)

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "siteName": "My Digital Garden",
  "social": [
    { "label": "github", "href": "https://github.com/yourusername" },
    { "label": "twitter", "href": "https://twitter.com/yourusername" },
    { "label": "linkedin", "href": "https://linkedin.com/in/yourusername" }
  ],
  "footer": {
    "navigation": [
      {
        "title": "Resources",
        "links": [
          { "name": "Documentation", "href": "/docs" },
          { "name": "Guides", "href": "/guides" },
          { "name": "Blog", "href": "/blog" }
        ]
      },
      {
        "title": "Company",
        "links": [
          { "name": "About", "href": "/about" },
          { "name": "Contact", "href": "/contact" },
          { "name": "Privacy Policy", "href": "/privacy" }
        ]
      }
    ]
  }
}
```

- `siteName`: Your site's name, shown in the footer copyright. Overrides the name set in the dashboard (**Settings → General → Name**); defaults to your project name. `title` is still accepted as a deprecated alias.
- `social`: Array of social link objects (same format as the dashboard JSON editor) — see [[social-links]]
- `footer.navigation`: Array of navigation group objects (same format as the dashboard JSON editor)

## Custom footer

> [!note]
> The custom footer is a ⭐️ Premium feature.

To replace the default footer with your own content, add a file called `_footer.html` at the root of your site (next to `config.json` and `custom.css`). It holds an HTML fragment: just the footer's content, with no `<html>`, `<head>` or `<body>`. Tailwind classes work, and links and images resolve the same way as HTML in a page.

```html
<div class="flex flex-col gap-6 py-4 md:flex-row md:items-start md:justify-between">
  <div class="flex items-center gap-3">
    <img src="/assets/logo.svg" alt="Acme" width="32" height="32">
    <div>
      <strong>Acme Inc.</strong>
      <p class="m-0">Tools for thoughtful teams.</p>
    </div>
  </div>
  <nav class="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
    <a href="/about">About</a>
    <a href="/blog">Blog</a>
    <a href="/privacy">Privacy</a>
    <a href="mailto:hello@acme.example">Contact</a>
  </nav>
</div>
<p class="mt-6 text-xs">© 2026 Acme Inc. All rights reserved.</p>
```

How it works:

- **It replaces the whole default footer.** The site name, copyright line, social icons and footer navigation are no longer shown. Put anything you want to keep in `_footer.html`.
- **It is HTML, not Markdown.** Markdown syntax (`**bold**`, `[link](/about)`, `[[wiki links]]`) is shown as plain text. Use `<strong>`, `<a href="...">` and so on.
- **Links and images resolve from the site root**, on every page. `href="about"`, `href="/about"` and `href="about.md"` all point at `/about`, even on a page deep in a folder, and `src="assets/logo.png"` or `src="/assets/logo.png"` load the image you published at `assets/logo.png`. External links open in a new tab, as on pages.
- **Tailwind classes work.** Utility classes used in the file (`flex`, `gap-4`, `text-sm`, `md:flex-row`, ...) are compiled for the footer only.
- **It is not a page.** `_footer.html` is not served at `/_footer.html` and doesn't appear in the sidebar or as your home page. Its content is shown on every page, so don't put anything private in it.
- **HTML is handled as in pages.** `<style>` blocks work (scope them under `.site-footer-custom`). Inline `<script>` tags behave as they do in a page and run only on a full page load; for site-wide scripts use [[custom-head|custom head code]].
- **An empty file keeps the default footer.** So does a file with only whitespace or HTML comments.
- **If it fails to render**, the default footer is shown instead, so a broken `_footer.html` never takes down your pages.
- **Only the root file counts.** The name is exact and case-sensitive: `_Footer.html` or `notes/_footer.html` are ordinary HTML files. A `_footer.md` is an ordinary Markdown page.
- **It follows your content filters.** If you use `contentInclude`, add `_footer.html` to it. If `_footer.html` matches `contentExclude`, it isn't published and the default footer is shown.
- **Free plan:** `_footer.html` is ignored and the default footer is shown. It is still never served as a page.
- The "Built with Flowershow" badge is separate from the footer. Premium sites can turn it off with `showBuiltWithButton` in [[config-file|config.json]].

### Styling the custom footer

The footer keeps its usual wrapper, so the content sits inside `footer.site-footer.site-footer--custom` and `.site-footer-custom`. Only light defaults are applied (small text, underlined links). Add your own styles with Tailwind classes in `_footer.html`, or in `custom.css`:

```css
.site-footer-custom {
  text-align: center;
}
.site-footer-custom a {
  color: var(--color-accent);
}
```

See [[custom-styles]] and the [[theme-class-reference|theme class reference]].

## Hide the footer on a page

Set `showFooter: false` in a page's frontmatter to hide the site footer on that page. This works on all plans.

```yaml
---
title: Landing page
layout: plain
showFooter: false
---
```

To hide the footer on every page, set `"showFooter": false` in `config.json`. A page can then bring it back with `showFooter: true`. To hide the navbar as well, see [[navbar#hide-the-navbar-on-a-page|Hide the navbar on a page]].

## Troubleshooting

1. **Footer not appearing**
   - Ensure your `config.json` is valid JSON (use a JSON validator, e.g. https://jsonlint.com/)
   - Check that navigation groups have both `title` and `links` properties

2. **Social icons not showing**
   - Verify you're using supported platform labels
   - Confirm the `label` value matches exactly (case-sensitive)
   - Ensure `social` is at the root level of `config.json`, not inside `footer`

3. **Links not working**
   - For internal links, use paths starting with `/` (e.g., `/about`)
   - For external links, include the full URL with protocol (e.g., `https://example.com`)

4. **Footer navigation not displaying**
   - Confirm `navigation` is inside the `footer` object
   - Each group must have at least one link
   - Verify all required properties are present
   - If you have a `_footer.html`, it replaces the footer navigation on Premium sites

5. **Custom footer (`_footer.html`) not showing**
   - Check the site is on the Premium plan
   - Make sure the file is at the root of your site (inside your root directory, if you set one) and named exactly `_footer.html` (not `_footer.md`)
   - If you use `contentInclude`, add `_footer.html` to it
   - Republish after editing; changes can take up to a minute to appear
