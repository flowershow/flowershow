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
- Scripts are loaded as classic scripts, one after another in the order listed: each script starts loading once the previous one has run (or failed to load). ES modules (`.mjs`, `type="module"`) aren't supported yet; a classic script can still load modules with `import()`.
- Query strings and `#` fragments on site paths are ignored. Republishing a file is enough to update it.

## When scripts run

Page scripts run **after the page is interactive**, every time the page is shown:

- on a full page load,
- when a reader navigates to the page from another page on your site, and
- when they come back to it (for example with the browser's back button).

When the reader leaves the page for another page on your site, the script elements are removed, any scripts not yet started are skipped, and a `flowershow:page-leave` event is dispatched on `document`. By the time your listener runs, the new page is already on screen, so the old page's elements are gone: keep references to anything you need to clean up instead of querying the page. The event isn't dispatched on a reload or when the reader leaves your site, because the browser discards the whole page then.

Because a script can run many times in the same browser tab, write it so it is safe to run again:

```js
(() => {
  // The reader may already have left the page by the time this script runs.
  if (!document.currentScript?.isConnected) return;

  const el = document.querySelector('#calculator');
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
- **Start with the `document.currentScript?.isConnected` check** (as above). A script that was already loading when the reader left the page still runs, and this check is the reliable way to tell. Checking that your elements exist isn't enough on its own: if the reader has come back to the page, they exist again.
- **Elements rendered by interactive components** (charts, diagrams and other components that load on demand) may appear after your script runs. Use a [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to wait for them.
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

An inline `<script>` tag (code between `<script>` and `</script>`) written directly in a `.md` page runs only when the page is loaded in full (first visit or a refresh). It doesn't run when readers reach the page by clicking a link within your site. Inline scripts never run in `.mdx` pages, or in `.md` pages rendered as MDX (`syntaxMode: mdx`).

An external script tag with `async` (`<script async src="…"></script>`) is loaded in both `.md` and `.mdx` pages, including after in-site navigation, but only once per browser tab: it doesn't run again when the reader comes back to the page.

For JavaScript that should run on every visit, use page scripts.

## Troubleshooting

- **Nothing happens:** check that the site is on the Premium plan, the file path is right (open it in the browser at `https://<your-site>/js/your-file.js`), and the file ends in `.js`.
- **The script doesn't load and the browser console mentions a MIME type:** republish the file so it is stored with the right content type.
- **"Identifier has already been declared" on the second visit:** wrap the script in a function, as shown above.

## Security

Page scripts run on your published site for every visitor of the page. Only add code you trust, and only load external scripts from sources you trust.
