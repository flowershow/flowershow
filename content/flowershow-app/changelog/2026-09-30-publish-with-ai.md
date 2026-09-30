---
title: Publish with AI
date: 2026-09-30
description: Go from your AI session to a live website. A new Publish with AI page, an updated Flowershow skill, per-agent install guides and a safer fl CLI.
authors:
  - rufuspollock
image: "[[assets/changelog-publish-with-ai.webp]]"
showToc: false
---

Whatever you're working on with Claude, ChatGPT, Codex or Cursor, you can now just ask it to publish: one page or a whole site, live in seconds. See [Publish with AI](/publish-with-ai).

- **Updated Flowershow skill:** your agent installs and logs in to `fl` for you, publishes HTML as-is alongside Markdown, checks for site-name clashes before a first publish, and can convert `.docx`, `.pptx` and `.pdf` files to Markdown before publishing. Update it with `npx skills add flowershow/skills --global`.
- **Install guides for every agent:** Claude Code, Codex, Cursor, the Claude apps and ChatGPT, with or without Node.js. See [Supported agents](/docs/agents/supported-agents).
- **Easier CLI install:** set `FL_INSTALL_DIR` to install `fl` without `sudo`, handy for agents and CI. See [CLI docs](/docs/reference/cli#installation).

**Fixes in fl 2.4.0**

- Publishing a new folder no longer silently overwrites an existing site with the same name. `fl` now asks first, and `--yes` refuses rather than overwriting. Pass `--overwrite` when you mean it. See [[cli#name-collisions|Name collisions]].
- `fl` now exits non-zero on every failure, and `fl whoami` exits 1 when you're logged out, so scripts and agents can tell when something went wrong.
