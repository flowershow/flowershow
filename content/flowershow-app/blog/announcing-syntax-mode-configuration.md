---
title: Choose Your Rendering Mode - Markdown or MDX
description: Flowershow now lets you choose how each page is rendered — Markdown for pure content, MDX for components and JSX.
date: 2025-11-09
authors:
  - olayway
image: /assets/md-and-mdx.png
---

If you’ve ever published notes from Obsidian or another Markdown editor with Flowershow and suddenly ran into strange parsing errors — like `<a, b>` breaking your page or `{something}` causing a crash — you’re not alone.

Until now, Flowershow rendered everything as MDX, a powerful format that supports JSX components like `<List>` or custom JSX blocks styled with Tailwind. The trade-off? MDX is also stricter than plain Markdown. Some syntax that works fine in Obsidian or GitHub Markdown doesn’t play nicely with MDX’s JavaScript-based parsing rules.

That changes today.

Flowershow will now automatically choose the right rendering mode for your content — Markdown or MDX — based on the file extension. Regular `.md` files are parsed as plain Markdown, while `.mdx` files use MDX rendering. And if you ever want to override this behavior, you can control it per-site or per-page.

## Why This Matters

This update ensures that your regular Markdown notes “just work”, while still giving you the option to use JSX components whenever you need them.

Markdown mode is perfect for clean, note-style content (ideal for Obsidian users). MDX mode, on the other hand, unlocks dynamic components and JSX blocks, but comes with stricter syntax rules. For example:
- HTML blocks may not parse if they aren’t valid JSX
- `<a, b>` or other “non-JSX” tags (`<a` is treated as a start of a tag) will break
- `{a}` is treated as a JavaScript expression, not plain text, so you'll get errors like "a is not defined"

With syntax mode configuration, you can:
- Use Markdown rendering for content with HTML or special characters
- Switch to MDX for JSX-based pages and Flowershow components
- Mix both across your site as needed

## Configuration Options

### Global Configuration

Set the default rendering mode for your entire site using the **Syntax Mode** option in your site's dashboard settings.

![](syntax-mode-config.png)

Options:
- `"md"` - Use regular Markdown rendering for all pages
- `"mdx"` - Use MDX rendering for all pages
- `"auto"` - (Default) Automatically decide based on file extension (`.md` vs `.mdx`)

### Per-Page Override

Override the global setting for individual pages using frontmatter:

```markdown
---
title: My Page
syntaxMode: md
---

Your content here...
```

Per-page frontmatter accepts:
- `"md"` - Render this page as regular Markdown
- `"mdx"` - Render this page as MDX

## Publishing from Obsidian

If you're authoring your content in Obsidian (or some other Markdown editor) and want to take advantage of some MDX features, e.g. use a Flowershow component, you can use frontmatter to set the rendering mode to MDX for a given file. Changing file extension to `.mdx` is not advised in this case, because you won't be able to edit that file in Obsidian anymore (you can only edit `.md` files there).

```markdown
---
title: My Catalog Page
syntaxMode: mdx
---

<List path="notes" />
```

## Summary

The new syntax mode configuration gives you the flexibility to:
- Work seamlessly with content from Obsidian and other Markdown editors
- Progressively enhance your site with JSX components
- Choose the right rendering mode for each page's needs
