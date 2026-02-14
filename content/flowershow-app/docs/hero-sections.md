---
title: Hero sections
description: Add prominent, full-width banners at the top of your pages that can include titles, descriptions, background images and call-to-action buttons.
---

## Page-level configuration

Enable hero sections for individual pages using frontmatter:

```yaml
---
showHero: true
---
```

The hero component can be configured using the following frontmatter fields:
- `title`: displayed as the hero title (if not set in the frontmatter, first level-1 heading on the page will be used; if that's not found, it will default to the file name),
- `description`: displayed as the hero subtitle,
- `image`: displayed on the right side of the hero,
- `cta`: up to 2 call-to-action buttons

Call-to-action buttons can be configured like this:

```yaml
cta:
  - href: /about
    label: About
  - href: /docs
    label: Docs
```

Full page frontmatter example:

```yaml
---
title: Page title
description: Page description
image: /assets/hero.jpg
showHero: true
cta:
  - href: /about
    label: About
  - href: /docs
    label: Docs
---
```

## Site-wide configuration

Enable hero sections across your site using `config.json`:

```json
{
  "showHero": true,
  "title": "Hero Title",
  "description": "Hero Description",
  "image": "/assets/hero.jpg",
  "cta": [
    { 
      "href": "/about",
      "label": "About"
    },
    { 
      "href": "/docs",
      "label": "Docs"
    }
  ]
}
```

This sets default hero content for all pages. Individual page frontmatters can override these defaults.

## Disabling heroes

To disable a hero section on a specific page when enabled site-wide:

```yaml
---
showHero: false
---
```

## Best practices

1. Use high-quality images optimized for web
2. Keep descriptions concise and engaging
3. Ensure image paths are correct relative to your site root
4. Test how your hero sections look on different screen sizes

> [!info]
> For detailed examples and step-by-step instructions, check out [[how-to-add-hero-sections|hero headers guide]].