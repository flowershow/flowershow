---
title: Footer configuration
description: Customize your site footer with navigation links and social media icons.
---

Configure your site footer from the **Flowershow dashboard** under **Site Settings → Navigation**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> The footer automatically displays your site name and a copyright notice. If no title is configured, it falls back to your project name. The year updates automatically.

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
  "title": "My Digital Garden",
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

- `title`: Site name shown in the footer copyright — this is only configurable via `config.json`, not from the dashboard
- `social`: Array of social link objects (same format as the dashboard JSON editor) — see [[social-links]]
- `footer.navigation`: Array of navigation group objects (same format as the dashboard JSON editor)

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
