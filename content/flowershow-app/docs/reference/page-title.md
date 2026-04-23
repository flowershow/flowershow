---
title: Page title
description: Set the title of your page, both for display and for SEO
---

## Methods

### Frontmatter title

```markdown
---
title: "Your Page Title"
---

content in your-page-title.md
```

**Resulting page title:** "Your Page Title"

### Level 1 heading

```markdown
# Your Page Title

content in your-page-title.md
```

**Resulting page title:** "Your Page Title"

### Filename (fallback)

```
(no title set)
content in your-page-title.md
```

**Resulting page title:** "your-page-title"

> [!hint]
> With the filename fallback, you can use descriptive filenames like `Complete Guide to Markdown Syntax.md` — the page title will be "Complete Guide to Markdown Syntax" and the URL path will be `/Complete+Guide+to+Markdown+Syntax`.

## Title precedence order

Flowershow uses the following precedence order for page titles (highest to lowest):

1. **Frontmatter `title` field** (highest precedence)
2. **First level 1 heading** (`# Heading`)
3. **Filename** (fallback)

## SEO

Page titles appear in search results, browser tabs, and social shares. Key considerations:

- Include relevant keywords
- Keep titles under 60 characters
- Make titles unique across your site
