---
title: Readers can take your pages to ChatGPT and Claude
date: 2026-10-22
description: A page menu to copy any page as Markdown or open it in ChatGPT or Claude, and an auto-generated llms.txt that indexes your whole site for AI assistants.
authors:
  - rufuspollock
showToc: false
---

More and more readers come to a docs page or tutorial with an AI assistant open. Two new settings make it easy for them, and both are off until you turn them on.

- **Page actions.** A **Copy page** button beside each page title copies the page as Markdown. Its menu can also open the page's Markdown, or start a ChatGPT or Claude chat that reads the page. Turn it on with `"showPageActions": true` in `config.json` or under **Settings → Features**. See [[page-actions|Page actions]].
- **llms.txt.** Your site can now serve an auto-generated [llms.txt](https://llmstxt.org) at `/llms.txt`. It lists your published pages with their titles, descriptions and links to their Markdown, so an AI assistant can find its way around your site. Drafts and hidden pages are left out, and a `llms.txt` you publish yourself still wins. Turn it on with `"enableLlmsTxt": true`. See [[llms-txt|llms.txt]].

Both are on for these docs: try the **Copy page** menu at the top of any [docs page](/docs/reference/page-actions), or see [flowershow.app/llms.txt](https://flowershow.app/llms.txt).

**Fixes**

- The [[markdown-access|Markdown access]] docs no longer say every page has a `.md` version. Pages published from `.html` files don't.
