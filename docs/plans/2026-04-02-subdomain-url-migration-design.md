# Subdomain URL Migration Design

**Date:** 2026-04-02  
**Status:** Approved

## Summary

Migrate Flowershow site URLs from path-based routing on `my.flowershow.app` to subdomain-based routing on `flowershow.site`.

**Old:** `https://my.flowershow.app/@johndoe/garden`  
**New:** `https://garden-johndoe.flowershow.site`

Old URLs redirect to new URLs. Custom domains are unaffected.

---

## Decisions

- Subdomain format: `{projectName}-{username}` (single hyphen separator)
- Subdomains are auto-assigned at site creation, never user-modifiable
- Username uniqueness is already enforced via `@unique` in schema
- Only site hosting moves to `flowershow.site` — cloud dashboard stays on `cloud.flowershow.app`
- Old URL redirects handled in Next.js middleware (has DB access, already owns routing logic)
- Existing sites get subdomains via a one-time data migration at deploy time

---

## Change Surface

### 1. Database — Data Migration

The `subdomain` field already exists on the `Site` model (`String? @unique`). No schema migration needed.

Run at deploy time to populate existing sites:

```sql
UPDATE "Site" s
SET subdomain = s.project_name || '-' || u.username
FROM "User" u
WHERE s.user_id = u.id
  AND s.subdomain IS NULL
```

### 2. Site Creation

When creating a site, compute and store `subdomain = ${projectName}-${username}` in the same transaction. Never expose it as writable in the API.

### 3. URL Generation (`apps/flowershow/lib/get-site-url.ts`)

**Remove** `getSiteUrlPath()` entirely (path-based routing is gone). Remove all call sites.

**Update** `getSiteUrl()` priority:

1. `customDomain` (PREMIUM) → `https://{customDomain}`
2. `subdomain` → `https://{subdomain}.flowershow.site`
3. Fallback (no subdomain) → `https://my.flowershow.app/@{username}/{projectName}`

### 4. API Contract (`packages/api-contract`)

Add `subdomain: string | null` as a read-only field to both `SiteDetail` and `SiteSummary` schemas.

The `url` field already exists and will now return the subdomain URL — no breaking change for consumers.

### 5. New API Lookup Endpoint

`GET /api/sites/_subdomain/[subdomain]` — mirrors the existing `_domain` pattern used for custom domains. Looks up site by `subdomain` field.

### 6. Middleware Routing (`apps/flowershow/middleware.ts`)

Routing order (important — `*.flowershow.site` must come before the custom domain catch-all):

1. `cloud.flowershow.app` → dashboard (unchanged)
2. `*.flowershow.site` → **new** — extract subdomain, fetch via `_subdomain` endpoint, rewrite to serve content
3. `my.flowershow.app/@user/project` → **updated** — 301 redirect to `https://{subdomain}.flowershow.site`
4. `flowershow.app/@user/project` → **updated** — 301 redirect directly to `https://{subdomain}.flowershow.site` (was double-hopping via `my.flowershow.app`)
5. Everything else → custom domain lookup via `_domain` endpoint (unchanged)

### 7. Environment Variables

Add to `.env.example` and all environments:

```
NEXT_PUBLIC_SITE_DOMAIN=flowershow.site
```

Keep `NEXT_PUBLIC_ROOT_DOMAIN=my.flowershow.app` (still needed for redirect handling).

### 8. CLI (`apps/cli`)

- Remove hardcoded `APP_URL = 'https://my.flowershow.app'`
- Remove local `getSiteUrl()` helper
- All URL display uses `site.url` from API response directly

### 9. MCP Server (`apps/flowershow-mcp`)

No changes needed — already uses `site.url` from API responses throughout.

---

## What Does NOT Change

- Custom domain handling — unaffected, remains the middleware catch-all
- `cloud.flowershow.app` dashboard routing
- Premium feature flags (`CustomDomain`, `NoBranding`, etc.)
- Site content rendering logic
- Auth flows
