# ADR 010: Dedicated Link Table for Backlinks and Knowledge Graph

**Status:** Accepted
**Date:** 2026-06-22

## Context

Backlinks (pages that link to the current page) and a knowledge graph both require a queryable map of which page links to which other page. Without persisted link data, computing backlinks at render time would require scanning every other page's content — infeasible at scale.

Three link syntaxes are used in Flowershow vaults:

- **Wiki links** (`[[Page Name]]`) — Obsidian-style, always internal
- **Embeds** (`![[Page Name]]`) — Obsidian-style transclusion; treated as a connection by Obsidian's graph, stored here even though embed rendering is not yet implemented
- **CommonMark links** (`[text](path)`) — standard markdown, may be internal or external

External URLs, anchor-only links (`#heading`), and raw asset links are noise for a knowledge graph and are excluded. Only links that resolve to a Page File within the same site are stored.

Links are resolved at render time today using in-memory file path lists passed to remark plugins. Nothing is persisted. This is sufficient for rendering but cannot power backlinks without a full site scan.

## Decision

Introduce a `Link` table in Postgres. Each row represents a unique directional connection from one Page File to another within the same site.

### Schema

```prisma
enum LinkType {
  wikilink
  embed      // ![[Page Name]] — stored now, rendering added later
  commonmark
}

model Link {
  id           String   @id @default(cuid())
  siteId       String   @map("site_id")
  sourceBlobId String   @map("source_blob_id")
  targetPath   String   @map("target_path")   // raw string extracted from file
  targetBlobId String?  @map("target_blob_id") // null until resolution pass
  linkType     LinkType @map("link_type")

  site       Site  @relation(fields: [siteId], references: [id], onDelete: Cascade)
  sourceBlob Blob  @relation("outgoingLinks", fields: [sourceBlobId], references: [id], onDelete: Cascade)
  targetBlob Blob? @relation("incomingLinks", fields: [targetBlobId], references: [id], onDelete: SetNull)

  @@unique([sourceBlobId, targetPath])
  @@index([siteId])
  @@index([targetBlobId])
}
```

`targetBlobId` is nullable because extraction and resolution happen in separate phases (see below). `onDelete: Cascade` on the source ensures a deleted page loses its outgoing links. `onDelete: SetNull` on the target preserves the link record when a target page is deleted (so the resolution pass can clean it up cleanly rather than relying on cascade order).

Multiple links from the same source to the same target path are deduplicated: `@@unique([sourceBlobId, targetPath])` makes them idempotent.

### Two-phase write

**Phase 1 — Extraction (Queue consumer, per file)**

When the Queue consumer processes a `PutObject` event for a markdown file, it extracts all internal links and syncs the `Link` rows for that source blob:

```sql
-- 1. Remove links that no longer exist in the file
DELETE FROM "Link"
WHERE source_blob_id = $sourceBlobId AND target_path NOT IN ($newTargetPaths);

-- 2. Insert new links; on conflict, update only link_type — preserve existing target_blob_id
INSERT INTO "Link" (id, site_id, source_blob_id, target_path, link_type)
VALUES (...)
ON CONFLICT (source_blob_id, target_path) DO UPDATE SET link_type = EXCLUDED.link_type;
```

Deleting all rows and reinserting is avoided because it would unresolve links that haven't changed, creating a window where backlink queries return incorrect results. The diff approach means: removed links are deleted, unchanged links keep their resolved `targetBlobId`, and only genuinely new links start as NULL.

**Phase 2 — Resolution (`PublishFinalizerWorkflow`)**

After `PublishFinalizerWorkflow` sets `completedAt`, it runs a resolution pass over **all** `Link` rows with `targetBlobId IS NULL` for the site — not just those from the current publish:

1. Attempt to match `targetPath` against current `Blob` records (by `path`, `appPath`, and `permalink`).
2. Set `targetBlobId` where a match is found. Links that still can't be resolved are left with `targetBlobId = NULL` — they represent broken links and are kept.

The pass must be site-wide (not publish-scoped) because `onDelete: SetNull` can null-ify links from files not touched in the current publish — for example, when a target file is moved or deleted, all incoming links across the site lose their `targetBlobId` and need a re-resolution attempt.

**File moves are handled automatically.** When a file moves from one folder to another, the publish sees a delete of the old path and an add of the new path. The old Blob is deleted → `onDelete: SetNull` nullifies all incoming links → the finalizer re-resolves them. Wiki links (`[[pageABC]]`) use `findMatchingFilePath` with `shortestPossible` format (suffix matching), so they re-resolve correctly as long as the filename is unchanged. CommonMark links that hardcode a path (e.g. `[text](/folder/pageABC)`) will not re-resolve after a move — they remain with `targetBlobId = NULL` as broken links.

### Querying

**Backlinks for a page:**

```sql
SELECT source_blob.* FROM "Link"
JOIN "Blob" source_blob ON source_blob.id = link.source_blob_id
WHERE link.target_blob_id = $blobId
```

**Knowledge graph for a site (all edges):**

```sql
SELECT source_blob_id, target_blob_id, link_type FROM "Link"
WHERE site_id = $siteId AND target_blob_id IS NOT NULL
```

## Consequences

**Gained:**

- Backlinks are a simple indexed query: `WHERE targetBlobId = $blobId`.
- Knowledge graph edges are ready for a future graph view: `WHERE siteId = $siteId AND targetBlobId IS NOT NULL`.
- `linkType` column is stored now; the graph can use it to style wiki vs CommonMark edges differently without a migration.
- Resolution runs after each publish, keeping link data current as files are added, updated, or deleted.

**Added complexity:**

- The Queue consumer must parse link targets from markdown content (in addition to existing frontmatter and image dimension extraction).
- `PublishFinalizerWorkflow` gains a resolution step that queries and writes to the `Link` table.
- Links for a file must be deleted before re-extraction on update (not just upserted), to handle removed links.
