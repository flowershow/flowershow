---
title: Content filtering
description: Control which files and directories get published
---

Configure content filtering from the **Flowershow dashboard** under **Site Settings → Content**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

## Include paths

Go to **Settings → Content → Content Include** and enter an array of paths to include in your published site:

```json
[
  "/blog",
  "README.md"
]
```

Leave this field empty to include all files by default. If set, only the listed paths are published — no other files or directories will be included.

## Exclude paths

Go to **Settings → Content → Content Exclude** and enter an array of paths to exclude from your published site:

```json
[
  "/drafts",
  "private.md"
]
```

Exclude rules take precedence over include rules, so you can use both fields together — for example, to publish only `/blog` while excluding a subdirectory within it:

**Content Include:**
```json
["/blog", "README.md"]
```

**Content Exclude:**
```json
["/blog/_archive"]
```

This publishes everything in `/blog` and `README.md`, but skips `/blog/_archive`.

## Hide paths

Go to **Settings → Content → Content Hide** and enter an array of paths to keep published but hidden from the [[sidebar|sidebar]] and search results:

```json
[
  "/docs/people",
  "/docs/internal"
]
```

Hidden pages are still synced, published, and accessible by URL — they just won't appear in the sidebar or search. This is useful for content like author profiles or reference pages that shouldn't clutter navigation.

### `contentExclude` vs `contentHide`

| | `contentExclude` | `contentHide` |
|---|---|---|
| **Published** | No | Yes |
| **Accessible by URL** | No | Yes |
| **In sidebar** | No | No |
| **In search** | No | No |
| **Can be linked to** | No | Yes |

## Page-level control

Exclude a specific page using `publish: false` in its frontmatter:

```md
---
title: "Draft Post"
publish: false
---
```

> [!note]
> `publish: false` takes precedence over site-wide settings. `publish: true` cannot override site-wide exclusion rules and has no practical effect — you cannot use it to publish only files marked with it.

## Rules

- Exclude rules take precedence over include rules
- Paths are relative to the content root directory
- Directory paths include all subdirectories
- Glob patterns are not supported

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "contentInclude": [
    "/blog",
    "README.md"
  ],
  "contentExclude": [
    "/blog/_archive",
    "private.md"
  ],
  "contentHide": [
    "/docs/people",
    "/docs/internal"
  ]
}
```

- `contentInclude`: Array of paths to include. If omitted, all files are included by default.
- `contentExclude`: Array of paths to exclude entirely. Exclude rules take precedence over include rules.
- `contentHide`: Array of paths to keep published but hidden from sidebar and search.
