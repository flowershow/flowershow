---
title: New agent docs, HTML publishing guide and easier CLI install
date: 2026-09-30
description: Per-agent install steps for the Flowershow skill, a guide to publishing HTML, and a no-sudo install option for the fl CLI.
authors:
  - rufuspollock
showToc: false
---

- **Supported agents:** how to install the Flowershow skill in Claude Code, Codex, Cursor, the Claude apps and ChatGPT, with or without Node.js. See [Supported agents](/docs/agents/supported-agents).
- **Publishing HTML:** HTML pages are published as-is, with their CSS, JavaScript and data files. The new guide covers standalone HTML sites and HTML inside Markdown pages. See [Publishing HTML](/docs/agents/html).
- **CLI install without sudo:** set `FL_INSTALL_DIR` when running the install script, e.g. `curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | FL_INSTALL_DIR="$HOME/.local/bin" sh`. Handy for AI agents and CI. See [CLI docs](/docs/reference/cli#installation).
