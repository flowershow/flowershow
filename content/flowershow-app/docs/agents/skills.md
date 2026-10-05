---
title: Skills
description: Install the Flowershow skill so your AI assistant can publish and manage Flowershow sites — via the fl CLI, a GitHub repository, or the Obsidian plugin.
---

The Flowershow skill gives AI agents everything they need to help you publish content and manage sites — regardless of how you publish.

## What the skill does

Once installed, your assistant can:

- **If you use the `fl` CLI:** install and log in to `fl`, publish a folder or file, list, update, and delete sites
- Publish without an account when you just want a link now (`fl --anon`), and hand you the claim link to keep the site
- Publish HTML pages as-is, with their CSS, JavaScript and data files (see [Publishing HTML](/docs/agents/html))
- Convert documents (docx, pptx, pdf and similar) to Markdown with pandoc or markitdown, then publish them
- Turn on annotations for a draft, then read reviewers' notes with `fl annotations pull`, revise your pages, republish and resolve the notes
- Configure your site with `config.json`
- Style your site with `custom.css`
- Walk you through complex setups (custom domain, comments, GitHub connection) step by step

## Installation

**With Node.js:**

```bash
npx skills add flowershow/skills --global
```

This installs the skill for every agent it detects (Claude Code, Codex, Cursor and 50+ others).

**Without Node.js:** the skill is a single file. Download [`SKILL.md`](https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md) into your agent's skills folder, for example:

```bash
mkdir -p ~/.claude/skills/flowershow
curl -fsSL https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md -o ~/.claude/skills/flowershow/SKILL.md
```

See [Supported agents](/docs/agents/supported-agents) for the folder each agent uses, and for the Claude apps and ChatGPT, where you upload the skill instead.

## How it works

The skill is a single file, maintained at [github.com/flowershow/skills](https://github.com/flowershow/skills):

- **`SKILL.md`** — behavioral instructions: how to install and authenticate `fl`, publish (including HTML and converted documents), read docs, handle premium features. Instructs the agent to fetch `https://flowershow.app/docs/sitemap.md` to discover available docs, then read the relevant page before making changes.

When your assistant encounters a Flowershow task, it loads these instructions and follows them.
