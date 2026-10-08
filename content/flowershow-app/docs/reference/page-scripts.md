---
title: Page scripts
description: Load your own JavaScript on a single page with the scripts frontmatter field. Runs on every visit, including when readers navigate within your site.
---

> [!note]
> Page scripts are a premium feature. See [pricing](/pricing) for details. On free sites the `scripts` field is ignored.

Page scripts let you add interactivity to one page, such as a calculator, a toggle, or a chart, without loading that code on every page of your site. List the JavaScript files in the page's frontmatter:

```yaml
---
title: Pricing calculator
scripts:
  - /js/calculator.js
---

<div id="calculator"></div>
```

A single script can be written on one line: `scripts: /js/calculator.js`.

Page scripts work in both `.md` and `.mdx` pages.

## What you can list

| Entry | Example | Resolves to |
| --- | --- | --- |
| A file from your site root | `/js/calculator.js` | `https://<your-site>/js/calculator.js` |
| A file relative to the page | `./widgets/toggle.js`, `../js/app.js` | The file next to (or above) the page's Markdown file, like image paths |
| An external `https://` URL | `https://cdn.jsdelivr.net/npm/canvas-confetti@1` | The URL as written |

Rules:

- Site files must be published `.js` files. If a listed file isn't on your site, it's skipped.
- External URLs must use `https://`. Other schemes (`http:`, `javascript:`, `data:`) and protocol-relative URLs (`//cdn…`) are ignored.
- Up to 10 scripts per page. Duplicates are loaded once.
- Scripts are loaded as classic scripts, in the order listed. ES modules (`.mjs`, `type="module"`) aren't supported yet; a classic script can still load modules with `import()`.
- Query strings and `#` fragments on site paths are ignored. Republishing a file is enough to update it.

## When scripts run

Page scripts run **after the page is interactive**, every time the page is shown:

- on a full page load,
- when a reader navigates to the page from another page on your site, and
- when they come back to it (for example with the browser's back button).

When the reader leaves the page, the script elements are removed and a `flowershow:page-leave` event is dispatched on `document`.

Because a script can run many times in the same browser tab, write it so it is safe to run again:

```js
(() => {
  const el = document.querySelector('#calculator');
  // The reader may already have navigated away by the time the script runs.
  if (!el) return;

  const onResize = () => { /* ... */ };
  window.addEventListener('resize', onResize);

  // Clean up anything global when the reader leaves the page.
  document.addEventListener('flowershow:page-leave', () => {
    window.removeEventListener('resize', onResize);
  }, { once: true });

  el.textContent = 'Ready';
})();
```

- **Wrap your code in a function** (as above). Top-level `const`, `let` or `class` declarations throw an error the second time the script runs.
- **Check that your elements exist** before using them. Once a script has started loading it runs even if the reader has already moved on to another page.
- **Remove global listeners and timers** on `flowershow:page-leave`, or they keep running on other pages.
- The page is first shown without your script's changes, then updated when it runs. Design the page so it reads well before the script runs.

## Page scripts, Custom Head Code, or an HTML page?

| You want | Use |
| --- | --- |
| JavaScript on one page, keeping the site layout | Page scripts |
| A script on every page (analytics, widget loaders) | [Custom Head Code](/docs/reference/custom-head), which loads once per visit |
| Full control of the whole page | A standalone [`.html` file](/docs/agents/html) |

If the same script is in both Custom Head Code and a page's `scripts`, it runs twice on that page.

## Raw `<script>` tags in Markdown

A `<script>` tag written directly in a Markdown page runs only when the page is loaded in full (first visit or a refresh). It doesn't run when readers reach the page by clicking a link within your site, and inline scripts in `.mdx` pages don't run at all. For JavaScript that should run every time, use page scripts.

## Troubleshooting

- **Nothing happens:** check that the site is on the Premium plan, the file path is right (open it in the browser at `https://<your-site>/js/your-file.js`), and the file ends in `.js`.
- **The script doesn't load and the browser console mentions a MIME type:** republish the file so it is stored with the right content type.
- **"Identifier has already been declared" on the second visit:** wrap the script in a function, as shown above.

## Security

Page scripts run on your published site for every visitor of the page. Only add code you trust, and only load external scripts from sources you trust.
