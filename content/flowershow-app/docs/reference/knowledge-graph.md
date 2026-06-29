---
title: Knowledge Graph
description: Show an interactive graph of how your notes connect to each other.
---

Configure the knowledge graph from the **Flowershow dashboard** under **Site Settings → Content**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> The knowledge graph is enabled by default and appears on the right-hand side of every page.

## How the graph works

During every publish, Flowershow extracts all internal links from your content and stores them. Three syntaxes are captured:

- Wiki links: `[[Page Name]]`
- Note embeds: `![[Page Name]]`
- Standard Markdown links: `[text](path)`

The graph renders these connections as a force-directed network. The current page is pinned at the centre and highlighted; every note that links to or from it radiates outward. Hover a node to dim unrelated nodes and links; click one to navigate to that page. An expand button opens a full-size view in a modal.

## Show or hide the knowledge graph

Go to **Settings → Content → Show Knowledge Graph** and set it to `true` or `false`.

You can also override this on a per-page basis using frontmatter:

```md
---
showKnowledgeGraph: false
---

Page content
```

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "showKnowledgeGraph": false
}
```

- `showKnowledgeGraph`: Set to `false` to disable the knowledge graph globally. Defaults to `true`.
