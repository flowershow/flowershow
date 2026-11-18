# Publish Word documents (DOCX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `.docx` published by any channel renders as a normal page at its extensionless URL, while the `.docx` URL still downloads the original.

**Architecture:** The Cloudflare Worker queue consumer hands each `.docx` upload to a new `DocConversionWorkflow`. The workflow converts it (mammoth → HTML → unified → Markdown), writes the Markdown and images under `{siteId}/main/derived/{path}/{sha}/`, and indexes the `.docx` Blob as a page with the shared Markdown indexing code. The Next.js app reads derived Markdown for convertible Blobs, renders it with the MD renderer, and serves derived images via `/_derived/...`.

**Tech Stack:** Cloudflare Workers + Workflows + R2 + Queues, postgres.js, mammoth 1.13 (BSD-2-Clause), unified/rehype-parse/rehype-remark/remark-gfm/remark-stringify (MIT), fflate (MIT) for the zip guard, Next.js app, Prisma, Vitest (workerd pool for the worker), Playwright.

**Spec:** `docs/plans/2026-11-18-docx-conversion-design.md`

## Global Constraints

- Convertible extensions: exactly `docx` (constant `CONVERTIBLE_EXTENSIONS` in `@flowershow/core`). Matching is case-insensitive.
- `PAGE_FILE_EXTENSIONS` stays `md, mdx, canvas`. `resolveContentLink` must keep `[x](report.docx)` a raw download link.
- Derived key layout: `{siteId}/main/derived/{path}/{sha}/index.md` and `{siteId}/main/derived/{path}/{sha}/image{N}.{ext}`, where `sha` is the git blob SHA-1 of the `.docx` bytes. Public URL for an image: `/_derived/{path}/{sha}/image{N}.{ext}` with each path segment `encodeURIComponent`-encoded.
- `Blob.sha` and `Blob.size` for a `.docx` are those of the Word file, never of the derived Markdown.
- Input cap 10 MB (`MAX_BUFFERED_BYTES`). Zip guard from the central directory: `word/document.xml` ≤ 20 MB uncompressed, total uncompressed ≤ 60 MB, ≤ 500 entries, ≤ 200 images.
- Allowed extracted image types, sniffed from magic bytes: png, jpeg (stored `.jpg`), gif, webp. Others (svg, emf, wmf, tiff…) are dropped with a warning.
- Allowed link schemes in converted output: `http:`, `https:`, `mailto:`, fragment `#…`, and relative. Others are removed (text kept).
- Converted pages always use the MD renderer, never MDX.
- When a `.md`/`.mdx` and a `.docx` share an `appPath`, the `.md`/`.mdx` wins.
- PostHog error source for conversion failures: `worker_docx_convert`.
- Conversion warnings go to `PublishFile.error` as `Converted with warnings: <w1>; <w2>` (page still live); a failed conversion sets `PublishFile.error` to `Could not convert this Word document: <reason>`.
- `metadata.convertedWith = 'mammoth-1'` on converted Blobs (bump the suffix when conversion output changes).
- No DB migration, no env var.

## Review Focus

