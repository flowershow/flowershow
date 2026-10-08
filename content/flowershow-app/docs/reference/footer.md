---
title: Footer configuration
description: Customize your site footer with navigation links and social icons, replace it with your own Markdown, or hide it on a page.
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

To replace the default footer with your own content, add a file called `_footer.md` at the root of your site (next to `config.json` and `custom.css`). Write it like any other Markdown page: links, wiki links, images and HTML with Tailwind classes all work.

```md
<div class="flex flex-wrap items-center justify-between gap-4">
  <span>© 2026 Acme Inc.</span>
  <span>[Privacy](/privacy) · [Contact](/contact) · [[about|About us]]</span>
</div>
```

How it works:

- **It replaces the whole default footer.** The site name, copyright line, social icons and footer navigation are no longer shown. Put anything you want to keep in `_footer.md`.
- **It is not a page.** `_footer.md` is not published at `/_footer`, and it doesn't appear in the sidebar, search, sitemap, RSS feed, tag pages or `<List />`. The raw file is still served at `/_footer.md`, like `custom.css`, so don't put anything private in it.
- **Frontmatter is ignored.** A frontmatter block is allowed but has no effect; `publish: false` does not hide the footer (delete or rename the file instead). A file with only frontmatter and no content keeps the default footer.
- **If it fails to render**, the default footer is shown instead, so a broken `_footer.md` never takes down your pages.
- **Only the root file counts.** The name is exact and case-sensitive: `_Footer.md` or `notes/_footer.md` are ordinary pages.
- **It is always rendered as Markdown**, even if your site uses `syntaxMode: mdx`, so the footer is part of the server-rendered HTML on every page. Use HTML with `class="..."` for layout; JSX components are not supported.
- **It follows your content filters.** If you use `contentInclude`, add `_footer.md` to it. If `_footer.md` matches `contentExclude`, it isn't published and the default footer is shown.
- **Free plan:** `_footer.md` is ignored and the default footer is shown. It is still never published as a page.
- The "Built with Flowershow" badge is separate from the footer. Premium sites can turn it off with `showBuiltWithButton` in [[config-file|config.json]].

> [!tip]
> Avoid headings in `_footer.md`. Heading IDs are generated the same way as on pages, so a footer heading can clash with a heading of the same name on the page and break its anchor link. Use bold text instead.

### Styling the custom footer

The footer keeps its usual wrapper, so the content sits inside `footer.site-footer.site-footer--custom` and `.site-footer-custom`. Only light defaults are applied (small text, underlined links). Add your own styles with Tailwind classes in `_footer.md`, or in `custom.css`:

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
   - If you have a `_footer.md`, it replaces the footer navigation on Premium sites

5. **Custom footer (`_footer.md`) not showing**
   - Check the site is on the Premium plan
   - Make sure the file is at the root of your site (inside your root directory, if you set one) and named exactly `_footer.md`
   - If you use `contentInclude`, add `_footer.md` to it
   - Republish after editing; changes can take up to a minute to appear
