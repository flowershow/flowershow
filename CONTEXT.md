# Flowershow

Flowershow is a multitenant platform that turns markdown files into published websites. Users publish content through multiple channels; the platform tracks, serves, and updates that content on their behalf.

## Language

### Routing and URLs

**URL Slug**:
The URL path derived from a Page File's vault path. Always has a leading `/`. Spaces are encoded as `+` (not `%20`) — matching Obsidian Publish convention for readability. Stored in `blob.appPath`. The middleware normalises `+` → `%20` before Next.js routing; the page component prepends `/` to `params.slug` and reverses `%20` → `+` for DB lookups.
_Avoid_: URL path, encoded path, app path (appPath is the DB column name, not the concept)

**Page File**:
A vault file that the app renders inside the site layout. Current types: `.md`, `.mdx`, `.canvas`. Page files produce a URL slug (the file path with extension stripped and index/README normalised to `/`).
_Avoid_: Markdown file (canvas is not markdown), renderable file

**Raw Asset**:
Any vault file that is not a Page File (e.g. `.html`, `.jpg`, `.pdf`, everything else). Raw assets are served directly via `/api/raw/...` and produce a full absolute URL, not a slug.
_Avoid_: Asset (overloaded with the Blob term above), media file

### Sites and Content

**Site**:
A user's published website on Flowershow. May be backed by a GitHub repository (webhook-driven) or fed by direct file uploads from the CLI, Obsidian plugin, or dashboard.
_Avoid_: Project, blog, workspace

**Site Name**:
The human-facing label of a Site, stored raw in `blob`-adjacent column `Site.projectName` exactly as the user typed it (e.g. `"My Notes"`). Also the key used to look a Site up by name (`GET /api/sites/{username}/{projectname}`, CLI, Obsidian plugin) — matched **exactly and case-sensitively**, never slugified. Unique per user (exact), enforced by a DB unique index on `(userId, projectName)`. Validated only enough to guarantee a derivable, URL-safe Subdomain: at least one alphanumeric character, no `/` or control characters, bounded length. Passing the wrong casing/characters is a caller error → 404. See ADR-0011.
_Avoid_: Project name (that's the DB column, not the concept), slug, title (Site Title is a separate config field)

**Subdomain**:
The stable web address of a Site, `{subdomain}.flowershow.me`, and the only slugified name value. Derived once via `sanitizeSubdomain(`{name}-{username}`)` at creation and **frozen** thereafter — renaming a Site never changes its URL. Globally unique (`Site.subdomain @unique`); collision resolution (the `-N` suffix) lives here, not on the Site Name. `sanitizeSubdomain` is the single source of truth for the slug transform; there is no `sanitizeProjectName`. See ADR-0011.
_Avoid_: Slug, domain (Custom Domain is a separate field), host

**Blob**:
A single tracked file within a site, always reflecting its current state (path, SHA, processing status). Not a version snapshot — mutated in place on each publish.
_Avoid_: File record, asset

### Appearance

**Theme**:
A curated CSS file that changes a site's visual appearance by overriding CSS custom properties and, optionally, specific semantic class names. Themes stack on top of `default-theme.css` and beneath any user custom CSS. Managed by Flowershow; users select a theme from the dashboard.
_Avoid_: Skin, style, template, stylesheet

### Publishing

**Publish**:
A single end-to-end publishing event for a site. Records when it started (`startedAt`) and when it finished (`completedAt`). A Publish with `completedAt IS NULL` is in progress.
_Avoid_: Sync, sync run, deployment, deploy

**PublishFile**:
A per-file record within a Publish, tracking the outcome of one file operation (upsert or delete). Created upfront for all files before any work begins; status starts as `uploading` for files to be uploaded, or a terminal status for files already deleted. Terminal statuses: `success`, `error`, `expired`, `canceled`.
_Avoid_: File record, publish item

**Publish Source**:
The channel that triggered a publish. Canonical values: `github_webhook`, `cli`, `obsidian_plugin`, `dashboard_upload`.
_Avoid_: Sync source, publish method, trigger type, client type

**Publish Status**:
The user-facing state of a site, derived at read time from the latest Publish and its PublishFile records. Never stored as a column. Values: `UNPUBLISHED` (no publishes yet), `PENDING` (latest Publish has no `completedAt`), `SUCCESS` (latest Publish completed, no errors), `ERROR` (latest Publish completed with errors).
_Avoid_: Sync status, site status, deployment status

### Links and Graph

**Link**:
A directional connection from one Page File to another within the same site, extracted during publish. Stored in a dedicated `Link` table as `(sourceBlobId, targetPath, targetBlobId?, linkType)`. Three syntaxes are captured: wiki links (`[[Page]]`), embeds (`![[Page]]`), and internal CommonMark links (`[text](path)`). External URLs, anchors, and raw asset links are excluded. The `remark-wiki-link` parser already distinguishes `wikilink` and `embed` node types.
_Avoid_: Edge, connection, reference

**Backlink**:
A Link viewed from the perspective of its target — the set of pages that link *to* the current page. Derived by querying `Link WHERE targetBlobId = X`.
_Avoid_: Incoming link, reverse link

**Link Resolution**:
The post-publish step (run in the PublishFinalizerWorkflow) that walks all unresolved Links for a site, matches `targetPath` against current Blob records, and fills in `targetBlobId`. Also cleans up Links whose source or target Blob was deleted.
_Avoid_: Link indexing, link building

## Example dialogue

> **Dev**: A user says their site shows PENDING even though the publish finished an hour ago.
>
> **Domain expert**: What was the publish source — GitHub webhook or a direct upload?
>
> **Dev**: GitHub webhook. The publish completed but the UI is still showing PENDING.
>
> **Domain expert**: Check whether `completedAt` is set on the Publish record. If it is, the UI is reading stale data — Publish Status is derived at read time from `completedAt` and the PublishFile rows, so if those are right it's a frontend cache issue.
>
> **Dev**: Right. Previously we derived status from blob states and a live GitHub API call, which caused flicker. Now we check `completedAt` directly.
>
> **Domain expert**: Good. `completedAt IS NOT NULL` is the definitive signal that a publish finished. Nothing more authoritative than that.
