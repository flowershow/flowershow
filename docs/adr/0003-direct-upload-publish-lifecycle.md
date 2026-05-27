# Explicit create + finalize lifecycle for direct upload publishes

Direct upload clients (CLI, Obsidian plugin, dashboard) now follow an explicit three-step protocol:

1. **Create**: call `POST /sites/:id/publishes` → server creates a `Publish` record and returns a `publishId`
2. **Upload**: call the existing sync/files endpoint with `publishId` → server creates `PublishFile` records in `uploading` status and returns presigned URLs; client uploads files directly to R2
3. **Finalize**: call `PATCH /sites/:id/publishes/:publishId/finalize` → signals that all uploads are complete

Finalize marks the end of the *upload phase*, not the end of the publish. The `Publish` stays `in_progress` after finalize — the Cloudflare Worker drives it to `completed` or `failed` as it processes each file (see ADR-0001). The `Publish` is only truly done when the last `PublishFile` reaches a terminal state.

This is a breaking change to the CLI and Obsidian plugin APIs, requiring coordinated releases.

## Why explicit finalize rather than inferring completion

Previously, there was no server-side record of a publish starting or completing for direct upload paths. The only signal was blob states transitioning from `UPLOADING → PROCESSING → SUCCESS`, which made it impossible to distinguish "publish in progress" from "publish abandoned mid-upload."

Inferring completion lazily from blob states was rejected for two reasons: it provides no reliable "uploads done" signal independent of async Cloudflare Worker processing, and it leaves the publish history ambiguous for clients that crash mid-upload. The explicit finalize call gives the server a clear boundary between the upload phase and the processing phase.
