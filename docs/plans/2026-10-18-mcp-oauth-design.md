# MCP account sign-in (OAuth): design

Bead: `flowershow-3fr` (parent epic `flowershow-w1y`). Date: 2026-10-18. Supersedes the February plan `docs/plans/2026-02-20-mcp-oauth.md`, which targeted the removed Express service `apps/flowershow-mcp` and a JWT-plus-internal-API split. Since ADR 0014 the MCP endpoint lives in the main app at `https://flowershow.app/api/mcp`, so the authorization server can talk to Prisma and the next-auth session directly.

## Why

Claude custom connectors and ChatGPT apps support only two modes: no auth, or OAuth. Personal access tokens (`fs_pat_…`) only work in clients that let you set headers (Claude Code, MCP Inspector). So today, from a chat app:

- every new chat creates a new anonymous site (there is no "my sites"),
- a site that has been claimed can no longer be updated from chat (its claim token stops working, 409),
- we can't be listed in the Claude Connectors Directory or the ChatGPT app directory with a write tool that touches user accounts (`flowershow-k8j`), and we keep the "beta" label.

## Goals and non-goals

Goals:

- A chat user adds the Flowershow connector, signs in once with their existing Flowershow login, approves access, and from then on the model can list their sites, publish new sites into their account, and update sites they own.
- Works in claude.ai (web, Desktop, mobile) and ChatGPT (developer mode and published apps), and in MCP Inspector and Claude Code.
- Anonymous publishing keeps working for people who don't want to sign in.
- An anonymous site made earlier in the chat can be moved into the account from chat.
- Users can see and revoke connected apps in the dashboard.
- Follows the current MCP authorization spec closely enough that generic MCP clients work without special cases.

Non-goals:

- Flowershow as a general OAuth/OIDC provider for third-party apps (no ID tokens, no userinfo, no OIDC discovery beyond what MCP clients probe).
- Fine-grained scopes (per-site grants, read-only tokens). One scope now; the table shape allows more later.
- Confidential clients, client secrets, client credentials grant, device flow for MCP (the CLI already has its own device flow).
- Replacing PATs or CLI tokens. They keep working on `/api/mcp`.
- A split-out MCP service at `mcp.flowershow.app` (ADR 0014 keeps that cheap to do later).

## User flows

**Signed-in connector (new, the default we document).** In claude.ai: Settings → Connectors → Add custom connector → URL `https://flowershow.app/api/mcp/account`, no client ID needed. Claude calls the endpoint, gets `401` with `WWW-Authenticate: Bearer resource_metadata="…"`, discovers our authorization server, registers itself, and opens a browser window to `https://flowershow.app/oauth/authorize?...`. That validates the request and sends the user to `https://cloud.flowershow.app/oauth/consent?req=…`. If not logged in, the existing cloud middleware redirects to `/login?callbackUrl=…` (GitHub, Google or magic link: the existing next-auth login, nothing new). The consent page says: "**Claude** wants to publish to your Flowershow account (@username): list your sites, create sites, and replace the content of sites you own. [Allow] [Cancel]", plus the redirect host in small print. Allow → redirect back to Claude with a code → Claude exchanges it for tokens → tools run as the user. ChatGPT is the same flow, with OAuth chosen in the app's auth settings.

**Anonymous connector (unchanged).** `https://flowershow.app/api/mcp` with no auth keeps its current behaviour: new anonymous site, claim link, update with `siteId` + `claimToken`. It also accepts a bearer token (PAT, CLI token or an OAuth access token) and then behaves like the account endpoint. Existing connectors keep working with no action from users.

**Claim into account from chat.** A user who started anonymously, then adds the signed-in connector, can say "keep that site". The model calls `claim-site` with the `siteId` and `claimToken` it already has from the earlier `publish` result in the conversation; the site moves into the account (same logic as the claim page), and further updates use `siteId` alone.

## Decisions

