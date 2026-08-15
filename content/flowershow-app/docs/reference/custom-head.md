---
title: Custom Head Code
description: Inject custom scripts, meta tags, and other HTML into the <head> of every page on your Flowershow site.
---

Custom Head Code lets you add raw HTML to the `<head>` of **every page** on your site. It's the place for scripts, meta tags, and other head elements:

- Third-party analytics and tag managers
- Widget **loader scripts** (Tally, Mailchimp, chat widgets, etc.)
- Site-verification `<meta>` tags (Google Search Console, Bing, Pinterest…)
- Custom fonts (`<link>` / `<style>`)

Configure it from the **Flowershow dashboard** under **Site Settings → Analytics → Custom Head Code**, or in `config.json` with the [`head`](config-file#head) field.

```json
{
  "head": "<script defer src=\"https://tally.so/widgets/embed.js\"></script>"
}
```

## Loader scripts vs. page markup

Custom Head Code holds the parts that are shared across your whole site. Anything specific to one page stays in that page. A third-party embed is a good example — it has two parts, and they belong in different places:

| Part | Where it belongs |
| --- | --- |
| The **loader script** (e.g. `embed.js`) | Custom Head Code — loads once, on every page |
| The **embed itself** (e.g. an `<iframe>`) | The markdown of the specific page that should show it |

For example, put Tally's loader script in Custom Head Code, then drop the form on any page with a plain iframe:

```html
<iframe data-tally-src="https://tally.so/embed/your-form-id" width="100%" height="229" title="Newsletter sign-up"></iframe>
```

Putting a loader script in Custom Head Code instead of in page content avoids loading it multiple times and keeps it working as you navigate between pages.

## Notes and security

- The code runs on your **published site** for every visitor, so only add code you trust.
- `<meta>`, `<link>`, and `<style>` tags are rendered into the page's `<head>` on the server, so verification tags and preconnect hints are visible to crawlers on the first load.
