# Teams: codebase recon (2026-11-07)

Facts about the current code that constrain the design of site collaborators (phase 1 of #919, bead `flowershow-dbg`). Paths are under `apps/flowershow/` unless noted. Companion to [[2026-11-07-teams-landscape-research]] and the design doc.

## Authorization today

- `lib/site-authz.ts` exports two pure predicates, `isSiteOwner(userId, site)` and `canManageSite(userId, site)`. Both take `site: { userId }`. `canManageSite` currently just delegates to `isSiteOwner` and was written as the seam to widen to editors (PR #1505).
- `canManageSite` call sites (would widen to editors): `server/api/routers/site.ts` (update, setPasswordProtection, updateDbConfig, getDbConfig, getAssetUploadUrl, getLatestPublishState, getPublishHistory), `routers/annotation.ts`, `server/auth.ts` (`withSiteAuth`), `app/(cloud)/dashboard/site/[id]/site-tabs-layout.tsx`, `app/api/sites/id/[siteId]/{route,status,files}`, `lib/site-auth.ts` (`authorizeSiteRequest`, used by sync), `lib/mcp/deps.ts` (`assertCanManage`), `lib/annotations/http.ts`.
- `isSiteOwner` call sites (stay owner-only): rename, delete, connect/disconnect/reconnect GitHub, all of `routers/stripe.ts`, REST DELETE site, owner cookie authorize/callback, claim, `lib/site-access.ts` password bypass (`TODO(#919)`), `lib/site-owner-session.ts` (marked to widen in #919).
- Two authorization checks still inline, both marked `TODO(#919)`: `routers/site.ts` `getById` (`where: { id, userId }`, used by settings/history/welcome pages) and `app/api/sites/[username]/[projectname]/route.tsx` (owner gets extended data).
- Owner-scoped queries that are lists or uniqueness, not authz, but all need to change for shared sites: `routers/user.ts getSites` (dashboard list), `app/api/sites/route.ts` (existing-site check and GET list), `lib/mcp/deps.ts listSites`, `routers/stripe.ts` bundle counts, `connectGitHub` installation lookup, rename uniqueness.

## Data model

- `Site.userId` is the single owner (`onDelete: Cascade`). `@@unique([userId, projectName])`, `subdomain @unique`, `customDomain @unique`. `plan Plan @default(FREE)`.
- `Subscription` is one per site (`siteId @unique`, `stripeCustomerId @unique`, created with `customer_email: site.user.email`). Bundle discounts count the owner's sites. All billing emails go to `site.user`.
- `enum Role { USER ADMIN }` is platform admin only. No membership, invite or team tables exist.
- NextAuth: GitHub, Google and Email (magic link via Resend) providers; JWT sessions; account linking gated on verified email (`lib/account-linking.ts`). `User.email` is unique but nullable.
- Tokens: `AccessToken` (CLI and PAT, hashed, no scopes) resolves to `{ userId }`. MCP OAuth has one scope, `sites:write`, and calls the REST handlers in-process.
- `GitHubInstallation` is `@@unique([installationId, userId])` (many users can link one installation in principle), rows created only when the user completes the install or via webhook sender match. `connectGitHub` requires an installation linked to the caller; reconnect uses the owner's.
- Anonymous sites belong to sentinel user `ANONYMOUS_USER_ID`; claiming rewrites `Site.userId` in one `updateMany`.

## Addressing and the CLI

- Sites are served at `{subdomain}.flowershow.me`; the subdomain is built from `projectName` and the owner's username once and frozen (ADR-0011). Internally everything is still keyed by owner username (`/site/{username}/{project}`, `GET /api/sites/{username}/{project}`).
- The CLI resolves a site by name under the caller's own username (`apps/cli/cmd/publish.go` → `GetSiteByName(ownUsername, name)`), then works by id. Local config stores `siteName` for account sites and `siteId` only for anonymous sites. An editor running `fl publish` would not find the shared site and would create a duplicate in their own account.
- `GET /api/sites` and MCP `listSites` return owned sites only.

## Dashboard

- Site list: `app/(cloud)/dashboard/page.tsx` via `api.user.getSites` and `components/dashboard/site-card.tsx`.
- Per-site pages under `dashboard/site/[id]/` with `SiteTabs` (Settings, History, Annotations). Settings is one long anchored page; it calls `site.getById` (owner-scoped), `stripe.getSiteSubscription` (owner-only, throws) and `stripe.getBundleInfo` unconditionally, so an editor would 404 or crash today.
- Admin UI exists only as a role check on `dashboard/admin` and `site.getAll`.

## Email

- Resend via `lib/email.ts` and `lib/transactional-email.ts` (never throws, idempotency keys). React Email templates in `emails/` (welcome, magic-link, site-created, premium-*, custom-domain-*, ...). No invite template yet.

## Plan gating and billing

- `lib/feature-flags.ts` gates every Premium feature on `site.plan === PREMIUM`, set by the Stripe webhook. Free plan has no collaborator or seat concept. Publish limits are per request and plan-independent.

## Deletion, transfer, admin

- Site delete is owner-only (tRPC and REST) and cleans R2, Typesense and Vercel domains.
- No ownership transfer exists. Account delete is blocked only while a site has an `active` subscription; it cascades to sites without cleaning R2/Typesense/Vercel.

## Tests and migrations

- Vitest unit tests next to files; routers tested in `server/api/routers/__tests__/` with a hand-written mock db passed to `appRouter.createCaller`. `lib/site-authz.test.ts` is a pure table test.
- Migrations: `pnpm prisma migrate dev --create-only --name x`, then hand-edit; production runs `prisma migrate deploy` in the Vercel build.
- `CONTEXT.md` says a Site is "a user's published website" and annotations are owner-only; both need updating. REST changes go through `packages/api-contract` first.

## Gotchas for collaborators

1. Per-owner names plus name-based CLI resolution: editors must resolve by id, or the list must include shared sites and disambiguate.
2. Owner-scoped reads in the dashboard (`getById`, `getSiteSubscription`) break for editors.
3. GitHub installation links are per user; editors cannot connect or reconnect repos without their own installation.
4. Billing, bundle discounts and billing emails are tied to the owner; keep them owner-only.
5. Deleting the owner's account cascades to shared sites.
6. Owner-only behaviour on the published site (password bypass, owner cookie, annotation moderation via cookie) each needs a decision for editors.
7. Tokens have no scopes: a collaborator's PAT reaches every site they can manage.
8. Invites by email must match on verified `User.email`; magic-link sign-in means invitees need no GitHub or Google account.
