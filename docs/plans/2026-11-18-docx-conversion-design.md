# Publish Word documents by converting them on upload (DOCX first)

**Status:** approved by Rufus 2026-11-18 (sketch 1). Bead `flowershow-eiz` (GH #1403). Reviewed once by an independent Opus reviewer; its findings are folded in (see "Review changes" at the end).

## Intent

"Drop in your Word doc, get a web page." A user publishes `report.docx` by any channel (dashboard, `fl`, drag-and-drop, GitHub, MCP, Obsidian) and `/report` renders as a normal Flowershow page: same layout, nav, search, tags, wiki-links, annotations. `/report.docx` still downloads the original. Inspiration: blot.im, where a Word file in the synced folder simply becomes a post.

Why: it widens the funnel beyond Markdown-literate users and fits "files are the atomic unit". Google Docs later: export as DOCX feeds this same pipeline.

## Goals

- DOCX upload → rendered page on production, by every publish channel, with no client changes.
- Fidelity bar: headings, paragraphs, bold/italic/strike, links, nested bullet and numbered lists, tables (merged cells kept as HTML), embedded images, footnotes, block quotes, code. A typical memo, essay or report reads well. Not a goal: pixel-faithful layout.
- The original stays downloadable at its own URL; explicit links to `report.docx` keep working as downloads.
- Re-upload replaces the page atomically; delete removes page and derived files.
- Conversion errors reach the author (fl output, dashboard publish history) and never block the rest of the publish or other sites' files.

## Non-goals (this phase)

- Editing the generated Markdown (one-way; the DOCX is the source of truth).
- Google Docs, PDF, PPTX, XLSX, ODT, RTF, ipynb (surveyed below with a recommended order).
- Track changes options, comments, equations, text boxes, headers/footers, page numbers.
- Dashboard UI for conversion options.

## Anti-goals

- A derived `report.md` appearing as a real file in the vault: `fl publish` (replace mode) and GitHub sync would delete it, and it would collide with a user's own `report.md`.
- Native binaries (pandoc) in the pipeline. The only component that sees file bytes is the Cloudflare Worker, which runs JS/WASM only.
- Breaking any existing site: today `.docx` files are raw downloads, often linked from pages. That must keep working unchanged.

## Design

### Where conversion runs

Every publish channel already lands bytes in R2 at `{siteId}/main/raw/{path}` and fires a queue event handled by the Worker consumer (`apps/cloudflare-worker/src/queue-consumer.js`). For a `.docx` the consumer does not convert inline (a batch of 10 files shares one 128 MB isolate, and an out-of-memory crash would retry unrelated files). It reads the bytes (10 MB cap, same as Markdown), computes the git sha, and starts a **`DocConversionWorkflow`** instance (Cloudflare Workflows, the pattern of ADR 0009) with id `hash(siteId, path, sha)`. That gives each conversion its own invocation, its own retries, and de-duplicates at-least-once delivery.

The spike (2026-11-18, scratchpad `spike/`) ran mammoth + unified inside workerd: 40 ms for a 32 KB document with one image, 250 ms for a 7.7 MB document with 400 paragraphs, 25 tables and 25 images; a Word-style document (Title, Heading 1/2, bullets, footnote, hyperlink, table, caption, strike) converted cleanly. Bundle cost about 230 KB gzipped (Workers allow 10 MB).

### The DOCX is the Page File; derived content lives outside the vault

The Blob for `report.docx` gets `appPath = /report`, `metadata` (title, description), links, tags and a search document, like a `.md`. `Blob.sha` is the sha of the Word file's bytes (so GitHub diffing and `?v=` versioning behave). The converted Markdown and extracted images are **derived objects**, keyed by that sha so a re-upload never mixes old and new:

```
{siteId}/main/raw/report.docx                         the original (unchanged)
{siteId}/main/derived/report.docx/{sha}/index.md      converted Markdown
{siteId}/main/derived/report.docx/{sha}/image1.png    extracted images
```

Derived objects are not Blobs. They are invisible to `fl` manifests, `/sync` replace-mode deletion and GitHub diffing. The consumer acks any `…/main/derived/…` key immediately (first line of `handleMessage`, before key parsing). Staying under `{siteId}/` means site deletion and anonymous-site cleanup, which delete the `{siteId}/` prefix, need no change.

Lifecycle:
- **Convert succeeds:** write `derived/{path}/{sha}/…`, upsert the Blob (appPath, sha, metadata, links, tags, search), PublishFile → success, then delete other `{sha}` folders under `derived/{path}/`.
- **Convert fails:** PublishFile → error with a readable message; the previous Blob and its derived folder stay live.
- **DOCX deleted:** delete the Blob row (existing) and the whole `derived/{path}/` prefix (trailing slash), even if no Blob row exists.

### Extension lists and link resolution

`PAGE_FILE_EXTENSIONS` (md, mdx, canvas) stays as it is. A new `CONVERTIBLE_EXTENSIONS = ['docx']` in `@flowershow/core`:
- `computeAppPath` gives a slug for page extensions **and** convertible ones.
- `resolveContentLink` does **not** treat `.docx` as a page: `[Download](report.docx)` stays a download. `[[report]]` and `/report` resolve to the page (`matchLinkTarget` learns to strip convertible extensions).
- A new helper `isMarkdownLikePage(path)` (md, mdx, docx) replaces the ~15 hardcoded `/\.mdx?$/` checks in the app (sidebar tree, home-page fallback, list components, changelog, listings, llms.txt, annotations, page actions, render). A grep test fails if a new hardcoded check appears.
- Slug collision: when `report.md` and `report.docx` share a slug, the `.md`/`.mdx` wins in `getBlob`'s tie-break, and the publish reports a warning on the docx. `index.docx`/`README.docx` do become the folder index (a home page from a Word file is a feature), subject to the same tie-break.

### Conversion pipeline (inside the workflow)

1. Guard the zip from its central directory before inflating: `document.xml` ≤ 20 MB, total uncompressed ≤ 60 MB, ≤ 500 entries, ≤ 200 images; count bytes while inflating as well.
2. mammoth → HTML with a style map (Title → h1, Quote/Intense Quote → blockquote, code styles → pre/code). Images via `convertImage`: sniff magic bytes, allow png/jpeg/gif/webp only, name `imageN.{ext}` from the sniffed type, store with `getContentType`, write to R2 one at a time; drop SVG/EMF/WMF with a warning.
3. HTML post-processing (rehype): drop empty bookmark anchors; promote a header-less table's first row to header; keep tables with `colspan`/`rowspan` as raw HTML (Flowershow renders HTML); strip `href`s that are not http(s), mailto or relative; footnotes → `[^n]` where feasible.
4. HTML → Markdown with unified (`rehype-parse` → `rehype-remark` → `remark-gfm` → `remark-stringify`). No DOM needed, so it runs in workerd.
5. Title: first H1 (Title style or Heading 1), else the filename humanised (`Q3_report-final` → "Q3 report final"). `metadata.convertedWith = <converter version>` for future re-conversion.
6. Run the existing Markdown pipeline on the result for the `report.docx` Blob (parse, links, tags, Typesense).

Author-facing warnings that matter (dropped equations, dropped unsupported images, too large) go in the PublishFile `error` field the way frontmatter errors do: the page is live, the publish says "converted with warnings: …". Every failure goes to PostHog via `captureError` (`source: 'worker_docx_convert'`).

### App changes

- `getBlobContent`: for a convertible extension read `derived/{path}/{sha}/index.md`.
- `renderPageContent`: convertible → the MD renderer, never MDX (document text with `{` or `<` must not compile as MDX).
- `/api/raw`: a path starting `_derived/` maps to the `derived/` key, same password handling; `_derived/` is a reserved folder (documented). Middleware already routes image extensions to `/api/raw`.
- Upload validators requiring "at least one .md/.mdx/.html" accept `.docx`: dashboard import modal, drop zone, publish-anon route, MCP publish.
- "View source" link (`showRawLink`) becomes "download the original".

### Limits and safety

- Bounded conversion (sizes above); each conversion in its own workflow invocation; a failure never affects other files or sites.
- The DOCX is untrusted: image types sniffed, link schemes filtered, no macros executed (mammoth reads XML and media only). Derived images are served from R2 with the sandbox headers of ADR 0013. Tenant isolation: derived keys live under the site's own prefix and are read only via the site's Blob.
- Track changes: insertions kept, deletions dropped ("accept all"); comments dropped; equations dropped (mammoth has no OMML support). Documented as known limits.
- Storage accounting counts Blob sizes only, so derived images (roughly the Word file's size again) are not counted. Accepted for v1.

### Converter choice and licences

- **mammoth** 1.13 (BSD-2-Clause, pure JS, maintained; the base of Microsoft markitdown, Adobe Helix and most Obsidian importers). Its own `convertToMarkdown` is deprecated and drops tables, so we go via HTML.
- **unified / rehype-remark / remark-gfm** (MIT), already used by the app.
- **Not pandoc** for v1: blot.im uses it, inside a jailed server. The official `pandoc-wasm` (GPL-2+, 58 MB) is the upgrade path if equations, ODT, RTF or track-changes options are demanded; too large for the Worker bundle, so it would be a separate job. Python markitdown/docling need a service; only worth it for PDF/PPTX fidelity.

### Rollout

No DB migration, no env var. Deploy the worker to staging, publish the test fixtures, deploy the app preview, verify; then production worker and app in either order (existing `.docx` Blobs keep `appPath = null` until republished, so nothing changes for them). Rollback is a revert and redeploy. Follow-up (bead): a script that re-enqueues Word files whose `convertedWith` is out of date.

## Format survey and order of work

| Format | Approach | Effort | Order |
| --- | --- | --- | --- |
| DOCX | mammoth → Markdown in a worker workflow (this design) | M | 1 |
| CSV / TSV | Render-time: treat as a Page File, render a styled table (papaparse, MIT); large files render client-side | S | 2 |
| ipynb | JSON → Markdown (cells, outputs) in the same workflow; own converter, no library | S–M | 3 |
| Google Docs | Drive API export as DOCX → this pipeline (blot.im exports HTML+images zip); needs OAuth connection and change polling | L | later |
| XLSX | exceljs (MIT) → table page per sheet | M | later |
| PDF | Keep as viewer (already works); text extraction (pdfjs) loses layout | — | not planned |
| PPTX | No good JS converter; markitdown/docling service or own JSZip walk | L | not planned |
| ODT / RTF | pandoc-wasm only | — | with pandoc-wasm, if ever |

CSV gets its own short design after DOCX ships.

## Comparable products

Notion is the only comparable with real Word import and documents the same caveats (merged cells, comments, tracked changes, 5–50 MB cap). Obsidian, Ghost and Substack have no DOCX import; users paste from Google Docs and lose images. blot.im: Word/ODT/Google Docs files in the synced folder become posts; styles stripped so the theme wins; original untouched; per-document `_assets/<hash>/` folder for extracted media; a fully bold paragraph becomes a heading (optional heuristic worth borrowing later).

## What is left to the builder

- Exact style map and post-processing rules, tested against a Word-authored fixture and a pandoc-authored one (both in the spike).
- Workflow wiring in `wrangler.flowershow.toml` for dev, staging and production.
- Tests: worker unit tests (derived-key early ack, zip guard, mislabelled image, collision tie-break, delete during conversion, Blob sha equals file sha); app unit tests for derived-key routing and the MD-renderer forcing; a Playwright e2e that seeds a docx Blob with derived content and checks `/report` renders and `/report.docx` downloads.
- Docs page `content/flowershow-app/docs/publish-word-documents.md` and a changelog entry with a screenshot.

## Review changes (2026-11-18)

Independent review (Opus) found and this draft now fixes: existing `.docx` links would have turned into page links (fixed by not adding docx to `PAGE_FILE_EXTENSIONS`); `report.md` next to `report.docx` was a random tie (md wins); conversion inline in the shared batch risked OOM retries of unrelated files (own workflow); derived-prefix events would have crashed the batch (early ack); mutable derived folder races (sha-keyed folders); attacker-controlled image content types (magic-byte allowlist); ~15 hardcoded `md|mdx` checks (one helper); MDX compilation of document text (force MD renderer); warnings hidden from authors (PublishFile error field).
