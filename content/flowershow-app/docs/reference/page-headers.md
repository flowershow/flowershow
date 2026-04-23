---
title: Page headers
description: Configure page headers and SEO meta tags.
---

## Available configuration options

Here are all the available page configuration options:

```yaml
---
title: My Page Title
description: A brief description
authors: ["John Doe", "Jane Smith"]
date: 2024-03-06
image: content/assets/my-image.jpg
---
```

### Title

The `title` field sets your page's title and is displayed in page header.

It's also used in:

- Page header
- Sidebar navigation
- Browser tab title
- Search engine result title
- Social media preview title

> [!note]
> Instead of using `title` frontmatter field, you can just set top level markdown `# Page title`. If neither `title` frontmatter field nor level 1 markdown heading is used, title will default to the filename.

### Description

The `description` field provides a brief summary of your page content and is displayed in page header.

It's also used in:

- Search engine result snippet
- Social media preview description

### Authors

The `authors` field lets you specify one or more authors for the page. Authors are displayed in page header.

```yaml
authors: ["John Doe"]           # Single author
authors: ["John", "Jane"]       # Multiple authors
```

See [[page-authors|Page authors]] for details on creating dedicated author pages with avatars.

### Date

The `date` field sets the publication date for your page and is displayed in page header.

```yaml
date: 2024-03-06 # YYYY-MM-DD format
```

### Featured image

The `image` field sets a featured image for your page.

It's also is used in:

- Social media preview cards[^1]

When someone shares your page on platforms like Twitter, LinkedIn, or Facebook, the featured image will be used to create a rich preview card, making your content stand out in social feeds.

For example:

![[cloud-featured-image.png]]

You can specify your featured image in two ways:

1. **Repository Path**: Use a relative or absolute path to an image in your repository
2. **External URL**: Link to an image hosted elsewhere on the web

#### Adding a featured image

Add the `image` field to your page's frontmatter:

```yaml
---
title: My Page
image: content/assets/my-image.jpg # relative path
---
```

Or use an absolute path from your repository root:

```yaml
---
title: My Page
image: /content/assets/my-image.jpg # absolute path
---
```

You can also use external URLs:

```yaml
---
title: My Page
image: https://example.com/my-image.jpg # external URL
---
```

> [!tip]
> Using images from your repository gives you more control and ensures they're always available. External URLs are convenient but depend on the external source staying available.

#### Best practices

- Use descriptive titles and descriptions for better SEO
- Include featured images when possible for better social sharing
- Recommended image dimensions: 1200x630 pixels (1.91:1 ratio) for optimal social media sharing
- Keep image file sizes reasonable (under 1MB) for better performance
- Use high-quality, relevant images with good contrast; avoid text in images as social platforms may add their own
- Respect image copyright: use your own images, properly licensed photos, or images from free stock photo sites
- Use ISO date format (YYYY-MM-DD) for dates

#### Testing featured images

After adding a featured image:

1. Wait for your site to sync
2. View your page to see the featured image
3. Test how it looks when shared using social media preview tools or by sharing the page on a test account

[^1]: Custom social share images are only available on premium sites.
