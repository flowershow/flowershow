# Spike: does a site page know its owner is viewing it?

Bead: flowershow-1pr.12. Date: 2026-10-18. Read-only investigation of `apps/flowershow` plus live header checks.

## Short answer

No. Today a page on `*.flowershow.me` or a custom domain has no idea who is viewing it. The login session cookie never reaches those hosts, no site-rendering code reads a session, and owner actions on annotations only work from the dashboard (or with a CLI/PAT bearer token).

## How auth works today

- **next-auth session** (`apps/flowershow/server/auth.ts`): JWT strategy, 30-day expiry. Cookie `__Secure-next-auth.session-token`, `Domain=.flowershow.app`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Live check on `cloud.flowershow.app/api/auth/csrf` confirms the `__Host-`/`__Secure-` prefixes and `SameSite=Lax` on the auxiliary cookies (the session cookie itself is only set on login; attributes from code).
- **Which hosts get it**: `flowershow.app`, `cloud.flowershow.app`, `my.flowershow.app`. Not `*.flowershow.me` (different registrable domain) and not custom domains. A cookie for `.flowershow.me` would have to be set separately; nothing does that today.
- **Middleware** (`apps/flowershow/middleware.ts`): only the cloud host calls `getToken()` (to gate the dashboard). The site branches (subdomain and custom domain) only check the per-site password cookie, then rewrite to `/site/{user}/{project}/...` or `/site/_domain/{host}/...`.
- **Session reads elsewhere**: `getServerSession`/`useSession` appear only in cloud pages (CLI authorize/verify, claim, username form), the PostHog provider, and a few `/api/*` routes (`user`, `sites/claim`, `sites/id/[siteId]/files`). None in `app/(public)/site/**`.
- **Annotations**: the overlay (`components/public/annotations/page-annotations.tsx`) calls the same-origin `/api/sites/id/:siteId/annotations` as an anonymous visitor (list + create). Owner actions in that route go through `authorizeOwner` in `lib/annotations/http.ts`, which only accepts a `Bearer fs_cli_`/`fs_pat_` token (CLI, MCP, agents). In the browser, owner actions (resolve, delete) are the tRPC `annotation.setStatus` / `annotation.delete` protected procedures, used from the dashboard. The overlay just shows a "Site owner? Manage annotations" link to the dashboard.
- **No owner-only UI on sites** exists (no "edit this page", no owner badge).
- **Useful precedent**: password-protected sites already do a per-site handshake. `/_login` on the site host issues a host-only cookie `SITE_ACCESS_COOKIE_NAME(site.id)`, a JWT signed with a per-site key (`siteKeyBytes(site.id, site.tokenVersion)`, audience = site id), verified in middleware. This works identically on subdomains and custom domains.

## Caching

Site pages are rendered dynamically per request, not ISR: the page reads `searchParams` (pagination), and the middleware does a DB-backed site lookup per request. Live responses show `cache-control: private, no-cache, no-store` / `public, max-age=0, must-revalidate`. So reading a cookie server-side would not break an existing cache today, but it would block any future move to ISR/CDN caching of page HTML and personalise HTML for everyone. Keeping owner state out of the HTML and fetching it client-side keeps that door open.

## Options

| Option | How | Works on custom domains | Effort | Risks |
| --- | --- | --- | --- | --- |
| (a) Cross-origin `isOwner` check | Page JS calls `https://cloud.flowershow.app/api/site-owner?siteId=` with `credentials: 'include'`; CORS allows the site's origin | Only if the session cookie is `SameSite=None` | S–M | Requires changing the session cookie to `SameSite=None` (weaker CSRF posture for the whole app); third-party cookie blocking (Safari ITP, Firefox, Chrome) makes it unreliable. Not recommended. |
| (b) Shared `.flowershow.me` cookie | Also set the session cookie on `.flowershow.me` | No | M | next-auth sets one domain per cookie, so a second login/sync hop is needed anyway; every user site (untrusted user HTML/JS on subdomains) would receive the full account session; HttpOnly protects it from JS but any server-side bug on a site host exposes it. Bad blast radius. |
| (c) Redirect handshake, site-scoped token | Owner clicks "Sign in as owner" on the site → `cloud.flowershow.app/site-auth?site=…&returnTo=…` (session checked, ownership checked) → redirect back to `https://<site host>/_owner?code=<one-time code>` → site host exchanges the code and sets a host-only, HttpOnly, short-lived (e.g. 12h) JWT cookie scoped to that site (same pattern and key material as the password cookie). Page JS calls same-origin `/api/sites/id/:siteId/owner` → `{ isOwner }`; owner annotation actions accept this cookie. | Yes | M | One-time code must be single-use and short-lived; validate `returnTo` against the site's own hosts; scope the token to the site and to owner actions only. Mirrors an existing, working pattern. |
| (d) Owner deep link from dashboard | Dashboard "View as owner" link runs the same handshake as (c) automatically | Yes | S on top of (c) | None extra; a nicer entry point. |
| (e) Status quo + PAT | Owners act via dashboard, CLI or MCP only | n/a | 0 | No in-page owner experience. |

## Recommendation

Go with **(c) redirect handshake issuing a site-scoped, host-only cookie**, entered via an explicit "Owner? Sign in" link in the annotations panel and a "View as owner" link in the dashboard (d). Keep page HTML anonymous and cacheable: owner state comes only from a same-origin client fetch (`/owner` → `{ isOwner }`), and owner-only UI (resolve, delete, later "edit this page") renders after that fetch. It works the same on `*.flowershow.me` and custom domains, never ships the account session to user-site hosts, avoids third-party-cookie problems, and reuses the password-site JWT machinery (`siteKeyBytes`, `tokenVersion` for revocation). First version: owner annotation actions (resolve/delete) only; author identity for logged-in non-owners can come later via the same handshake with a non-owner role.
