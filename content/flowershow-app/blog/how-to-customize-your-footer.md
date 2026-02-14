---
title: Customize Your Site Footer with config.json
description: Add navigation links and social media icons to your site footer for a more professional look and better navigation.
date: 2026-01-09
authors:
  - olayway
image: "[[footer.png]]"
---

You can now customize your footer directly from your `config.json` file, adding organized navigation groups and social media links to create a more professional and useful footer.

## Quick Example

Here's how simple it is to add footer navigation to your site:

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
          }
        ]
      }
    ]
  }
}
```

This configuration creates a footer with:
- Your site name and copyright notice
- Social media icons (shared with your navbar)
- Two organized navigation groups with useful links

## What You Can Configure

- **Site name and copyright** - Automatically generated from your `title` setting
- **Social media links** - Displayed as icons, configured once and shared between navbar and footer
- **Navigation groups** - Organize links into categories like "Resources," "Company," "Community," etc.

## Learn More

Check out the complete [[docs/footer|footer configuration documentation]] for detailed examples, all supported social platforms, and troubleshooting tips.

---

Have questions or feedback about footer customization? Drop a comment below or reach out to us on Discord!

–Flowershow team 💐
