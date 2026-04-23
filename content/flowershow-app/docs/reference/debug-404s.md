---
title: Debugging 404 pages
description: Troubleshoot and fix 404 errors on your Flowershow site.
---

## How URLs map to files

When someone visits `/blog/my-post`, Flowershow looks for:

1. `/blog/my-post.md`
2. `/blog/my-post/README.md`
3. `/blog/my-post/index.md`

For your homepage (`/`), Flowershow looks for `/README.md` or `/index.md` at the root of your repository. See [[home-page|Home page resolution]] for the full fallback order.

If you've set a `rootDir` in site settings (e.g. `/docs`), all paths are resolved relative to that directory. For example, visiting `/quick-start` resolves to `/docs/quick-start.md`, `/docs/quick-start/README.md`, or `/docs/quick-start/index.md`.

## Common causes

### Missing index file

You have a `/blog/` directory but no `blog/README.md` or `blog/index.md` inside it.

**Fix:** Create a `README.md` in the directory.

> [!note]
> This also applies to the root URL. If your homepage returns a 404, your repository is missing a top-level `/README.md` or `/index.md`.

### Case mismatch

URLs are case-sensitive. File `About.md` maps to `/About`, not `/about`.

**Fix:** Match the exact casing of your file name in the URL.

### Missing `.md` extension

Your file is named `quick-start` instead of `quick-start.md`.

**Fix:** Add the `.md` extension to your file.

### File not synced

Your changes haven't been pushed to GitHub, or the site hasn't finished syncing.

**Fix:** Push your changes and wait for the sync to complete in your dashboard.

### File excluded from publishing

The file is in a `contentExclude` path or has `publish: false` in frontmatter.

**Fix:** Check your `config.json` `contentExclude` array and the file's frontmatter. See [[content-filtering|Content filtering]].

## File name encoding

- `.md` and `.mdx` extensions are stripped: `my-post.md` → `/my-post`
- `README.md` and `index.md` resolve to the parent directory URL: `/blog/README.md` → `/blog`
- Spaces become `+` in URLs: `my post.md` → `/my+post`
- Other special characters are URL-encoded via `encodeURIComponent()`: `café.md` → `/caf%C3%A9`
- Letter casing is preserved

## Debugging checklist

1. Check the file exists in your repository
2. Verify the file extension is `.md` or `.mdx`
3. Check for typos and casing mismatches
4. Confirm the site has finished syncing
5. Check the file isn't excluded from publishing
