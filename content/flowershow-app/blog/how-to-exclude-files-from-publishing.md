---
title: How to Exclude Files from Publishing
description: Learn how to control which files get published in your Flowershow site.
date: 2025-05-28
authors:
  - olayway
---

Flowershow provides flexible options for controlling which files and directories are included in your published site. This is particularly useful when you want to:

- Publish only specific sections of your content
- Exclude private or work-in-progress content
- Hide archive posts

## Using Site-Wide Settings

The primary way to control content filtering is through the `contentInclude` and `contentExclude` fields in your [[docs/config-file|`config.json` file]].

### Excluding Content

To specify which files and directories should be excluded from your published site, use the `contentExclude` field.

For example, here we can exclude all of the drafts folder *and* a specific file `private.md`:

```json
  "contentExclude": [
    "/drafts",
    "private.md"
  ]
```

### Including Specific Content

If instead you want to publish only _some_ files or directories, you can use the `contentInclude` field:

```json
  "contentInclude": [
    "/blog",
    "README.md"
  ]
```

If this config field is set, no other files or directories will be published.

### Combining include and exclude rules

You can use both `contentInclude` and `contentExclude` together for more fine-grained control. For example, if you want to publish your blog but exclude the archive directory:

```json
  "contentInclude": [
    "README.md"        // Include the main README
    "/blog"            // and the blog directory
  ],
  "contentExclude": [
    "/blog/_archive"   // But exclude the _archive subdirectory
  ]
```

Remember that exclude rules always take precedence over include rules.

## Using page-level control

Sometimes you might want to exclude just a specific page. You can do this by adding `publish: false` in the page's frontmatter:

```md
---
title: "Draft Post"
publish: false
---

This page won't be published.
```

The `publish: false` setting takes precedence over site-wide settings in `config.json`. However, note that `publish: true` cannot be used to override site-wide exclusion rules or to selectively publish only specific pages.

## Important notes

- If a path matches both `contentInclude` and `contentExclude`, the exclude rule takes precedence
- Paths are relative to your content root directory
- Directory paths will include all files and subdirectories within them
- Glob patterns are not supported at the moment
