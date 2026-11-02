---
title: Mermaid, Obsidian Bases and PDF embeds now work in plain Markdown
date: 2026-10-10
description: Mermaid diagrams, Obsidian Bases, the PDF viewer and code-block copy buttons now work in .md pages. You no longer need to switch to MDX.
authors:
  - rufuspollock
image: "[[assets/changelog-markdown-mermaid-bases-pdf.webp]]"
showToc: false
---

Several features used to work only in MDX pages, so you had to rename a file to `.mdx` or set `syntaxMode: mdx` to get them. They now work in ordinary `.md` pages too:

- **Mermaid diagrams**: ```` ```mermaid ```` code blocks render as diagrams. See [[mermaid|Mermaid diagrams]].
- **Obsidian Bases**: ```` ```base ```` blocks render as table, cards and list views. See [[obsidian-bases|Obsidian Bases]].
- **PDF embeds**: `![[report.pdf]]` and `<iframe src="report.pdf">` open in the built-in PDF viewer.
- **Copy button on code blocks**: every code block gets one.

If you switched pages to MDX only for these features, you can switch them back.

**Fixes**

- An inline `<svg>` with a blank line inside it (for example in its `<style>`) no longer breaks the page in `.md` pages. Before, the rest of the SVG, including `<animate>` and `<animateMotion>` animations, and the content after it failed to render.
