---
title: REST API
description: Complete reference for the Flowershow REST API — authenticate, manage sites, publish content, and integrate with GitHub.
---

The Flowershow REST API lets you manage sites and publish content programmatically. It is the same API used by the CLI and the Obsidian plugin.

**Base URL:** `https://flowershow.app`

---

## Authentication

Most endpoints require authentication. Two schemes are supported:

| Scheme | How to pass it | Used by |
|---|---|---|
| **Bearer token** | `Authorization: Bearer <token>` | CLI, Obsidian plugin, API clients |
| **Session cookie** | `next-auth.session-token` cookie | Browser / web UI only |

Bearer tokens come in two flavours:
- `fs_cli_*` — short-lived CLI tokens obtained via the Device Authorization flow below.
- `fs_pat_*` — Personal Access Tokens managed in your account settings.

---

## CLI Auth

These endpoints implement the [OAuth 2.0 Device Authorization Grant (RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628) so headless tools (CLI, plugins) can authenticate without a browser redirect.

### Start device authorization

```
POST /api/cli/device/authorize
```

No authentication required. Returns a device code and a short user code to display to the user.

**Response `200`**

```json
{
  "device_code": "...",
  "user_code": "ABCD-1234",
  "verification_uri": "https://flowershow.app/cli/verify",
  "verification_uri_complete": "https://flowershow.app/cli/verify?user_code=ABCD-1234",
  "expires_in": 900,
  "interval": 5
}
```

Show the user the `verification_uri` and `user_code`, then poll the token endpoint every `interval` seconds.

---

### Poll for access token

```
POST /api/cli/device/token
```

No authentication required. Poll this endpoint at the interval returned above until you get a token or an error.

**Request body**

```json
{
  "device_code": "<device_code from above>",
  "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
}
```

**Response `200`** — token issued

```json
{
  "access_token": "fs_cli_...",
  "token_type": "bearer",
  "expires_in": null
}
```

**Response `400`** — authorization still pending (keep polling) or the code has expired.

---

### Approve a device code (web UI)

```
POST /api/cli/authorize
```

Requires session cookie. Called by the web UI after the user enters the verification code.

**Request body**

```json
{ "user_code": "ABCD-1234" }
```

**Response `200`** — `{ "success": true }`

---

## User

### Get current user

```
GET /api/user
```

Accepts Bearer token **or** session cookie.

**Response `200`**

```json
{
  "id": "clxxx...",
  "name": "Ada Lovelace",
  "username": "ada",
  "email": "ada@example.com",
  "image": "https://...",
  "role": "USER"
}
```

---

### Revoke an access token

```
POST /api/tokens/revoke
```

Requires session cookie (cannot revoke a token using that same token).

**Request body**

```json
{ "token_id": "<token id>" }
```

**Response `200`** — `{ "success": true }`

---

## Sites

All Sites endpoints require a **Bearer token** unless noted.

### List sites

```
GET /api/sites
```

Returns all sites owned by the authenticated user.

**Response `200`**

```json
{
  "sites": [
    {
      "id": "site_...",
      "projectName": "my-notes",
      "url": "https://ada.flowershow.app/my-notes",
      "fileCount": 42,
      "updatedAt": "2026-02-19T10:00:00Z",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

### Create a site

```
POST /api/sites
```

Creates a new site for direct publishing (CLI, Obsidian plugin). The project name is sanitized to lowercase letters, numbers, hyphens, and underscores.

> **Note:** This endpoint is for direct file publishing only. To create a site connected to a GitHub repository, see [`POST /api/sites/github`](#create-a-github-connected-site) below.

**Request body**

```json
{
  "projectName": "my-notes",
  "overwrite": false
}
```

| Field | Type | Description |
|---|---|---|
| `projectName` | string | Desired site name (will be sanitized) |
| `overwrite` | boolean | If `true`, overwrites an existing site with the same name. Default `false`. |

**Response `201`** — site created
**Response `200`** — site overwritten (when `overwrite: true` and it already existed)

```json
{
  "site": {
    "id": "site_...",
    "projectName": "my-notes",
    "url": "https://ada.flowershow.app/my-notes",
    "userId": "clxxx...",
    "createdAt": "2026-02-19T10:00:00Z"
  }
}
```

**Error codes**

| Status | Meaning |
|---|---|
| `400` | Invalid project name, or your account has no username set |
| `409` | Site already exists and `overwrite` is `false` |

---

### Create a GitHub-connected site

```
POST /api/sites/github
```

Creates a new site linked to a GitHub repository via a GitHub App installation. An initial sync is triggered immediately — the site starts populating in the background. Use [`GET /api/sites/id/{siteId}/status`](#get-processing-status) to track progress.

**Prerequisites:** You must have already installed the Flowershow GitHub App on the repository and obtained the `installationId` from [`GET /api/github-app/installations`](#list-github-app-installations).

**Request body**

```json
{
  "ghRepository": "ada/my-notes",
  "ghBranch": "main",
  "installationId": "inst_...",
  "rootDir": "notes",
  "projectName": "my-notes"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `ghRepository` | string | Yes | Full repository name, e.g. `"owner/repo"` |
| `ghBranch` | string | Yes | Branch to sync from, e.g. `"main"` |
| `installationId` | string | Yes | ID of the GitHub App installation (from `GET /api/github-app/installations`) |
| `rootDir` | string | No | Subdirectory within the repo to use as the site root |
| `projectName` | string | No | Custom site name. Defaults to the repository name. A numeric suffix is added automatically if the name is already taken. |

**Response `201`**

```json
{
  "site": {
    "id": "site_...",
    "projectName": "my-notes",
    "url": "https://ada.flowershow.app/my-notes",
    "ghRepository": "ada/my-notes",
    "ghBranch": "main",
    "rootDir": null,
    "autoSync": true,
    "userId": "clxxx...",
    "createdAt": "2026-02-19T10:00:00Z"
  }
}
```

`autoSync` is always `true` for GitHub-connected sites — pushes to the branch automatically trigger a re-sync via the GitHub App webhook.

**Error codes**

| Status | Meaning |
|---|---|
| `400` | Validation error, branch not found in repository, or account has no username |
| `401` | Not authenticated |
| `404` | `installationId` not found or does not belong to you |

---

### Get site details

```
GET /api/sites/id/{siteId}
```

**Response `200`**

```json
{
  "site": {
    "id": "site_...",
    "projectName": "my-notes",
    "ghRepository": null,
    "ghBranch": null,
    "customDomain": null,
    "rootDir": null,
    "autoSync": false,
    "plan": "FREE",
    "privacyMode": "PUBLIC",
    "enableComments": false,
    "enableSearch": true,
    "syntaxMode": "obsidian",
    "url": "https://ada.flowershow.app/my-notes",
    "fileCount": 42,
    "totalSize": 1048576,
    "updatedAt": "2026-02-19T10:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

---

### Delete a site

```
DELETE /api/sites/id/{siteId}
```

Permanently deletes the site and all its content from storage and the database.

**Response `200`**

```json
{
  "success": true,
  "message": "Site deleted",
  "deletedFiles": 42
}
```

---

### Sync files

```
POST /api/sites/id/{siteId}/sync
```

The unified sync endpoint. Send a manifest of all local files (path, size, SHA-256 hash); the server compares against its stored state and returns presigned S3 upload URLs only for files that are new or have changed. Files present on the server but absent from the manifest are deleted.

**Request body**

```json
{
  "files": [
    { "path": "notes/hello.md", "size": 1234, "sha": "abc123..." },
    { "path": "assets/image.png", "size": 56789, "sha": "def456..." }
  ]
}
```

**Response `200`**

```json
{
  "toUpload": [
    { "path": "notes/hello.md", "uploadUrl": "https://...", "blobId": "...", "contentType": "text/markdown" }
  ],
  "toUpdate": [],
  "deleted": ["old-file.md"],
  "unchanged": ["assets/image.png"],
  "summary": { "toUpload": 1, "toUpdate": 0, "deleted": 1, "unchanged": 1 }
}
```

Upload each file in `toUpload` and `toUpdate` directly to its `uploadUrl` with a `PUT` request.

---

### Publish specific files

```
POST /api/sites/id/{siteId}/files
```

Additive publishing — returns upload URLs for the specified files without affecting any other files already on the site. Useful for incremental updates.

**Request body**

```json
{
  "files": [
    { "path": "notes/new-post.md", "size": 512, "sha": "aaa..." }
  ]
}
```

**Response `200`**

```json
{
  "files": [
    { "path": "notes/new-post.md", "uploadUrl": "https://...", "blobId": "...", "contentType": "text/markdown" }
  ]
}
```

---

### Delete specific files

```
DELETE /api/sites/id/{siteId}/files
```

Removes specific files from the site without touching others.

**Request body**

```json
{ "paths": ["notes/old-post.md", "assets/unused.png"] }
```

**Response `200`**

```json
{
  "deleted": ["notes/old-post.md"],
  "notFound": ["assets/unused.png"]
}
```

---

### Get processing status

```
GET /api/sites/id/{siteId}/status
```

Poll this endpoint after uploading files to track processing progress. Authentication is optional — unauthenticated responses contain less detail.

**Response `200`** (authenticated)

```json
{
  "siteId": "site_...",
  "status": "complete",
  "files": { "total": 10, "pending": 0, "success": 10, "failed": 0 },
  "blobs": [
    { "id": "...", "path": "notes/hello.md", "syncStatus": "SUCCESS", "syncError": null, "extension": "md" }
  ]
}
```

`status` is one of `pending` | `complete` | `error`. Poll until `complete` or `error`.

---

### Look up a site by username and project name

```
GET /api/sites/{username}/{projectname}
```

Resolves a site by its owner and project name. No authentication required for public sites.

**Response `200`** — returns `{ "site": { ...SiteDetail } }` or `{}` if the site exists but is inaccessible.

---

## Anonymous Publishing

Publish up to 5 files without an account. Anonymous sites expire after 7 days unless claimed.

### Publish anonymously

```
POST /api/sites/publish-anon
```

No authentication required.

**Request body**

```json
{
  "anonymousUserId": "a0b1c2d3-...",
  "files": [
    { "fileName": "index.md", "fileSize": 512, "sha": "abc..." }
  ]
}
```

`anonymousUserId` should be a stable UUID generated on the client (e.g. stored in `localStorage`). It is used to associate the site with the browser session for claiming later.

**Response `200`**

```json
{
  "siteId": "site_...",
  "projectName": "random-name-123",
  "files": [{ "fileName": "index.md", "uploadUrl": "https://..." }],
  "liveUrl": "https://flowershow.app/anon/random-name-123",
  "ownershipToken": "..."
}
```

Save the `ownershipToken` — you'll need it to claim the site.

---

### Claim an anonymous site

```
POST /api/sites/claim
```

Requires session cookie. Transfers an anonymous site to your account.

**Request body**

```json
{
  "siteId": "site_...",
  "ownershipToken": "..."
}
```

**Response `200`**

```json
{
  "success": true,
  "site": { "id": "site_...", "projectName": "random-name-123", "userId": "clxxx..." }
}
```

---

## Site Access

Endpoints for visitor access to password-protected sites.

### Log in to a password-protected site

```
POST /api/sites/id/{siteId}/login
```

Content type: `multipart/form-data`. Sets an httpOnly JWT cookie valid for 7 days on success.

**Form fields**

| Field | Type |
|---|---|
| `password` | string |

**Response `200`** — `{ "success": true }`
**Response `401`** — wrong password

---

### Log out of a password-protected site

```
POST /api/sites/id/{siteId}/logout
```

Clears the site access cookie.

**Response `200`** — `{ "success": true }`

---

## GitHub App

These endpoints manage GitHub App installations and are used by the web UI to enable GitHub-connected sites. They use **session cookie** authentication.

### List GitHub App installations

```
GET /api/github-app/installations
```

Returns all GitHub App installations for the authenticated user, including their accessible repositories.

**Response `200`**

```json
{
  "installations": [
    {
      "id": "inst_...",
      "installationId": "12345678",
      "accountLogin": "ada",
      "accountType": "User",
      "repositories": [
        { "id": "...", "repositoryId": "...", "name": "my-notes", "fullName": "ada/my-notes", "isPrivate": false }
      ],
      "suspendedAt": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### Generate GitHub App installation URL

```
POST /api/github-app/installation-url
```

Generates the URL to send a user to in order to install the Flowershow GitHub App. The URL includes a signed JWT state parameter for CSRF protection.

**Request body**

```json
{ "suggestedTargetId": "optional-github-user-or-org-id" }
```

**Response `200`**

```json
{
  "url": "https://github.com/apps/flowershow/installations/new?state=...",
  "state": "..."
}
```

---

### Sync repositories from an installation

```
POST /api/github-app/sync-repositories
```

Fetches the latest repository list from GitHub for a given installation and updates the database.

**Request body**

```json
{ "installationId": "12345678" }
```

**Response `200`**

```json
{ "success": true, "repositoriesCount": 5 }
```

---

### Remove a GitHub App installation record

```
DELETE /api/github-app/installations/{id}
```

Deletes a GitHub App installation record from Flowershow's database. The installation must belong to the authenticated user.

**Response `200`**

```json
{ "success": true, "message": "Installation deleted" }
```

---

### GitHub App OAuth callback

```
GET /api/github-app/callback
```

Handles the OAuth redirect after the user installs or updates the GitHub App. This is called automatically by GitHub — you do not need to call it directly.

---

## Domain

### Verify custom domain DNS configuration

```
GET /api/domain/{domain}/verify
```

No authentication required. Checks whether the DNS records for a custom domain are correctly configured.

**Response `200`**

```json
{
  "status": "Valid Configuration",
  "domainJson": {
    "name": "docs.example.com",
    "apexName": "example.com",
    "projectId": "...",
    "verified": true,
    "verification": []
  }
}
```

`status` is one of:
- `Valid Configuration` — DNS is correct, domain is live
- `Pending Verification` — add the TXT record shown in `verification`
- `Invalid Configuration` — DNS records are wrong or still propagating
- `Domain Not Found`
- `Unknown Error`

See [Custom Domain](/docs/custom-domain) for setup instructions.

---

## SEO

### Generate XML sitemap

```
GET /api/sitemap/{user}/{project}
```

No authentication required. Returns an XML sitemap for the given site containing all successfully synced markdown files.

**Response `200`** — `application/xml`

---

### Generate robots.txt

```
GET /api/robots/{hostname}
```

No authentication required. Returns a `robots.txt` for a site with a custom domain.

**Response `200`** — `text/plain`

---

## Error responses

All error responses follow the same shape:

```json
{
  "error": "Short error code",
  "error_description": "Human-readable explanation (optional)",
  "message": "Additional context (optional)"
}
```

Common status codes across all endpoints:

| Status | Meaning |
|---|---|
| `400` | Bad request — invalid input or missing required fields |
| `401` | Not authenticated |
| `403` | Authenticated but not authorized to access this resource |
| `404` | Resource not found |
| `409` | Conflict (e.g. site already exists) |
| `413` | Payload too large |
| `429` | Rate limit exceeded |
| `500` | Internal server error |
