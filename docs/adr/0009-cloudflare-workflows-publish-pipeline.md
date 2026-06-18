# ADR 008: Replace Inngest with Cloudflare Workflows for the Publish Pipeline

**Status:** Proposed  
**Date:** 2026-06-13

## Context

The publish pipeline has two pain points:

1. **No explicit publish lifecycle.** There is no "publish started" or "publish ended" event. Publish status is derived at read time by aggregating `PublishFile` rows in `getSyncStatus`. This makes it impossible to trigger downstream work (cache revalidation, webhooks, notifications) reliably at the moment a publish completes — the aggregation has to be polled or re-run on every status check.

2. **Inngest is only partially used.** Inngest is only involved in the GitHub-connected-site path (`syncSite`, `deleteSite`, cleanup crons). All other publish paths (CLI, Obsidian, anonymous) go through presigned R2 URLs with no Inngest involvement. This split ownership means two separate systems for what is conceptually one pipeline, with the added operational cost of an external vendor.

### Current architecture

**GitHub path** (webhook-driven):

1. GitHub push webhook hits `/api/webhooks/github-app`.
2. Webhook handler sends `site/sync` event to Inngest.
3. Inngest `syncSite` function: creates `Publish` record (source=`github_webhook`); diffs GitHub tree against stored Blobs; creates `PublishFile` rows (status=`uploading`) for files to add/update; uploads files to R2; creates terminal `PublishFile` rows for deletions.
4. Each R2 PUT triggers an R2 event notification → Cloudflare Queue.
5. Queue consumer (Worker): reads `publishId` from R2 object metadata; parses frontmatter, extracts image dimensions; upserts Blob record with metadata; indexes in Typesense; flips `PublishFile` to `success` (or `error`).

**Presigned paths** (CLI, Obsidian, dashboard):

1. Client calls `/api/sites/id/{siteId}/sync` or `/api/sites/id/{siteId}/files`.
2. API endpoint: creates `Publish` record (source=`cli`/`obsidian_plugin`/`dashboard_upload`); creates `PublishFile` rows (status=`uploading`, `presignedUrlExpiresAt` set); generates presigned R2 PUT URLs (1h TTL, `publishId` embedded in object metadata headers); returns URLs to client.
3. Client uploads files directly to R2 via presigned URLs.
4. Each R2 PUT triggers R2 event notification → same Cloudflare Queue → same Worker processing as step 5 above.

**Anonymous path**: same as presigned paths but no `Publish` or `PublishFile` records are created; the Worker processes files but has no publish to credit. _(Bug: publish history is not tracked for anonymous publishes.)_

**Completion detection**: `getSyncStatus` queries all `PublishFile` rows for the latest `Publish` at read time and derives status — `PENDING` if any are `uploading`, `ERROR` if any are `error`, `SUCCESS` otherwise. No event is fired when all rows reach a terminal state.

**Cleanup**: a 15-minute Inngest cron marks `uploading` `PublishFile` rows as `error` when their `presignedUrlExpiresAt` has passed (abandoned presigned uploads), and as `canceled` when the parent GitHub sync has been running for over 2 hours.

## Decision

Replace Inngest with **Cloudflare Workflows** as the durable orchestrator for every publish. One Workflow instance per `Publish` record, with `instanceId = publishId`.

The Queue consumer handles file processing for **all** paths unchanged — R2 event notifications fire on every PUT regardless of origin. The Workflow's role is lifecycle ownership only: it differs between paths solely in how files get into R2.

### Per-path workflow roles

**GitHub path** — the Workflow replaces `syncSite`:

1. Fetch GitHub tree, diff against stored Blobs.
2. In batches: download files from GitHub, upload to R2 (with `publishId` in object metadata), create `PublishFile` rows (status=`uploading`).
3. Handle deletions (remove from R2, Typesense, and DB; create terminal `PublishFile` rows immediately).
4. `step.waitForEvent('publish-complete', { timeout: '1h' })`.
5. On event received: revalidate cache tags, finalize publish (set `Publish.status`, `completedAt`).
6. On timeout: mark remaining `uploading` rows as `expired`, finalize as partial/error.

