---
title: Publish from Claude and ChatGPT (beta)
date: 2026-10-03
description: Add the Flowershow connector to Claude or ChatGPT, ask it to publish, and get a live link. Nothing to install, no account needed.
authors:
  - rufuspollock
image: "[[assets/changelog-publish-from-claude-and-chatgpt.webp]]"
showToc: false
---

You can now publish straight from a chat in the Claude and ChatGPT apps. Add `https://flowershow.app/api/mcp` as a connector once, then ask your AI to "publish this". You get a live link in seconds. See [Publish from Claude and ChatGPT](/docs/agents/mcp).

- **Nothing to install, no account:** each new site gets a `…-anon.flowershow.me` link and a claim link. Claim it to keep the site; otherwise it expires after 7 days.
- **Change it as you go:** ask for edits in the same conversation and they go live at the same address.
- **Markdown, HTML and images:** one page or a small site, up to 50 files and about 3 MB per publish. For bigger sites, use the [`fl` CLI](/docs/reference/cli).

This is a beta. The connector can't sign in to your account yet, so make your changes first, then claim the site. Tell us how it goes on [Discord](https://discord.gg/JChzM5VdFn).

In coding agents such as Claude Code, Codex and Cursor, keep using the [Flowershow skill](/docs/agents/skills). The [Publish with AI](/publish-with-ai) page now shows both paths.
