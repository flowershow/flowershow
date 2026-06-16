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

**Blob**:
A single tracked file within a site, always reflecting its current state (path, SHA, processing status). Not a version snapshot — mutated in place on each publish.
_Avoid_: File record, asset

### Appearance

**Theme**:
A curated CSS file that changes a site's visual appearance by overriding CSS custom properties and, optionally, specific semantic class names. Themes stack on top of `default-theme.css` and beneath any user custom CSS. Managed by Flowershow; users select a theme from the dashboard.
_Avoid_: Skin, style, template, stylesheet

### Publishing

**Publish**:
A single end-to-end publishing event for a site. Records when it started, what triggered it (publish source), its outcome (publish status), and any errors. The source of truth for a site's current status — not blob states, not live GitHub API calls.
_Avoid_: Sync, sync run, deployment, deploy

**Publish Source**:
The channel that triggered a publish. Canonical values: `github_webhook`, `cli`, `obsidian_plugin`, `dashboard_upload`.
_Avoid_: Sync source, publish method, trigger type, client type

**Publish Status**:
The current state of a site as shown to the user, derived from its latest Publish: `UNPUBLISHED` (no publishes yet), `PENDING` (publish in progress), `SUCCESS` (last publish completed), `ERROR` (last publish failed).
_Avoid_: Sync status, site status, deployment status

## Example dialogue

> **Dev**: A user says their site shows PENDING even though the publish finished an hour ago.
>
> **Domain expert**: What was the publish source — GitHub webhook or a direct upload?
>
> **Dev**: GitHub webhook. The publish completed but the status never updated to SUCCESS.
>
> **Domain expert**: So the Publish record has a completed status but the UI is still showing PENDING? That's a stale poll — the site's publish status is derived from the latest Publish record, so if the record is right, it's a frontend cache issue.
>
> **Dev**: Right. Previously we derived status from blob states and a live GitHub API call, which caused flicker. Now we read the Publish record directly.
>
> **Domain expert**: Good. The Publish is the definitive record of what happened. There's nothing more authoritative.
