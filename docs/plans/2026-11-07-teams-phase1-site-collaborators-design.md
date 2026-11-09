# Site collaborators (teams phase 1): design

Status: v2 after critique (Claude builder check and Codex, 2026-11-07). Rufus: "looks good" (2026-11-07); community feedback requested via [[2026-11-07-teams-options-for-community]] before build. Epic `flowershow-dbg`, GitHub #919. Inputs: [[2026-11-07-teams-codebase-recon]] and [[2026-11-07-teams-landscape-research]].

## Intent

Let several people manage one Flowershow site. Today a site has exactly one owner, so groups (Life Itself first) share a login or route everything through one person. Phase 1 adds **editors** to a site, invited by email by the owner. Organisations (one entity owning many sites, shared billing) are phase 2 and are decided later with usage data.

## Goals

- An owner invites people by email; they get the site in their dashboard and can publish to it from the web, MCP, API and (with the new CLI) the command line.
- The owner stays the single point for money, deletion, public address and access control.
- No change to URLs, billing or existing sites. Every existing site is simply an owner with zero members.
- Every authorization decision goes through `lib/site-authz.ts`. No new inline checks.

## Non-goals (phase 1)

- Organisations, org namespaces, org billing, seat billing.
- Deriving access from GitHub org membership or repo permissions.
- Admin or viewer roles, invite links, domain auto-join, SSO, audit log UI.
- Restricted readers (#1374) stays a separate track.
- Editors connecting, changing or disconnecting the GitHub repo, or changing `rootDir`.
- Ownership transfer (phase 1.5).

## Anti-goals

- A missed owner check that lets an editor delete, re-domain or re-bill a site, or lets a removed editor keep access.
- Breaking the CLI or Obsidian plugin for existing single-owner users.
- Per-seat pricing or anything that needs Stripe quantity handling.
- Granting access on an unverified email.

## Who it is for

Small groups co-running a site: Life Itself (dogfood), course and community sites, small NGOs. An editor is a trusted colleague, not an anonymous contributor.

## Decisions

### Roles

Two roles. **Owner** is `Site.userId`, unchanged, exactly one per site. **Editor** is a row in `SiteMember`.

| Action | Owner | Editor |
|---|---|---|
| Publish, sync, upload files (web, CLI, MCP, API) | yes | yes |
| Settings keys: comments, search, RSS, syntax mode, giscus, sidebar, built-with button, raw link, hide branding | yes | yes |
| Site config (`updateDbConfig`), including custom head, scripts, footer, navbar | yes | yes |
| Password protection on or off, set the password | yes | yes |
| Owner-cookie handshake on the published site (annotation moderation) | yes | yes |
| Moderate annotations | yes | yes |
| View publish history, status, dashboard | yes | yes |
| Custom domain (`SiteUpdateKey.customDomain`) | yes | no |
| Root directory (`SiteUpdateKey.rootDir`, wipes and re-syncs the site) | yes | no |
| Rename site (project name) | yes | no |
| Connect, reconnect, disconnect GitHub repo | yes | no |
| Invite, remove members, revoke invites | yes | no |
| Billing, plan, Stripe portal, bundle info | yes | no |
| Delete site | yes | no |
| Leave the site | n/a | yes |

Why password protection is editor-level: it is a day-to-day publishing choice ("hide this while we draft"), and editors already see the content. Custom domain, root directory and rename stay owner-only because they change the public address or wipe content and use the owner's GitHub installation.

Note on the published site: nobody bypasses the visitor password today (the edge middleware checks the visitor cookie only). The owner cookie exists for annotation moderation on the site, and that is what editors also get. A real signed-in bypass is a separate feature for owners and editors alike.

Why editors publish to GitHub-synced sites too: the owner can already CLI-publish to a GitHub-connected site and the next push overwrites it. Editors get the same behaviour, no new restriction.

### Plan gating

- **Which pricing plan:** collaborators are included in every **paid** plan, no extra charge and no seats: Premium ($5 per site) today, and Pro ($15, up to 5 sites) and Unlimited ($50) once the account-level plans approved on 2026-11-07 ship (product bead `flwrprd-ox8`, implementation epic `flowershow-gyj`). The gate is `site.plan === PREMIUM` now and moves to the plan resolver from `flowershow-da3` when it lands; `canManageSite` only needs a boolean "is paid". Organisations (phase 2) fit naturally as an account that holds a Pro or Unlimited plan.
- Inviting requires `site.plan === PREMIUM`. Free sites are owner-only. This makes "team collaboration" a true Premium feature.
- **Limit: 20 editors per site** (constant `MAX_SITE_MEMBERS`), and at most 20 pending invites per site. No seat billing. Raise the constant on request. Member counts per site go to PostHog as the demand signal for orgs.
- **If Premium lapses**, memberships stay but editors lose management access until the site is Premium again. Spelled out:
  - `canManageSite` returns false for editors when `plan !== PREMIUM`.
  - Dashboard: the site still appears under "Shared with me", greyed, with "Premium lapsed, ask the owner", and no link into the site pages (so no 404).
  - REST, sync and MCP return a distinct `premium_required` error (403), not "site not found".
  - Owner actions on members (remove, revoke invites) never require Premium, so the owner can always clean up. Inviting and accepting do require it; accept re-checks `plan` at accept time.

### Data model

Two additive tables, no backfill, no change to `Site`.

```prisma
enum SiteMemberRole { EDITOR }

model SiteMember {
  id        String         @id @default(cuid())
  site      Site           @relation(fields: [siteId], references: [id], onDelete: Cascade)
  siteId    String         @map("site_id")
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String         @map("user_id")
  role      SiteMemberRole @default(EDITOR)
  invitedBy String?        @map("invited_by")
  createdAt DateTime       @default(now()) @map("created_at")

  @@unique([siteId, userId])
  @@index([userId])
}

model SiteInvite {
  id         String         @id @default(cuid())
  site       Site           @relation(fields: [siteId], references: [id], onDelete: Cascade)
  siteId     String         @map("site_id")
  email      String                           // lower-cased, trimmed
  role       SiteMemberRole @default(EDITOR)
  tokenHash  String         @unique @map("token_hash")
  invitedBy  String         @map("invited_by")
  expiresAt  DateTime       @map("expires_at")
  createdAt  DateTime       @default(now()) @map("created_at")

  @@unique([siteId, email])
  @@index([email])
}
```

`Publish` gets an optional `userId` (`onDelete: SetNull`) so history shows who published. `SiteMemberRole` has one value now so Admin can be added later as an enum value.

The owner is never a `SiteMember` row. The anonymous sentinel user can never be a member or own members (claiming rewrites `Site.userId`; the claimed site has no members).

### Authorization

- `lib/site-authz.ts` keeps pure predicates. `canManageSite(userId, site)` takes `site: { userId: string; plan: Plan; members: Array<{ userId: string }> }` with **`plan` and `members` required** in the type, so a call site that forgets to load them is a compile error, not a silent denial. It returns true for the owner, or for a member when `plan === PREMIUM`.
- A Prisma select fragment `siteAuthzSelect(userId)` (`{ userId, plan, members: { where: { userId }, select: { userId: true } } }`) is the one way call sites load what the predicate needs. One membership row at most per check.
- `isSiteOwner` is unchanged and stays the check for every "no" in the table. In `site.update`, keys `customDomain` and `rootDir` require `isSiteOwner`; a table test classifies every `SiteUpdateKey` as owner-only or editor so a new key must be classified.
- The two remaining inline checks (`site.getById` where-clause; `site.user.id === auth.userId` in `/api/sites/[username]/[projectname]`) move to the helper. The unused `withSiteAuth` wrapper in `server/auth.ts` is deleted.
- Verification is by tests, not a grep gate: the implementation plan lists every `canManageSite` and `isSiteOwner` call site with a router or route test asserting editor allow or deny.
- List queries (`user.getSites`, `GET /api/sites`, MCP `listSites`) return owned sites plus sites where the user is a member, each with `role: 'owner' | 'editor'`. Bundle counts, rename uniqueness and `connectGitHub` stay owner-scoped by design.
- Token model is unchanged: a CLI or PAT token acts as its user across every site that user can manage. Removing a member takes effect on their next authenticated request because every request re-checks membership. A publish already in flight can still complete: presigned upload URLs stay valid until they expire (minutes) and the finaliser workflow does not authenticate. Accepted for v1; the owner sees the run in publish history with the editor's name.
- The owner-cookie handshake on the published site (`lib/site-owner-session.ts`) is edge-safe and loads the site before it knows the user, so it is reworked to read the cookie first and then check membership, and `/owner/me` re-checks membership on every call.

### Invites

1. Owner opens the site's **Members** tab, types an email, clicks Invite. Server checks: caller is owner, site is Premium, email is not the owner's, not already a member or pending, under the limits. Invites are owner-only and the per-site caps bound abuse; no separate daily rate limit in v1.
2. A `SiteInvite` row is created with a random 32-byte token (stored hashed, like `AccessToken`), expiry 14 days. Email via `sendTransactionalEmail` with a new React Email template `emails/site-invite.tsx`: who invited you, to which site, Accept button linking to `/invite/{token}`.
3. `/invite/{token}` requires sign-in (any provider; magic link means no GitHub account is needed). Accept succeeds only when the token hash matches, the invite is unexpired, the site is still Premium, the caller is not the owner, the member limit holds, and the invite email equals the signed-in user's email **and that email is verified** (`User.emailVerified` is set; unlike account linking's `isExistingUserEmailTrusted`, a linked Google account alone does not count, because Google may not have verified that address). On a mismatch the page says which address the invite was sent to and offers "sign in with that address" (magic link). There is **no** "accept with this account anyway".
4. Accept runs in one transaction: re-check, create `SiteMember`, delete the invite. Then redirect to the site dashboard. Concurrent accept, revoke or re-invite resolve by the transaction: the row is either consumed or gone.
5. On dashboard load, pending invites whose email equals the signed-in user's **trusted** email show as a banner with one-click Accept (same server path as step 3, minus the token). Untrusted email: no banner, link only.
6. Owner's Members tab lists pending invites with Revoke. No resend in v1: revoke and invite again. Expired invites are deleted lazily when the Members tab or accept path touches them; no scheduled sweep.

