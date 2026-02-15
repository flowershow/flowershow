---
title: Footer configuration
description: Customize your site footer with navigation links and social media icons.
---

The footer appears at the bottom of every page on your site. You can configure it to display your site name, social media links, and organized navigation groups.

## Site name and copyright

The footer automatically displays your site name and copyright notice using the `title` from your `config.json`:

```json
{
  "title": "My Digital Garden"
}
```

This will display:
- Your site name as a heading
- Copyright notice: "© 2026 My Digital Garden. All rights reserved."

The year updates automatically.

> [!note]
> If you don't set a `title` in your config.json, the footer will fall back to displaying your project name instead.

## Social media links

Add social media links to your footer using the `social` array at the root of your `config.json`. These links display as icons:

```json
{
  "social": [
    {
      "label": "github",
      "href": "https://github.com/yourusername"
    },
    {
      "label": "twitter",
      "href": "https://twitter.com/yourusername"
    },
    {
      "label": "linkedin",
      "href": "https://linkedin.com/in/yourusername"
    }
  ]
}
```

Properties:
- `label`: Platform identifier (see supported platforms below)
- `href`: Your social media profile URL

> [!note]
> Social links are shared between the navbar and footer. Configure them once at the root level, and they'll appear in both locations.

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

> [!info] Missing your favorite platform?
> If your platform isn't listed, skip the `label` and Flowershow will display a generic 🌐 icon. Consider submitting an issue to request support for your platform!

## Footer navigation

Organize footer links into groups using the `footer.navigation` array. Each group has a title and a list of links:

```json
{
  "footer": {
    "navigation": [
      {
        "title": "Resources",
        "links": [
          {
            "name": "Documentation",
            "href": "/docs"
          },
          {
            "name": "Guides",
            "href": "/guides"
          },
          {
            "name": "Blog",
            "href": "/blog"
          }
        ]
      },
      {
        "title": "Company",
        "links": [
          {
            "name": "About",
            "href": "/about"
          },
          {
            "name": "Contact",
            "href": "/contact"
          },
          {
            "name": "Privacy Policy",
            "href": "/privacy"
          }
        ]
      }
    ]
  }
}
```

Each navigation group requires:
- `title`: Heading for the group
- `links`: Array of link objects

Each link requires:
- `name`: Display text for the link
- `href`: URL or path the link points to

## Complete example

Here's a comprehensive footer configuration:

```json
{
  "title": "My Digital Garden",
  "social": [
    {
      "label": "github",
      "href": "https://github.com/yourusername"
    },
    {
      "label": "twitter",
      "href": "https://twitter.com/yourusername"
    },
    {
      "label": "linkedin",
      "href": "https://linkedin.com/in/yourusername"
    }
  ],
  "footer": {
    "navigation": [
      {
        "title": "Resources",
        "links": [
          {
            "name": "Documentation",
            "href": "/docs"
          },
          {
            "name": "Guides",
            "href": "/guides"
          },
          {
            "name": "Blog",
            "href": "/blog"
          }
        ]
      },
      {
        "title": "Company",
        "links": [
          {
            "name": "About",
            "href": "/about"
          },
          {
            "name": "Contact",
            "href": "/contact"
          },
          {
            "name": "Privacy Policy",
            "href": "/privacy"
          }
        ]
      },
      {
        "title": "Community",
        "links": [
          {
            "name": "Discord",
            "href": "https://discord.gg/yourserver"
          },
          {
            "name": "GitHub Discussions",
            "href": "https://github.com/yourusername/yourrepo/discussions"
          }
        ]
      }
    ]
  }
}
```


## Troubleshooting

Common issues and solutions:

1. **Footer Not Appearing**
   - Ensure your `config.json` is valid JSON (use a JSON validator, e.g. https://jsonlint.com/)
   - Check that navigation groups have both `title` and `links` properties

2. **Social Icons Not Showing**
   - Verify you're using supported platform labels
   - Confirm the `label` value matches exactly (case-sensitive)
   - Ensure `social` is at the root level of `config.json`, not inside `footer`

3. **Links Not Working**
   - For internal links, use paths starting with `/` (e.g., `/about`)
   - For external links, include the full URL with protocol (e.g., `https://example.com`)

4. **Footer Navigation Not Displaying**
   - Confirm `navigation` is inside the `footer` object
   - Each group must have at least one link
   - Verify all required properties are present
