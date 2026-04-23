---
title: Three Ways to Set a Page Title
description: Learn the three different ways to set page titles and understand their precedence order.
date: 2025-06-09
authors:
  - olayway
image: /assets/page-titles.png
---
## The Three Ways to Set Page Titles

Flowershow offers three methods to set your page titles, listed here in order of precedence (highest to lowest):

### 1. Title Frontmatter Field (Highest Precedence)

The most explicit and reliable way to set your page title is using the `title` field in your markdown frontmatter. This method takes the highest precedence and will always override other title sources.

```markdown
---
title: Complete Guide to Markdown Syntax
---

Content in file named "markdown-syntax-guide.md"
```

**Result:**
- Page title will be "Complete Guide to Markdown Syntax"
- URL path will be: `/markdown-syntax-guide`

**When to use:** Use this method when you want precise control over your page title, especially when it differs from your main heading or filename.

### 2. First Level 1 Markdown Heading

If no `title` frontmatter is specified, Flowershow will use the first level 1 heading it finds in your markdown content as the page title.

```markdown
# Complete Guide to Markdown Syntax

Content in file named "markdown-syntax-guide.md"
```

**Result:**
- Page title will be "Complete Guide to Markdown Syntax"
- URL path will be: `/markdown-syntax-guide`

**When to use:** This is perfect for content where your main level 1 heading naturally serves as the page title.

### 3. File Name (Fallback)

When neither a frontmatter title nor a level 1 heading is present, Flowershow will use the filename (without the `.md` extension) as the page title.

```markdown
Content in file named "markdown-syntax-guide.md"
```

**Result:**
- Page title will be "markdown-syntax-guide"
- URL path will be: `/markdown-syntax-guide`

**When to use:** This works well for when you prefer descriptive filenames (especially popular in Obsidian note-taking) and minimal frontmatter, or when you simply forget to set the title for your page.

>[!hint]
> Notice how in this method file name is both a base for the rendered page URL path and for it's title.
> 
> If you prefer this option, you can use more descriptive names for your files, e.g. have a file named `Complete Guide to Markdown Syntax.md`. In this case the title of that page will be "Complete Guide to Markdown Syntax" and the URL path will be `/Complete+Guide+to+Markdown+Syntax`.

### SEO Implications

Page titles aren't just for display on your page—they're crucial for SEO as they appear in search results, browser tabs, and social shares, and help search engines understand your content.

Here are the key SEO considerations for page titles:
- Include relevant keywords in your titles
- Keep titles under 60 characters for optimal search results
- Make titles unique across your site

```yaml
# Good
title: "Complete Guide to Setting Up Docker Containers"

# Avoid
title: "Setup Guide"
```

{/* TODO: link to separate guide/docs on SEO fields settings */}

## Conclusion

Understanding Flowershow's title precedence system gives you the flexibility to organize your content exactly how you want. Whether you prefer explicit frontmatter control, natural heading-based titles, or simple filename fallbacks, you can choose the approach that best fits your workflow and content strategy.

The key is consistency - pick the method that works best for your site's structure and stick with it across similar content types.