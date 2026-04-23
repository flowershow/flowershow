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

The `description` field provides a summary used in:

- Search engine result snippets
- Social media preview descriptions

Aim for 150–160 characters for optimal display in search results.

### Image

> [!note] Premium Feature
> Social media image configuration is a premium feature.
>
> **Free sites:** The default Flowershow thumbnail is always used for social sharing, regardless of your image settings.
>
> **Premium sites:** Your custom images are used. The default Flowershow thumbnail is never used, even if you don't set your own.

The `image` field sets a featured image for:

- Page headers
- Social media preview cards (premium feature)

Recommended size: 1200×630 pixels (JPG or PNG, under 1MB).

## Site-wide defaults

Configure fallback values in your `config.json`:

```json
{
  "title": "My Site Name",
  "description": "Default site description.",
  "image": "/assets/default-social.jpg"
}
```

### Title suffix

The `title` in `config.json` is appended to every page title as an SEO suffix:

**Page title:** "My Guide"  
**Config title:** "My Site"  
**Final SEO title:** "My Guide - My Site"

This appears in browser tabs, search results, social shares, and bookmarks. It doesn't affect how the title displays on the page itself. Keep the combined title under 60 characters for best results.

### Fallback description and image

If a page doesn't set `description` or `image` in frontmatter, the site-wide defaults from `config.json` are used. Unlike titles, descriptions and images are not combined — the page value replaces the site default entirely.

## Complete example

Frontmatter:

```markdown
---
title: Complete Guide to Docker Containers
description: Learn how to create, manage, and deploy Docker containers with practical examples and best practices.
image: /assets/docker-guide-social.jpg
---
```

`config.json`:

```json
{
  "title": "DevTutorials",
  "description": "Professional development tutorials for modern developers.",
  "image": "/assets/devtutorials-default.jpg"
}
```

Result:

- **SEO title:** "Complete Guide to Docker Containers - DevTutorials"
- **Description:** "Learn how to create, manage, and deploy Docker containers with practical examples and best practices."
- **Social image:** `/assets/docker-guide-social.jpg`
