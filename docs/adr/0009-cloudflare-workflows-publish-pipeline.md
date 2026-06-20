# ADR 009: Replace Inngest with Cloudflare Workflows for the Publish Pipeline

**Status:** Accepted
**Date:** 2026-06-13

## Context

The publish pipeline has two pain points:

**No explicit publish lifecycle.** Publish status is derived at read time by aggregating `PublishFile` rows. There is no moment when a publish is declared "done," making it impossible to reliably trigger downstream work (cache revalidation, webhooks, notifications) at completion.

**Inngest is only partially used.** Inngest orchestrates only the GitHub-connected-site path. All other paths (CLI, Obsidian, dashboard) go through API endpoints and use presigned R2 URLs with no Inngest involvement. Two separate systems for one conceptual pipeline, with an external vendor dependency.

### Current architecture

**GitHub path:** Webhook → Inngest `syncSite` → creates `Publish` and `PublishFile` records, uploads to R2 → R2 event → Queue consumer → processes file, updates Blob/Typesense/PublishFile.

**Presigned paths (CLI, Obsidian, dashboard):** Client calls `/sync` or `/files` → API creates `Publish` and `PublishFile` records, returns presigned R2 URLs → client uploads → R2 event → same Queue consumer as above.

**Completion detection:** `getSyncStatus` queries all `PublishFile` rows at read time and derives status — `PENDING` if any are `uploading`, `ERROR` if any are `error`, `SUCCESS` otherwise. No event fires when a publish finishes.

**Cleanup:** An Inngest cron marks abandoned `uploading` rows as `error` after their presigned URL TTL expires.

## Decision

Replace Inngest with **Cloudflare Workflows** as the durable orchestrator for every publish path. The Queue consumer retains its per-file processing role but loses all coordination responsibility.

### Roles

**`GitHubSyncWorkflow`** (GitHub path only)
Replaces Inngest's sync function. Creates the `Publish` record, diffs the GitHub tree against stored Blobs, creates all `PublishFile` records, starts `PublishFinalizerWorkflow`, then uploads files to R2.

**`PublishFinalizerWorkflow`** (all paths, `instanceId = publishId`)
Lifecycle owner for every publish. Polls the DB until all `PublishFile` rows for the publish are in a terminal state, then finalizes the `Publish` record and revalidates cache tags.

**Queue consumer** (all paths)
Processes a single file per message: upserts the Blob record, updates Typesense, and (when `publishId` is present in R2 object metadata) flips the `PublishFile` to `success` or `error`. No coordination — it does not signal the finalizer.

### Unified publish step order

Every publish, regardless of source, follows this sequence:

1. Create `Publish` record.
2. Prepare a list of files to upsert and files to delete.
3. Create `PublishFile` rows (`uploading`) for all files to upsert.
4. Delete files from R2 synchronously; create `PublishFile` rows with terminal status (`success`/`error`) for each deletion.
5. Start `PublishFinalizerWorkflow`.
6. **GitHub path:** upload files to R2 with `publishId` in object metadata. **Presigned paths:** return presigned R2 PUT URLs to the client.

The finalizer starts for every publish.

### Per-path implementation

**GitHub path** — the worker `/sync` endpoint handles supersession and creates `GitHubSyncWorkflow`. The workflow owns steps 1–7:

1. Create `Publish` record.
2. Fetch site config (includes/excludes) from GitHub.
3. Fetch GitHub repo tree; diff against stored Blobs.
4. Create `PublishFile` rows (`uploading`) for all files to upsert.
5. In batches: delete files from R2; create terminal `PublishFile` rows for each deletion.
6. Start `PublishFinalizerWorkflow`.
7. In batches: download from GitHub, upload to R2 with `publishId` in object metadata.

**Presigned paths** — the Next.js API routes (`/sync`, `/files`) own the sequence:

1. Create `Publish` record; handle supersession.
2. Create `PublishFile` rows (`uploading`, `presignedUrlExpiresAt` set) for files to upload.
3. Delete removed files from R2; create terminal `PublishFile` rows for each deletion.
4. Start `PublishFinalizerWorkflow` (via worker `/start-finalizer` endpoint).
5. Return presigned R2 PUT URLs to the client.

### `PublishFinalizerWorkflow`

Polls every 10 seconds:

```js
while (true) {
  const done = await step.do('check-completion', async () => {
    const [{ count }] = await sql`
      SELECT COUNT(*) FROM "PublishFile"
      WHERE publish_id = ${publishId} AND status = 'uploading'
    `;
    return Number(count) === 0;
  });
  if (done) break;
  await step.sleep('poll-interval', '10s');
}
```

`step.sleep` does not count toward the 10,000-step limit. At 10-second intervals, a 1-hour timeout consumes at most 360 `step.do` calls.

**On completion (count = 0):**

Determine terminal `Publish` status:

- All `PublishFile` rows are `canceled` → `status = 'superseded'` (the publish was fully claimed by a newer one).
- Any `error` rows (ignoring `canceled`) → `status = 'error'`.
- Otherwise → `status = 'success'`.

