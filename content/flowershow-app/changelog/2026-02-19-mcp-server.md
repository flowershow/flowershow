---
title: "Publish to Flowershow from Claude, Cursor, and any AI assistant"
date: 2026-02-19
description: The Flowershow MCP server lets you create sites and publish notes directly from Claude, Cursor, ChatGPT, and any MCP-compatible AI assistant.
authors:
  - abeelha
---

AI assistants are becoming the place where a lot of writing and thinking happens. You shouldn't have to break that flow just to publish. Today we're shipping the Flowershow MCP server — connect it once, and your AI assistant can manage your Flowershow site as naturally as it edits code or answers questions.

## Publish notes without leaving your editor

Once connected, your AI assistant can create a new site, publish a note, update existing content, and check publish status — all through natural conversation. You describe what you want; the MCP server handles the Flowershow API calls.

A typical session looks like this: you finish drafting a note in Claude Code, say "publish this to my site", and the note is live in seconds. No browser tab, no copy-paste, no switching context.

## Available tools

The server exposes seven tools your AI can compose freely:

| Tool | What it does |
| --- | --- |
| `list-sites` | List all your Flowershow sites |
| `get-site` | Get details for a specific site (plan, file count, etc.) |
| `get-user` | Get your current user profile |
| `create-site` | Create a new site |
| `publish-note` | Publish an in-memory markdown note to an existing site |
| `publish-local-files` | Request presigned upload URLs for a batch of local files |
| `get-publish-status` | Poll the current publishing status for a site |

For larger publishing jobs — like syncing a whole vault — the agent calls `publish-local-files` with file metadata, uploads directly to the returned presigned URLs, then polls `get-publish-status` until the site is live. Local file bytes never pass through the MCP server itself.

## Getting connected

You need a [Personal Access Token](https://flowershow.app/dashboard/tokens) and Node.js 20+.

**Claude Desktop / Claude Code** — add this to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "flowershow": {
      "type": "remote",
      "url": "http://localhost:3456/mcp",
      "headers": {
        "Authorization": "Bearer fs_pat_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Run the server from the monorepo:

```bash
pnpm build --filter @flowershow/mcp
pnpm run --filter @flowershow/mcp start
```

The server listens on `http://localhost:3456/mcp` by default. Full setup instructions for ChatGPT, Cursor, and OpenCode are in the [MCP server README](https://github.com/flowershow/flowershow/tree/main/apps/flowershow-mcp).

## What's next

The current release covers note publishing and site management. Upcoming work includes OAuth so you can connect without managing tokens manually, and a hosted remote endpoint so you don't need to run a local server at all.
