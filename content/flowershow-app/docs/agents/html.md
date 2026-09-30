---
title: Publishing HTML
description: How to publish HTML pages and sites with Flowershow, standalone or inside Markdown pages. Written for AI agents and the people using them.
---

Much of what AI agents produce is a standalone HTML page: a report, a dashboard, a slide deck, an interactive explainer. Flowershow publishes HTML as a first-class file type, next to Markdown. There are two ways to do it, depending on whether the page should keep your site's look.

| You want | Use | Site navbar, theme, `custom.css` | JavaScript |
|---|---|---|---|
| The page exactly as written | A standalone `.html` file | No | Runs |
| HTML sections inside a normal site page | HTML inside a `.md` file | Yes | `<script>` tags don't run |

## Standalone HTML files

A `.html` file is served byte-for-byte as you wrote it, with no Flowershow layout added.

**One self-contained file** (inline `<style>` and `<script>`):

```bash
fl --yes ./report.html
```

**A page with separate CSS, JavaScript, data or images:** put everything in one folder and publish the folder, so relative paths keep working:

```text
my-report/
├── index.html      ← <link href="css/style.css">, <script src="js/app.js">
├── about.html
├── css/style.css
├── js/app.js
└── data/items.json ← fetch('data/items.json') works from app.js
```

```bash
fl --yes ./my-report
```

What to know:

- **Keep references relative** (`css/style.css`, `./data/items.json`). Absolute local paths (`/Users/...`, `file://...`) won't exist on the web.
- **Publish the folder, not a list of files.** `fl index.html css/style.css` flattens paths, so the stylesheet ends up at `/style.css` and the page's `css/style.css` link breaks.
- **URLs keep the `.html` extension.** `about.html` is at `https://<your-site>/about.html`; `/about` is a 404. Link between pages with `about.html`.
- **The site root redirects to `index.html`.** For a single-file site, the root redirects to that file.
- **Data files can be fetched.** JSON, CSV and other files are served with `Access-Control-Allow-Origin: *`, so `fetch()` from your page works.
- **Mixing is fine.** A folder can contain both `.html` and `.md` files. Markdown pages get the site layout; HTML pages are served raw.
- **`config.json` and `custom.css` don't apply** to standalone HTML files. Style them in the HTML or its own CSS.
- **Changed CSS, JS or images can be cached for several minutes** after you republish. If an update must show immediately, rename the file (for example `style.v2.css`) and update the reference.

## HTML inside Markdown

Use this when you want a custom section (a hero, a card grid, a callout) on a page that keeps the site's navbar, footer and theme. Write the HTML directly in a `.md` file.

```markdown
---
title: Our products
layout: plain
---

<style>
.product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
</style>

<div class="product-grid">
  <div class="card">
    <h3>First product</h3>
    <p>Short description.</p>
  </div>
  <div class="card">
    <h3>Second product</h3>
    <p>Short description.</p>
  </div>
</div>
```

Rules that avoid most breakage:

- **No blank lines inside an HTML block.** A blank line ends the block, and anything after it is parsed as Markdown.
- **Don't indent HTML by 4 or more spaces** after a blank line. Markdown treats it as a code block and shows your tags as text. Two-space indents inside an unbroken block are fine.
- **`<style>` blocks work.** Scope your selectors with a class so they don't affect the rest of the page.
- **`<script>` tags don't run** in Markdown pages. For anything interactive, use a standalone `.html` file, or add site-wide scripts with [custom head code](/docs/reference/custom-head) (Premium).
- **`layout: plain`** in frontmatter removes the default typography styles, which is usually what you want for landing-page-style HTML. See [Enhancing Markdown with styled JSX blocks](/docs/guides/enhance-markdown-with-styled-jsx-blocks).
- **`class` or `className`.** Plain `class=` works in `.md` files. MDX pages (`.mdx`, or `syntaxMode: mdx`) expect JSX, so prefer `className=` there; see [Syntax mode](/docs/reference/syntax-mode). For Tailwind utility classes, see the styled JSX blocks guide above.

## Converting an existing HTML page to a site page

If you have a full HTML document and want it inside the site layout:

1. Keep only what's inside `<body>…</body>`. Move any `<style>` from `<head>` into the body.
2. Remove blank lines inside the HTML and keep indentation under 4 spaces.
3. Drop `<script>` tags, or keep the page as a standalone `.html` file instead.
4. Save it as a `.md` file with frontmatter (`title`, and `layout: plain` if you want no typography styles).

When in doubt, publish the `.html` file as-is. It's the most faithful option.

For every file type Flowershow publishes, and the URL each one gets, see [Supported file types](/docs/reference/supported-file-types).
