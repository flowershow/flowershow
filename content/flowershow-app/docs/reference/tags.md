---
title: Tags
description: Organize your notes with Obsidian-style tags — declared in frontmatter or inline as #tag — and browse them through automatically generated tag pages.
---

Flowershow supports **Obsidian-style tags**. Tag any page — from frontmatter or inline in the body — and Flowershow builds browsable tag pages for your whole site, with no configuration required.

> [!note]
> Tags are enabled by default and are extracted from your content on every publish. You can [turn tag display off](#turning-tags-off) if you use `#tags` purely for organizing your notes and don't want them on your published site.

## Declaring tags

A page's tags come from two places, and the two are combined into a single tag set for that page.

### Frontmatter

Add a `tags` (or `tag`) field to a page's frontmatter. It accepts a YAML list, a single string, or a comma/space-separated string. A leading `#` is optional and is stripped:

```yaml
---
tags: [book, book/fiction]
---
```

```yaml
---
tags: book, book/fiction
---
```

### Inline `#tags`

Write an Obsidian-style `#tag` anywhere in the body:

```md
Reading notes on my favourite #book and #book/fiction titles.
```

Inline tags follow Obsidian's grammar:

- A tag is one or more `/`-separated segments made of letters, digits, `_`, and `-` — for example `#book`, `#book/fiction`, `#2026-review`.
- A tag must be preceded by the start of a line or whitespace, so mid-word `#` (like a hex color `#fff` in `abc#fff`) and URL fragments are never treated as tags. A Markdown heading (`# Heading`) is not a tag, because a space isn't a tag character.
- A tag must contain at least one non-numeric character, so purely numeric tokens like `#1` or `#123` are **not** tags — this keeps issue references and numbered notes from being picked up.
- `#` inside inline code or fenced code blocks is left untouched.

## Case sensitivity and nested tags

Tags are matched **case-insensitively** — `#Book` and `#book` are the same tag — and the first-seen casing is preserved for display.

Tags are **hierarchical**: a parent tag matches all of its descendants. Listing pages for `book` also include pages tagged `book/fiction`.

## How tags render

- **Inline `#tags`** in the body render as clickable pills that link to their tag page.
- **Frontmatter tags** appear as a row of pills at the top of the page.

Every pill links to that tag's page (see below).

## Tag pages

Flowershow generates two kinds of tag pages for your site:

- **`/tags`** — an index of every tag on your site, each with a count of how many pages use it.
- **`/tags/{tag}`** — a listing of every page carrying that tag, including nested descendants. For a nested tag, the URL mirrors the tag, e.g. `#book/fiction` lives at `/tags/book/fiction`.

Tag pages are generated navigation pages, not Markdown content. They're served as a fallback, so if you publish your own page at `/tags` (or any `/tags/...` path), your content always takes precedence.

## Turning tags off

Tag display is optional. If you use `#tags` to organize your notes in Obsidian but don't want them surfaced on your published site, set `showTags` to `false` — in your site's dashboard settings ("Show Tags") or in `config.json`:

```json
{
  "showTags": false
}
```

When tags are off:

- Inline `#tags` in the body render as **plain text** instead of pill links.
- The **frontmatter tag row** in page headers is hidden.
- The **`/tags` index and `/tags/{tag}` pages** return 404 (and are dropped from your sitemap).

Tags are still extracted from your content, so `file.tags` and `file.hasTag()` in [[obsidian-bases|Obsidian Bases]] keep working — only the tag display is suppressed.

## Tags in Obsidian Bases

Tags are queryable from [[obsidian-bases|Obsidian Bases]]. Both `file.tags` and `file.hasTag()` operate on a page's full tag set — **frontmatter and inline body tags** — and respect nested matching:

```yaml
filters:
  or:
    - file.hasTag("book")
```

`file.hasTag("book")` matches pages tagged `book` as well as `book/fiction`.