### Dashboard

- Site list: owned sites first, then "Shared with me" with an "Editor" badge and the owner's username on the card.
- Site pages: `site-tabs-layout.tsx` gate uses the widened `canManageSite`. New **Members** tab (owner: full management; editor: read-only list plus "Leave site").
- Settings page becomes role-aware: editors do not see Billing, Danger, Rename, Custom domain, Root directory or GitHub sections, and the page stops calling owner-only procedures (`stripe.getSiteSubscription`, `getBundleInfo`) for editors.
- Account deletion is unchanged in v1. It is already blocked while any owned site has an active subscription, and sites with members must be Premium, so the shared-site case only arises after a lapse. Revisit with transfer in phase 1.5.

### CLI, MCP and API

- `GET /api/sites` returns owned sites by default and adds shared sites only with `?includeShared=true` (each site has `role` and `owner.username`). Why: released CLIs resolve a bare site name from this list, so adding shared sites by default could make them sync into someone else's site. Any other `includeShared` value is a 400. MCP `list-sites` always includes shared sites. Shared sites whose Premium has lapsed are left out of REST and MCP lists (only the dashboard shows them, greyed). Contract updated first (`packages/api-contract`).
- `GET /api/sites/{username}/{project}` returns extended data to anyone who `canManageSite`, so editors address a shared site as `owner/name`.
- MCP: `listSites` includes shared sites with `role` and owner; all other tools already go through `assertCanManage`. MCP is in the v1 done-check.
- CLI (`apps/cli`), its own bead in phase 1 but not blocking the dogfood (Life Itself publishes via GitHub sync and the web): `fl list` shows shared sites as `owner/name`; `fl publish` accepts `owner/name` or a stored `siteId`; a bare `name` resolves only under the caller's own sites, as today. New configs store `siteId` for every site plus `siteName` as `owner/name` for shared sites, so later publishes do not depend on names, and an old CLI reading a shared link fails on the slash instead of creating a duplicate site. Old CLIs with a bare name keep today's behaviour. The Obsidian plugin follows the same rule in its own repo (follow-up bead).
- No REST endpoints for member management in phase 1. Members are managed in the dashboard through tRPC (`siteMember.list`, `invite`, `revokeInvite`, `remove`, `leave`). An API can be added when an agent needs it.

