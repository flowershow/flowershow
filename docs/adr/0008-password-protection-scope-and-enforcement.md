# ADR 0008: Password protection scope and enforcement

**Status**: Accepted

## Context

Flowershow supports password-protected sites (`privacyMode = 'PASSWORD'`). The access control must cover:

1. **Rendered pages** — Next.js pages served at extension-free URLs
2. **Raw source files** — files served at extension-suffixed URLs (e.g. `/notes.md`, `/image.png`) as described in ADR-0007

A complicating factor: Next.js image optimization (`/_next/image`) fetches images **server-side**, without the visitor's browser cookie. A hard cookie requirement on image requests would break image optimization for password-protected sites.

## Decision

### What is protected

Password protection covers **all content** on a site — rendered pages and raw source files alike. A visitor without a valid session token cannot read any content, regardless of how they construct the URL.

### Session mechanism

On successful password entry, the server issues an HMAC-signed JWT cookie (`site_access_{siteId}`) scoped to the site. The JWT is verified against a site-specific key derived from `siteId` and `tokenVersion`. Changing the password increments `tokenVersion`, which invalidates all existing sessions without a token blacklist.

### Two-layer enforcement

Access is enforced at two independent layers:

**Layer 1 — middleware (browser traffic)**

- **Image extensions** (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`) bypass the password gate and are rewritten directly to the raw handler. The raw handler issues a short-lived presigned URL (5 min) so the asset is time-limited even without cookie verification.
- **All other file extensions** (`.md`, `.pdf`, `.html`, `.csv`, etc.) go through `ensureSiteAccess` *before* being rewritten to the raw handler. An invalid or missing cookie redirects the browser to `/_login?returnTo=...`.
- **Extension-free URLs** (rendered pages) always go through `ensureSiteAccess`.

**Layer 2 — raw route handler (direct API calls)**

`/api/` routes skip the middleware password gate entirely (the middleware returns immediately for all `/api/` paths). The raw handler therefore performs its own cookie verification for password-protected sites:

- **Image files**: issue a presigned URL regardless (no cookie check — required to support the Next.js image optimizer).
- **HTML files**: verify the cookie first, then proxy the content. HTML cannot use a presigned redirect because browsers would download rather than render it.
- **All other files**: verify the cookie; return `401` if missing or invalid.

This provides defense in depth: browser traffic is caught at the middleware and redirected to login; direct API calls are caught at the handler and rejected with `401`.

### Why presigned URLs for images instead of cookie verification

Requiring a cookie for image requests would break Next.js image optimization (`/_next/image`), which fetches images server-side without the visitor's cookie. Presigned URLs embed time-limited authorization in the URL itself, allowing the optimizer to fetch images without a cookie while ensuring the URL expires quickly (5 minutes).

## Consequences

- Images on password-protected sites are accessible to anyone who obtains a presigned URL within its 5-minute window. This is an acceptable trade-off to preserve image optimization.
- The raw handler must select `tokenVersion` from the database (in addition to `id` and `privacyMode`) to verify session cookies.
- Direct `/api/raw/` calls to non-image files on password-protected sites return `401`, not a login redirect — callers are expected to handle this programmatically.
- Password changes immediately invalidate all existing visitor sessions via `tokenVersion` increment.
