---
title: How to Configure SEO and Social Media Metadata
description: Learn how to configure title, description, and social media images for better SEO and social sharing.
date: 2025-06-10
authors:
  - olayway
---

## Optimizing Your Content for Search and Social

Beyond basic page titles, Flowershow provides options to optimize your content for search engines and social media platforms. This guide covers how to set SEO titles, descriptions, and social media images to improve your site's discoverability and sharing experience.

## SEO Title Configuration

### Page-Level Title Setting

As covered in our [page title guide](./how-to-set-page-title.md), you can set individual page titles using three methods (in order of precedence):

1. **Title frontmatter field** (highest precedence)
2. **First level 1 heading** in your content
3. **Filename** (fallback)

For example:
```markdown
---
title: Complete Guide to Docker Containers
---

# Your content here
```

### Site-Wide Title Suffix

You can enhance your SEO by adding a site-wide title suffix in your [[config-file|config file]]. This automatically appends your brand or site name to every page title for better SEO.

```json
{
  "title": "MyProduct"
}
```

**Result:** If your page title is "Complete Guide to Docker Containers" and your config has `"title": "MyProduct"`, the final SEO title becomes:

```
Complete Guide to Docker Containers - MyProduct
```

This appears in:
- Browser tabs
- Search engine results
- Social media shares
- Bookmarks

Note: The suffix doesn't change how the title displays on your page.

**Best practices:**
- Keep the combined title under 60 characters for optimal search results
- Use a consistent brand name or site identifier
- Consider how the combination reads naturally

## Description Configuration

### Page-Level Descriptions

You can set unique descriptions for individual pages using the `description` frontmatter field:

```markdown
---
title: Complete Guide to Docker Containers
description: Learn how to create, manage, and deploy Docker containers with practical examples and best practices.
---

# Your content here
```

### Site-Wide Default Description

Provide a fallback description in your `config.json` for pages without specific descriptions:

```json
{
  "title": "MyProduct",
  "description": "The ultimate platform for developers to build, deploy, and scale applications efficiently."
}
```

**How it works:**
- If a page has a `description` in frontmatter → uses that description
- If no page description → uses the site-wide default from config
- Unlike titles, descriptions are **not** appended together

**SEO impact:**
- Descriptions appear in search engine results below the title
- They influence click-through rates from search results
- Should be 150-160 characters for optimal display
- Should accurately summarize the page content

```yaml
# Good
description: "Step-by-step tutorial for setting up Docker containers with real-world examples and troubleshooting tips."

# Avoid
description: "Docker guide"
```

## Social Media Image Configuration

>[!note] Premium Feature
>Social media image configuration is a premium feature available to Flowershow subscribers. However, images set in your frontmatter will still appear in your page header as described in the [page header guide](./how-to-configure-page-headers.md).
>
>**For free sites:** You'll always get a default Flowershow thumbnail image for social media sharing, regardless of your image settings.
>
>**For premium sites:** As part of removing Flowershow branding, the default Flowershow thumbnail is never used. You'll have either no social image, your page-specific image, or your custom site-wide fallback image.

### Page-Level Social Images

Set custom social media images for individual pages using the `image` frontmatter field:

```markdown
---
title: Complete Guide to Docker Containers
description: Learn Docker containers with practical examples and best practices.
image: /assets/docker-guide-social.jpg
---

# Your content here
```

### Site-Wide Default Image

Configure a default social media image in your `config.json`:

```json
{
  "title": "MyProduct",
  "description": "The ultimate platform for developers to build applications efficiently.",
  "image": "/assets/default-social-image.jpg"
}
```

**How it works:**
- If a page has an `image` in frontmatter → uses that image
- If no page image → uses the site-wide default from config
- Images are **not** combined or appended

**Image requirements:**
- Recommended size: 1200x630 pixels (1.91:1 aspect ratio)
- Format: JPG or PNG
- File size: Under 1MB for faster loading
- High contrast text if including text overlay

## Complete Example

Here's a fully optimized page with all metadata fields:

```markdown
---
title: Complete Guide to Docker Containers
description: Learn how to create, manage, and deploy Docker containers with practical examples, best practices, and troubleshooting tips.
image: /assets/docker-guide-social.jpg
date: 2025-06-10
authors:
  - johndoe
---

# Complete Guide to Docker Containers

Your comprehensive content here...
```

With this config.json:

```json
{
  "title": "DevTutorials",
  "description": "Professional development tutorials and guides for modern developers.",
  "image": "/assets/devtutorials-default.jpg"
}
```

**Final SEO results:**
- **SEO Title:** "Complete Guide to Docker Containers - DevTutorials"
- **Description:** "Learn how to create, manage, and deploy Docker containers with practical examples, best practices, and troubleshooting tips."
- **Social Image:** "/assets/docker-guide-social.jpg"

## Testing Your Metadata

To verify your SEO and social media setup:

1. **Search Results:** Use Google's Rich Results Test or search for your content
2. **Social Sharing:** Test links on Twitter, LinkedIn, and Facebook
3. **Browser Tabs:** Check how titles appear in browser tabs
4. **Open Graph:** Use Facebook's Sharing Debugger to preview social cards

## Conclusion

Proper SEO and social media metadata configuration significantly improves your content's discoverability and sharing appeal. By combining page-specific metadata with thoughtful site-wide defaults, you create a professional, optimized web presence that performs well in search results and social media platforms.