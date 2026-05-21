---
title: Navbar configuration
description: Set logo, title, links and socials in your navigation bar.
---

Configure your site's navigation bar from the **Flowershow dashboard**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> The navbar is only displayed if at least one of the following is configured: nav title, nav links, CTA, social links, or full text search.

## Logo and title

Go to **Settings → Navigation** and set:

- **Logo** — upload an image file
- **Nav Title** — the text shown as your site title in the navbar

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

Go to **Settings → Navigation → Social Links** and enter your social links as a JSON array:

```json
[
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
]
```

Properties:

- `label`: Platform identifier (see supported platforms below)
- `name`: Text label (used in sidebar mode)
- `href`: Your social media profile URL

> [!note]
> Social links are shared between the navbar and footer. Configure them once and they'll appear in both locations.

Supported social platforms:

- `bluesky` (or `bsky`)
- `discord`
- `facebook`
- `github`
- `instagram`
- `linkedin`
- `mastodon`
- `pinterest`
- `reddit`
- `spotify`
- `substack`
- `telegram`
- `threads`
- `tiktok`
- `twitter` (or `x`)
- `whatsapp`
- `youtube`

> [!info] Is your favorite platform missing from the list?
> If the social platform you want to use isn't listed above, you can skip the `label` and Flowershow will display a generic 🌐 icon.
> We encourage you to submit an issue, too. 😉

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
- `social`: Array of social link objects (root-level key, shared with footer)
- `nav.title`: Text displayed as your site title
- `nav.links`: Array of navigation link objects (same format as the dashboard JSON editor)

## Troubleshooting

Common issues and solutions:

1. **Logo not displaying**
   - Verify the logo path is correct relative to your site's root directory
   - Ensure the image file exists at the specified path

2. **Social icons not showing**
   - Confirm you're using supported platform labels
   - Check that the `label` value matches exactly (case-sensitive)
