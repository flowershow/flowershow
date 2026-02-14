---
title: Debugging 404 Pages
description: Learn how to troubleshoot and fix 404 errors in your Flowershow site by understanding the URL-to-file mapping system and common causes of missing pages.
date: 2025-05-28
authors:
  - olayway
image: /assets/404.png
---

In this guide, I'll walk you through the most common causes of 404 errors in Flowershow and how to fix them.

## Understanding Flowershow's URL-to-file mapping

The key to debugging 404 pages in Flowershow is understanding how URLs map to files in your GitHub repository. Flowershow follows a specific pattern for resolving URLs to markdown files.

### The basic rule

When someone visits a URL like `https://my.flowershow.app/@username/sitename/blog`, Flowershow has it mapped internally to one of these files in your repository:

1. `/blog.md` or
2. `/blog/README.md` or
3. `/blog/index.md` 

In case of the root (home page) of your website (e.g. `https://my.flowershow.app/@username/sitename`), Flowershow will look for:
1. `/README.md` or
2. `/index.md`

### Root directory configuration

If your site is published from a specific folder within your GitHub repository (not the whole repo), meaning you have `rootDir` configured in your site settings, then all file paths that Flowershow tries to resolve to will be prepended with this root directory.

For example, if your `rootDir` is set to `/docs` and someone visits `/quick-start`, Flowershow will have it mapped to one of:
1. `/docs/quick-start.md`,
2. `/docs/quick-start/README.md` or
3. `/docs/quick-start/index.md`

### File name encoding in URLs

When Flowershow resolves file paths to URLs, it applies specific encoding rules to ensure URLs are web-safe and properly formatted:

1. **File extension removal**: The `.md` and `.mdx` extensions are automatically stripped from the URL
   - `/blog/my-post.md` becomes `/blog/my-post`
   - `/docs/guide.mdx` becomes `/docs/guide`

2. **Index file handling**: Files named `index` or `README` are removed from the end of the URL path
   - `/blog/README.md` becomes `/blog`
   - `/docs/getting-started/index.md` becomes `/docs/getting-started`

3. **URL encoding**: Special characters in file names are encoded using a custom encoding scheme:
   - Spaces are converted to `+` (plus signs)
   - Other special characters are encoded using `encodeURIComponent()`
   - Letter casing is preserved

**Examples of file name encoding**:
- File: `/my blog post.md` → URL: `/my+blog+post`
- File: `/café & restaurant.md` → URL: `/caf%C3%A9+%26+restaurant`
- File: `/docs/api/Users.md` → URL: `/docs/api/Users`

This encoding system ensures that your file names can contain spaces and special characters while still generating valid, web-friendly URLs.

## Common causes of 404 errors

### Missing index files

**Problem**: You have a directory like `/blog/` with content and you try to visit it at `https://my.flowershow.app/@username/sitename/blog`, but you don't have an index file in that folder.

**Solution**:
- Create one of these files:
  - `/blog/README.md` (recommended)
  - `/blog/index.md`
- Or rename your directory to `/blog.md` if it's supposted to be a single page

> [!note] 404 on the main page of your site
> The problem described above also applies to root URL of your site. If you get 404 error there, it means your repository lacks the top level `/README.md` (or `/index.md`) file.

### Mismatch in casing

**Problem**: Flowershow URLs are case sensitive and you've typed a wrong case in the URL.

**Example**:
- File: `/About.md`
- URL: `/about` ❌
- URL should be: `/About` ✅

### Missing or incorrect file extension

**Problem**: You forgot to include `.md` (or `.mdx`) extension in the file name. Or you've used incorrect extension, e.g. `.txt`.

**Example**:
- URL: `/quick-start`
- File: `/quick-start` ❌
- File should be: `/quick-start.md` ✅

### Stupid typo

Just a typo in the URL or file path 🐛

## Debugging steps

1. Check for missing file in your repository
2. Verify it's extension
3. Check for typos and casing mismatches in the URL and file path
4. Check if the site has finished syncing
5. Check if you have committed and pushed your changes to the GitHub repository.
6. Check that page in not excluded from publishing