1. **Two URLs, one implementation.** `/api/mcp` stays anonymous-first (no header → anon; bearer → account). `/api/mcp/account` requires a token and answers `401` + `WWW-Authenticate` without one, which is what makes Claude and ChatGPT start OAuth. Reason: Claude decides "OAuth or not" from the server's 401, so one URL can't be both authless for existing users and sign-in for new ones; and changing `/api/mcp` to require auth would break every connector already added. Both routes call the same `handle()` with a `requireAuth` flag. ChatGPT's per-tool mixed auth (`securitySchemes`, with `_meta["mcp/www_authenticate"]` on a tool error to prompt sign-in) and Claude's "lazy authentication" pattern could later let one URL do both; we don't depend on either until they are tested in both apps.
2. **Build a small authorization server in the app on the existing next-auth session and Prisma; no auth library.** See "Build vs library" below.
3. **Opaque tokens, hashed at rest**, same pattern as `AccessToken` (`sha256`, prefix-tagged): access `fs_oat_…` (1 hour), refresh `fs_ort_…` (30 days, rotated on every use, reuse of an old refresh token revokes the whole grant). No JWTs: we need a DB lookup anyway for revocation and `lastUsedAt`, and opaque tokens can't be mis-validated by other services.
4. **One scope: `sites:write`** (list own sites, create sites, publish to and claim sites). Requested scope is ignored if absent and defaulted to `sites:write`; unknown scopes are rejected with `invalid_scope`.
5. **Client registration: Client ID Metadata Documents (CIMD) first, Dynamic Client Registration (DCR) as fallback.** In the current MCP spec (2026-07-28) CIMD is the preferred mechanism and DCR (RFC 7591) is deprecated but allowed. Claude uses CIMD only when the AS metadata has `client_id_metadata_document_supported: true` and `none` in `token_endpoint_auth_methods_supported`, and otherwise registers a new DCR client on every connection; ChatGPT prefers CIMD (`https://chatgpt.com/oauth/client.json`) and falls back to DCR. DCR is open (no initial access token), public clients only (`token_endpoint_auth_method: none`), rate limited per IP, and DCR clients with no grant after 7 days are deleted.
6. **PKCE S256 mandatory** for every client; `plain` and missing challenges are rejected. `resource` (RFC 8707) must equal `https://flowershow.app/api/mcp/account` or `https://flowershow.app/api/mcp` (defaulting to the former when a client omits it) and is stored on the grant; each MCP route accepts only tokens whose resource is its own URL (audience check), and the REST API never accepts OAuth tokens. Every authorization response, including errors, carries `iss` (RFC 9207), and the metadata says so, because ChatGPT picks its client ID and redirect URI based on that flag.
7. **Consent on every new grant; skip the screen for a client the user already approved with the same redirect URI and scope** (a reconnect after token loss). The consent page shows the client name from registration as unverified text plus the redirect host, since anyone can register "Claude".
8. **Issuer is `https://flowershow.app`** (same origin as the MCP endpoint, so metadata discovery works without path tricks); the consent page lives on `cloud.flowershow.app`, where login and the session already live.
9. **Use no OAuth or MCP-auth library; write the resource-server glue ourselves** (about 50 lines: `WWW-Authenticate`, protected resource metadata, bearer lookup), since our route already uses the SDK's web-standard transport directly. Vercel's `mcp-handler` would save little and add a dependency.
10. **OAuth-created sites are normal account sites** (not temporary), named from the first heading or `site-<random>` like the dashboard upload, and counted against the same per-account limits as any other publish (`flowershow-bp8`). Per-user rate limits for the signed-in path replace the shared anonymous bucket for those callers, which also takes load off `flowershow-tl0`.
11. **Revocation UI is a section on the existing Access Tokens page** ("Connected apps": client name, scopes, connected on, last used, Revoke), not a new page.

## Endpoints and metadata

All on `https://flowershow.app`. `/.well-known/*` on the home domain is rewritten in `middleware.ts` to route handlers under `app/api/oauth/well-known/…` (the home domain otherwise renders the content site).

