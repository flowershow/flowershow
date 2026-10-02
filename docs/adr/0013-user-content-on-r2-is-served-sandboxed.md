# ADR 0013: User content on r2.flowershow.app is served sandboxed, with types from one shared map

**Status**: Accepted (header rule to be applied in Cloudflare; see "Cloudflare rule" below)

## Context

Every uploaded file is stored in R2 and served publicly from `r2.flowershow.app`: `/api/raw` 302-redirects every non-HTML file there, and site logos and favicons link to it directly. `r2.flowershow.app` is a subdomain of `flowershow.app`, so it is *same-site* with the dashboard (`cloud.flowershow.app`) and the claim page (`flowershow.app`).

Production responses from `r2.flowershow.app` had no `Content-Security-Policy` and no `X-Content-Type-Options` (checked 2026-10-02). So any uploaded `.html` or `.svg`, opened directly on `r2.flowershow.app`, runs its script there. That script can set cookies for `.flowershow.app`, including a `__Secure-` NextAuth session cookie (login CSRF / session fixation against dashboard users), and can send same-site requests that carry `SameSite=Lax` cookies. Since `fl --anon` (#1414), anyone can upload such files without an account. Found in the #1414 adversarial review (H2), tracked as `flowershow-cs0`.

Presigned uploads sign only `host`: the stored `Content-Type` is whatever the uploader sends. The review suggested signing `Content-Type` into the presigned PUT. That does not fix the problem: a legitimate `.html` file is stored as `text/html` and a legitimate `.svg` as `image/svg+xml`, and both run script when opened directly. Pinning would also break clients that send their own type (the drag-and-drop page hardcodes `text/markdown`; the dashboard import modal sends the browser's guess), including cached web clients.

## Decision

1. **Serve all user content on `r2.flowershow.app` sandboxed**, with a Cloudflare response-header rule on that hostname:
   - every response: `X-Content-Type-Options: nosniff`;
   - every response whose media type is not `application/pdf`: `Content-Security-Policy: sandbox; default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; media-src 'self'`.

   `sandbox` puts a directly opened document in an opaque origin with scripts, forms and popups disabled, so it can neither run script nor set cookies. CSP on a response only applies when that response is a document; images, scripts, stylesheets, fonts and media loaded as subresources by user sites are unaffected. PDFs are excluded because Chrome refuses to render a PDF in a sandboxed document; a file mislabelled `application/pdf` is not rendered as HTML because of `nosniff`. The rule keys on the response's media type, not the path, so an uploader can't escape it by naming an HTML file `x.pdf`.

2. **Don't pin `Content-Type` in presigned uploads.** With the rule above it adds no protection, and it would break existing clients.

3. **One shared extension → Content-Type map** in `@flowershow/core` (`getContentType`), used by the app (presigned uploads, which the CLI and Obsidian plugin follow) and the worker (GitHub sync writes). Because of `nosniff`, a script or stylesheet stored with the wrong type is blocked, so the map covers web assets (`mjs`, `cjs`, fonts, `wasm`, `webmanifest`, …), is case-insensitive, and unknown extensions fall back to `application/octet-stream` (never rendered or executed) instead of `application/json`.

HTML pages of user sites are unaffected: `/api/raw` reads `.html` from storage through the S3 API and serves it from the site's own domain with its own headers. (Phishing and script on `*.flowershow.me` itself is a separate problem, `flowershow-ctv`.)

## Cloudflare rule

Zone `flowershow.app` → Rules → Transform Rules → Modify Response Header. Create two rules:

| Rule | When incoming requests match (expression) | Then |
| --- | --- | --- |
| `r2 user content: nosniff` | `(http.host eq "r2.flowershow.app")` | Set static `X-Content-Type-Options` = `nosniff` |
| `r2 user content: sandbox` | `(http.host eq "r2.flowershow.app" and http.response.content_type.media_type ne "application/pdf")` | Set static `Content-Security-Policy` = `sandbox; default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; media-src 'self'` |

Verify with `scripts/check-r2-headers.sh`. Because `/api/raw` redirects to content-versioned URLs (`?v=<sha>`) and the rule runs on every response (cached or not), no cache purge is needed.

## Consequences

- Opening a user's HTML or SVG file directly on `r2.flowershow.app` shows it without script (SVG still renders as an image). Nothing in Flowershow links users there for HTML.
- Existing objects keep the type they were stored with. A `.mjs` (or other script) uploaded before this change with the old `application/json` fallback is blocked by `nosniff` until the site is republished. HTML publishing is new (2026-09-30), so this should be rare.
- The longer-term fix is a separate registrable domain for user content (e.g. `flowershow-usercontent.net`), so user content is never same-site with the dashboard, whatever headers it is served with.
