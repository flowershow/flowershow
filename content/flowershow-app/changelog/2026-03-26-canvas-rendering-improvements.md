---
title: "Canvas rendering improvements"
date: 2026-03-26
description: Image embeds, note embeds with rendered markdown, custom hex colors, and style fixes for Obsidian Canvas rendering.
image: "[[assets/canvas-v2-preview.png]]"
showToc: false
authors:
  - olayway
---

Canvas rendering just got an upgrade!

![[canvas-demo-v2.canvas]]

## What's new

- **Image embeds** -- file nodes referencing images (`.png`, `.jpg`, `.gif`, `.svg`, `.webp`) now render the actual image inside the canvas node, with proper sizing and lazy loading
- **Note embeds with rendered markdown** -- file nodes pointing to `.md` files now display the note's rendered content (headings, lists, links, callouts, math, code highlighting) instead of just the filename
- **Rich text in text nodes** -- text nodes now render full markdown (GFM, wiki-links, callouts, math, syntax highlighting) instead of plain text
- **Custom hex colors** -- nodes and edges with custom hex color values (e.g. `#ff6600`) now render correctly, in addition to the 6 Obsidian color presets
- **Improved labels display** -- edge labels are now positioned correctly on edge lines and have background for better readability.

For full details, see the [[canvas|Canvas documentation]].