### Emails

- `site-invite`: to the invitee. The only email in v1.

### Migration and rollout

- One additive Prisma migration. No data backfill. `prisma migrate deploy` runs in the Vercel build as today.
- Ship behind the Premium gate only; no feature flag. Dogfood on a Life Itself site first, then announce in the changelog and restore a truthful "Team collaboration" line to the Premium feature list.
- Docs page `content/flowershow-app/docs/reference/collaborators.md`; update `CONTEXT.md` (Site definition, annotations moderation) and add ADR 0016 for membership and roles.
- Implementation plan: [[2026-11-07-teams-phase1-site-collaborators-plan]] (16 tasks in four PRs: foundation, members UI, API and MCP, CLI; beads `flowershow-dbg.1` to `.5`).

### Phase 1.5 (soon after, same model)

- Ownership transfer to an existing editor, two-sided (owner initiates, editor accepts). Handles `(userId, projectName)` uniqueness under the new owner, keeps the frozen subdomain, leaves the Stripe subscription to cancel at period end with a prompt for the new owner to subscribe.
- Account deletion offers transfer before delete.
- Resend invite; `site-member-joined` email to the owner.
- Destructive-sync guard: a replace-mode sync that would delete pages last published by someone else requires explicit confirmation (CLI and MCP). Useful for single owners too.
- Admin role if asked for (enum value plus a few table rows).
- Member management over REST and MCP for agent use.

