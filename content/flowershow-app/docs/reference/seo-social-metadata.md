---
title: SEO and social media metadata
description: Configure SEO titles, descriptions, and social media images for better search and sharing.
---

Configure site-wide SEO defaults from the **Flowershow dashboard** under **Site Settings → General**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

## Site title

Go to **Settings → General → Site Title** and enter your site name.

This value is appended as a suffix to every page title and appears in browser tabs, search results, social shares, and bookmarks. It doesn't affect how the title displays on the page itself. Keep the combined title under 60 characters for best results.

**Page title:** "My Guide"  
**Site title:** "My Site"  
**Final SEO title:** "My Guide - My Site"

## Default description

Go to **Settings → General → Description** and enter a fallback description for your site.

This is used in search results and social previews when a page has no `description` set in its frontmatter. Unlike titles, descriptions are not combined — the page value replaces the site default entirely.

Aim for 150–160 characters for optimal display in search results.

## Default social image

Go to **Settings → General → Social Image** and upload your default social sharing image.

> [!note] Premium Feature
> Social media image configuration is a premium feature.
>
> **Free sites:** The default Flowershow thumbnail is always used for social sharing, regardless of your image settings.
>
> **Premium sites:** Your custom images are used. The default Flowershow thumbnail is never used, even if you don't set your own.

Recommended size: 1200×630 pixels (JPG or PNG, under 1MB).

> [!note]
> To use a file path or external URL as your social image, use `config.json` — the dashboard social image field accepts image uploads only.

## Per-page configuration

Site-wide defaults can be overridden on individual pages using frontmatter fields.

### Title

Page titles can be set using three methods (in order of precedence):

1. **Frontmatter `title` field** (highest precedence)
2. **First level 1 heading** (`# Heading`)
3. **Filename** (fallback)

Read more about [[page-titles|Page titles]].

### Description

Set `description` in frontmatter to override the site-wide default for that page:

```markdown
---
description: Learn how to create, manage, and deploy Docker containers.
---
```

### Image

Set `image` in frontmatter to use a custom social image for that page:

```markdown
---
image: /assets/docker-guide-social.jpg
---
```

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "title": "My Site Name",
  "description": "Default site description.",
  "image": "/assets/default-social.jpg"
}
```

- `title`: Site name appended as a suffix to every page title
- `description`: Fallback description for pages with no frontmatter description
- `image`: Path to the default social image (relative to site root) or an external URL

### Complete example

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
