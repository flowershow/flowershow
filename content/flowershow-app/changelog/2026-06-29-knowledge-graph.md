---
title: "Knowledge Graph"
date: 2026-06-29
description: Every page now shows a live, interactive graph of how your notes connect — one of Obsidian's most beloved features, now on the web.
authors:
  - olayway
showToc: false
---

If you've used Obsidian, you know the graph. A mini graph panel now appears on every page of your Flowershow site: the current note sits at the centre, highlighted in orange, with every connected note radiating outward. Hover a node to dim everything unrelated; click one to navigate to it. An expand button opens a full-size version in a modal for sites with dense link networks.

## Why it's here now

The graph needs a fast, queryable map of which page links to which. The [[2026-06-23-backlinks|backlinks feature]] shipped that infrastructure — a dedicated `Link` table that captures every wiki link, note embed, and CommonMark link during the publish pipeline. The graph is the second feature built on top of it.

## Configuring it

The graph is on by default. Turn it off site-wide in **Settings → Show Knowledge Graph**, via `config.json`:

```json
{
  "showKnowledgeGraph": false
}
```

or per page in frontmatter:

```yaml
---
showKnowledgeGraph: false
---
```
