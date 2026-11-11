---
title: Publish from Claude and ChatGPT
description: Add Flowershow as a connector in Claude or ChatGPT, sign in, and ask it to publish what you've made to your account. Or try it without an account and get a live link.
---

Flowershow has an [MCP](https://modelcontextprotocol.io/) server, so chat apps that can't run the [`fl` CLI](/docs/reference/cli) can still publish. Add it as a connector, then ask your AI to "publish this" or "put this online". It sends the page or small site it made to Flowershow and gives you back a live link.

There are two connector URLs:

| Connector URL | What you get |
|---|---|
| `https://flowershow.app/api/mcp/account` | **Signed in.** You sign in to Flowershow once. Your AI publishes new sites to your account, lists your sites, and updates them in any conversation. |
| `https://flowershow.app/api/mcp` | **No account.** Each new site gets a random `…-anon.flowershow.me` address and a claim link. Open the claim link and sign in (or sign up) to keep the site; otherwise it expires after 7 days. |

## What you can do

- **Share what you just made.** A report, a one-pager, an HTML page: ask your AI to publish it and get a link you can send.
- **Change it as you go.** Ask for edits and they go live at the same address. Signed in, you can come back to a site in a new conversation.
- **Keep it.** Sites you publish signed in are normal Flowershow sites in your dashboard: rename them, add a custom domain, or keep editing them with the [`fl` CLI](/docs/reference/cli) or GitHub.

## Add it to Claude

Works in claude.ai, Claude Desktop and Claude mobile, on every plan (the Free plan allows one custom connector).

1. Open **Settings → Connectors** and choose **Add custom connector**.
2. Name it `Flowershow` and enter the URL `https://flowershow.app/api/mcp/account`. Leave the advanced settings (OAuth client ID and secret) empty.
3. Choose **Connect**. A Flowershow window opens: sign in (or sign up) with GitHub, Google or an email link, check that the account shown is yours, and choose **Allow**.
4. In a chat, make sure the Flowershow connector is turned on in the tools menu.

To publish without an account, enter `https://flowershow.app/api/mcp` instead. Claude then doesn't ask you to sign in.

## Add it to ChatGPT

Custom connectors need ChatGPT Plus, Pro, Business, Enterprise or Edu, on the web.

1. Open **Settings → Security and login** and turn on **Developer mode**.
2. Add a new app (connector) with the URL `https://flowershow.app/api/mcp/account` and authentication set to **OAuth**.
3. A Flowershow window opens: sign in, check that the account shown is yours, and choose **Allow**.
4. In a chat, enable the Flowershow app from the tools menu. ChatGPT asks you to confirm before each publish.

To publish without an account, use `https://flowershow.app/api/mcp` with authentication set to **No authentication**.

## Use it

Ask in your own words, for example:

> Make a one-page site about our team offsite with the agenda and a map, and publish it.

> Publish this report as a website.

> Add a page with last week's numbers to my team site.

When it publishes, your AI tells you which files it is sending and to which site. It stops to check with you first if a file looks private (drafts, personal notes, keys, data with names or emails), if the publish would delete files you didn't ask it to remove, if it would create a new site when you meant to update one, or if the files differ from what you asked for. If you've already named the files or said to go ahead, it publishes straight away.

Your AI replies with the live link. To change the site, ask it to update the page: it republishes to the same address. An update sends only the files that changed and keeps the rest of the site as it is. To remove a page, ask your AI to delete it; to start the site over, ask it to replace the whole site (it checks with you first if that would remove existing files).

**Signed in**, your AI can find your sites in any conversation, including sites shared with you as an [editor](/docs/reference/collaborators). Before changing a site it sees which files the site has and reads a page's current text, so it adds or edits pages and leaves the rest as it was.

**Without an account**, your AI also gives you a claim link. A new conversation creates a new site, and once you've claimed a site the no-account connector can no longer update it. So make your changes first, then claim the site when you're happy with it.

If the site was published from the CLI, Obsidian or GitHub, pages your AI adds through the connector are removed the next time you publish from that source, because it publishes your folder or repo as the whole site.

## What you can publish

- **Markdown** (`.md`) pages, rendered with a theme and navigation, and **HTML** (`.html`) pages served as they are. See [Supported file types](/docs/reference/supported-file-types).
- Supporting files such as CSS, JavaScript, JSON and images.
- Up to 50 files and about 3 MB per publish. For bigger sites, use the [`fl` CLI](/docs/reference/cli).
- Hidden files and folders (names starting with `.`) aren't published.

## Keep a site published without an account

Open the claim link the AI gave you, sign in or sign up, and choose **Add to my account**. The site is then permanent and appears in your dashboard, where you can rename it, add a custom domain and change its settings. The claim link is a secret: anyone who has it can take or overwrite the site until it's claimed.

If the signed-in connector is also on in that conversation, you can instead ask your AI to keep the site, and it moves the site into your account.

## Disconnect

Open [Access tokens](https://cloud.flowershow.app/tokens) in your dashboard and choose **Revoke** next to the app under **Connected apps**. The app can no longer reach your account; to use it again, connect it and allow it again.

## Other MCP clients

MCP clients that support sign-in, such as Claude Code, can use `https://flowershow.app/api/mcp/account` the same way. From clients that only let you set request headers, use a [personal access token](https://cloud.flowershow.app/tokens) instead. For example, in Claude Code's `.mcp.json`:

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

With a token, the connector works as if you were signed in. In local agents with a terminal, the [Flowershow skill](/docs/agents/skills) and `fl` are usually the better fit.

## Tools

"Signed in" means the signed-in connector or a personal access token.

| Tool | What it does |
|---|---|
| `publish` | Publishes files (text, or base64 for binary). Without `siteId`: creates a new site, in your account when signed in; otherwise it returns `liveUrl`, `claimUrl`, `claimToken` and `expiresAt`. With `siteId` (plus `claimToken` when not signed in): adds or updates the files sent and keeps the others. `delete` lists paths to remove; `replaceWholeSite: true` makes the files sent the whole site, removing everything else. If that would remove existing files, the call is refused with the count and paths, and goes ahead only when repeated with `confirmDeleteCount` set to that count. |
| `list-sites` | Signed in only: lists your sites, and sites shared with you as an editor, with their `siteId`, URL, `role` (`owner` or `editor`) and `owner` username. |
| `list-files` | Signed in only: lists the files on one of your sites or a site shared with you (`siteId`) with their size and last change. Returns up to 1,000 paths; `folder` lists one folder. |
| `read-file` | Signed in only: returns the current text of one file (`siteId`, `path`), so the AI can change a page without losing what's on it. Text files only (Markdown, HTML, CSS, JSON, …), up to 256 KB. |
| `claim-site` | Signed in only: moves a site published without an account earlier in the conversation (`siteId` and `claimToken`) into your account, so it no longer expires. |