**Presigned paths** (CLI, Obsidian, dashboard) — the Workflow is a lifecycle owner only:

1. Create `Publish` record and `PublishFile` rows; return presigned URLs to the caller.
2. `step.waitForEvent('publish-complete', { timeout: '1h' })`.
3. On event received: finalize publish.
4. On timeout: mark remaining `uploading` rows as `expired`, finalize as partial/error.

### Blob creation — queue consumer owns the full lifecycle

Blob records are created **lazily** by the queue consumer, not eagerly by the API routes or Workflow.

**Rationale:** Creating Blobs eagerly (before the file lands in R2) produces ghost records when uploads are abandoned. The consumer is the only actor that has seen the file content, so it is the natural place to derive all Blob fields. The API routes and Workflow have no information that isn't also available to the consumer.

**How the consumer creates a Blob:**

When a file arrives in R2, the consumer:
1. Derives `path`, `extension`, and `appPath` (URL slug) from the R2 object key.
2. Reads the file content (GET). For markdown and image files this read already happens for other reasons; for all other file types it is an additional fetch.
3. Computes `sha` as a git blob SHA: `SHA1("blob {size}\0{content}")`. This matches the format used by the GitHub tree API and by the CLI, so the diff logic on both paths remains correct.
4. Derives `size` from the content length.
5. For markdown: parses frontmatter → sets `metadata` and `permalink`. Removes file from R2 and DB if `publish: false` in frontmatter.
6. For images: extracts pixel dimensions → sets `width` and `height`.
7. Upserts the Blob (`INSERT ... ON CONFLICT (site_id, path) DO UPDATE`).

**Consequences for API routes and Workflow:**

- `/sync` and `/files` routes no longer upsert Blobs. They create `Publish`, `PublishFile` records and presigned URLs only.
- The GitHub Workflow no longer upserts Blobs before uploading to R2. It also drops the error-fallback ghost Blob insert — if an R2 upload fails, no queue event fires and no Blob record is needed.
- `blobId` is removed from API responses (`/sync`, `/files`) — the Blob does not exist at response time. The CLI struct field was already unused.

**Anonymous path** — treated identically to the presigned paths. `/api/sites/publish-anon` will be updated to create a `Publish` record (source=`anonymous`) and `PublishFile` rows, start a Workflow instance, and embed `publishId` in presigned URL metadata — the same as the authenticated presigned flow. This also fixes the existing bug where anonymous publishes are not tracked in publish history at all.

### Publish completion signal (all tracked paths)

Multiple Worker instances will be running concurrently — Cloudflare spins up parallel consumer invocations to drain the queue backlog (controlled by `max_concurrency` in wrangler config; not pinned to 1). Two instances can therefore finish the last two files of a publish at the same time, both believing they might be "the last one."

The completion check uses an atomic UPDATE to serialize this:

```sql
-- only one concurrent worker wins this transition
UPDATE publish SET status = 'finalizing'
WHERE id = $publishId AND status = 'in_progress'
  AND NOT EXISTS (
    SELECT 1 FROM publish_file
    WHERE publish_id = $publishId AND status = 'uploading'
  );
```

The instance that transitions the row (`affected rows = 1`) sends a single `publish-complete` event to the Workflow. All others get `affected rows = 0` and stop. The Workflow receives exactly one event regardless of consumer concurrency.

Two properties make this safe:

1. **Within each worker, the flip precedes the check.** A worker always updates its `PublishFile` to `success` before running the completion UPDATE. So no worker ever runs the completion check against a count that includes its own file as still `uploading`. The last file to be flipped is always followed by a completion check against fully-terminal state — guaranteeing someone eventually sends the event.

2. **The completion UPDATE serializes concurrent winners.** If two workers flip their files before either runs the completion check, both will see 0 uploading rows and both will attempt the UPDATE. PostgreSQL locks the `publish` row on the first UPDATE; the second waits, then re-evaluates `WHERE status = 'in_progress'` — which is now false — and gets 0 rows affected.

This also holds under queue redelivery (at-least-once delivery): if a worker crashes after flipping `PublishFile` to success but before the UPDATE, the message redelivers, the UPDATE runs again, and `affected rows` is still 0 (the row is already `finalizing` or `completedAt` is set) — no duplicate event.

