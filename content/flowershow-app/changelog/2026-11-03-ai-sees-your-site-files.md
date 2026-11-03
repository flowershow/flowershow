---
title: Your AI can see what's on your site before it changes it
date: 2026-11-03
description: Signed in through the Flowershow connector, your AI can now list a site's files and read a page before editing it, so a later chat adds pages and leaves the rest of the site as it was.
authors:
  - rufuspollock
showToc: false
---

When your AI publishes to one of your sites through the [Flowershow connector](/docs/agents/mcp), it sends only the pages it adds or changes, and everything else on the site stays as it is. Removing a page happens only when you ask for it.

In a new chat, though, your AI doesn't remember what the site already has. Two new connector tools fix that:

- **`list-files`** shows the files on a site, so your AI can see which pages exist before it adds one or removes one.
- **`read-file`** gets the current text of a page, so when your AI changes a page, for example to link a new page from your home page, it keeps what was already there.

Both work only on sites in the account you signed in with. Reconnect the connector, or start a new chat, if your AI doesn't see the new tools yet.
