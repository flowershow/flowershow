# Blob as a pure content-metadata store

`Blob` no longer tracks processing status. The `syncStatus` and `syncError` fields are removed. A `Blob` record represents only the permanent metadata about a file: its path, SHA, size, URL slug, permalink, parsed metadata (title, description, etc.), and image dimensions.

Transient processing state — whether a file is uploading, processing, done, or errored — belongs to `PublishFile`, scoped to the publish that triggered the processing. This means error history is preserved across publishes (a file that fails in publish N and succeeds in publish N+1 retains both records), rather than being overwritten.

## Serving-layer readiness signal

The sitemap, RSS feed, and search index previously filtered content by `syncStatus = 'SUCCESS'`. With `syncStatus` removed, the readiness signal for markdown files is `metadata IS NOT NULL`. The Cloudflare Worker writes the parsed `metadata` JSON to the `Blob` only on successful processing — so a non-null `metadata` field reliably indicates the file has been fully processed and is safe to serve. Non-markdown files (images, attachments) are not gated by the sitemap or RSS feed, so no equivalent signal is needed for them.

## Why this separation

The previous design conflated two concerns on the same record:
- **What a file is** (path, SHA, content metadata) — permanent, updated on each publish
- **Where a file is in the current processing pipeline** — transient, meaningful only during a publish window

This made `Blob.syncStatus` ambiguous: if a file is in `PROCESSING` state, is that from the current publish or a stale state from a previous run? It also meant the `syncError` field could only hold the *most recent* error, silently discarding failure history from earlier publishes.

Moving processing state to `PublishFile` resolves both: `Blob` is always a stable representation of the file's current content, and `PublishFile` provides a per-publish, historically preserved record of what happened during processing.
