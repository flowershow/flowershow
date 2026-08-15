---
title: Custom Head Code — site-wide scripts and meta tags
date: 2026-08-15
description: Inject analytics, verification meta tags, fonts, and widget loaders into the head of every page — from the dashboard or config.json.
authors:
  - olayway
showToc: false
---

You can now add custom HTML to the `<head>` of **every page** on your site — no per-page embedding required.

Use it for anything that belongs site-wide:

- Third-party analytics and tag managers
- Site-verification `<meta>` tags (Google Search Console, Bing, Pinterest…)
- Custom fonts (`<link>` / `<style>`)
- Widget loader scripts (Tally, Mailchimp, chat widgets…)

Set it from the dashboard under **Site Settings → Analytics → Custom Head Code**, or in `config.json`:

```json
{
  "head": "<script defer src=\"https://tally.so/widgets/embed.js\"></script>"
}
```

Verification `<meta>` tags are rendered into the page `<head>` on the server, so crawlers see them on the first load.

For form and widget embeds, put the loader script here **once** and drop just the `<iframe>` on the pages that need it — instead of repeating the whole embed on every page.

## `CustomHtml` is now deprecated

Previously, the recommended way to embed a script was the `CustomHtml` component inside a page's markdown. It still works, but it's now **deprecated**: it re-runs the loader on every page that uses it and only works from `.md`/`.mdx` content.

To migrate, split your embed in two — move the `<script>` into Custom Head Code, and keep just the embed markup (e.g. the `<iframe>`) in your page:

```md
<!-- before (deprecated) -->
<CustomHtml html={`<iframe data-tally-src="https://tally.so/embed/your-form-id"></iframe><script src="https://tally.so/widgets/embed.js"></script>`}/>

<!-- after: script in Custom Head Code, iframe in the page -->
<iframe data-tally-src="https://tally.so/embed/your-form-id"></iframe>
```

See the [[custom-head|Custom Head Code docs]] for details.
