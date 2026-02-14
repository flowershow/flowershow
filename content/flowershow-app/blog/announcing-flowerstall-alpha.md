---
title: Flowerstall (Alpha) - Instant previews for Markdown geeks
description: Point at a file, see it live, move on. An instant local preview server for your Markdown.
date: 2026-01-26
authors:
  - abeelha
image: "[[flowerstall-logo.png]]"
---

> Point at a file, see it live, move on.

Flowerstall is a tiny Node-based preview server for Markdown/HTML that strips front matter, runs remark/rehype, injects Tailwind from the CDN, links your local CSS (e.g., `custom.css`), and live-reloads as you edit.

No bundler, no build step—just point it at a file and keep writing.

Check out the repo here: [https://github.com/flowershow/flowerstall](https://github.com/flowershow/flowerstall)

## What it does (and why it’s handy)

- **Renders Markdown** (with inline HTML) and removes front matter.
- **Injects Tailwind** via CDN plus any local CSS you point it at.
- **Serves assets** from the file’s directory (or `--root`), with optional livereload.
- **Zero build output**: everything is rendered in-memory on request.

## How to try it (alpha)

```bash
git clone https://github.com/flowershow/flowerstall
cd flowerstall
npm install
./flowerstall sample/metacrisis.md --css custom.css --port 3000 --lr-port 35729
# or disable livereload if the port is blocked:
# ./flowerstall sample/metacrisis.md --no-lr
```

Open `http://localhost:3000` and edit your file/CSS to see live updates.

## Flowerstall + Flowershow

Flowerstall is the local companion to [Flowershow](https://flowershow.app)

Use Flowerstall to preview Tailwind-heavy Flowershow content locally—catch layout or styling issues instantly before pushing live. It also works standalone for any Markdown/HTML project when you just need a quick, styled preview with live reload.

## Caveats (it’s alpha)

- Livereload will disable itself if the port is blocked; use `--no-lr` if needed.
- Tailwind is pulled from the CDN; there’s no build step or JIT config.
- Minimal feature set by design—file-based previews first, polish later.

If you try it and hit rough edges, file an issue or drop feedback on GitHub. We’re keeping it intentionally small but want it to be useful for everyday Markdown work.
