# Publish record as source of truth for site status

Site publish status — what the dashboard displays — is derived from the latest `Publish` record, not from aggregating `Blob.syncStatus` values or making live GitHub API calls. A `Publish` record spans the full publishing lifecycle: from the moment a publish is triggered until the Cloudflare Worker finishes processing the last changed file.

A companion `PublishFile` table tracks the processing status of each file touched in a publish. The Cloudflare Worker — which already has a direct Postgres write connection to update blob metadata — updates `PublishFile` rows as it processes files, and transitions the parent `Publish` to `completed` or `failed` when no `PublishFile` rows remain in a non-terminal state.

## Why this replaces blob-level status tracking

Previously, site status was computed two ways:

- **Blob aggregation**: all blobs queried, their `syncStatus` values aggregated into a site-level state
- **Live GitHub tree poll**: for GitHub-connected sites, the GitHub tree API was called on every 10-second poll to compare the stored tree SHA against the current one, producing a SUCCESS or OUTDATED result

The GitHub poll caused a visible flicker (SUCCESS → OUTDATED → SUCCESS) because the comparison raced against the Inngest step that writes the updated tree SHA back to the database. It also consumed GitHub API quota on every open dashboard tab.

Blob-level status (`UPLOADING`, `PROCESSING`, `SUCCESS`, `ERROR`) was designed to track transient processing state, but it conflated two different concerns: the current processing state of a file during a publish, and the permanent metadata of that file. This made it impossible to show historical error information — a file's `syncError` was overwritten on every publish.

## What replaced it

- `Publish` has a status (`in_progress`, `completed`, `failed`, `cancelled`) and is the single source of truth for what the dashboard shows
- `PublishFile` records per-file outcomes for the changed files in each publish; errors are permanently associated with the publish that caused them, not overwritten
- `Blob.syncStatus` and `Blob.syncError` are removed (see ADR-0004)
- The Cloudflare Worker's existing Postgres connection is used to update `PublishFile` rows and close the `Publish` — no new coupling

## Considered options

**Keep blob aggregation + live GitHub poll** — no schema change, but the flicker remains, GitHub API calls continue on every 10-second poll, and historical error information is permanently lost on the next successful publish.

**Derive OUTDATED from a stored `lastGhPushAt` field** — event-driven, no live poll, preserves the OUTDATED state. Rejected because manual sync was dropped at the same time (see ADR-0002), making OUTDATED irrelevant for the remaining sites (all GitHub sites are now always auto-syncing via webhook).

**Mark Publish as completed after upload to R2, not after CF processing** — simpler lifecycle; no CF worker feedback needed. Rejected because it would mark a publish "completed" while potentially hundreds of files are still queued for processing, and CF processing errors (markdown parse failures, invalid frontmatter) would not be associated with the publish that caused them.
