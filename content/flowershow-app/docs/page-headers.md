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

>[!note]
>Instead of using `title` frontmatter field, you can just set top level markdown `# Page title`. If neither `title` frontmatter field nor level 1 markdown heading is used, title will default to the filename.

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
date: 2024-03-06               # YYYY-MM-DD format
```

### Featured image

The `image` field sets a featured image for your page.

It's also is used in:
- Social media preview cards

You can specify your featured image in two ways:

1. **Repository Path**: Use a relative or absolute path to an image in your repository
2. **External URL**: Link to an image hosted elsewhere on the web

#### Adding a featured image

Add the `image` field to your page's frontmatter:

```yaml
---
title: My Page
image: content/assets/my-image.jpg  # relative path
---
```

Or use an absolute path from your repository root:

```yaml
---
title: My Page
image: /content/assets/my-image.jpg  # absolute path
---
```

You can also use external URLs:

```yaml
---
title: My Page
image: https://example.com/my-image.jpg  # external URL
---
```

## Best practices

- Use descriptive titles and descriptions for better SEO
- Include featured images when possible for better social sharing
- Recommended image dimensions: 1200x630 pixels for optimal social media sharing
- Keep image file sizes reasonable (under 1MB) for better performance
- Use ISO date format (YYYY-MM-DD) for dates

> [!info]
> For a detailed guide including examples and step-by-step instructions, check out [[how-to-configure-page-headers|this blog post]].