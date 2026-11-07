# Site collaborators (teams phase 1): design

Status: draft for Rufus's OK. Epic `flowershow-dbg`, GitHub #919. Inputs: [[2026-11-07-teams-codebase-recon]] and [[2026-11-07-teams-landscape-research]].

## Intent

Let several people manage one Flowershow site. Today a site has exactly one owner, so groups (Life Itself first) share a login or route everything through one person. Phase 1 adds **editors** to a site, invited by email by the owner. Organisations (one entity owning many sites, shared billing) are phase 2 and are decided later with usage data.

## Goals

- An owner invites people by email; they get the site in their dashboard and can publish to it from the web, CLI and MCP.
- The owner stays the single point for money, deletion and access control.
- No change to URLs, billing or existing sites. Every existing site is simply an owner with zero members.
- Every authorization decision goes through `lib/site-authz.ts`. No new inline checks.

## Non-goals (phase 1)

- Organisations, org namespaces, org billing, seat billing.
- Deriving access from GitHub org membership or repo permissions.
- Admin or viewer roles, invite links, domain auto-join, SSO, audit log UI.
- Restricted readers (#1374) stays a separate track.
- Editors connecting, changing or disconnecting the GitHub repo.

## Anti-goals

- A missed owner check that lets an editor delete, re-domain or re-bill a site, or lets a removed editor keep access.
- Breaking the CLI or Obsidian plugin for existing single-owner users.
- Per-seat pricing or anything that needs Stripe quantity handling.

## Who it is for

Small groups co-running a site: Life Itself (dogfood), course and community sites, small NGOs. An editor is a trusted colleague, not an anonymous contributor.

## Decisions

### Roles

Two roles. **Owner** is `Site.userId`, unchanged, exactly one per site. **Editor** is a row in `SiteMember`.

| Action | Owner | Editor |
|---|---|---|
| Publish, sync, upload files (web, CLI, MCP, API) | yes | yes |
| Change settings: appearance, navigation, content, features, analytics, config | yes | yes |
| Password protection on or off, set the password | yes | yes |
| Bypass the site password and owner cookie on the published site | yes | yes |
| Moderate annotations | yes | yes |
| View publish history, status, dashboard | yes | yes |
| Custom domain | yes | no |
| Rename site (project name) | yes | no |
| Connect, reconnect, disconnect GitHub repo | yes | no |
| Invite, remove members, revoke invites | yes | no |
| Billing, plan, Stripe portal | yes | no |
| Delete site | yes | no |
| Leave the site | n/a | yes |

Why password protection is editor-level: it is a day-to-day publishing choice ("hide this while we draft"), and editors already see the content. Custom domain and rename stay owner-only because they change the public address and interact with billing and the frozen subdomain.

Why editors publish to GitHub-synced sites too: the owner can already CLI-publish to a GitHub-connected site and the next push overwrites it. Editors get the same behaviour, no new restriction. The overwrite risk is pre-existing and documented.

### Plan gating

- Inviting requires `site.plan === PREMIUM`. Free sites are owner-only. This makes "team collaboration" a true Premium feature.
- Members are free and uncapped. A constant `MAX_SITE_MEMBERS = 20` guards abuse and is not a product limit. Member counts per site are logged to PostHog as the demand signal for orgs.
- If Premium lapses, memberships stay but `canManageSite` returns false for editors until the site is Premium again. Resubscribing restores everyone. The dashboard shows the site to editors with a "Premium lapsed" notice.

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

`Publish` gets an optional `userId` so history shows who published. `SiteMemberRole` has one value now so that Admin can be added later without a schema redesign.

The owner is never a `SiteMember` row. Membership of the anonymous sentinel user is impossible (claiming rewrites `Site.userId`; the claimed site has no members).

### Authorization

- `lib/site-authz.ts` keeps pure predicates. `canManageSite(userId, site)` takes `site: { userId: string; plan: Plan; members?: Array<{ userId: string }> }` and returns true for the owner, or for a member when `site.plan === PREMIUM`. Missing `members` fails closed (editor denied), so a forgotten include can never widen access.
- A Prisma helper `siteWithMembersFor(userId)` (select `{ userId, plan, members: { where: { userId }, select: { userId: true } } }`) is the one way call sites load what the predicate needs. One membership row at most is fetched per check.
- `isSiteOwner` is unchanged and stays the check for every "no" in the table.
- The two remaining inline checks (`site.getById` where-clause, `/api/sites/[username]/[projectname]` extended data) move to the helper.
- List queries (`user.getSites`, `GET /api/sites`, MCP `listSites`) return owned sites plus sites where the user is a member, each with `role: 'owner' | 'editor'`. Bundle counts, rename uniqueness and `connectGitHub` stay owner-scoped by design.
- Token model is unchanged: a CLI or PAT token acts as its user across every site that user can manage. Removing a member revokes their access at once because every request re-checks membership. No token revocation is needed.

### Invites

1. Owner opens the site's **Members** tab, types an email, clicks Invite. Server: site is Premium, caller is owner, email is not the owner's, not already a member, not already invited, under `MAX_SITE_MEMBERS`, rate limit of 20 invites per site per day and 50 per user per day.
2. A `SiteInvite` row is created with a random 32-byte token (stored hashed, like `AccessToken`), expiry 14 days. An email goes out via `sendTransactionalEmail` with a new React Email template (`emails/site-invite.tsx`): who invited you, to which site, Accept button linking to `/invite/{token}`.
3. `/invite/{token}` requires sign-in (any provider; magic link means no GitHub account is needed). On accept, the server checks the token hash, expiry, and that the invite email matches the signed-in user's `email` (case-insensitive). If it does not match, the page says which address the invite was sent to and offers "sign in with that account" or "accept with this account anyway". The second option is allowed because the person holds the secret link, which is how Vercel and Netlify behave; the owner sees the actual account in the member list and can remove it.
4. Accept creates the `SiteMember` row, deletes the invite, and redirects to the site dashboard. The owner's **Members** tab also lists pending invites with Revoke and Resend (resend reuses the row, new token, new expiry).
5. On every dashboard load, pending invites whose email matches the signed-in user's email are shown as a banner with one-click Accept, so an invite never depends on the email link alone.
6. Expired invites are deleted lazily on access and by a daily Inngest sweep.

### Dashboard

- Site list: owned sites first, then a "Shared with me" section with an "Editor" badge and the owner's username on the card.
- Site pages: `site-tabs-layout.tsx` gate uses the widened `canManageSite`. New **Members** tab (owner: full management; editor: read-only list plus "Leave site").
- Settings page becomes role-aware: editors do not see Billing, Danger, Rename, Custom domain or GitHub sections, and the page stops calling owner-only procedures (`stripe.getSiteSubscription`, `getBundleInfo`) for editors.
- Account deletion: if the user owns sites that have members, the confirmation lists them with member counts and says those sites will be deleted and the editors will lose access. Cascade behaviour is unchanged; transfer comes in phase 1.5.

### CLI, MCP and API

- `GET /api/sites` returns owned plus shared sites, each with `role` and `owner.username`. Contract updated first (`packages/api-contract`).
- `GET /api/sites/{username}/{project}` keeps working for owners. For a shared site the editor must address it by the owner's username, which this route already supports when `username` is any user; it now returns extended data to anyone who `canManageSite`.
- CLI (`apps/cli`): `fl list` shows shared sites with the owner prefix. `fl publish` resolves a configured `siteName` first under the caller's own sites, then under shared sites; if both exist it errors and asks for `owner/name`. New `fl` configs store `siteId` for all sites so later publishes do not depend on names. The Obsidian plugin follows the same rule in its own repo (follow-up bead).
- MCP: `listSites` includes shared sites with `role`; everything else already goes through `assertCanManage`.
- No REST endpoints for member management in phase 1. Members are managed in the dashboard through tRPC (`siteMember.list`, `invite`, `revokeInvite`, `resendInvite`, `remove`, `leave`). An API can be added when an agent needs it.

### Emails

- `site-invite`: to the invitee.
- `site-member-joined`: to the owner when someone accepts (one line, low priority, can be dropped if noisy).
- `site-member-removed`: to the removed editor. Optional; builder's call.

### Migration and rollout

- One additive Prisma migration. No data backfill. `prisma migrate deploy` runs in the Vercel build as today.
- Ship behind the Premium gate only; no feature flag. Dogfood on a Life Itself site first, then announce in the changelog and restore a truthful "Team collaboration" line to the Premium feature list.
- Docs page `content/flowershow-app/docs/collaborators.md`; update `CONTEXT.md` (Site definition, annotations moderation) and add an ADR for membership and roles.

### Phase 1.5 (soon after, same model)

- Ownership transfer to an existing editor, two-sided (owner initiates, editor accepts). Handles `(userId, projectName)` uniqueness under the new owner, keeps the frozen subdomain, leaves the Stripe subscription to cancel at period end with a prompt for the new owner to subscribe.
- Account deletion offers transfer before delete.
- Admin role if asked for (enum value plus a few table rows).
- Member management over REST and MCP for agent use.

### Phase 2 (organisations), decide later

Trigger to revisit: several Premium customers asking for one bill across sites, or sites with more than about 5 members. Then: `Organization`, `OrgMember`, org as site owner, org billing, optional GitHub-org link. Out of scope here.

## Risks and how this design handles them

- **Missed owner check widens access.** All authz is in one file with a fail-closed predicate; the implementation plan includes a grep gate that fails CI if `site.userId ===` or `userId: ctx.session.user.id` appears in a site-scoped query outside the helper and the known owner-scoped list.
- **Two editors overwrite each other via CLI sync.** Pre-existing single-user risk made more likely. Mitigation in phase 1: publish history shows who published each run. A "this sync would delete N pages last published by someone else" warning is a follow-up bead.
- **Invite to the wrong account.** Accept-with-this-account is explicit, the owner sees the real account, and the dashboard banner matches on the account email.
- **Lapsed Premium confuses editors.** Dashboard notice, and the site stays listed.
- **Owner deletes account.** Named warning in the deletion flow; transfer in 1.5.

## Left to the builder

- Exact UI copy and layout of the Members tab and the invite banner.
- Whether `site-member-removed` email ships.
- Inngest sweep schedule and rate-limit storage (reuse `OAuthRateLimit` pattern or a simple count query).
- Test plan per surface: pure predicate table tests, router tests with the mock db, REST route tests, one Playwright flow for invite and accept.

## Open questions for Rufus

1. Password protection for editors: yes (this doc) or owner-only (the research note's recommendation)?
2. Uncapped members with a soft abuse constant, or a visible product cap?
3. Life Itself dogfood after the 11–17 launch, as planned?