| Path | Purpose |
| --- | --- |
| `GET /.well-known/oauth-protected-resource/api/mcp/account` (and `/api/mcp`) | RFC 9728 protected resource metadata: `resource`, `authorization_servers: ["https://flowershow.app"]`, `scopes_supported: ["sites:write"]`, `bearer_methods_supported: ["header"]`, `resource_name`. Also served at the root `/.well-known/oauth-protected-resource` (describing `/api/mcp/account`) for clients that fall back to the origin root. Claude requires `resource` to equal the URL the user typed exactly, and uses only the first `authorization_servers` entry. |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata: `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `revocation_endpoint`, `response_types_supported: ["code"]`, `grant_types_supported: ["authorization_code","refresh_token"]`, `code_challenge_methods_supported: ["S256"]`, `token_endpoint_auth_methods_supported: ["none"]`, `scopes_supported`, `client_id_metadata_document_supported: true`, `authorization_response_iss_parameter_supported: true`. No OIDC scopes and no `offline_access` in `scopes_supported` (ChatGPT requests any OIDC scopes it sees; Claude adds `offline_access` if listed). We issue refresh tokens regardless. |
| `GET /.well-known/openid-configuration` | Same JSON (some clients probe OIDC discovery first). No `id_token` support advertised. |
| `GET /oauth/authorize` | Validates `client_id` (DB or CIMD fetch), `redirect_uri`, `response_type=code`, `code_challenge`+`S256`, `scope`, `resource`, `state`. Errors before the redirect URI is trusted render an error page; after, they redirect with `error=`. Stores a pending request (10 min) and redirects to the consent page. |
| `GET /oauth/consent?req=…` (cloud host) | Server-rendered page; requires session (middleware already redirects to login). Allow/Cancel POST to a server action that checks the session, CSRF (same-origin Origin, as in `/api/sites/claim`), creates or reuses the grant, issues a 60-second single-use code, and redirects to `redirect_uri?code=…&state=…&iss=https://flowershow.app`. |
| `POST /oauth/token` | `authorization_code` (verify code unused and unexpired, PKCE, same `client_id` and `redirect_uri`, `resource`) and `refresh_token` (rotate; failures return `invalid_grant`). Accepts `application/x-www-form-urlencoded` (what Claude sends) and JSON. Returns `access_token`, `token_type: Bearer`, `expires_in: 3600`, `refresh_token`, `scope`. CORS open, `Cache-Control: no-store`. |
| `POST /oauth/register` | RFC 7591 DCR, public clients only. |
| `POST /oauth/revoke` | RFC 7009, revokes the token's grant. |
| `/api/mcp/account` | MCP endpoint, token required. `401` carries `WWW-Authenticate: Bearer resource_metadata="https://flowershow.app/.well-known/oauth-protected-resource/api/mcp/account", scope="sites:write"`; insufficient scope returns `403` with `error="insufficient_scope"`. |

`/oauth/*` paths on the home domain are rewritten to `app/api/oauth/*` handlers, like `/claim` today.

## Data model (one migration)