Then set `completedAt = NOW()` and revalidate Next.js cache tags for the site.

**On 1-hour timeout:**

Mark remaining `uploading` `PublishFile` rows as `expired`. Set `Publish.status = 'error'`, `completedAt = NOW()`.

`Publish.status` transitions directly from `in_progress` to a terminal state — there is no intermediate `finalizing` status.

### Supersession

**Path-level `PublishFile` cancellation** runs on every new publish regardless of source. Any in-flight `PublishFile` rows from prior publishes for the same site that share a path with the new publish are canceled:

```sql
UPDATE "PublishFile" pf SET status = 'canceled'
FROM "Publish" p
WHERE pf.publish_id = p.id
  AND p.site_id = $siteId
  AND pf.path = ANY($newPaths)
  AND pf.status = 'uploading'
  AND pf.publish_id != $newPublishId;
```

**Finalizer termination** depends on the publish source:

- **GitHub `/sync`** and **Next.js `/sync`** — a full-site publish fully supersedes any prior in-progress publish for the same site. The previous `PublishFinalizerWorkflow` is terminated explicitly (`instance.terminate()`). For GitHub, the previous `GitHubSyncWorkflow` is also terminated.
- **Next.js `/files`** — operates on a specific subset of files; concurrent `/files` publishes may touch completely different paths. The previous `PublishFinalizerWorkflow` is **not** terminated. It continues polling and exits naturally once its remaining (non-canceled) `PublishFile` rows reach a terminal state.

The Queue consumer is robust to at-least-once delivery: if a message redelivers after its `PublishFile` was already set to a terminal state, the UPDATE is a no-op and the Blob upsert is idempotent (`ON CONFLICT DO UPDATE`).

### Blob lifecycle — queue consumer owns create and delete

**Creation:** Blob records are created lazily by the queue consumer, not eagerly by the API routes or workflows. Creating them before the file lands in R2 produces ghost records when uploads are abandoned. The consumer is the only actor that has seen the file content.

When a `PutObject` event arrives, the consumer:
1. Derives `path`, `extension`, and `appPath` from the R2 object key.
2. Reads file content (already needed for markdown/images; an extra GET for other types).
3. Computes `sha` as a git blob SHA (`SHA1("blob {size}\0{content}")`), matching the GitHub tree API and CLI format.
4. For markdown: parses frontmatter → sets `metadata` and `permalink`; removes from R2 and DB if `publish: false`.
5. For images: extracts pixel dimensions → sets `width` and `height`.
6. Upserts the Blob (`INSERT ... ON CONFLICT (site_id, path) DO UPDATE`).

**Deletion:** Blob records and Typesense documents are deleted lazily when a `DeleteObject` event arrives. The consumer deletes the Typesense document by `blob.id`, then deletes the `Blob` row. The workflows and API routes only delete from R2 — no direct DB or Typesense writes for deletions.

This requires R2 buckets to emit `DeleteObject` events to the same queue as `PutObject` events (configured in the Cloudflare dashboard under R2 → Event notifications).

### Anonymous publishes

The anonymous publish path (`/api/sites/publish-anon`) is updated to follow the same presigned pattern: create a `Publish` record (`source = 'anonymous'`), create `PublishFile` rows, start `PublishFinalizerWorkflow`, embed `publishId` in presigned URL metadata. This fixes the existing bug where anonymous publishes are not tracked in publish history.

## Consequences

**Gained:**
- Explicit publish lifecycle: `Publish.status` and `completedAt` are set at the moment a publish finishes, not derived on read.
- Post-publish hooks are trivial to add: new `step.do()` calls in `PublishFinalizerWorkflow` after finalization.
- The 1-hour polling timeout replaces the `cleanupExpiredPublishFiles` cron — each publish gets its own deadline.
- Inngest removed as an external dependency.
- The entire publish pipeline lives in one Cloudflare project (Worker + Queues + Workflows + Cron Triggers).

**Added complexity:**
- Supersession must be implemented manually (Inngest handled `cancelOn` declaratively).
- Local dev requires a Workflows emulator alongside MinIO and the wrangler dev server.
- `GitHubSyncWorkflow` has a 10,000 `step.do()` limit. At batch size 20 this accommodates ~20k files per sync — sufficient, but the batch size should not be reduced without rechecking.
- For non-markdown/non-image file types the consumer performs one additional R2 GET per file to compute sha.

## Migration order

1. Update the data model: add `status` and `completedAt` to `Publish`; make status transitions explicit in existing code.
2. Introduce `PublishFinalizerWorkflow` for the **presigned paths only**: API routes create `Publish` + `PublishFile` records, start the workflow, return presigned URLs. Delivers explicit publish lifecycle for CLI/Obsidian publishes immediately.
3. Port GitHub sync into `GitHubSyncWorkflow`: create `Publish` record, diff, create `PublishFile` records, start finalizer, upload to R2. Remove Inngest sync function.
4. Move remaining Inngest crons to Cloudflare Cron Triggers. Remove Inngest. (Emails are sent directly from the Next.js app.)
