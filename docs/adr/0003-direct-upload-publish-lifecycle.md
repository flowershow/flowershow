# Two-step direct upload lifecycle

Direct upload clients (CLI, Obsidian plugin, dashboard) follow a two-step protocol:

1. **Create**: call `POST /sites/:id/publishes` → server creates a `Publish` record and returns a `publishId`
2. **Upload**: call the existing sync/files endpoint with `publishId` → server creates `PublishFile` records in `uploading` status, embeds `publishId` in the R2 object key when generating presigned URLs, and returns those URLs; client uploads files directly to R2

There is no finalize step. The Cloudflare Worker is R2-event-driven — when a file lands in R2, R2 fires an event that triggers the Worker, which processes the file and writes the `PublishFile` result. No client callback is needed to signal that uploads are complete.

The create step is a breaking change for the CLI and Obsidian plugin, which currently call sync/files without a `publishId`. Coordinated releases are required.

## Why no finalize step

A finalize endpoint was considered to give the server a clear signal that all uploads had completed. It is unnecessary for two reasons:

First, `Publish` has no stored status field — status is derived from `PublishFile` rows on read (see ADR-0001). There is nothing to "close."

Second, the Cloudflare Worker is R2-event-driven. When a file lands in R2, R2 fires an event that triggers the Worker almost immediately. The Worker transitions the `PublishFile` from `uploading` to `success` or `error` in that same operation. There is no gap between "file arrived in R2" and "Worker processing it" that a finalize call could usefully bridge.

## Why the create step is still required

The `publishId` must be known before calling sync/files so the server can embed it in the R2 object keys when generating presigned URLs. The Cloudflare Worker extracts `publishId` from the object key when it processes a file, allowing it to locate the correct `PublishFile` row to update. Without an explicit create step, the server could generate a `publishId` inside sync/files and return it alongside the presigned URLs — but this would conflate two distinct operations (registering a publish intent and uploading files) into a single call.
