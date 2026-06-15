---
title: Skills
description: Install the Flowershow skill to let your AI assistant publish and manage Flowershow sites — whether you publish via the fl CLI, a GitHub repository, or the Obsidian plugin.
---

The Flowershow skill gives AI agents everything they need to help you publish content and manage sites — regardless of how you publish.

## What the skill does

Once installed, your assistant can:

- Configure your site with `config.json`
- Style your site with `custom.css`
- Walk you through complex setups (custom domain, comments, GitHub connection) step by step
- **If you use the `fl` CLI:** authenticate, publish a folder or file, list, update, and delete sites

## Installation

**With Node.js:**

```bash
npx skills add flowershow/flowershow --skill flowershow --global
```

**Without Node.js:** Refer to your agent's documentation for adding custom skills or instructions, then point it to the skill source at `https://raw.githubusercontent.com/flowershow/flowershow/main/skills/flowershow/SKILL.md`.

## How it works

The skill is a single file:

- **`SKILL.md`** — behavioral instructions: how to authenticate, publish, read docs, handle premium features. Instructs the agent to fetch `https://flowershow.app/docs/sitemap.md` to discover available docs, then read the relevant page before making changes.

When your assistant encounters a Flowershow task, it loads these instructions and follows them.
