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

## Full-width background image

By default the image sits on the right of the hero. To put it full width behind the title, description and buttons, use a `hero` object with `imagelayout: full`:

```yaml
---
title: Maple & Moss Pottery
description: Hand-thrown stoneware from a small studio in Bristol.
hero:
  image: /pottery.jpg
  imagelayout: full
cta:
  - href: "#classes"
    label: Book a class
---
```

### Overlay

A full-width image gets a dark overlay with white text by default, so the title stays readable on any photo. Choose another with `overlay`:

| `overlay` | What you get |
| --- | --- |
| `dark` (default) | A dark tint over the image, with white title, description and secondary button text. Works on most photos. |
| `light` | A pale cream wash over the image, with dark text. Good for soft or bright photos. |
| `none` | The image as is, with the theme's normal text colours. Use it with a light, low-contrast photo. |

```yaml
hero:
  image: /pottery.jpg
  imagelayout: full
  overlay: light
```

`overlay` only applies with `imagelayout: full`. An unknown value falls back to `dark`. To fine-tune the overlay, style `.page-hero.overlay-dark` or `.page-hero.overlay-light` in [[custom-styles|custom CSS]].

Any field in the `hero` object (`title`, `description`, `image`, `cta`) overrides the page's own field for the hero only.

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

For a site-wide full-width image, use a `hero` object instead: `"hero": { "image": "/assets/hero.jpg", "imagelayout": "full", "overlay": "dark" }`.

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