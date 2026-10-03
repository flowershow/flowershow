---
title: Publish from Claude and ChatGPT (MCP)
description: Add Flowershow as a connector in Claude or ChatGPT, then ask it to publish what you've made. You get a live website link, with no account needed.
---

Flowershow has an [MCP](https://modelcontextprotocol.io/) server, so chat apps that can't run the [`fl` CLI](/docs/reference/cli) can still publish. Add it as a connector, then ask your AI to "publish this" or "put this online". It sends the page or small site it made to Flowershow and gives you back a live link.

**Connector URL:** `https://flowershow.app/api/mcp`

No account or sign-in is needed. Each new site gets a random `…-anon.flowershow.me` address and a claim link. Open the claim link and sign in (or sign up) to keep the site; otherwise it expires after 7 days.

## Add it to Claude

Works in claude.ai, Claude Desktop and Claude mobile, on every plan (the Free plan allows one custom connector).

1. Open **Settings → Connectors** and choose **Add custom connector**.
2. Name it `Flowershow` and enter the URL `https://flowershow.app/api/mcp`. Leave the authentication settings empty.
3. In a chat, make sure the Flowershow connector is turned on in the tools menu.

## Add it to ChatGPT

Custom connectors need ChatGPT Plus, Pro, Business, Enterprise or Edu, on the web.

1. Open **Settings → Security and login** and turn on **Developer mode**.
2. Add a new app (connector) with the URL `https://flowershow.app/api/mcp` and authentication set to **No authentication**.
3. In a chat, enable the Flowershow app from the tools menu. ChatGPT asks you to confirm before each publish.

## Use it

Ask in your own words, for example:

> Make a one-page site about our team offsite with the agenda and a map, and publish it.

> Publish this report as a website.

Your AI replies with the live link and a claim link. To change the site in the same conversation, ask it to update the page: it republishes to the same address. Each update sends the whole site, so files it leaves out are removed.

## What you can publish

- **Markdown** (`.md`) pages, rendered with a theme and navigation, and **HTML** (`.html`) pages served as they are. See [Supported file types](/docs/reference/supported-file-types).
- Supporting files such as CSS, JavaScript, JSON and images.
- Up to 50 files and about 3 MB per publish. For bigger sites, use the [`fl` CLI](/docs/reference/cli).
- Hidden files and folders (names starting with `.`) aren't published.

## Keep the site

Open the claim link the AI gave you, sign in or sign up, and choose **Add to my account**. The site is then permanent and appears in your dashboard, where you can rename it, add a custom domain and change its settings. The claim link is a secret: anyone who has it can take or overwrite the site until it's claimed.

## Publish to your own account

Chat-app connectors can't sign in to your account yet. From MCP clients that let you set request headers, you can use a [personal access token](https://cloud.flowershow.app/tokens). For example, in Claude Code's `.mcp.json`:

```json
{
  "mcpServers": {
    "flowershow": {
      "type": "http",
      "url": "https://flowershow.app/api/mcp",
      "headers": { "Authorization": "Bearer fs_pat_…" }
    }
  }
}
```

With a token, `list-sites` shows your sites, and `publish` updates the one you name by its `siteId`. In local agents with a terminal, the [Flowershow skill](/docs/agents/skills) and `fl` are usually the better fit.

## Tools

| Tool | What it does |
|---|---|
| `publish` | Publishes files (text, or base64 for binary). Without `siteId`: creates a new site and returns `liveUrl`, `claimUrl`, `claimToken` and `expiresAt`. With `siteId` (plus `claimToken` when not using an account token): replaces that site's content. |
| `list-sites` | Account tokens only: lists your sites with their `siteId` and URL. |
