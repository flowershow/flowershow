---
title: SEO and social media metadata
description: Configure SEO titles, descriptions, and social media images for better search and sharing.
---

Configure site-wide SEO defaults from the **Flowershow dashboard** under **Site Settings → General**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

## Site name

Your site's name is set from **Settings → General → Name**.

This value is appended as a suffix to every page title and appears in browser tabs, search results, social shares, and bookmarks. It's also shown in your site's navbar and footer. It doesn't affect how the title displays in the page body itself. Keep the combined title under 60 characters for best results.

**Page title:** "My Guide"  
**Site name:** "My Site"  
**Final SEO title:** "My Guide - My Site"

When a page's title is the same as your site name — for example, your home page — the name isn't repeated. The SEO title is just "My Site" rather than "My Site - My Site".

## Default description

Go to **Settings → General → Description** and enter a fallback description for your site.

This is used in search results and social previews when a page has no `description` set in its frontmatter. Unlike titles, descriptions are not combined — the page value replaces the site default entirely.

Aim for 150–160 characters for optimal display in search results.

## Social preview cards

Every page gets its own preview card when its link is shared in Slack, X, LinkedIn, WhatsApp or iMessage. The card shows the page title, its section (the top-level folder, such as "Blog" or "Docs") and your site name and logo.

![[changelog-picture-preview-cards.webp]]

Which card a page gets:

1. **The page has an `image`:** the picture fills the left of the card, with the title on the right.
2. **No page image, but the site has one:** the site image takes its place, so every page still gets a picture card with its own title.
3. **No image at all:** the title, centred, with your site name below it.

- **Images already made for sharing** (about 1200×630, at least 1000 pixels wide, stored in your site) are used as they are, not put inside a card. On the home page, the site image is used as it is too, as is one uploaded in the dashboard.
- **Small images** (under 400 pixels on a side), SVGs and images that can't be loaded are skipped, so the page falls back to the next card.
- **Free sites** show a small Flowershow mark beside the site address; premium sites don't.
- **Password-protected sites:** the card and the preview's title and description show only the site name and tagline, never page titles, descriptions or images.

## Default social image

Set a site-wide `image` in `config.json` (all plans), or on premium sites upload one under **Settings → General → Social Image**. Pages without their own `image` show it in their card.

Use a landscape picture at least 1000 pixels wide. JPG, PNG and WebP all work.

## Per-page configuration

Site-wide defaults can be overridden on individual pages using frontmatter fields.

### Title

Page titles can be set using three methods (in order of precedence):

1. **Frontmatter `title` field** (highest precedence)
2. **First level 1 heading** (`# Heading`)
3. **Filename** (fallback)

Read more about [[page-title|Page titles]].

### Description

Set `description` in frontmatter to override the site-wide default for that page:

```markdown
---
description: Learn how to create, manage, and deploy Docker containers.
---
```

If a page has no `description`, Flowershow uses the opening sentence of the page as a short subtitle-style description (up to 140 characters) for search results and previews. It isn't shown in the page header, since the paragraph is right there.

### Image

Set `image` in frontmatter to give a page its own picture in its preview card. A relative path, an absolute path, a `[[wikilink]]` or an external `https` URL all work:

```markdown
---
image: /assets/docker-guide-cover.jpg
---
```

To use your own finished share image instead of a card, make it about 1200×630 pixels and put it in your site (not an external URL: Flowershow only knows the size of images in your site).

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "siteName": "My Site Name",
  "description": "Default site description.",
  "image": "/assets/default-social.jpg"
}
```

- `siteName`: Your site's name, appended as a suffix to every page title. Overrides the name set in the dashboard; defaults to your project name.
- `description`: Fallback description for pages with no frontmatter description
- `image`: Path to the default social image (relative to site root) or an external URL, shown in the preview card of pages without their own `image`

> [!note]
> `title` is still accepted as a deprecated alias for `siteName`. Existing configs keep working, but new sites should use `siteName`.

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
  "siteName": "DevTutorials",
  "description": "Professional development tutorials for modern developers.",
  "image": "/assets/devtutorials-default.jpg"
}
```

Result:

- **SEO title:** "Complete Guide to Docker Containers - DevTutorials"
- **Description:** "Learn how to create, manage, and deploy Docker containers with practical examples and best practices."
- **Social image:** a card with `/assets/docker-guide-social.jpg` on the left and the title on the right
