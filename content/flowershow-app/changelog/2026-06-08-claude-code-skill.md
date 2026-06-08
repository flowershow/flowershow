---
title: "AI assistant skill"
date: 2026-06-08
description: A skill for AI coding assistants that lets them publish and manage Flowershow sites using the fl CLI — without guessing commands or hallucinating config options.
authors:
  - olayway
showToc: false
---

You can now install a Flowershow skill for your AI coding assistant that gives it everything it needs to publish your notes and manage your sites without hand-holding.

## What it does

The skill instructs your AI assistant how to use the `fl` CLI correctly: how to authenticate, publish a folder or a single file, manage site settings, configure `config.json`, add custom styles, and walk you through operations that require the dashboard (custom domains, GitHub connections, comments via Giscus, billing).

A few things it gets right that a plain LLM wouldn't:

- **Never guesses config or CSS options** — fetches the authoritative reference docs before suggesting any `config.json` key or CSS variable name.
- **Knows which features are premium** — warns you if a configured feature won't work without a paid plan.
- **Step-by-step for complex setups** — custom domains, Giscus comments, GitHub connections, and password protection all require steps outside the CLI. The skill instructs your assistant to spell these out explicitly, numbered, rather than assuming you know where to click.
- **Styles your site** — knows how to add a `custom.css` to override visual styles, and fetches the authoritative CSS variable reference before making any suggestions.

## Installing

Install the skill with one command:

```bash
npx skills add flowershow/flowershow --skill flowershow --global
```

This registers the `flowershow` skill. Your AI assistant will then use it automatically whenever you ask to publish notes or manage a site.

If you don't have Node.js, refer to your agent's documentation for adding custom skills or instructions, then point it to the [skill source](https://raw.githubusercontent.com/flowershow/flowershow/main/skills/flowershow/SKILL.md) directly.
