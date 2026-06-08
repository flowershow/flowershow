---
title: Markdown access
description: Every page on a Flowershow site is also served as raw markdown. Append .md to any URL to get clean, agent-readable content.
---

Every page on any Flowershow-hosted site is also available as raw markdown — including your own published content and the Flowershow documentation at `flowershow.app`. Append `.md` (or `.mdx` for MDX pages) to any page URL to get the source:

- **Page:** `https://your-site.flowershow.app/some/page`
- **Markdown:** `https://your-site.flowershow.app/some/page.md`
- **MDX:** `https://your-site.flowershow.app/some/page.mdx`

This works the same way for the Flowershow docs:

- **Page:** `https://flowershow.app/docs/reference/config-file`
- **Markdown:** `https://flowershow.app/docs/reference/config-file.md`

Raw markdown is faster and cheaper for AI agents to process than rendered HTML — no parsing, no noise.

## Special cases

**`index` and `README` pages** — directory URLs (e.g. `/some/folder/`) are served from `index.md`, `index.mdx`, `README.md`, or `README.mdx`. To fetch them as raw markdown, include the filename explicitly:

- `https://your-site.flowershow.app/some/folder/index.md`
- `https://your-site.flowershow.app/some/folder/README.md`

Appending `.md` directly to the directory URL (e.g. `/some/folder/.md`) will 404.

**MDX pages** — if the source file is `.mdx`, use the `.mdx` extension in the raw URL, not `.md`.

## Fetching markdown

```bash
# Fetch a page from your own site
curl https://your-site.flowershow.app/some/page.md

# Fetch a page from the Flowershow docs
curl https://flowershow.app/docs/reference/config-file.md

# Pipe to clipboard (macOS)
curl https://your-site.flowershow.app/some/page.md | pbcopy
```

## Feeding pages to AI assistants

### Single page

Copy one page and paste it into your prompt:

```text
Here is the documentation for [topic]:

[paste markdown content]

Based on this, how do I...
```

### Multiple pages

Combine pages for tasks that span features:

```text
I need to set up a blog with custom styles. Here is the relevant documentation:

## Blog setup
[paste publish-blog.md]

## Custom styles
[paste custom-styles.md]

Help me set this up step by step.
```
