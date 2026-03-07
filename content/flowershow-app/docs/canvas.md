---
title: Obsidian Canvas
description: Render Obsidian Canvas (.canvas) files as visual diagrams on your Flowershow site.
---

Flowershow supports rendering [Obsidian Canvas](https://obsidian.md/canvas) files (`.canvas`). Canvas files follow the open [JSON Canvas](https://jsoncanvas.org/) specification and are displayed as SVG diagrams showing your nodes, connections, and colors.

## Demo

Here's a simple canvas embedded inline in this page:

![[canvas-demo.canvas]]

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

- Text cards with content
- Colored nodes (all 6 Obsidian color presets)
- Edges (connections between nodes) with bezier curves
- Edge colors and labels
- Node labels
- File embed nodes (displayed as filename references)

## Limitations

- Canvas rendering is a static SVG -- no zoom, pan, or interactivity
- Text inside nodes is plain text (no markdown formatting)
- Embedded markdown files within canvas nodes show as filename references rather than rendered content
- Nested canvas (canvas within canvas) is not yet supported

These limitations may be addressed in future updates based on user feedback.
