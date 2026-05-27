# Direct upload publish lifecycle

Direct upload clients (CLI, Obsidian plugin, dashboard) call the existing sync/files endpoint as they do today. The server creates the `Publish` and `PublishFile` records internally as part of handling that request, embeds the `publishId` in the R2 object keys when generating presigned URLs, and returns the `publishId` alongside the presigned URLs in the response.

The client uploads files directly to R2 using the presigned URLs — unchanged from the current behaviour. The `publishId` in the response is available for the CLI to display or use for status polling; no further calls are required.

There is no separate create endpoint and no finalize step. This is a non-breaking change for the CLI and Obsidian plugin.

## Why no finalize step

A finalize endpoint was considered to give the server a clear signal that all uploads had completed. It is unnecessary for two reasons:

First, `Publish` has no stored status field — status is derived from `PublishFile` rows on read (see ADR-0001). There is nothing to "close."

Second, the Cloudflare Worker is R2-event-driven. When a file lands in R2, R2 fires an event that triggers the Worker almost immediately. The Worker transitions the `PublishFile` from `uploading` to `success` or `error` in that same operation. There is no gap between "file arrived in R2" and "Worker processing it" that a finalize call could usefully bridge.
