---
title: Backlinks
description: Show a list of pages that link to the current page.
---

Configure backlinks from the **Flowershow dashboard** under **Site Settings → Features**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> Backlinks are enabled by default. When a page has incoming links, a **Links to this page** panel appears at the bottom of that page. If no other page links to it, the panel is hidden.

## How backlinks work

During every publish, Flowershow extracts all internal links from your content and stores them. Three syntaxes are captured:

- Wiki links: `[[Page Name]]`
- Embeds: `![[Page Name]]`
- Standard Markdown links: `[text](path)`

External URLs and anchor-only links are not included. After extraction, links are resolved to their target pages so the backlinks section can display the correct titles and URLs.

## Show or hide backlinks

Go to **Settings → Features → Show Backlinks** and set it to `true` or `false`.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "showBacklinks": false
}
```

- `showBacklinks`: Set to `false` to disable backlinks site-wide. Defaults to `true`.
