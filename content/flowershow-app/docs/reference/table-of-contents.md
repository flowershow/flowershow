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

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "showToc": false
}
```

- `showToc`: Set to `false` to disable the table of contents globally. Defaults to `true`.
