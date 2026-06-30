---
title: "Knowledge Graph"
date: 2026-06-29
description: Interactive graph of how your notes connect — one of Obsidian's most beloved features, now in Flowershow.
authors:
  - olayway
showToc: false
---

If you've used Obsidian, you know the graph. A mini graph panel now appears on every page of your Flowershow site: the current note sits at the centre, highlighted in orange, with every connected note radiating outward. Hover a node to dim everything unrelated; click one to navigate to it. Two buttons in the corner let you go further: one opens a full-size local graph in a modal, and another opens the global graph — every note in your site at once.

## Why it's here now

The graph needs a fast, queryable map of which page links to which. The [[2026-06-23-backlinks|backlinks feature]] shipped that infrastructure — a dedicated `Link` table that captures every wiki link, note embed, and CommonMark link during the publish pipeline. The graph is the second feature built on top of it.

## Configuring it

The graph is off by default. Turn it on site-wide in **Settings → Show Knowledge Graph** or via `config.json`:

```json
{
  "showKnowledgeGraph": true
}
```
