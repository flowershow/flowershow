---
title: Page titles
description: Set the tile of your page, both for display and for SEO
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

### 3. Filename (fallback)

```
(no title set)
content in your-page-title.md
```

**Resulting page title:** "your-page-title"

## Title precedence order

Flowershow uses the following precedence order for page titles (highest to lowest):

1. **Frontmatter `title` field** (highest precedence)
2. **First level 1 heading** (`# Heading`)
3. **Filename** (fallback)