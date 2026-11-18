# ADR 0017: Converted documents are Page Files, with derived content stored outside the vault

**Status**: Accepted (Word documents, 2026-11)

## Context

Users want to publish `.docx` files as pages, not only as downloads. A `.docx` was a Raw Asset served from `/api/raw`. We need a page for it without changing what the vault contains, and without breaking existing sites that link to `.docx` downloads. Design: `docs/plans/2026-11-18-docx-conversion-design.md`.

## Decision

- **The `.docx` is the Page File.** Its Blob keeps the sha and size of the Word file, so sync, deletes and re-publishes work as for any file. The original stays downloadable at its `.docx` URL. `PAGE_FILE_EXTENSIONS` is unchanged; a separate `CONVERTIBLE_EXTENSIONS` list (`docx`) marks files that also get a page.
- **Derived content lives outside the vault.** Converted Markdown and images are stored under `{siteId}/main/derived/{path}/{sha}/` (`index.md`, `image{N}.{ext}`), keyed by the source's sha and served under `/_derived/`. Nothing is written into the user's vault or synced back. A changed sha writes a new folder and removes the old one; deleting the `.docx` removes the folder. `_derived/` is a reserved top-level folder name.
- **Conversion runs in `DocConversionWorkflow`** (Cloudflare worker) using mammoth to read the Word file and unified to produce Markdown. It is capped at 10 MB with zip limits, allows only PNG, JPEG, GIF and WebP images, and removes unsafe link schemes. A Word file never fails a publish that would have succeeded before conversion existed: dropped content (equations, unsupported images) and failed conversions go to PostHog and the logs, not `PublishFile.error`; a file that cannot be converted stays a download (a previously converted version stays live).
- **Markdown wins on a shared URL.** If `report.md` and `report.docx` both exist, the Markdown is the page and the Word file is only a download (no warning).
- **Explicit `.docx` links stay downloads.** `[x](report.docx)` and `[[report.docx]]` link the file; `[[report]]` links the page. Existing links keep working.

## Alternatives considered

- **Write a sibling `.md` into the vault.** Simple, but it pollutes the user's vault and GitHub repo, can be edited by mistake (the conversion is one way), and collides with a real `report.md`.
- **Pandoc.** Good output, but a native binary doesn't run in a Cloudflare Worker, so it needs separate infrastructure.
- **Convert in the CLI or agent.** Covers only some channels; GitHub sync, the dashboard and Obsidian would each need their own converter.

## Consequences

- Every publish channel gets Word support with no client change.
- Search, tags, backlinks and annotations work on Word pages. Page actions ("copy as Markdown") and `llms.txt` do not include them.
- Derived images on public sites are cached long-term, so password-protecting a site later does not retract image URLs already shared, as with other files.
- No database migration. Bump `metadata.convertedWith` when conversion output changes.
- Deploy the app before the worker: the old app would render converted Word Blobs as raw bytes. Roll back in reverse (worker, then app), then clear converted Word Blobs (see the design's Rollout section).
- Authors are not told when a Word file was only partly converted or stayed a download; the docs page says what is left out.
- Further formats can be added to `CONVERTIBLE_EXTENSIONS`, each with a converter.
