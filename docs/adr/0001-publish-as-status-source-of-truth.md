# Publish record as source of truth for site status

Site publish status — what the dashboard displays — is derived from the `PublishFile` rows belonging to the latest `Publish` record, not from aggregating `Blob.syncStatus` values or making live GitHub API calls. `Publish` has no stored status field; status is computed on read from the aggregate state of its `PublishFile` rows.

A companion `PublishFile` table tracks the per-file outcome of each file touched in a publish. The Cloudflare Worker — which already has a direct Postgres write connection — updates `PublishFile` rows as it processes files. The Cloudflare Worker does not write to the `Publish` table.

## Why this replaces blob-level status tracking

Previously, site status was computed two ways:

- **Blob aggregation**: all blobs queried, their `syncStatus` values aggregated into a site-level state
- **Live GitHub tree poll**: for GitHub-connected sites, the GitHub tree API was called on every 10-second poll to compare the stored tree SHA against the current one, producing a SUCCESS or OUTDATED result

The GitHub poll caused a visible flicker (SUCCESS → OUTDATED → SUCCESS) because the comparison raced against the Inngest step that writes the updated tree SHA back to the database. It also consumed GitHub API quota on every open dashboard tab.

Blob-level status (`UPLOADING`, `PROCESSING`, `SUCCESS`, `ERROR`) was designed to track transient processing state, but it conflated two different concerns: the current processing state of a file during a publish, and the permanent metadata of that file. This made it impossible to show historical error information — a file's `syncError` was overwritten on every publish.

## What replaced it

- `Publish` has no stored status field. Dashboard status is derived from the latest `Publish`'s `PublishFile` rows: any file in `uploading` → PENDING; all terminal, none errored → SUCCESS; all terminal, at least one errored → ERROR; no `PublishFile` rows yet → PENDING.
- `Publish` stores `gitCommitSha` and `gitCommitMessage` (both nullable) for GitHub webhook publishes, populated from the push event payload. The commit URL is constructed on the frontend from the site's repo URL and the SHA — not stored. This gives a Vercel-style commit reference in the publish history without any live GitHub API calls. The previous mechanism (storing a tree SHA for OUTDATED comparison) is removed.
- `PublishFile` records per-file outcomes for the changed files in each publish; errors are permanently associated with the publish that caused them, not overwritten
- `Blob.syncStatus` and `Blob.syncError` are removed (see ADR-0004)
- The Cloudflare Worker's existing Postgres connection is used to update `PublishFile` rows only — no writes to `Publish`

## PublishFile state machine

Each `PublishFile` row has two orthogonal fields:

**`changeType`** — what kind of change this file underwent in the publish. Set once at publish creation time, never changes:
- `added`: file is new; no prior `Blob` record existed
- `updated`: file changed; a prior `Blob` existed with a different SHA
- `deleted`: file was removed

**`status`** — how processing went:
- `uploading`: initial state for `added`/`updated` files. The file is expected in R2 but the Cloudflare Worker has not yet processed it.
- `success`: processing completed successfully. For `added`/`updated` files this is set by the CF Worker; for `deleted` files it is set synchronously by Inngest (GitHub path) or the server (direct upload path).
- `error`: processing failed, with a reason stored in the `error` field.

Deleted files skip the `uploading` state entirely — their `status` is written directly to `success` or `error` by whoever handles the deletion (Inngest or server), with no CF Worker involvement.

The aggregate file counts (`filesAdded`, `filesUpdated`, `filesDeleted`) are derived from `PublishFile` rows rather than stored on `Publish`. `filesUnchanged` is dropped entirely — unchanged files have no `PublishFile` rows and the count is not worth storing.

A `processing` intermediate state was considered and rejected. Once the CF Worker starts on a file it completes immediately — there is no observable window between "Worker started" and "Worker finished" that warrants a separate state.

Known limitation: `uploading` does not distinguish between an upload genuinely in flight and an upload the client abandoned. A `PublishFile` that remains in `uploading` past its `presignedUrlExpiresAt` is treated as abandoned and marked `error` by a background cleanup job.

## Considered options

## Error recovery

`Publish` and `PublishFile` records are never mutated after the fact to reflect a retry. If files need to be reprocessed — whether due to a platform bug or a user re-triggering a sync — the correct mechanism is to create a new `Publish` record. The failed publish remains in history as a permanent record of what went wrong; the retry is a distinct event with its own `Publish` and `PublishFile` rows.

Mechanically, reprocessing a file means re-uploading the R2 object (the files remain in R2 after a failed publish). This re-triggers the R2 event and the Cloudflare Worker reprocesses the file under the new publish.

For v1, reprocessing is an operator-only capability (a script). A user-facing "force resync" button for GitHub-connected sites is a post-v1 enhancement.

## Considered options

**Keep blob aggregation + live GitHub poll** — no schema change, but the flicker remains, GitHub API calls continue on every 10-second poll, and historical error information is permanently lost on the next successful publish.

**Derive OUTDATED from a stored `lastGhPushAt` field** — event-driven, no live poll, preserves the OUTDATED state. Rejected because manual sync was dropped at the same time (see ADR-0002), making OUTDATED irrelevant for the remaining sites (all GitHub sites are now always auto-syncing via webhook).

**Mark Publish as completed after upload to R2, not after CF processing** — simpler lifecycle; no CF worker feedback needed. Rejected because it would mark a publish "completed" while potentially hundreds of files are still queued for processing, and CF processing errors (markdown parse failures, invalid frontmatter) would not be associated with the publish that caused them.
