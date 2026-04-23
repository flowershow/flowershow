---
title: Obsidian Canvas
description: Render Obsidian Canvas (.canvas) files as visual diagrams on your Flowershow site.
---

Flowershow supports rendering [Obsidian Canvas](https://obsidian.md/canvas) files (`.canvas`). Canvas files follow the open [JSON Canvas](https://jsoncanvas.org/) specification and are displayed as SVG diagrams showing your nodes, connections, and colors.

## Demo

Here's a simple canvas embedded inline in this page:

![[canvas-demo-v2.canvas]]

You can also view it as a [[canvas-demo.canvas|standalone page]].

## How It Works

Canvas files (`.canvas`) are JSON files created by Obsidian's Canvas feature. When you sync your Obsidian vault to Flowershow, canvas files are automatically detected and rendered as visual diagrams -- no configuration needed.

## Standalone Canvas Pages

Any `.canvas` file in your content is automatically rendered as its own page. The URL preserves the `.canvas` extension to avoid conflicts with markdown files of the same name:

- `Roadmap.canvas` renders at `/@user/project/Roadmap.canvas`
- `notes/architecture.canvas` renders at `/@user/project/notes/architecture.canvas`

Canvas files also appear in the sidebar navigation alongside your markdown pages.

## Inline Canvas Embeds

You can embed a canvas inside any markdown page using either Obsidian wiki-link or standard markdown image syntax:

```md
![[my-diagram.canvas]]

![](my-diagram.canvas)
```

The canvas renders as an inline SVG diagram within the page content.

## Supported Features

- **Rich text nodes** -- text nodes render full markdown including GFM tables, wiki-links, callouts, math (KaTeX), and syntax-highlighted code
- **Image embeds** -- file nodes referencing images (`.png`, `.jpg`, `.gif`, `.svg`, `.webp`, `.bmp`, `.ico`) display the actual image inside the node
- **Note embeds** -- file nodes referencing `.md` files render the note's content with full markdown formatting and a title heading
- **Colored nodes** -- all 6 Obsidian color presets plus custom hex colors (e.g. `#ff6600`)
- **Edges** -- connections between nodes render as bezier curves with support for edge colors, labels, and arrow markers on both ends
- **Node labels** -- optional labels displayed above node content

## Limitations

- Canvas rendering is static -- no zoom, pan, or interactivity
- Nested canvas (canvas within canvas) is not yet supported

These limitations may be addressed in future updates based on user feedback.
