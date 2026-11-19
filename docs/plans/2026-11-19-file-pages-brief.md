# Brief: show PDF and CSV files as site pages

You are a sub-session started from Rufus's Flowershow work. Rufus is the founder. You own this end to end: a short design, a plan, then the build. Work in the flowershow repo in your own git worktree. Run on Opus; send mechanical work to Sonnet subagents and reviews to Opus.

## Rufus's ask (19 Nov)

Word documents now publish as pages (PR #1568, shipped 18 Nov). Next: PDF and CSV. Rufus agreed: **PDFs become pages without being converted to Markdown**, because conversion jumbles layout and scanned PDFs have no text. PDF first, then CSV.

## The shape (agreed in outline)

- **PDF:** `report.pdf` gets a page at `/report` with the site navbar, title, a viewer and a download button. Text is pulled out in the worker only for search, the page description and the sitemap; it is never the page body. `/report.pdf` still serves the raw file.
- **CSV/TSV:** `data.csv` gets a page at `/data` with a sortable table and a download link. The table is drawn in the reader's browser straight from the CSV file, so unlike Word there is no converted copy to make or store on upload. (Recommendation; the design can overturn it, e.g. if search needs the table text.)
- **Existing files:** as for Word, PDFs and CSVs already on sites stay as they are until re-published. No backfill (Rufus, 19 Nov).

## What exists already (checked 19 Nov)

- Word plumbing to reuse: read `docs/adr/0017-converted-documents-are-page-files-with-derived-content.md`, `docs/plans/2026-11-18-docx-conversion-design.md`, `packages/core/src/convertible.ts`, `apps/cloudflare-worker/src/converted-document.js` and `apps/flowershow/lib/converted-blob.ts`.
- PDF: `/x.pdf` already opens inline (no Content-Disposition). `![[x.pdf]]` renders `components/public/mdx/pdf-viewer.tsx` (react-pdf; text layer off; worker loaded from unpkg).
- CSV: `components/public/mdx/flatui-table.tsx` (flat-ui Grid + papaparse, reads the first ~5 MB by Range request).

## How to work

Superpowers: brainstorming (short; the outline is agreed) → design doc in `docs/plans/` → writing-plans → subagent-driven development. Have a subagent critique the design before showing it. Play back once to Rufus (goal, scope, done-check, a sketch of the PDF page), get one OK, then run to the done-check without checking in. Small, reversible choices: decide and continue.

Questions the design must settle: name collisions across md/docx/pdf/csv for one address; whether explicit `.pdf`/`.csv` links stay raw (Word precedent: yes); size limits; listing/search/sitemap; the PDF text extractor in workerd (e.g. unpdf, MIT); self-hosting the pdf.js worker; mobile.

## Beads

Epic `flowershow-eiz`. In order: `flowershow-eiz.13` (design) → `flowershow-eiz.14` (PDF) → `flowershow-eiz.11` (CSV). Also `flowershow-eiz.8` (fl CLI counts .docx/.pdf/.csv as content) fits here.

## Done-check

PDF and CSV pages work on production. PRs merged with CI and e2e green. Docs page(s) and changelog entry with a screenshot. Beads closed and synced. Branches and worktree cleaned up.

## Care

Launch was 17 Nov, so be careful with production. Ask before any risky production database migration and before publishing anything public. Deploy the app before the worker (see the Word design's deploy-order note).

Reply shape: follow the global CLAUDE.md (detail, then `### Summary` and `### You`).