The same check covers both GitHub and presigned paths — the Queue consumer is always the last actor to touch each file.

### Concurrency

The 5-per-account concurrency limit in the current Inngest config was a workaround for Inngest platform constraints, not an intentional product requirement. It does not need to be carried over. Cloudflare Workflows instances are independent and can run without an artificial cap.

### Supersession (same file in two rapid publishes)

When a new publish claims a path, any older in-flight `PublishFile` rows for the same paths are canceled at publish creation time:

```sql
UPDATE publish_file pf SET status = 'canceled'
FROM publish p
WHERE pf.publish_id = p.id
  AND p.site_id = $siteId
  AND pf.path = ANY($newPaths)
  AND pf.status = 'uploading'
  AND pf.publish_id != $newPublishId;
```

For GitHub full-syncs the previous Workflow instance is also terminated explicitly (`instance.terminate()`), mirroring Inngest's `cancelOn` behaviour.

After canceling rows, the same completion check runs on each affected older publish — cancellation may have made it fully terminal, in which case it finalizes immediately as `superseded`.

The Queue consumer is robust to the underlying race: both queue events for the same file see the same R2 content (v2) and the same `publishId` (publish 2's). Publish 2's `PublishFile` is credited twice (idempotent). Publish 1's row was already canceled above. The final DB and R2 state is always correct regardless of event ordering, because the worker reads current R2 state rather than event payloads.

## Consequences

**Gained:**

- Explicit publish lifecycle: `publish.status` and `publish.completedAt` are set by the Workflow at the moment the publish finishes, not derived on read.
- Post-publish hooks are trivial: add `step.do()` calls after finalization (deploy webhooks, email, analytics).
- The `waitForEvent` timeout replaces the `cleanupExpiredPublishFiles` cron — abandoned publishes get a definite end per-publish rather than via a sweep.
- Inngest removed as an external dependency.
- The entire publish pipeline lives in one Cloudflare project (Worker + Queues + Workflows + Cron Triggers).
- Anonymous publishes gain full history tracking (bug fix); requires adding `anonymous` to the `PublishSource` enum.

**Lost / added complexity:**

- Must implement supersession / `cancelOn` manually — Inngest handled this declaratively.
- Local dev adds a Workflows emulator moving part alongside the existing MinIO + wrangler dev setup.
- Workflows caps ~1024 steps per instance. At batch size 20, this accommodates ~20k files per GitHub sync — sufficient, but needs a guard and the batch size should not be reduced without rechecking.
- Queue delivery is at-least-once; the completion check and finalization must remain idempotent (they are, by the atomic UPDATE guard).
- For non-markdown/non-image file types (PDFs, fonts, HTML, etc.) the consumer now performs one additional R2 GET per file to compute sha. These file types are typically a small fraction of a site's content.

**Emergent: headless upload**

Because the consumer owns the full Blob lifecycle and short-circuits gracefully when `publishId` is absent, any file PUT directly into R2 at the correct key (`{siteId}/main/raw/{path}`) for an existing site will be fully processed — Blob upserted, frontmatter parsed, Typesense indexed — without going through the API or Workflow. Cache revalidation and publish history are not triggered (those require a Workflow instance). This "headless upload" mode is a natural consequence of the design and could be formalised into a supported path for future clients or bulk import tooling.

## Migration order

1. Add `status` and `completedAt` to the `Publish` model; make status transitions explicit in the existing code. Standalone value, low risk.
2. Update the Queue consumer to run the completion check and send `publish-complete` (even before any Workflow exists — the event is a no-op until a Workflow listens).
3. Introduce a Workflow for the **presigned paths only**: create instance → `waitForEvent` → finalize. Small surface, immediately delivers explicit publish lifecycle for CLI/Obsidian publishes.
4. Port the GitHub sync into a Workflow (fetch, diff, upload, wait, finalize), implementing concurrency control as part of this step.
5. Move remaining Inngest crons to Cloudflare Cron Triggers, emails to a Queue. Remove Inngest.
