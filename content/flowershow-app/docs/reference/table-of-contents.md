---
title: Table of contents
description: Control visibility of the page table of contents
---

Configure the table of contents from the **Flowershow dashboard** under **Site Settings → Content**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> The table of contents is enabled by default and appears on the right-hand side of pages that have headings.

## Show or hide the table of contents

Go to **Settings → Content → Show Table of Contents** and set it to `true` or `false`.

You can also override this on a per-page basis using frontmatter:

```md
---
showToc: false
---

Page content
```

## Choose the rail style

The table of contents has two styles:

- `panel` (default): the classic contents panel in the right-hand column.
- `rail`: a column of short ticks in the right-hand column, one for each `h2` and `h3` heading.

On the rail, the current section's tick is longer and in the accent colour. Ticks for sections you have already passed are darker. Hover over the rail, or tab to it with the keyboard, to open the outline. It opens to the left. Click a title to jump to that section.

The rail shows from 1024px wide, on pages with 3 or more `h2` and `h3` headings.

The rail is opt-in for now. It may become the default later. It is not in the dashboard settings yet, so set it in `config.json` or in page frontmatter.

In `config.json`:

```json
{
  "toc": {
    "style": "rail"
  }
}
```

Or for one page, in frontmatter:

```md
---
toc:
  style: rail
---

Page content
```

`showToc: false` still turns the table of contents off completely, whatever the style.

## Contents on narrow screens

On narrower screens a closed **Contents** block appears under the page title, for both styles. Tap it to open the list of headings. The rail switches to this block below 1024px wide, and the classic panel below 1280px wide.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "showToc": false
}
```

- `showToc`: Set to `false` to disable the table of contents globally. Defaults to `true`.
- `toc.style`: `"panel"` (default) or `"rail"`. See [Choose the rail style](#choose-the-rail-style).