```prisma
model OAuthClient {
  id                String   @id @default(cuid())
  clientId          String   @unique @map("client_id") // generated for DCR, the URL for CIMD
  kind              OAuthClientKind                    // DCR | CIMD
  name              String
  uri               String?
  logoUri           String?  @map("logo_uri")
  redirectUris      String[] @map("redirect_uris")
  metadataFetchedAt DateTime? @map("metadata_fetched_at") // CIMD cache (24h)
  createdAt         DateTime @default(now()) @map("created_at")
  grants            OAuthGrant[]
}

// One per user x client authorization: the unit shown and revoked in the dashboard.
model OAuthGrant {
  id         String    @id @default(cuid())
  userId     String    @map("user_id")
  clientId   String    @map("client_id")
  scope      String
  resource   String
  redirectUri String   @map("redirect_uri")
  createdAt  DateTime  @default(now()) @map("created_at")
  lastUsedAt DateTime? @map("last_used_at")
  revokedAt  DateTime? @map("revoked_at")
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  client     OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)
  tokens     OAuthToken[]
  @@index([userId])
}

model OAuthAuthorizationCode {
  codeHash      String   @id @map("code_hash")
  grantId       String   @map("grant_id")
  codeChallenge String   @map("code_challenge")
  redirectUri   String   @map("redirect_uri")
  expiresAt     DateTime @map("expires_at")
  usedAt        DateTime? @map("used_at")
}

model OAuthToken {
  tokenHash String         @id @map("token_hash")
  grantId   String         @map("grant_id")
  kind      OAuthTokenKind // ACCESS | REFRESH
  expiresAt DateTime       @map("expires_at")
  usedAt    DateTime?      @map("used_at") // refresh rotation / reuse detection
  createdAt DateTime       @default(now()) @map("created_at")
  grant     OAuthGrant     @relation(fields: [grantId], references: [id], onDelete: Cascade)
  @@index([grantId])
  @@index([expiresAt])
}
```

Plus `OAuthPendingRequest` (`id`, `clientId`, `params` JSON, `expiresAt` 10 min, `@@index([expiresAt])`) for the step between `/oauth/authorize` and consent: the consent page gets only its id, so it can't be fed edited parameters. There is no cleanup cron today, so expired rows are deleted opportunistically: each `/oauth/token` and `/oauth/authorize` call deletes up to 100 expired codes, pending requests and tokens (indexed on `expiresAt`), and DCR clients with no grant after 7 days. Revoking a grant sets `revokedAt` and deletes its tokens; validation joins token → grant and rejects revoked grants.

## How the MCP tools change

`McpMode` gains `{ kind: 'user', userId, via: 'pat' | 'oauth', scopes }`. `resolveMode` tries PAT/CLI prefixes first, then `fs_oat_`. The user path today forwards the bearer to the sync and status handlers in-process; for OAuth tokens it can't (those handlers accept only `fs_pat_`/`fs_cli_`), so the PR factors `validateAccessToken` into `resolveBearer()` returning `{ userId, via }` and lets the sync/status handlers accept `fs_oat_` tokens only when called in-process from MCP (an internal flag on the request, not a header a caller can set). Simpler alternative if that proves awkward: MCP calls the publish library functions directly instead of the route handlers.

| Tool | Anonymous | Signed in |
| --- | --- | --- |
| `publish` | new anon site, or `siteId`+`claimToken` | no `siteId`: create a new account site (optional `name`); `siteId`: replace content of a site the user owns (404-style error otherwise); `siteId`+`claimToken` for an unclaimed anon site: tells the model to call `claim-site` first |
| `list-sites` | not registered | user's sites: `siteId`, name, URL, last published |
| `claim-site` (new) | not registered | `siteId`+`claimToken` → moves the anon site into the account, using a shared `claimAnonSite()` factored out of `/api/sites/claim` (and made atomic, fixing `flowershow-nds` on the way) |

Tool descriptions change for the signed-in mode: "publish into the user's Flowershow account; use list-sites to find a site to update". The anonymous description is unchanged. Publish source is recorded as a new `PublishSource.mcp` (also asked for in `tl0`).

## Security

