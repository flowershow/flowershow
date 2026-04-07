---
title: Home page
description: How Flowershow resolves which file to show at the root of your site.
---

Your home page is whatever file Flowershow resolves for the `/` path. The resolution follows a fixed priority order.

## Resolution order

### 1. `README.md(x)` or `index.md(x)`

If a `README.md`, `README.mdx`, `index.md`, or `index.mdx` exists at your content root, it becomes your home page. This is the most common and recommended way to define a homepage.

If both exist in the same directory, `index.*` takes precedence over `README.*`.

### 2. `index.html`

If no markdown index file is found, Flowershow looks for `index.html` at the root. If found, it redirects to `/index.html`, which is served as a raw HTML file — outside the normal Flowershow layout.

This is useful if you want full control over your homepage with custom HTML.

### 3. First Markdown/MDX file

If no index file or `index.html` exists, Flowershow falls back to the first `md` or `mdx` file, sorted by URL path then file path. This is a best-effort fallback — the result may not be what you intend.

### 4. First HTML file

If there are no markdown files at all, Flowershow tries the first `.html` file sorted by file path and redirects to its URL.

### 5. 404

If none of the above exist, a 404 is returned.

## Recommendations

For a predictable homepage, always create one of:

- `README.md` — conventional, recognised by GitHub
- `index.md` — conventional for static sites

If you want a custom HTML homepage, create `index.html` at the root of your content folder.

## HTML files and layout

`.html` files are served raw — they bypass the Flowershow layout (navbar, sidebar, styles). The browser renders them directly. This applies to `index.html` and all other `.html` files accessed at their `.html` URL path.

## rootDir

If you've set a `rootDir` in site settings (e.g. `/docs`), all resolution above is relative to that directory.

See also: [[debugging-404s|Debugging 404 pages]]