### Phase 2 (organisations), decide later

Trigger to revisit: several Premium customers asking for one bill across sites, or sites approaching the 20-editor limit. Out of scope here, but phase 1 is built so it evolves without a rewrite:

- `Organization { id, slug, name }` and `OrgMember { orgId, userId, role: OWNER | ADMIN | MEMBER }` are new tables. `Site` gains an optional `orgId`; `Site.userId` stays as the human owner of record for personal sites and becomes the org's billing contact for org sites.
- `siteRole()` is the only place that changes: it also returns `editor` (or `owner` for org owners and admins) when the site's `orgId` has the user as a member. Call sites, lists and the CLI already work in terms of `role`, so they need no change. `siteAuthzSelect` grows one join.
- Per-site invites keep working on org sites; they are how an org brings in an outside contributor for one site.
- Billing: an org subscription is a different Stripe model (one customer, one subscription covering N sites or seats) and is where the fs-plans work (Unlimited plan, limits model) plugs in. Per-site Premium stays for personal sites.
- Namespace: org sites get `{project}-{orgslug}` subdomains through the existing `buildSubdomain` rule; existing subdomains stay frozen as today (ADR-0011).
- GitHub-org link is optional on top: an installation on a GitHub org can be attached to the Flowershow org, which also closes #1329 for org members.

Community-facing summary of the options: [[2026-11-07-teams-options-for-community]].

## Risks and how this design handles them

- **Missed owner check widens access.** All authz is in one file; the predicate type forces call sites to load plan and membership; every call site has an allow/deny test; `site.update` keys are classified by a table test.
- **Two editors overwrite each other via replace-mode sync.** Pre-existing single-user risk made more likely. Phase 1 records who published each run; the confirmation guard is phase 1.5. Documented in the collaborators docs page.
- **Invite reaches the wrong person.** Acceptance needs a signed-in account whose trusted email equals the invited address. A forwarded link alone grants nothing.
- **Lapsed Premium confuses editors.** Greyed card with a clear message, distinct error code on API and MCP, owner can still remove members.
- **Owner deletes account.** Existing active-subscription block covers Premium sites; lapsed shared sites cascade as today. Transfer in 1.5.

## Left to the builder

- Exact UI copy and layout of the Members tab and the invite banner.
- Test plan per surface: pure predicate table tests, router tests with the mock db, REST route tests, one Playwright flow for invite and accept.
- Order of PRs (suggested: schema and predicate; lists and dashboard; invites; MCP and API; CLI).

## Decisions taken in critique (for Rufus to check, not re-decide)

- Dropped "accept with this account anyway", resend, the Inngest sweep, the daily rate limit, the account-deletion warning and the grep CI gate from v1.
- Named the editor limit (20) instead of calling it uncapped.
- Made `customDomain` and `rootDir` owner-only inside the shared `site.update` mutation.
- Corrected the password-bypass row: it is the annotation owner-cookie, not a visitor-password bypass.

## Open questions for Rufus

1. Password protection for editors: yes (this doc) or owner-only (the research note's recommendation)?
2. Life Itself dogfood after the 11–17 launch, as planned, with web and MCP first and the CLI following?
