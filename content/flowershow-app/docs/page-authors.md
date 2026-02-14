---
title: Page authors
description: Create dedicated profile pages for authors of your content and list them in page headers
---

## Basic usage

Add authors to a page using the `authors` field in the frontmatter:

```yaml
---
title: My Amazing Post
authors:
  - John Doe
  - Jane Doe
---
```

This will display the authors' names in the page header as a simple paragraph.

## Author pages

If you create markdown pages with the exact same names as listed in the `authors` field, Flowershow will automatically link the author names in page headers to those pages. These pages are just regular markdown pages, with an optional `avatar` field that enables displaying profile pictures next to author names.

Example author page (e.g. `/authors/Jane Doe.md`):

```yaml
---
title: Jane Doe
description: Technical writer
avatar: /assets/jane-avatar.jpg  # Optional - enables profile picture in page headers
---

Regular markdown content about Jane...
```

The `avatar` field can be:
- A path to an image in your repository: `/assets/jane-avatar.jpg`
- An external URL: `https://example.com/jane-avatar.jpg`


For a detailed guide with examples and screenshots, see [[how-to-create-author-pages|How to Create Author Pages]].