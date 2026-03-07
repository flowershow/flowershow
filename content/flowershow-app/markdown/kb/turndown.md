---
title: "Turndown: HTML to Markdown converter"
source: "https://github.com/mixmark-io/turndown"
created: 2025-10-18
---

# Turndown

[Turndown](https://github.com/mixmark-io/turndown) is an open-source JavaScript library that converts HTML into Markdown. 10k+ stars on GitHub, MIT licensed.

Useful for migrating HTML content to Markdown, building tools that extract Markdown from web pages, or converting rich text editor output to Markdown.

## Quick usage

```bash
npm install turndown
```

```js
var TurndownService = require('turndown')
var turndownService = new TurndownService()
var markdown = turndownService.turndown('<h1>Hello world!</h1>')
```

It also works in the browser and accepts DOM nodes as input.

## Key features

- Configurable heading style (setext/atx), list markers, code block style, link style
- Extensible via rules and plugins (e.g. [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) for tables and strikethrough)
- `keep()` and `remove()` methods for fine-grained control over which HTML elements to preserve or strip

See the [full README](https://github.com/mixmark-io/turndown) for details.
