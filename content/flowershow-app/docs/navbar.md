---
title: Navbar configuration
description: Set logo, title, links and socials in your navigation bar.
---

> [!info]
> [[how-to-configure-navigation-bar|Tutorial with examples and step-by-step instructions]].

The navigation bar configuration is defined under the `nav` object in your `config.json`.

> [!note]
> If you omit the `nav` key from your `config.json` entirely, the navbar will not be displayed. A `no-nav` CSS class is added to the page layout in this case, which you can use in custom themes to adjust styling.

## Logo and title

Configure your site's branding with a logo and title:

```json
{
  "nav": {
    "logo": "logo.jpeg",
    "title": "My Digital Garden"
  }
}
```

- `logo`: Path to your logo file (relative to site root) or external URL
- `title`: Text displayed as your site title

## Navigation links

Add navigation links using the `links` array. Each link requires:

```json
{
  "nav": {
    "links": [
      {
        "href": "/blog",
        "name": "Blog"
      },
      {
        "href": "/about",
        "name": "About"
      }
    ]
  }
}
```

Properties:
- `href`: URL or path the link points to
- `name`: Display text for the link

## Social media links

Add social media links using the `social` array. Each social link requires:

```json
{
  "nav": {
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
    ]
  }
}
```

Properties:
- `label`: Platform identifier (see supported platforms below)
- `name`: Text label (used in sidebar mode)
- `href`: Your social media profile URL

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
> If the social platform you want to use isn’t listed above, you can skip the `label` and Flowershow will display a generic 🌐 icon.
We encourage you to submit an issue, too. 😉

## Complete example

Here's a comprehensive configuration example:

```json
{
  "nav": {
    "logo": "logo.jpeg",
    "title": "My Digital Garden",
    "links": [
      {
        "href": "/blog",
        "name": "Blog"
      },
      {
        "href": "/about",
        "name": "About"
      }
    ],
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
    ]
  }
}
```

## Troubleshooting

Common issues and solutions:

1. **Logo Not Displaying**
   - Verify the logo path is correct relative to your site's root directory
   - Ensure the image file exists at the specified path

2. **Social Icons Not Showing**
   - Confirm you're using supported platform labels
   - Check that the `label` value matches exactly (case-sensitive)
