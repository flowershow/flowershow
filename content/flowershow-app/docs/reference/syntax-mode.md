---
title: Syntax Mode Configuration
description: Configure whether your content is parsed as Markdown or MDX, globally or per page.
---

Configure how your content is parsed from the **Flowershow dashboard** under **Site Settings → Content**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

## Global setting

Go to **Settings → Content → Markdown or MDX** and choose one of the following options:

- **Auto-detect** (default) — decides based on file extension (`.md` vs `.mdx`)
- **Markdown (md)** — parses all files as regular Markdown
- **MDX (mdx)** — parses all files as MDX

With the default **Auto-detect** setting, most users writing `.md` files will get standard Markdown rendering automatically. You only need to change this if you want all files to use a specific mode regardless of extension.

## Per-page override

Override the global setting for a specific page using frontmatter:

```markdown
---
title: My Page
syntaxMode: mdx
---

<List path="notes" />
```

## When to enable MDX

MDX lets you embed React components directly in your content. Enable it (globally or per page) when you want to:
- Use Flowershow components like [[list-component|List]]
- Write [[custom-styles#jsx-blocks-styled-with-tailwind|JSX blocks styled with Tailwind]]
- Embed interactive React components
- [[frontmatter-variables|Use frontmatter fields as variables in your content]]

> [!note]
> MDX has stricter parsing rules than regular Markdown and may break content that works fine in `.md` files:
> - HTML blocks (MDX expects JSX syntax, though some HTML may work)
> - Special characters like `<` that aren't part of valid JSX
> - Unescaped curly braces like `{a}` in regular text
>
> If you enable MDX globally and experience rendering issues, switch back to `md` or `auto` and enable MDX only on the specific pages that need it.

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "syntaxMode": "auto"
}
```

- `syntaxMode`: How to process your markdown files. Options: `"auto"` (auto-detect based on file extension), `"md"` (Markdown), `"mdx"` (MDX). Defaults to `"auto"` if not set.