- PKCE S256 mandatory; codes single-use, 60 s, bound to client, redirect URI and challenge; a replayed code revokes the grant.
- Redirect URIs: exact string match against the client's registered URIs (DCR) or its metadata document (CIMD). HTTPS only, except loopback `http://localhost` / `http://127.0.0.1`, where the port is ignored (RFC 8252; Claude Code uses a changing port). No wildcards, no fragments. Known callbacks to test against: `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback`, `https://chatgpt.com/connector_platform_oauth_redirect`, `https://chatgpt.com/connector/oauth/{callback_id}`. Our endpoints must answer within Claude's 10 s discovery/registration/token budget, so CIMD fetches time out at 5 s. CIMD: `client_id` must be an HTTPS URL without fragment, the fetched document's `client_id` must equal the URL, fetch with 5 s timeout, 5 KB limit, no redirects, block private IP ranges (SSRF), cache 24 h.
- Consent always shown for a new client/user pair; the page shows the redirect host and marks client names as self-declared. Login CSRF covered by next-auth; consent POST checks same-origin like the claim route.
- Tokens: 256-bit random, only hashes stored, constant-time irrelevant (hash lookup). Access 1 h, refresh 30 d rotating with reuse detection. Tokens accepted only on `/api/mcp*` (no token passthrough: we never forward the bearer to other services).
- Rate limits: DCR 10/hour/IP, token endpoint 60/min/IP, authorize 30/min/IP, using the DB-backed limiter in `lib/anon-rate-limit.ts` (in-memory `lib/rate-limit.ts` is per-instance on Vercel and isn't enough). Per-user publish limits come from `flowershow-bp8`; the shared anonymous MCP bucket problem (`flowershow-tl0`) is reduced because signed-in users no longer draw from it.
- Logging: PostHog events `mcp_oauth_grant_created`, `mcp_oauth_token_refreshed`, `mcp_oauth_grant_revoked`; no tokens in logs.

## Dashboard: connected apps

On `/dashboard/tokens` (rename the heading to "Access tokens and connected apps"), a new section lists the user's active grants: client name (and host of its redirect URI), connected date, last used, Revoke button (tRPC `user.revokeOAuthGrant`). Empty state: "No apps connected. Add Flowershow as a connector in Claude or ChatGPT." Link to `/docs/agents/mcp`.

## Build vs library

We need an authorization server (AS) that issues tokens for users who log in with our existing next-auth v4 session, and a resource server check on `/api/mcp*`. Options surveyed (October 2026):

| Option | Verdict |
| --- | --- |
| MCP TypeScript SDK v1 `mcpAuthRouter`, `requireBearerAuth`, `ProxyOAuthServerProvider` | Express-only and DCR-centric; slated for removal in SDK v2. The February plan used it; it doesn't fit App Router route handlers. No. |
| Vercel `mcp-handler` (`withMcpAuth`, `protectedResourceHandler`) | Resource-server side only (401 + metadata), not an AS. Usable, but it's ~50 lines we can write against our existing transport. No (decision 9). |
| better-auth `oauthProvider`/`mcp` + `@better-auth/cimd` | The most complete off-the-shelf AS with CIMD, but brings its own user, session and account tables: a second auth system next to next-auth v4, or a migration. No. |
| panva `oidc-provider` | Mature and certified, DCR and resource indicators, but Koa-based, needs a Prisma adapter and interaction glue, and no CIMD support found. No. |
| next-auth v4 / Auth.js | Login only; it can't act as an OAuth provider. n/a. |
| Hosted (WorkOS AuthKit, Clerk, Stytch, Auth0) | WorkOS and Clerk support CIMD and DCR, but users would sign in at the vendor and we'd have to bridge identities to our users; adds cost and a dependency for a small surface. Auth0's CIMD has a reported ChatGPT incompatibility. Fallback only. |

**Recommendation: build.** The surface Claude and ChatGPT need is small and well specified (metadata, authorize + consent, token with two grants, DCR, CIMD fetch, revoke), there is one first-party user base, and we already have the patterns: hashed prefix tokens (`lib/cli-auth.ts`), a login-gated approve page (`/cli/authorize`), a same-origin-checked session POST (`/api/sites/claim`) and a DB-backed rate limiter. Estimate: ~1,200 lines including tests. Use `jose` (already a dependency) only if we later need JWTs; nothing new is added. If maintaining our own AS becomes a burden, the swap target is WorkOS AuthKit or Clerk behind the same `/api/mcp/account` URL.

Sources: MCP authorization spec 2026-07-28 (modelcontextprotocol.io/specification/latest/basic/authorization and its client-registration page), claude.com/docs/connectors/building/authentication, support.claude.com/en/articles/11503834, developers.openai.com/apps-sdk/build/auth, github.com/vercel/mcp-handler, better-auth.com/docs/plugins/cimd, clerk.com and workos.com CIMD changelogs (Aug 2026).

## Testing

- Unit (Vitest): PKCE verification, redirect URI matching, CIMD validation (including SSRF guards with a mocked fetch), code single use and expiry, refresh rotation and reuse detection, scope/resource validation, revoked grant rejection, metadata JSON shapes, `WWW-Authenticate` on `/api/mcp/account`.
- Route tests in the style of `app/api/mcp/route.test.ts`: full flow register → authorize (with a mocked session) → consent → token → `tools/list` and `publish` → refresh → revoke → 401.
- Playwright e2e: log in, open an authorize URL built by the test, approve consent, assert redirect with code; the dashboard Revoke button.
- MCP Inspector against a Vercel preview and local dev: "Quick OAuth flow" and "Guided OAuth flow" both pass, tools list differs between `/api/mcp` and `/api/mcp/account`.
- Manual (Rufus, bead below): claude.ai web and mobile, Claude Desktop, ChatGPT developer mode. Add connector, sign in, consent, publish a new site, update it in a later chat, claim an anon site from chat, revoke in dashboard and confirm the client asks to reconnect.

## PR breakdown

Each is one PR; chained in this order. Beads are children of `flowershow-3fr`.

1. **OAuth core: tables, metadata, register, token, revoke.** Migration for `OAuthClient`, `OAuthGrant`, `OAuthPendingRequest`, `OAuthAuthorizationCode`, `OAuthToken`; `lib/oauth/` (token generation and hashing, PKCE, redirect matching, scope/resource validation, CIMD fetcher with SSRF guards, refresh rotation); `/.well-known/oauth-authorization-server`, `/.well-known/openid-configuration`, `/oauth/register`, `/oauth/token`, `/oauth/revoke`; middleware rewrites. Acceptance: metadata validates against RFC 8414 fields listed above; unit tests for PKCE, redirect matching (incl. loopback any port), CIMD (mismatched `client_id`, private IP, oversize, timeout), code reuse, refresh rotation + reuse detection, `invalid_grant`; form-urlencoded token requests work; rate limits on register/token.
2. **Authorize and consent.** `/oauth/authorize` validation and error handling (redirect vs error page, `iss` on all responses), pending request, consent page on the cloud host (client name marked self-declared, redirect host, account), approve/cancel server action with same-origin check, grant reuse to skip repeat consent. Acceptance: Playwright logs in, approves, gets `code`+`state`+`iss`; cancel returns `access_denied`; logged-out user goes through `/login` and returns to consent; route test runs register → authorize → consent → token.
3. **MCP signed-in mode.** `/api/mcp/account` (401 + `WWW-Authenticate` with `resource_metadata` and `scope`), protected resource metadata for both MCP URLs, `resolveBearer()` accepting `fs_oat_` with audience check, `publish` creating account sites without `siteId`, `list-sites` with last-published, new `claim-site` using a shared atomic `claimAnonSite()` (fixes `flowershow-nds`), `PublishSource.mcp`. Acceptance: MCP Inspector OAuth flow passes against a preview; anon `/api/mcp` behaviour unchanged (existing tests green); a token for `/api/mcp/account` is rejected on `/api/mcp` and on REST routes; claim from chat moves the site and later `publish` by `siteId` works.
4. **Connected apps and cleanup.** "Connected apps" section on the tokens page with Revoke (tRPC), opportunistic cleanup of expired codes, pending requests, tokens and unused DCR clients, PostHog events. Acceptance: revoking makes the next MCP call 401 and the client re-prompts sign-in; e2e covers the Revoke button.
5. **Manual test in claude.ai and ChatGPT (Rufus).** Not a PR. claude.ai web + mobile, Claude Desktop, ChatGPT developer mode: add `https://flowershow.app/api/mcp/account`, sign in, consent, publish a new site, update it in a new chat, claim an anon site from chat, revoke and reconnect. Record findings as beads.
6. **Docs, changelog and drop "beta".** The checklist below. Acceptance: no "beta" for the connector anywhere in `content/flowershow-app`; changelog entry with a real consent-screen screenshot; skill updated.

## Implementation notes (deviations from the above)

Recorded as the PRs landed; each says why.

- **Kill switch `MCP_OAUTH_ENABLED`** (PR 1). The `/.well-known/oauth-*` and `/oauth/*` rewrites, and the `/api/oauth/*` handlers, answer 404 unless it is `true`. PR 1 and PR 2 merge before the signed-in endpoint exists; if discovery metadata went live first, a client that probes the origin for OAuth metadata could start a flow that has no endpoint behind it yet. Turn it on together with PR 3, and it stays as an off switch afterwards.
- **Protected resource metadata ships in PR 1**, not PR 3, with the other discovery documents (behind the same switch).
- **Rate limits use a new `OAuthRateLimit` table** (fixed window, one `INSERT ... ON CONFLICT` per request) rather than `lib/anon-rate-limit.ts`, which only counts anonymous sites per IP hash and can't count arbitrary events. Old windows are swept opportunistically. Revoke is also limited (60/min/IP).
- **Schema additions**: `OAuthAuthorizationCode` has a `grant` relation (cascade delete) and `createdAt`; `OAuthGrant` is indexed on `clientId`; `OAuthPendingRequest` has `createdAt`.
- **CIMD fetch details**: default port (443) only; if any address the host resolves to is non-public the fetch is refused (checked inside the socket's own DNS lookup, so there is no DNS-rebinding gap); IPv4-mapped, NAT64 and 6to4 IPv6 ranges are blocked too; the document must be served as JSON (`application/json` or `application/*+json`); if a refetch after the 24 h cache fails, the stale copy is not used (fail closed).
- **Refresh token presented by the wrong `client_id`** returns `invalid_grant` without consuming the token (so a third party can't trigger reuse-revocation of someone else's grant with a mismatched client). Any presentation of an already-used refresh token by its own client revokes the grant, including a client racing itself.
- **Token endpoint refuses client authentication** (`Authorization` header or `client_secret`) with `invalid_client`, since every client is public.
- **Cleanup**: apart from rate-limit windows, expired-row cleanup stays in PR 4 as planned.
- **Pending request ids are 256-bit random values** (PR 2), not cuids: the id is the consent page's only handle on the request, so it must be unguessable. A pending request is deleted when it is decided, so Allow/Cancel works once.
- **Consent skip happens on the consent page itself** (PR 2): when the signed-in user already has an unrevoked grant for the same client, redirect URI, scope and resource, the page issues a code and redirects without showing the screen. A grant is reused (not duplicated) in that case and when the user approves again.
- **The consent page can't be framed** (`X-Frame-Options: DENY`, `frame-ancestors 'none'`, set in middleware) and the authorize error page has a locked-down CSP.
- **`state` is capped at 2048 characters** (longer is `invalid_request`).
- **`mcp_oauth_grant_created`** is captured in PR 2, where grants are created; the other events stay in PR 4.
- **How MCP acts as the user** (PR 3): the design's "internal flag on the request" is a module-private `Symbol` property set by `lib/mcp/internal-request.ts` on requests the MCP endpoint builds in-process; `validateAccessToken` honours it, so sync, status and create-site run their normal ownership checks for that user. A Symbol property can't come from HTTP. It is used for PAT/CLI callers too, so the MCP endpoint no longer forwards any bearer token (claim tokens for anonymous sites still travel as the bearer, as before). REST routes still accept only `fs_pat_`/`fs_cli_` tokens.
- **New account sites** (PR 3) are created through `POST /api/sites` in-process (same validation, subdomain logic and site-created email as the CLI). A name clash gets `-2`, `-3`, … instead of overwriting. There are no per-account site limits to apply yet (`flowershow-bp8`).
- **`/api/mcp/account` also accepts PAT/CLI tokens**; `/api/mcp` keeps its original `Bearer realm="flowershow"` challenge for PAT/CLI failures and only adds `resource_metadata` when an `fs_oat_` token fails, so existing clients see no change.
- **Not-yours and not-found look the same** to a signed-in caller of `publish` (no probing of other accounts' site ids); with a `claimToken` the message points to `claim-site`.
- **Claim route status codes** (PR 3, `flowershow-nds`): an already-claimed site is now `409` (was `400`), the same answer the loser of a concurrent claim gets.
- **`PublishSource.mcp`** is recorded for every publish that comes through MCP, anonymous ones included.
- **Playwright** signs in by setting a next-auth session cookie minted with the test secret (the login providers themselves are not exercised); the logged-out case asserts the redirect to `/login?callbackUrl=/oauth/consent?req=…` and the return to consent.
- **Consent is bound to the browser** (PR 4, from the security review): `/oauth/authorize` sets an HttpOnly, SameSite=Lax cookie (`fs_oauth_<hash of request id>`, `Path=/oauth`, scoped to the home domain so the cloud host sees it, 10 min) holding a random secret; the pending request stores its SHA-256. The consent page and its action refuse the request without the matching cookie, so a consent link sent to someone else is useless. The cookie is cleared once the request is decided.
- **The consent page never changes state on GET** (PR 4): the reconnect skip renders "Reconnecting…" and the form posts Allow itself from the browser, replacing PR 2's approve-on-render.
- **CIMD clients show their `client_id` host** on the consent screen ("published by claude.ai"), with a warning when it is under `NEXT_PUBLIC_SITE_DOMAIN` (a user-published site). Connected apps shows the same host, or the redirect host for DCR clients.
- **Cleanup** (PR 4): `/oauth/authorize`, `/oauth/token` and `/oauth/register` schedule a sweep with `after()` that deletes up to 100 rows per table: expired pending requests and tokens (rotated refresh tokens stay until they expire, for reuse detection), codes an hour past expiry (so a late replay still revokes), and clients (DCR or cached CIMD) with no grant 7 days after registration. No new indexes: the `expiresAt` ones exist and the client table stays small.
- **Token endpoint errors** (PR 4): rate-limited requests get `429` + `invalid_request` + `Retry-After` (not `slow_down`, a device-flow code), also on register and revoke; `invalid_client` 401s carry `WWW-Authenticate` with the scheme the client tried (RFC 6749 §5.2).
- **Narrower scope on refresh** (PR 4): `OAuthToken.scope` (nullable, null = the grant's) lets a refresh with a narrower `scope` issue an access token with just that scope; the new refresh token keeps the presented one's scope (RFC 6749 §6). With one scope today this is future-proofing.
- **Events**: `mcp_oauth_grant_refreshed` (token endpoint, after the response) and `mcp_oauth_grant_revoked` (dashboard). Revocation via `/oauth/revoke` is not captured.

## Drop the "beta" label: checklist

Only after the manual test bead passes in both apps.

- `content/flowershow-app/docs/agents/mcp.md`: title without "(beta)", remove the Beta callout, lead with the signed-in URL `https://flowershow.app/api/mcp/account`, keep the anonymous URL as "no account", replace "can't sign in to your account yet" with sign-in steps for Claude and ChatGPT, add "Disconnect" (dashboard) section.
- `content/flowershow-app/docs/sitemap.md`: entry title and description.
- `content/flowershow-app/publish-with-ai.md`: drop "(beta)" twice; mention sign-in.
- Changelog: new entry "Sign in to Flowershow from Claude and ChatGPT" with a real screenshot of the consent screen; leave the 2026-10-03 entry as history.
- Skill (`flowershow/skills`): update the MCP mention to the signed-in URL; bump version.
- ADR 0014 consequences: add a line pointing to this design; mark the February plan superseded.
- Close `flowershow-3fr`; unblock `flowershow-k8j` (directory submissions need OAuth plus a privacy policy URL and test account) and `flowershow-l0z` (launch post).
