---
title: Supported file types
description: Which files Flowershow renders as themed pages, which it serves as-is, the URL each one gets, and the limits on a publish.
---

Flowershow publishes a folder of files as a website. Markdown is rendered with your site's theme. HTML and other files are served exactly as you uploaded them. You can mix all of them in one folder.

## At a glance

| File | What you get | Site theme, navbar, `custom.css` | URL for `docs/example.<ext>` |
|---|---|---|---|
| `.md`, `.mdx` | A page rendered from Markdown | Yes | `/docs/example` |
| `.canvas` (Obsidian Canvas) | A page showing the canvas as a diagram | Yes | `/docs/example` |
| `.html` | The file, byte-for-byte. Scripts run. | No | `/docs/example.html` |
| `.css`, `.js` | The file, for your HTML pages to load | No | `/docs/example.css` |
| `.json`, `.csv`, `.yaml`, `.yml` | The file, for pages to fetch or readers to download | No | `/docs/example.json` |
| `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp` | The image | No | `/docs/example.png` |
| `.pdf` | The PDF, which opens in the browser | No | `/docs/example.pdf` |
| `.epub`, `.docx`, `.xlsx`, `.pptx`, `.zip` and other downloads | The file, which readers download | No | `/docs/example.epub` |

## Markdown and MDX

`.md` and `.mdx` files become pages with your site's theme, navigation, `config.json` settings and `custom.css`. The extension is dropped from the URL, and `index.md` or `README.md` is served at its folder's URL (`docs/README.md` is at `/docs`).

Supported syntax includes CommonMark, GitHub Flavored Markdown, Obsidian wikilinks and embeds, callouts, [Mermaid diagrams](/docs/reference/mermaid) and [LaTeX math](/docs/reference/math). See [Supported syntax](/docs/reference/syntax) and [Syntax mode](/docs/reference/syntax-mode) for Markdown versus MDX.

Adding `.md` to a page URL returns the raw Markdown source. See [Markdown access](/docs/agents/markdown-access).

## Obsidian Canvas and Bases

A `.canvas` file becomes its own page at the URL without the extension (`roadmap.canvas` is at `/roadmap`). You can also embed a canvas in a Markdown page with `![[roadmap.canvas]]`. Requesting the `.canvas` URL itself returns the raw JSON. See [Obsidian Canvas](/docs/reference/obsidian-canvas).

Obsidian Bases work as `base` code blocks inside a Markdown page, which render as tables, cards or lists. A standalone `.base` file isn't published as a page. See [Obsidian Bases](/docs/reference/obsidian-bases).

## HTML

A `.html` file is served byte-for-byte as you wrote it. Flowershow adds no theme, navbar or scripts, and your page's own `<script>` tags run.

- **URLs keep the `.html` extension.** `about.html` is at `/about.html`, and `/about` returns a 404. Link between pages with `about.html`.
- **Only the site root falls back to `index.html`.** If there's no `index.md` or `README.md` at the root, the site root redirects to `index.html`. A folder's `index.html` isn't served at the folder URL: `report/index.html` is at `/report/index.html`, and `/report` returns a 404.
- **Relative paths work.** A page can load `css/style.css`, `js/app.js`, `data/items.json` and images from the same folder tree. Publish the whole folder so the paths stay intact.
- **`config.json` and `custom.css` don't apply.** Style the page in its own HTML or CSS.

For a step-by-step guide, including how to put HTML inside a Markdown page instead, see [Publishing HTML](/docs/agents/html).

## CSS, JavaScript, data, media, documents and downloads

These files are served as-is, with a content type that matches the extension, so browsers and scripts handle them normally:

- **CSS and JavaScript** (`.css`, `.js`, `.mjs`, `.cjs`) load in your HTML pages, including ES modules (`<script type="module">`).
- **Fonts and other web assets** (`.woff`, `.woff2`, `.ttf`, `.otf`, `.eot`, `.wasm`, `.webmanifest`) load from your pages too. To use your own fonts site-wide, see [Custom fonts](/docs/guides/custom-fonts).
- **Data** (`.json`, `.jsonl`, `.ndjson`, `.geojson`, `.topojson`, `.csv`, `.tsv`, `.yaml`, `.toml`, `.xml`, `.txt`, `.parquet`, `.arrow`, `.sqlite`, `.db`, `.ipynb`) can be fetched with `fetch()` or downloaded. Files are served with `Access-Control-Allow-Origin: *`, so pages on other sites can fetch them too.
- **Images** (`.png`, `.jpg`, `.gif`, `.svg`, `.webp`, `.avif`, `.bmp`, `.ico`) can be used in Markdown and HTML pages, and each one has its own URL.
- **Audio and video** (`.mp3`, `.m4a`, `.aac`, `.ogg`, `.opus`, `.wav`, `.flac`, `.mp4`, `.m4v`, `.webm`, `.ogv`, `.mov`, `.mkv`, `.3gp`) play in the browser, if the browser supports the format. Captions (`.vtt`) load in a `<track>` when the `<video>` has the `crossorigin` attribute, for example `<video crossorigin src="clip.mp4"><track src="captions.vtt" kind="subtitles"></video>`. `.srt` files can be downloaded.
- **PDFs** open in the browser's PDF viewer.
- **Documents and ebooks** (`.epub`, `.docx`, `.xlsx`, `.pptx`, `.odt`, `.ods`, `.odp`, `.rtf`, `.bib`, `.tex`) can be linked to and downloaded, for example `[Download the book](book.epub)`.
- **Maps** (`.kml`, `.kmz`, `.gpx`) can be loaded by map libraries or downloaded.
- **Calendars and contacts** (`.ics`, `.vcf`) can be downloaded and added to a calendar or address book, so you can offer an "add to calendar" link.
- **Archives** (`.zip`, `.gz`, `.tgz`, `.tar`, `.7z`) can be downloaded.
- **`.htm`** pages are served like `.html`.

For security, opening an uploaded SVG or other file directly at its own URL never runs scripts in it. Scripts in your HTML pages work as normal.

Once a republish has finished processing, a reload shows the new version of these files. Each file is served from a URL that changes whenever its content changes, so you don't need to rename files to get past caches.

## Limits

When you publish with the [CLI](/docs/reference/cli), the Obsidian plugin or a dashboard upload, one publish can include up to 1,000 files, up to 100 MB per file and 500 MB in total. Storage per site depends on your [plan](/pricing).

Files that aren't listed on this page are uploaded, but may not be reachable at their own URL. Use one of the types above for anything readers or scripts need to load.
