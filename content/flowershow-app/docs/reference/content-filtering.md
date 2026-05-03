---
title: Content filtering
description: Control which files and directories get published
---

## General Configuration

Control which files are included in your published site using `contentInclude` and `contentExclude` in your [[config-file|`config.json`]]:

### `contentInclude`

Array of paths to include in your published site:
```json
{
  "contentInclude": [
    "/blog",           // Include entire blog directory
    "README.md"        // Include specific file
  ]
}
```

If not specified, all files are included by default (except those in `contentExclude`). If set, only the listed paths are published — no other files or directories will be included.

### `contentExclude`

Array of paths to exclude from your published site:
```json
{
  "contentExclude": [
    "/drafts",          // Exclude entire drafts directory
    "private.md"        // Exclude specific file
  ]
}
```

### Page-level Control

Exclude a specific page using `publish: false` in frontmatter:

```md
---
title: "Draft Post"
publish: false
---
```

Note: `publish: false` takes precedence over site-wide settings, but `publish: true` cannot override site-wide exclusion rules, and doesn't have any meaning in practice. You can't use it to publish only the files marked with it.

### Rules

- Exclude rules take precedence over include rules
- Paths are relative to content root directory
- Directory paths include all subdirectories
- Glob patterns not supported

### Example: Combined Usage

Here's how to combine `contentInclude` and `contentExclude` to publish only specific content while excluding certain subdirectories:

```json
{
  "contentInclude": [
    "/blog",           // Include entire blog directory
    "README.md"        // Include specific file
  ],
  "contentExclude": [
    "/blog/_archive"   // Exclude archive subdirectory from blog
  ]
}
```

This configuration will:
1. Only publish files from the `/blog` directory and `README.md`
2. Exclude everything in `/blog/_archive` (since exclude rules take precedence)
3. Not publish any other files or directories

## Hiding content from sidebar and search

Use `contentHide` to keep pages published and accessible by URL, but hide them from the [[sidebar|sidebar navigation]] and search results. This is useful for content like author profiles, reference pages, or other pages that shouldn't clutter the sidebar or search.

```json
{
  "contentHide": [
    "/docs/people",
    "/docs/internal"
  ]
}
```

Unlike `contentExclude`, hidden pages are still synced, published, and can be linked to — they're just not discoverable through the sidebar or search.

### `contentExclude` vs `contentHide`

| | `contentExclude` | `contentHide` |
|---|---|---|
| **Published** | No | Yes |
| **Accessible by URL** | No | Yes |
| **In sidebar** | No | No |
| **In search** | No | No |
| **Can be linked to** | No | Yes |