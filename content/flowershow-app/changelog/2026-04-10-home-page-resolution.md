---
title: "Predictable home page resolution"
date: 2026-04-10
description: Flowershow now resolves your home page via a fixed priority order — index.md, README.md, index.html, first markdown file, first HTML file, then 404.
authors:
  - olayway
showToc: false
---

Previously, if your content root had no `README.md` or `index.md`, visiting your site's root URL returned a 404. This was a common pain point for Obsidian users, whose vaults rarely contain either — your home note might be called anything from `Home.md` to `Welcome.md` to `My Notes.md`.

Flowershow now resolves the home page (`/`) via a fixed priority order, so your site always has something to show at the root.

## Resolution order

1. `index.md(x)` or `README.md(x)` at your content root
2. `index.html` — for when you want a fully custom homepage with your own HTML, outside the Flowershow layout
3. First `.md` or `.mdx` file (sorted by path) — best-effort fallback so Obsidian vaults and other collections without an index file always show something
4. First `.html` file (sorted by path) — fallback for content roots with only HTML files
5. 404

`index.*` takes precedence over `README.*` if both exist.

If you want full control over which note is your home page, just rename it (or add a copy) as `index.md`.

See [[home-page|Home page docs]] for the full details and recommendations.
