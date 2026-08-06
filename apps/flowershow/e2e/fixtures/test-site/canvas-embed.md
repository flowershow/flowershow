---
title: Canvas Embed Test
---

Inline canvas embeds must render as the canvas SVG diagram, not fall through
to a (broken) image. See canvas-embed.spec.ts.

## Wiki embed

<div data-testid="wiki-canvas-embed">

![[canvas-embed-demo.canvas]]

</div>

## Markdown embed

<div data-testid="md-canvas-embed">

![](canvas-embed-demo.canvas)

</div>
