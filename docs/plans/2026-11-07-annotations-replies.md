# Annotations: replies and resolving (stream B)

Status: **Agreed 2026-11-07** (Rufus OK'd the sketch in chat). Bead `flowershow-1pr.11`, epic `flowershow-1pr`. Builds on [annotations v2 UX](2026-10-18-annotations-v2-ux.md) §6 (job stories) and amends [ADR 0015](../adr/0015-annotations-are-open-and-moderated-off-page.md).

## Why

Comments are one-way today. A reviewer can't answer the author, the author can't say "kept as is because…", and when an agent fixes a point the reviewer can't see what changed. Copy Google Docs threads (flat replies, one Resolve), cut down.

## Decisions

1. **Flat replies** under each comment. No nesting, no edit, no reactions ("+1" is a reply).
2. **Anyone who can comment can resolve or reopen** on the page (Rufus 2026-11-07). The panel shows "Resolved by <name>" (or "Resolved"). **Delete stays owner-only.** This amends ADR 0015's owner-only resolve.
3. **Author badge**: a reply posted with owner auth (owner cookie on the page, or the CLI/PAT token) is stored `byOwner = true` and shows an **Author** badge. Names are otherwise unverified, as today.
4. **Agents close the loop**: `fl annotations reply <id> -m "…"` and `fl annotations resolve <id…> -m "…"` (adds the message as an owner reply, then resolves). `pull` prints whole threads.
5. **Out of scope**: notifications, "new since last visit" markers, reactions, editing/deleting own replies, dashboard changes, MCP annotation tools (follow-up bead).

## Data model

- New `AnnotationReply { id, annotationId → Annotation (cascade delete), note, authorName?, byOwner Boolean @default(false), createdAt }`, index on `annotationId`. A separate table so existing rows and queries don't change.
- `Annotation.resolvedBy String?` (the name given when resolving; null = unknown/owner via bulk). Cleared on reopen.
- Limits (in `ANNOTATION_LIMITS`): reply note = note limit (2000), name 60, **100 replies per comment**.

## API (contract first, `packages/api-contract`)

- `Annotation` DTO gains `replies: AnnotationReply[]` (oldest first) and `resolvedBy: string | null`. `AnnotationReply = { id, note, authorName, byOwner, createdAt }`.
- `POST /api/sites/id/{siteId}/annotations/{annotationId}/replies` (`createAnnotationReply`, tag Annotations): body `{ note, authorName? }` → `201 { reply }`. Same gate as creating a comment (JSON only, body size cap, `hasSiteAccess`, page exists and annotations on for the comment's page) **or** owner auth (Bearer PAT / owner cookie via `authorizeOwner`), which also sets `byOwner`. 409 at the reply cap. 404 if the annotation isn't on this site.
- `POST /api/sites/id/{siteId}/annotations/{annotationId}/status` (`setAnnotationStatus`): body `{ status: 'open' | 'resolved', authorName? }` → `{ annotation }`. Same gate as replies. Resolving sets `resolvedAt` and `resolvedBy` (the given name, or null); reopening clears both.
- Owner bulk route unchanged (resolve/reopen/delete), except bulk reopen also clears `resolvedBy`.
- GET list includes replies (one `include`, ordered by `createdAt`).
- Analytics: `annotation_reply_created`, `annotation_status_changed` with `$process_person_profile: false`, as for `annotation_created`.

## Page UI (`components/public/annotations/`)

- Each comment in the panel shows its replies below the note: author (medium weight), **Author** badge when `byOwner`, relative time, text. Reply text indented under a hairline, same type scale as notes.
- Actions row under each open comment for everyone: **Reply** · **Resolve**. Owner still also sees **Delete**. Resolved comments show "Resolved by Maya" (or "Resolved") and **Reopen**.
- **Reply** opens an inline textarea (autofocus, ⌘/Ctrl+Enter posts, Escape cancels) with the remembered name ("Replying as …· change", same as the composer). Post appends the reply in place.
- Resolve passes the remembered name. A resolved comment moves to the **Resolved** group (existing behaviour); its highlight goes.
- Phone sheet: same, no special casing beyond tap targets.

## CLI (`apps/cli`, Go)

- `fl annotations reply <id> -m "text"`: posts as owner (PAT).
- `fl annotations resolve <ids…> [-m "text"]`: with `-m`, posts the reply to each id first, then resolves via bulk.
- `pull` (markdown and JSON): each annotation includes its replies (author, Author flag, time, text) inside the same `<untrusted-annotation>` wrapper; replies marked `byOwner` are still shown as data. Show `resolvedBy` when present.
- README / docs updated; CLI CHANGELOG entry.

## Docs and changelog

- `content/flowershow-app/docs/reference/annotations.md`: new "Replying and resolving" section; update "Resolving and deleting" (anyone resolves, owner deletes); CLI commands.
- ADR 0015: append an amendment note (resolve opened up 2026-11-07).
- Changelog entry: "Reply to comments and resolve them on the page", with the panel polish (#1527) as a bullet. Screenshot from a live `fl` test site.

## Build order and acceptance

1. **Backend** (one PR or the first commits of one): Prisma model + migration, contract schemas/routes, two new routes, DTO/list changes, bulk reopen clears `resolvedBy`, unit tests for routes (gate, owner flag, caps, cross-site id rejected).
2. **Page UI** and **CLI** in parallel on top of 1. Unit tests for the panel (reply posts and appears; resolve moves to Resolved with name; Author badge) and Go tests for `reply` / `resolve -m` / pull output.
3. e2e: a visitor replies and resolves on the test page; reopen works.
4. Docs, ADR note, changelog with screenshot. One PR; CI green; verify on production with the `fs-annotations-polish-test` site after merge.

Security: replies and `resolvedBy` are untrusted text, rendered as text only, and wrapped in `pull` output like notes. Anyone with page access can resolve/reopen (by design, reversible); delete remains owner-only. The annotation must belong to `siteId` and its page must be open, checked on every write.
