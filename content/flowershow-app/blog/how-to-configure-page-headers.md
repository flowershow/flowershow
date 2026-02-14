---
title: How to Configure Page Headers
description: Learn how to customize your page headers in Flowershow Cloud with frontmatter configuration options for titles, descriptions, authors, dates, and featured images.
date: 2025-03-06
modified: 2025-06-16
authors:
  - olayway
image: /assets/page-headers.png
---

If you're using Flowershow Cloud to build your website, one of the first things you'll want to customize is how your pages look. The page header is particularly important as it's the first thing visitors see and plays a crucial role in SEO and social sharing. Let's dive into how you can configure your page headers to look exactly the way you want.

## Essential Configuration Options

### Title

The title is perhaps the most important element of your page header. You have 3 ways to set it:

1. Using the `title` frontmatter field
2. Using the top-level markdown heading (`# Page Title`)
3. Not setting any of the above and allowing Flowershow to use file name as the title.

Your title doesn't just appear in the page header - it's also used in:
- Search results
- Social media previews
- Sidebar navigation
- Browser tabs

Example:
```yaml
title: Chasing Auroras in Norway
```

![[header-title.png]]

Alternatively you could use the top level heading:

```markdown
# Chasing Auroras in Norway
```

Or just name your file `Chasing Auroras in Norway.md`.

### Description

A good description helps visitors understand what your page is about and improves SEO. It appears in your page header and is also used for search engine results and social media previews. You can set it using `description` frontmatter field.

Example:
```yaml
description: "Join me on a mesmerizing journey beneath the Arctic skies, where nature's most enchanting spectacle dances."
```

![[header-description.png]]

### Publication date

Adding publication dates helps visitors understand when content was created. You can configure it with `date` frontmatter field.

Example:
```yaml
date: 2024-04-17               # Use YYYY-MM-DD format
```

![[header-date.png]]

### Featured Image

Featured images make your content more engaging and improve social sharing[^1]. You can set them with `image` frontmatter field.

You have several options for adding them:

1. **Repository Images**:
```yaml
image: my-image.jpg    # relative path
image: /blog/my-image.jpg   # absolute path
```

2. **External Images**:
```yaml
image: https://example.com/my-image.jpg
```

![[header-image.png]]

### Authors

Learn how to display and configure page authors in [[how-to-create-author-pages|this blog post]].

![[header-authors.png]]

## Best Practices for Header Configuration

To get the most out of your page headers:

1. **Write Descriptive Titles**
   - Make them clear and specific
   - Include relevant keywords
   - Keep them under 60 characters for optimal SEO

2. **Craft Compelling Descriptions**
   - Summarize your content clearly
   - Include key information
   - Aim for 150-160 characters

3. **Optimize Featured Images**
   - Use 1200x630 pixels for optimal social sharing
   - Keep file sizes under 1MB
   - Choose visually appealing images that represent your content

4. **Maintain Consistency**
   - Use consistent date formats (YYYY-MM-DD)
   - Follow a consistent image naming convention

By following these guidelines and utilizing all available configuration options, you can create professional-looking pages that are both user-friendly and optimized for search engines and social sharing.

[^1]: Custom social share image is only set on premium sites.
