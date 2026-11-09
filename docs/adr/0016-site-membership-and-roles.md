# ADR 0016: Sites have one owner and optional editors; organisations come later

**Status**: Accepted (Teams phase 1, 2026-11)

## Context

A site has exactly one owner (`Site.userId`), so groups share a login or route everything through one person (GitHub #919). We need several people to manage one site without changing URLs, billing or existing sites, and without an owner check being missed in the many places that assume a single owner. Design: `docs/plans/2026-11-07-teams-phase1-site-collaborators-design.md`.

## Decision

- **Two roles.** The owner stays `Site.userId`, exactly one per site. An editor is a `SiteMember` row (`SiteMemberRole` has the one value `EDITOR`, so Admin can be added later). The owner is never a `SiteMember` row. Both tables are additive, with no backfill: every existing site is an owner with zero members.
- **Per-site collaborators before organisations, on purpose.** Phase 1 solves "several people run this site" with no change to namespaces or Stripe. Organisations (one entity owning many sites, shared billing) wait for usage data. The design's "Phase 2 (organisations), decide later" section gives the trigger and how this model extends: `siteRole()` is the only place that changes.
- **All authorization goes through `lib/site-authz.ts`.** `canManageSite` is true for the owner, or for a member when `site.plan === PREMIUM`. `isSiteOwner` guards every owner-only action: custom domain, root directory, rename, the GitHub connection, inviting and removing, billing, deleting the site. The `canManageSite` site type requires `plan` and `members`, and `siteAuthzSelect(userId)` is the one way to load them, so a call site that forgets them is a compile error rather than a silent denial.
- **Premium gating.** Inviting and accepting need `site.plan === PREMIUM`; accept re-checks at accept time. Removing and revoking never do, so the owner can always clean up. When Premium lapses, memberships stay and editors lose access until the owner renews: REST, sync and MCP return 403 `premium_required`, never "site not found", and the dashboard shows the site greyed under "Shared with me".
- **Invites are bound to a verified email.** A random 32-byte token is stored only as its SHA-256 hash (like `AccessToken`) and expires after 14 days. At most 20 editors and 20 pending invites per site. Accepting needs the invited address to equal the signed-in account's email, and `User.emailVerified` to be set. A linked Google account alone doesn't count, as Google may not have verified the address. There is no "accept with this account anyway": a mismatched or unverified account gets a sign-in link to the invited address. So a forwarded link grants nothing.
- **`GET /api/sites` returns only owned sites unless called with `?includeShared=true`.** Released CLIs resolve a bare site name from this list, so returning shared sites by default could make them sync into someone else's site. Any other value is a 400. MCP `list-sites`, which has no such clients, always includes shared sites. Shared sites whose Premium has lapsed are left out of REST and MCP lists.
- **Member management is dashboard-only in phase 1** (tRPC `siteMember.*`). There are no REST or MCP endpoints for it.

## Consequences

- Lists return shared sites with `role` and the owner's username. The CLI addresses a shared site as `owner/name` or by a stored `siteId`, and a bare name only ever means the caller's own site, so a shared site with the same name can't be hit by accident.
- Tokens are unchanged: a CLI or PAT token acts as its user across every site that user can manage. Every request re-checks membership, so removal applies on the next request; a publish already in flight can still finish.
- Editors can overwrite each other: a replace-mode publish from a different folder deletes what isn't in it. Phase 1 records who published each run (`Publish.userId`) and documents the risk. A destructive-sync guard is planned for phase 1.5, with ownership transfer and resend.
- Editors can change custom head code and scripts, and turn password protection on or off, so an editor is a trusted colleague, not an anonymous contributor.
- Deleting annotations is now open to editors as well as the owner, amending ADR 0015.