1. **File names with spaces, `+`, unicode or nested folders** (`My Notes/Q3 Report (final).docx`): page at `/My+Notes/Q3+Report+(final)`, images load. Test in Task 2 (image src encoding) and Task 5 (e2e fixture lives in a folder with a space).
2. **Re-upload of a changed `.docx` while the previous conversion is still running:** the newest sha wins; old sha folders are removed. Test in Task 3 (`indexConvertedDocument` skips when the stored object's sha differs).
3. **`.docx` deleted during or after conversion:** no Blob, no derived folder left. Test in Task 3 (delete handler removes `derived/{path}/` even with no Blob row; index step stops if the raw object is gone).
4. **A Word file that is not a real docx** (renamed `.doc`, encrypted, empty, a zip bomb): readable PublishFile error, the file still downloads, other files in the batch unaffected. Tests in Task 2 (guard) and Task 3 (failure path upserts a raw-asset Blob when none exists).
5. **Existing sites with `.docx` downloads linked from pages:** links still download after deploy. Test in Task 4 (`resolveContentLink` unit test) and Task 5 (e2e `/…/report.docx` responds with the docx).

---

### Task 1: Core helpers for convertible documents

**Files:**
- Modify: `packages/core/src/file-path-to-slug.ts`, `packages/core/src/match-link-target.ts`, `packages/core/src/index.ts`
- Create: `packages/core/src/convertible.ts`
- Test: `packages/core/src/convertible.test.ts`, `packages/core/src/match-link-target.test.ts`

**Interfaces:**
- Produces (exported from `@flowershow/core`):
  - `CONVERTIBLE_EXTENSIONS: ReadonlySet<string>` = `{'docx'}`
  - `MARKDOWN_LIKE_EXTENSIONS: readonly string[]` = `['md', 'mdx', 'docx']` (for Prisma `extension: { in: … }`)
  - `isConvertiblePath(path: string): boolean`
  - `isMarkdownLikePage(path: string): boolean` (md, mdx, docx; case-insensitive)
  - `derivedPrefix(path: string): string` → `derived/{path}/` (relative to `{siteId}/main/`)
  - `derivedMarkdownKey(siteId: string, path: string, sha: string): string` → `{siteId}/main/derived/{path}/{sha}/index.md`
  - `derivedAssetKey(siteId: string, path: string, sha: string, name: string): string`
  - `derivedAssetUrlPath(path: string, sha: string, name: string): string` → `/_derived/{enc(path segments)}/{sha}/{name}`
  - `parseDerivedUrlPath(urlPath: string): string | null` → the R2 key suffix `derived/{path}/{sha}/{name}` for a decoded `_derived/...` request path, or null (rejects `..` segments and empty segments)
  - `pageSlugFromPath(path: string): string | null` → `encodeSlug(filePathToSlug(path))` for page or convertible extensions, else null. `filePathToSlug` strips a convertible extension too (so `report.docx` → `/report`, `index.docx` → `/`).

- [ ] **Step 1:** Write tests in `convertible.test.ts`: `isConvertiblePath('a/Report.DOCX') === true`; `isMarkdownLikePage('x.docx') === true`, `('x.canvas') === false`; `derivedMarkdownKey('s1','My Notes/r.docx','abc') === 's1/main/derived/My Notes/r.docx/abc/index.md'`; `derivedAssetUrlPath('My Notes/r (1).docx','abc','image1.png') === '/_derived/My%20Notes/r%20(1).docx/abc/image1.png'`; `parseDerivedUrlPath('_derived/My Notes/r.docx/abc/image1.png') === 'derived/My Notes/r.docx/abc/image1.png'`; `parseDerivedUrlPath('_derived/../x/abc/i.png') === null`; `pageSlugFromPath('docs/Q3 Report.docx') === '/docs/Q3+Report'`; `pageSlugFromPath('a.pdf') === null`; `filePathToSlug('index.docx') === '/'`.
- [ ] **Step 2:** In `match-link-target.test.ts` add: `matchLinkTarget('report', [{path:'report.docx'}])` returns it; `matchLinkTarget('report', [{path:'report.docx'},{path:'report.md'}])` returns `report.md`.
- [ ] **Step 3:** Run `pnpm --filter @flowershow/core test` — new tests fail.
- [ ] **Step 4:** Implement. `stripExt` in `matchLinkTarget` strips `.md|.mdx|.docx`; on ties of equal stripped path prefer md/mdx over docx, then shortest.
- [ ] **Step 5:** Run `pnpm --filter @flowershow/core test` and `pnpm --filter @flowershow/core build` — pass.
- [ ] **Step 6:** Commit `feat(core): helpers for convertible (docx) pages`.

### Task 2: DOCX → Markdown converter module (worker, pure)

**Files:**
- Create: `apps/cloudflare-worker/src/docx/convert.js`, `apps/cloudflare-worker/src/docx/zip-guard.js`, `apps/cloudflare-worker/src/docx/sniff-image.js`
- Create fixtures: `apps/cloudflare-worker/test/fixtures/docx/word.docx` (Word-style: Title, Heading 1/2, bullets with nesting, footnote, hyperlink, a `javascript:` hyperlink, table with header-less first row, a table with a merged cell, PNG image, caption, strike), `pandoc.docx`, `not-a-zip.docx` (random bytes), `bomb.docx` (zip whose `word/document.xml` declares > 20 MB uncompressed). Generate with a script committed at `apps/cloudflare-worker/test/fixtures/docx/make-fixtures.mjs` (uses `docx` npm as a devDependency) so fixtures are reproducible; commit the generated `.docx` files too.
- Modify: `apps/cloudflare-worker/package.json` (deps: `mammoth@^1.13.0`, `unified`, `rehype-parse`, `rehype-remark`, `remark-gfm`, `remark-stringify`, `unist-util-visit`, `fflate`; devDep `docx`)
- Test: `apps/cloudflare-worker/test/unit/docx-convert.test.js`

**Interfaces:**
- Produces:
  - `checkDocxZip(bytes: Uint8Array): void` — throws `DocxRejectedError` (exported class, `.message` user-facing) when limits in Global Constraints are exceeded or the bytes are not a zip containing `word/document.xml`.
  - `sniffImageType(bytes: Uint8Array): 'png'|'jpg'|'gif'|'webp'|null`
  - `convertDocx(bytes: Uint8Array, { imageUrl: (name: string) => string, onImage: (name: string, bytes: Uint8Array, contentType: string) => Promise<void> }): Promise<{ markdown: string, warnings: string[], imageCount: number }>` — calls `checkDocxZip` first; `onImage` is awaited once per kept image, in order, before the next one is read (no image array held in memory).

- [ ] **Step 1:** Write the fixtures script and generate fixtures.
- [ ] **Step 2:** Write failing tests (run in workerd via existing `vitest.unit.config.js`; load fixtures with `?raw`-free approach: import as base64 modules generated by the fixtures script, `test/fixtures/docx/*.b64.js`):
  - `word.docx`: markdown starts with `# Board Memo`; contains `## Details`; contains `- First bullet` and an indented `- Sub bullet`; contains `**strongly**`; contains `[the site](https://flowershow.app)`; contains `[^1]` and a line starting `[^1]: A Word footnote.`; contains a GFM table whose header row is `| Region | Revenue |`; the merged-cell table appears as raw `<table` HTML with `colspan`; contains `![](` + `imageUrl('image1.png')`; contains `~~strike~~`; does **not** contain `javascript:`; no empty `[]()` anchors.
  - `onImage` called once with name `image1.png`, content type `image/png`.
  - An image whose bytes are SVG but declared `image/png` is dropped with a warning mentioning “unsupported image”.
  - `not-a-zip.docx` → rejects with `DocxRejectedError`, message `This file is not a valid Word (.docx) document.`
  - `bomb.docx` → rejects with `DocxRejectedError`, message mentions `too large`.
  - Equations: a fixture paragraph containing `m:oMath` produces warning `Equations are not supported and were left out.` (map mammoth's "unrecognised element" warnings for `m:oMath`/`m:oMathPara` to this one message; other mammoth style warnings are not surfaced).
- [ ] **Step 3:** Run `pnpm --filter markdown-processing-worker test -- docx-convert` — fails.
- [ ] **Step 4:** Implement. Style map: `p[style-name='Title'] => h1:fresh`, `p[style-name='Subtitle'] => p:fresh`, `p[style-name='Quote'] => blockquote:fresh`, `p[style-name='Intense Quote'] => blockquote:fresh`, `p[style-name='Block Text'] => blockquote:fresh`, `p[style-name='Source Code'] => pre:fresh`, `r[style-name='Verbatim Char'] => code`. Post-process the hast before `rehype-remark`: remove empty `<a>` with only `id`; promote the first row of a table with no `th` to header cells; leave any table containing `colspan`/`rowspan` as raw HTML (custom `rehype-remark` handler returning an `html` node); drop disallowed hrefs (unwrap the `<a>`); convert mammoth footnote markup (`sup > a[href^="#footnote-"]` and the trailing `ol > li[id^="footnote-"]`, dropping the `↑` back-link) to mdast `footnoteReference`/`footnoteDefinition`. Stringify with `bullet: '-'`, `fences: true`, `emphasis: '_'`, `strong: '*'`.
- [ ] **Step 5:** Run tests — pass. Run `pnpm --filter markdown-processing-worker lint`.
- [ ] **Step 6:** Commit `feat(worker): docx to markdown converter`.

### Task 3: DocConversionWorkflow and queue routing

**Files:**
- Create: `apps/cloudflare-worker/src/doc-conversion-workflow.js`, `apps/cloudflare-worker/src/converted-document.js`
- Modify: `apps/cloudflare-worker/src/queue-consumer.js` (export a shared `indexMarkdownPage`, derived-key early ack, docx routing, delete cleanup), `apps/cloudflare-worker/src/worker.js` (export the workflow class), `apps/cloudflare-worker/wrangler.flowershow.toml` (binding `DOC_CONVERSION_WORKFLOW`, names `flowershow-doc-conversion-workflow[-staging|-dev]`, class `DocConversionWorkflow`, in production, staging and dev), `apps/cloudflare-worker/README.md`
- Test: `apps/cloudflare-worker/test/unit/queue-consumer.test.js`, `apps/cloudflare-worker/test/unit/converted-document.test.js`

**Interfaces:**
- Consumes: Task 1 helpers; Task 2 `convertDocx`, `DocxRejectedError`.
- Produces:
  - `indexMarkdownPage({ sql, typesense, env, siteId, path, markdown, sha, size, publishId, extraMetadata }): Promise<{ blobId: string|null, fileError: string|null }>` in `queue-consumer.js` — the body of today's `processMarkdownFile` after reading bytes (parse, `publish:false` handling, upsert, links, tags, search). `processMarkdownFile` calls it. For `publish: false` on a docx, it deletes the raw `.docx` like for md.
  - `convertDocument({ storage, siteId, path, sha }): Promise<{ warnings: string[] }>` in `converted-document.js` — reads `{siteId}/main/raw/{path}` (10 MB cap; larger → `DocxRejectedError('This Word document is larger than 10 MB, the conversion limit.')`), verifies its git sha equals `sha` (else returns `{ superseded: true }`), runs `convertDocx`, writes images then `index.md` to derived keys with `getContentType(ext)`.
  - `indexConvertedDocument({ storage, sql, typesense, env, siteId, path, sha, size, publishId, warnings }): Promise<void>` — stops (and deletes `derived/{path}/{sha}/`) if the raw object is gone or its sha ≠ `sha`; reads `index.md`; calls `indexMarkdownPage` with `extraMetadata: { convertedWith: 'mammoth-1' }`; if a `.md`/`.mdx` Blob with the same `app_path` exists, appends warning `report.md already uses this URL, so this Word file is only available as a download.`; sets PublishFile success or `Converted with warnings: …`; deletes other `{sha}` folders under `derived/{path}/`; calls `revalidateIfPublishDone`.
  - `recordConversionFailure({ sql, env, siteId, path, sha, size, publishId, error })` — PublishFile error `Could not convert this Word document: <message>`; if no Blob row exists, upserts a raw-asset Blob (appPath null) so the file downloads; `captureError` with `source: 'worker_docx_convert'`, `size`.
  - `DocConversionWorkflow.run(event, step)` with `event.payload = { siteId, path, sha, size, publishId }`: `step.do('convert', …)` → `step.do('index', …)`; a `DocxRejectedError` is not retried (catch inside the step, return `{ rejected: message }`), other errors retry with the step default then go to `recordConversionFailure`.
  - Queue consumer, `PutObject` on a convertible path: hash the stream (as for non-markdown), then `env.DOC_CONVERSION_WORKFLOW.create({ id: sha1hex(`${siteId}:${path}:${sha}`), params })`; an "already exists" error is treated as success; ack. It does not touch the Blob or PublishFile.
  - Queue consumer, any key matching `^[^/]+/main/derived/`: ack and return before `parseObjectKey`.
  - Queue consumer, `DeleteObject` on a convertible path: also `deleteStoragePrefix(storage, `${siteId}/main/${derivedPrefix(path)}`)`, even when no Blob row was deleted.

- [ ] **Step 1:** Write failing unit tests (use the existing `createRecordingSql`, `createR2Storage`, `putMessage` helpers; extend `createR2Storage` to record `put`/`delete`/`list` calls if needed):
  - `handleMessage - a derived key is acked without parsing or DB writes`.
  - `handleMessage - a docx PutObject starts one conversion workflow with the file's git sha` (mock `env.DOC_CONVERSION_WORKFLOW.create`; assert id is 40 hex chars and params `{siteId, path, sha, size, publishId}`; no `INSERT INTO "Blob"`).
  - `handleMessage - a duplicate workflow id is not an error`.
  - `handleMessage - deleting a docx removes its derived folder even without a Blob row`.
  - `convertDocument - writes image1.png then index.md under the sha folder`.
  - `convertDocument - returns superseded when the stored file has another sha`.
  - `indexConvertedDocument - Blob gets app_path /Q3+Report, the docx sha and size, metadata.convertedWith`.
  - `indexConvertedDocument - stops and cleans its folder when the docx was deleted`.
  - `indexConvertedDocument - warns when report.md has the same URL`.
  - `indexConvertedDocument - removes older sha folders after success`.
  - `recordConversionFailure - creates a raw-asset Blob when none exists and sets the PublishFile error`.
  - Existing markdown tests still pass unchanged (refactor safety).
- [ ] **Step 2:** Run `pnpm --filter markdown-processing-worker test` — new tests fail.
- [ ] **Step 3:** Implement; `computeAppPath` uses `pageSlugFromPath`.
- [ ] **Step 4:** Run tests and lint — pass. Run `pnpm --filter markdown-processing-worker exec wrangler deploy --dry-run --config wrangler.flowershow.toml --env staging --outdir /tmp/fs-docx-dry` (after `pnpm --filter @flowershow/core build`) and check the bundle builds and its gzipped size is under 3 MB.
- [ ] **Step 5:** Update the worker README (workflow list, derived keys, conversion limits).
- [ ] **Step 6:** Commit `feat(worker): convert docx uploads in DocConversionWorkflow`.

### Task 4: App reads, renders and serves converted documents

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts` (`getBlobContent` ~1758, `getBlob` tie-break ~1532-1546, `extension: { in: … }` at ~1248, ~1464, ~1594 and the raw SQL list query ~1382), `apps/flowershow/lib/render-page-content.tsx:64`, `apps/flowershow/lib/listing/route.ts` (`MARKDOWN_RE`, `rendersAsMdx` → convertible always MD), `apps/flowershow/lib/listing/query.ts:44`, `apps/flowershow/lib/listing/items.ts:77`, `apps/flowershow/lib/post/footer.ts:48`, `apps/flowershow/lib/annotations/enabled.ts:3`, `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx:250,567`, `apps/flowershow/app/api/rss/[user]/[project]/route.ts:46`, `apps/flowershow/lib/content-store.ts` (add `fetchDerivedMarkdown`), `apps/flowershow/app/api/raw/[username]/[projectName]/[[...path]]/route.tsx` (`_derived/` mapping), upload validators `apps/flowershow/components/dashboard/onboarding/import-files-modal.tsx:40-58`, `apps/flowershow/components/home/drop-zone.tsx:20`, `apps/flowershow/app/api/sites/publish-anon/route.ts:105-161`, `apps/flowershow/lib/mcp/publish.ts:559` (check what it does; accept docx via `contentBase64`)
- Leave as md/mdx only (they expose raw Markdown source, which a Word file does not have): page actions `page.tsx:920`, `lib/llms-txt.ts`, `app/api/llms/…`, `lib/changelog*.ts`, Obsidian Bases components.
- Test: `apps/flowershow/lib/resolve-link.test.ts` (or the existing test file for it), `apps/flowershow/lib/converted-blob.test.ts`, a test for the raw route helper.

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces:
  - `pickBlobForSlug<T extends { path: string }>(candidates: T[]): T | undefined` in `apps/flowershow/lib/converted-blob.ts` — today's order (index.* > folder index > first), but any md/mdx/canvas beats a convertible file; used by `getBlob`.
  - `fetchDerivedMarkdown({ projectId, path, sha }): Promise<string | null>` in `content-store.ts`.
  - `getBlobContent` returns derived Markdown for convertible blobs (it already loads the blob; select `sha`).

- [ ] **Step 1:** Write failing tests: `resolveContentLink('report.docx', …)` returns the absolute file URL ending `/report.docx`, and `resolveContentLink('report', …)` returns `/report`; `pickBlobForSlug([{path:'report.docx'},{path:'report.md'}]).path === 'report.md'`, `pickBlobForSlug([{path:'a/index.docx'},{path:'a/README.md'}]).path === 'a/README.md'`; raw route helper maps `['_derived','My Notes','r.docx','abc','image1.png']` to key `{siteId}/main/derived/My Notes/r.docx/abc/image1.png` and rejects `..`; `rendersAsMdx('x.docx', 'auto') === false` and `('x.docx','mdx') === false`.
- [ ] **Step 2:** Run `pnpm --filter @flowershow/app test:unit --run` on these files — fail.
- [ ] **Step 3:** Implement. In the raw route, a `_derived/` path builds the key with `parseDerivedUrlPath`, skips the Blob `?v=` lookup (sha-keyed URLs are immutable; set `Cache-Control: public, max-age=31536000, immutable` on the redirect only for public sites), keeps the password branch as is. Upload validators accept `.docx` and update their copy to “(.md, .mdx, .html or .docx)”.
- [ ] **Step 4:** Run app unit tests, `pnpm --filter @flowershow/app lint` and `pnpm --filter @flowershow/app exec tsc --noEmit` — pass.
- [ ] **Step 5:** Commit `feat(app): render converted Word documents as pages`.

### Task 5: End-to-end test

**Files:**
- Modify: `apps/flowershow/e2e/helpers/seed.ts` (seed convertible files: upload `report.docx` to raw, a pre-converted `index.md` and `image1.png` to the derived keys, Blob with the docx git sha, `appPath` from `pageSlugFromPath`, metadata from the derived Markdown)
- Create: `apps/flowershow/e2e/fixtures/test-site/Word Docs/Board Memo.docx` (copy of Task 2's `word.docx`), `apps/flowershow/e2e/fixtures/derived/Word Docs/Board Memo.docx/index.md` and `image1.png` (the converter's real output for that fixture, generated once with `convertDocx`)
- Create: `apps/flowershow/e2e/specs/word-documents.spec.ts`

- [ ] **Step 1:** Write the spec: visiting `/Word+Docs/Board+Memo` shows heading `Board Memo`, a table cell `North`, an `img` whose `naturalWidth > 0`, and a footnote; the page appears in the sidebar; `GET /Word%20Docs/Board%20Memo.docx` (following redirects) returns status 200 with a body starting `PK`; the password-protected site variant is not needed.
- [ ] **Step 2:** Run `pnpm --filter @flowershow/app test:e2e word-documents` locally if the e2e stack is available; otherwise rely on CI (`.github/workflows/e2e.yml`). Expected: PASS.
- [ ] **Step 3:** Commit `test(e2e): Word document page renders and downloads`.

### Task 6: Docs, changelog, domain docs

**Files:**
- Create: `content/flowershow-app/docs/publish-word-documents.md` (follow the `write-tutorial` skill: what works, how to publish by each channel, what is kept and dropped, limits, `report.md` precedence, the download URL)
- Create: `content/flowershow-app/changelog/2026-11-DD-publish-word-documents.md` (date = ship day; screenshot added in Task 7)
- Create: `docs/adr/0017-converted-documents-are-page-files-with-derived-content.md`
- Modify: `CONTEXT.md` (Page File and Raw Asset entries; new term **Converted Document** and **Derived Content**), `apps/flowershow/README.md` / `packages/core/README.md` if they list page file types.

- [ ] **Step 1:** Write the pages. Changelog title: “Publish Word documents”.
- [ ] **Step 2:** Commit `docs: publish Word documents`.

### Task 7: Ship (coordinator, not a subagent)

- [ ] Open the PR (`Fixes #1403`), independent Opus review per `docs/agents/review.md`, fix findings, `gh pr checks --watch` green.
- [ ] Deploy the worker to staging (`pnpm --filter markdown-processing-worker deploy:staging`); publish the fixture with `fl` to a staging site; check page, images, download, re-upload and delete.
- [ ] Merge (app deploys via Vercel), deploy the worker to production, publish the fixture to a throwaway `fl` site on production, verify, take the ~1440px `.webp` screenshot for the changelog, delete the throwaway site.
- [ ] Close beads, sync, clean branches and the worktree.
