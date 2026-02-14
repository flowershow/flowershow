---
title: SEO and social media metadata
description: Configure SEO titles, descriptions, and social media images for better search and sharing.
---

## Page-level configuration

### Title

Page titles can be set using three methods (in order of precedence):

1. **Frontmatter `title` field** (highest precedence)
2. **First level 1 heading** (`# Heading`)
3. **Filename** (fallback)

Read more about [[page-titles|Page titles]].

### Description

The `description` field provides a summary for:
- Search engine result snippets
- Social media preview descriptions

### Image

>[!note] Premium Feature
>Social media image configuration is a premium feature.
>
>**Free sites:** Always default Flowershow thumbnail is used for social sharing
>**Premium sites:** Use your custom images. No default Flowershow thumbnail is ever used, even if you don't set your own.

The `image` field sets a featured image for:
- Page headers
- Social media preview cards (premium feature)

## Site-wide defaults

Configure fallback values in your `config.json`:

```json
{
  "title": "My Site Name",
  "description": "Default site description",
  "image": "/assets/default-social.jpg"
}
```

### Site-wide title suffix

The `title` in config.json gets appended to page titles for SEO:

**Page title:** "My Guide"  
**Config title:** "My Site"  
**Final SEO title:** "My Guide - My Site"

### Fallback description and image

If a page doesn't have a `description` or `image` in frontmatter, the site-wide defaults from config.json are used.

## Best practices

- Keep combined titles under 60 characters
- Write descriptions between 150-160 characters
- Use 1200x630 pixel images for optimal social sharing
- Keep image files under 1MB

> [!info]
> For detailed examples and step-by-step instructions, see our [[how-to-configure-seo-and-social-media-metadata|SEO and social media metadata guide]].