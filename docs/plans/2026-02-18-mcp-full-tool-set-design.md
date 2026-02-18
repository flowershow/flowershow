# Flowershow MCP — Full Tool Set Design

**Date:** 2026-02-18
**Status:** Approved

## Context

The Flowershow MCP server currently exposes a single tool (`list-sites`). This design
extends it to a full set of tools covering site management and in-memory markdown publishing.

The primary use-case is an AI agent that drafts a note in conversation, then publishes it
directly to an existing Flowershow site with a single tool call.

## Tool Set

| Tool | API | Description |
|------|-----|-------------|
| `list-sites` | `GET /api/sites` | List all sites (already implemented) |
| `get-site` | `GET /api/sites/id/{siteId}` | Get full details for one site |
| `get-user` | `GET /api/user` | Get current user profile |
| `create-site` | `POST /api/sites` | Create a new site |
| `delete-site` | `DELETE /api/sites/id/{siteId}` | Delete a site and all its content |
| `publish-note` | `POST /api/sites/id/{siteId}/files` + PUT presigned | Publish in-memory markdown, poll until live |

### Site name resolution

Tools that operate on a site accept `siteId` (not name). The AI is expected to call
`list-sites` first to resolve a human-readable site name to its ID. This keeps tools
composable and avoids hidden extra API calls inside tools.

## `publish-note` Implementation

**Parameters:** `siteId`, `path` (e.g. `notes/my-note.md`), `content` (markdown string)

**Internal flow:**

```
1. Encode content to UTF-8 buffer → compute size (bytes) + SHA-256 hex
2. POST /api/sites/id/{siteId}/files  [{path, size, sha}]
   → receive presigned upload URL + blobId
3. PUT content to presigned URL   (Content-Type: text/markdown)
4. Poll GET /api/sites/id/{siteId}/status every 2 s, up to 30 s
   → wait for status "complete" or "error"
5. On complete: return live URL  (<siteUrl>/<path-without-.md-extension>)
   On error/timeout: return isError with the error detail
```

Uses the **additive** `POST /files` endpoint (not `/sync`), so existing files on the site
are unaffected.

## File Structure

```
apps/flowershow-mcp/src/
  lib/
    api.ts          — extend with: getSite, getUser, createSite, deleteSite,
                      publishFiles, getSiteStatus, uploadToPresignedUrl
  tools/
    sites.ts        — extend with: get-site, create-site, delete-site
    user.ts         — new file: get-user
    notes.ts        — new file: publish-note
  app.ts            — register all new tools
```

## API Client Additions

```typescript
// New methods on FlowershowApi:
getSite(siteId: string): Promise<SiteDetail>
getUser(): Promise<User>
createSite(projectName: string, overwrite?: boolean): Promise<CreateSiteResponse>
deleteSite(siteId: string): Promise<DeleteSiteResponse>
publishFiles(siteId: string, files: FileMetadata[]): Promise<PublishFilesResponse>
getSiteStatus(siteId: string): Promise<StatusResponse>
uploadToPresignedUrl(url: string, content: string): Promise<void>
```

## Suggested Future API Additions

These are not needed for this iteration but would unlock additional tools:

- `GET /api/sites/id/{siteId}/files` — list all published files (enables a `list-notes` tool)
- `PATCH /api/sites/id/{siteId}` — update site settings (privacy, comments, search, custom domain)
