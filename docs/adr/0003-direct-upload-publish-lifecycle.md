# Direct upload publish lifecycle

Direct upload clients (CLI, Obsidian plugin, dashboard) call the existing sync/files endpoint as they do today. The server creates the `Publish` and `PublishFile` records internally as part of handling that request, embeds the `publishId` in the R2 object's custom metadata (`x-amz-meta-publish-id`) when generating presigned URLs, and returns the `publishId` alongside the presigned URLs in the response.

The R2 object key remains canonical: `{siteId}/main/raw/{path}`. Every publish of the same file overwrites the same key. The `publishId` travels as a signed metadata header, not as part of the key.

The client uploads files directly to R2 using the presigned URLs. Because the metadata header is signed into the presigned URL, the client **must** include `x-amz-meta-publish-id: {publishId}` in the PUT request — R2 will reject the upload with 403 if the header is absent or mismatched. The `publishId` is available in the sync/files response for this purpose.

There is no separate create endpoint and no finalize step.

## Why metadata, not the key

Embedding the publishId in the key (`…/raw/{publishId}/{path}`) was the initial approach, but it creates a separate R2 "folder" per publish. Each publish only uploads the files that changed, so files from different publishes end up scattered across different key prefixes. The serving layer — and any code using `fetchFile` — expects all site files under a single canonical prefix (`{siteId}/main/raw/{path}`), making the key-based approach unworkable without an additional copy-to-canonical step after processing.

Using object metadata keeps the key canonical and lets the Cloudflare Worker retrieve the publishId by doing a lightweight HEAD request on the object before dispatching to the appropriate processor.

## How the Cloudflare Worker reads publishId

When the Worker receives an R2 event, it performs a HEAD request on the canonical object key and reads `customMetadata['publish-id']` (R2 native) or `Metadata['publish-id']` (S3/dev). This is a single cheap call with no body transfer. The publishId is then threaded into the file processor to update the correct `PublishFile` row.

If the metadata is absent (legacy objects uploaded before this scheme), `publishId` is null and the `updatePublishFile` call is a no-op — the cleanup job will eventually mark those `PublishFile` rows as `error`.

## Backward compatibility with legacy clients

Older versions of the CLI and Obsidian plugin that predate this scheme are not broken. The minimum version check on the sync/files endpoint is **not** bumped for this change.

When the server detects a legacy client (version header below the threshold, or absent), it takes a different path:

1. Creates a `Publish` record with `legacy = true`.
2. Does **not** create any `PublishFile` rows.
3. Generates presigned URLs **without** signing in the `x-amz-meta-publish-id` header condition — R2 will accept the PUT regardless of whether the header is present.

The Cloudflare Worker receives the R2 event, performs the HEAD request, finds no `publish-id` in the object metadata, and falls through to its existing no-op path: it skips the `updatePublishFile` call and writes directly to `Blob` as it did before this scheme was introduced.

The result: the legacy client's files are processed and served correctly. The `Publish` record appears in history but has no `PublishFile` rows, which the dashboard renders as a limited entry with a prompt to upgrade (see ADR-0001). There are no false errors.

The `legacy` column on `Publish` is temporary. Once legacy client usage drops to negligible levels it will be removed along with the legacy branch in the sync/files handler.

## Why no finalize step

A finalize endpoint was considered to give the server a clear signal that all uploads had completed. It is unnecessary for two reasons:

First, `Publish` has no stored status field — status is derived from `PublishFile` rows on read (see ADR-0001). There is nothing to "close."

Second, the Cloudflare Worker is R2-event-driven. When a file lands in R2, R2 fires an event that triggers the Worker almost immediately. The Worker transitions the `PublishFile` from `uploading` to `success` or `error` in that same operation. There is no gap between "file arrived in R2" and "Worker processing it" that a finalize call could usefully bridge.
