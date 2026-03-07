---
title: "Obsidian Canvas support"
date: 2026-03-07
description: Flowershow now renders Obsidian Canvas (.canvas) files as SVG diagrams, both as standalone pages and inline embeds in markdown.
authors:
  - Rufus Pollock
---

Flowershow now supports [Obsidian Canvas](https://obsidian.md/canvas) files. Canvas files (`.canvas`) are automatically rendered as visual SVG diagrams showing your nodes, connections, and colors -- no configuration needed.

![[canvas-demo.canvas]]

## What's supported

- **Standalone canvas pages** -- any `.canvas` file in your content gets its own page, e.g. `Roadmap.canvas` renders at `/@user/project/Roadmap.canvas`
- **Inline embeds** -- embed a canvas in any markdown page with `![[my-diagram.canvas]]` or `![](my-diagram.canvas)`
- **Obsidian color presets** -- all 6 node color presets are rendered
- **Edges** -- connections between nodes render as bezier curves, with support for edge colors and labels
- **Text cards, file nodes, and node labels**

## How it works

Canvas files follow the open [JSON Canvas](https://jsoncanvas.org/) specification. When you sync your vault, Flowershow detects `.canvas` files, parses the JSON, and renders them as inline SVGs. The rendering is built on the [`@trbn/jsoncanvas`](https://github.com/trbndev/jsoncanvas) TypeScript bindings, with SVG rendering adapted from [`rehype-jsoncanvas`](https://github.com/lovettbarron/rehype-jsoncanvas).

## Current limitations

Canvas rendering is static SVG -- no zoom, pan, or interactivity yet. Text inside nodes is plain text without markdown formatting. These may be improved in future updates.

For full details, see the [[canvas|Canvas documentation]].
