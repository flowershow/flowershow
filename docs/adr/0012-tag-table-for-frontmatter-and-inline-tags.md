# Dedicated Tag table for frontmatter and inline tags

To support Obsidian-style tags — declared in frontmatter (`tags`/`tag`) or inline in the body as `#tag` — we persist them in a dedicated `Tag` table `(siteId, blobId, tag, source)`, written by the Cloudflare worker at publish time, exactly mirroring the existing `Link` table (ADR-0010). This gives clean, indexed SQL for the `/tags/{tag}` pages, the `/tags` index, and per-tag counts, and makes the union of frontmatter and inline tags have a single canonical home.

## Considered Options

- **Merged array in `Blob.metadata` (JSONB).** Rejected as the canonical store: tag pages and counts would scan every blob's JSONB (needing a GIN index), and it keeps two divergent code paths (Bases reading metadata, navigation reading something else). The `Link`-table precedent already exists for exactly this "extract-at-publish, query-across-site" shape.

## Consequences

- The "what is a tag / are two tags equal" logic (frontmatter normalization + inline `#tag` grammar + case-folded, nested-aware matching) moves into a shared module in `packages/core`, imported by the worker, Bases, and the renderer, so the three can't drift.
- Bases' `hasTag`/`tags` switch from reading frontmatter-only `Blob.metadata` to the unified `Tag` table, so **inline body tags become queryable in Bases** for the first time (previously explicitly unsupported).
- Tag pages live at `/tags` and `/tags/{...}` as virtual fallbacks rendered only when no Blob exists at that path, so user content at those paths always wins.
