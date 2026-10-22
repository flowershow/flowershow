---
title: Page actions (copy as Markdown, open in ChatGPT or Claude)
description: Add a small menu beside each page title so readers can copy the page as Markdown or open it in ChatGPT or Claude.
---

Page actions add a **Copy page** button and a small menu beside the title of each page. Readers can:

- **Copy page**: copy the page's Markdown source to the clipboard, ready to paste into an AI chat or another document.
- **View as Markdown**: open the page's raw Markdown in a new tab. See [[markdown-access|Markdown access]].
- **Open in ChatGPT** and **Open in Claude**: start a new chat with the prompt "Read `<page URL>.md` and help me with it."

This is handy for docs, tutorials and reference pages that readers want to ask an AI about. You can see it on every page of these docs.

Page actions are off by default.

## Turning it on

In the dashboard, go to **Settings → Features → Page Actions Menu** and toggle it on.

Or set it in `config.json`. Values set in `config.json` take precedence over dashboard settings:

```json
{
  "showPageActions": true
}
```

## Where it shows

- On every Markdown page (`.md` and `.mdx`) that has a page header with a title.
- Not on raw HTML pages, listing pages, changelog pages, blog posts, pages with `layout: plain`, or pages that show a hero instead of a header.

On [[password-protection|password-protected sites]] the menu leaves out **Open in ChatGPT** and **Open in Claude**, because an AI assistant can't get past the password to read the page. **Copy page** still works for signed-in readers.

## Styling

The menu uses the `.page-actions` classes, so a theme or your `custom.css` can restyle it. See the [[theme-class-reference|theme class reference]].
