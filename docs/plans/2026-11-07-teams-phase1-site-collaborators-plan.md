# Site collaborators (teams phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Premium site's owner invite editors by email, who can then publish to and configure the site from the dashboard, REST API, MCP and CLI, while money, deletion, address and access control stay with the owner.

**Architecture:** Two additive tables (`SiteMember`, `SiteInvite`) and an optional `Publish.userId`. Every authorization decision goes through `lib/site-authz.ts`: `canManageSite` widens to editors on Premium sites and takes a site shape whose `plan` and `members` are required, loaded by one select fragment `siteAuthzSelect(userId)`; `isSiteOwner` stays the check for every owner-only action. Members are managed in the dashboard over a new `siteMember` tRPC router; list endpoints return owned plus shared sites with a `role`.

**Tech Stack:** Next.js (app router, RSC, server actions), tRPC, Prisma/Postgres, NextAuth (JWT, magic link via Resend), React Email, Vitest, `@flowershow/api-contract` (Zod to OpenAPI), Go CLI (`apps/cli`, cobra).

**Spec:** `docs/plans/2026-11-07-teams-phase1-site-collaborators-design.md` (codebase facts: `docs/plans/2026-11-07-teams-codebase-recon.md`). Epic bead `flowershow-dbg`, GitHub #919.

## Global Constraints

- Two roles only. Owner is `Site.userId` (exactly one). Editor is a `SiteMember` row. `enum SiteMemberRole { EDITOR }` has one value. The owner is never a `SiteMember` row.
- `canManageSite(userId, site)` is true for the owner, or for a member when `site.plan === PREMIUM`. Its `site` type has `plan` and `members` **required**.
- Every "no" in the spec's role table uses `isSiteOwner`: `customDomain`, `rootDir`, rename, connect/reconnect/disconnect GitHub, invite/remove/revoke, all of `stripe.*`, delete site.
- Inviting requires `site.plan === PREMIUM`; accept re-checks `plan` at accept time. Owner actions on members (remove, revoke) never require Premium.
- `MAX_SITE_MEMBERS = 20` editors per site; at most 20 pending invites per site (`MAX_PENDING_INVITES = 20`).
- Invite token: random 32 bytes, stored only as its SHA-256 hex hash (same as `AccessToken`), expires after 14 days. Invite email is lower-cased and trimmed.
- Accept requires: token hash matches, invite unexpired, site still Premium, caller is not the owner, member limit holds, invite email equals the signed-in user's email **and** that email is verified (`User.emailVerified` is set; a linked Google account alone does not count, as Google may not have verified the address). There is no "accept with this account anyway".
- Lapsed Premium: REST, sync and MCP return HTTP 403 `{ error: 'premium_required' }` to an editor, never "site not found".
- No resend, no scheduled sweep, no daily invite rate limit, no feature flag, no REST or MCP endpoints for member management in phase 1.
- No new inline authorization checks anywhere; no `site.userId === x` comparisons outside `lib/site-authz.ts`.
- REST changes go through `packages/api-contract` first (`AGENTS.md`). Markdown is never hard-wrapped.
- Every commit message ends with the line `Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK`.

## Review Focus

1. **A `members` array that is not filtered to the caller** (a future call site loads all members, or passes someone else's row): the predicate must match `userId`, never `members.length > 0`. Pinned by `canManageSite denies a stranger on a site that has other editors` (Task 2).
2. **Invite email in a different case or with spaces** (`" Ada@Example.com"` invited, account email `ada@example.com`): invite stores `ada@example.com`, accept succeeds, and the owner's own address in any case is refused. Pinned by `invite normalises the email and refuses the owner's address in any case` (Task 8) and `accept matches emails case-insensitively` (Task 9).
3. **A removed editor who still holds the site-host owner cookie**: `/owner/me` says false and annotation moderation returns 401 on the next request. Pinned by `getSiteManagerFromRequest rejects a cookie for a user who is no longer a member` (Task 6).
4. **CLI bare name equal to a shared site's name** (editor runs `fl --name notes` and Bob shares a site called `notes`): the CLI must never sync into Bob's site from a bare name. Pinned by `TestResolveSite_BareNameIgnoresSharedSite` and `TestPublish_BareNameMatchingSharedSite_NeverSyncsShared` (Task 14).
5. **A stale invite link after revoke or re-invite**: the old token must fail with "invite not found" and never attach the user. Pinned by `accept refuses a token whose invite was revoked and re-sent` (Task 9).

---

## File map

| File | Responsibility |
|---|---|
| `apps/flowershow/prisma/schema.prisma` + `prisma/migrations/<ts>_add_site_members/migration.sql` | `SiteMember`, `SiteInvite`, `SiteMemberRole`, `Publish.userId` |
| `apps/flowershow/lib/site-authz.ts` | `SiteAuthzFields`, `siteAuthzSelect`, `siteRole`, `canManageSite`, `isSiteOwner`, premium-required constants |
| `apps/flowershow/server/api/types.ts` | `SITE_UPDATE_KEY_ROLE` classification next to `SiteUpdateKey` |
| `apps/flowershow/lib/site-auth.ts` | `siteAccessDenied(role)` REST 403 helper; sync auth |
| `apps/flowershow/lib/site-invites.ts` (new) | limits, TTL, token generation and hashing, email normalisation, invite URL |
| `apps/flowershow/server/api/routers/site-member.ts` (new) | `siteMember` tRPC router |
| `apps/flowershow/emails/site-invite.tsx` (new) | invite email |
| `apps/flowershow/app/(cloud)/dashboard/invite/[token]/` (new) | invite accept page (`/invite/{token}` on the cloud host is rewritten to `/dashboard/invite/{token}` by `middleware.ts:146-149`) |
| `apps/flowershow/app/(cloud)/dashboard/site/[id]/members/` (new) | Members tab |
| `apps/flowershow/components/dashboard/members-panel.tsx`, `invite-banner.tsx` (new) | Members tab UI, dashboard banner |
| `packages/api-contract/src/schemas.ts`, `src/routes/sites.ts`, `src/routes/anonymous.ts` | `role`, `owner`, `premium_required` |
| `apps/cli/internal/api/client.go`, `cmd/site_ref.go` (new), `cmd/site_resolve.go`, `cmd/list.go`, `cmd/publish.go`, `internal/localconfig/localconfig.go` | shared sites in the CLI |

---

# PR A: membership foundation

Ships with zero members in the database, so behaviour for every existing user is unchanged. CI green and `pnpm exec tsc --noEmit` clean at the end of the PR (TypeScript errors after Task 2 are the checklist for Tasks 3 to 6).

### Task 1: Prisma schema and migration

**Files:**
- Modify: `apps/flowershow/prisma/schema.prisma:19-40` (User), `:107-159` (Site), `:308-321` (Publish); add enum and two models after `SiteOwnerCode` (`:272-282`)
- Create: `apps/flowershow/prisma/migrations/<timestamp>_add_site_members/migration.sql`

**Interfaces:**
- Produces: Prisma models `SiteMember { id, siteId, userId, role, invitedBy, createdAt }`, `SiteInvite { id, siteId, email, role, tokenHash, invitedBy, expiresAt, createdAt }`, enum `SiteMemberRole.EDITOR`, `Publish.userId: string | null`, relations `Site.members`, `Site.invites`, `User.siteMemberships`, `User.publishes`, `Publish.user`.

- [ ] **Step 1: Edit the schema.** Add the two models and enum exactly as in the spec's "Data model" block. Add `members SiteMember[]` and `invites SiteInvite[]` to `Site`; `siteMemberships SiteMember[]` and `publishes Publish[]` to `User`; to `Publish` add `userId String? @map("user_id")` and `user User? @relation(fields: [userId], references: [id], onDelete: SetNull)`. Table names follow the existing convention (model name, no `@@map`).

- [ ] **Step 2: Generate the migration without applying it.** With the local Postgres up (`pnpm dev` from the repo root starts it):

Run: `cd apps/flowershow && pnpm prisma migrate dev --create-only --name add_site_members`
Expected: a new folder `prisma/migrations/<YYYYMMDDHHMMSS>_add_site_members/` (Prisma's timestamp; matches the existing `20261018150000_oauth_token_scope` style).

- [ ] **Step 3: Hand-check the SQL.** It must be additive only: `CREATE TYPE "SiteMemberRole" AS ENUM ('EDITOR')`, `CREATE TABLE "SiteMember"` and `"SiteInvite"` with snake_case columns, `ALTER TABLE "Publish" ADD COLUMN "user_id" TEXT`, unique indexes `SiteMember_site_id_user_id_key`, `SiteInvite_token_hash_key`, `SiteInvite_site_id_email_key`, indexes on `SiteMember.user_id` and `SiteInvite.email`, FKs `ON DELETE CASCADE` to `Site` and `User` for members, `ON DELETE CASCADE` to `Site` for invites, and `Publish_user_id_fkey ... ON DELETE SET NULL ON UPDATE CASCADE`. Delete any line that drops or alters an existing column (none expected). No backfill.

- [ ] **Step 4: Validate and generate.**

Run: `cd apps/flowershow && pnpm prisma validate && pnpm prisma migrate dev && pnpm prisma generate`
Expected: "The schema is valid", migration applied locally, client generated.

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/prisma/schema.prisma apps/flowershow/prisma/migrations/*_add_site_members
git commit -m "feat(db): SiteMember, SiteInvite and Publish.userId for site collaborators" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 2: Widen the authorization predicate

**Files:**
- Modify: `apps/flowershow/lib/site-authz.ts:1-32`
- Test: `apps/flowershow/lib/site-authz.test.ts:1-27` (rewrite)

**Interfaces:**
- Consumes: `Plan` from `@prisma/client` (Task 1).
- Produces:
  - `type SiteAuthzFields = { userId: string; plan: Plan; members: ReadonlyArray<{ userId: string }> }`
  - `function siteAuthzSelect(userId: string): { userId: true; plan: true; members: { where: { userId: string }; select: { userId: true } } }` (typed with `satisfies Prisma.SiteSelect`)
  - `type SiteRole = 'owner' | 'editor' | 'lapsed_editor'`
  - `function siteRole(userId: string | null | undefined, site: SiteAuthzFields | null | undefined): SiteRole | null`
  - `function canManageSite(userId, site: SiteAuthzFields | null | undefined): boolean` (true iff `siteRole` is `owner` or `editor`)
  - `function isSiteOwner(userId, site: { userId: string } | null | undefined): boolean` (unchanged)
  - `const PREMIUM_REQUIRED = 'premium_required'` and `const PREMIUM_REQUIRED_MESSAGE = 'This site is shared with you, but its Premium plan has lapsed. Ask the site owner to renew it.'`

- [ ] **Step 1: Write the failing tests** (replace the file; keep the existing missing-user/missing-site cases for both functions).

```ts
import { describe, expect, it } from 'vitest';
import { canManageSite, isSiteOwner, siteAuthzSelect, siteRole } from './site-authz';

const site = (plan: 'FREE' | 'PREMIUM', memberIds: string[] = []) => ({
  userId: 'owner-1',
  plan,
  members: memberIds.map((userId) => ({ userId })),
});

describe('siteRole', () => {
  it.each([
    ['owner on FREE', 'owner-1', site('FREE'), 'owner'],
    ['owner on PREMIUM', 'owner-1', site('PREMIUM', ['ed-1']), 'owner'],
    ['editor on PREMIUM', 'ed-1', site('PREMIUM', ['ed-1']), 'editor'],
    ['editor on FREE (lapsed)', 'ed-1', site('FREE', ['ed-1']), 'lapsed_editor'],
    ['removed editor', 'ed-1', site('PREMIUM'), null],
    ['stranger', 'x', site('PREMIUM'), null],
  ] as const)('%s', (_l, userId, s, expected) => {
    expect(siteRole(userId, s)).toBe(expected);
  });
});

describe('canManageSite', () => {
  it('allows the owner on any plan and an editor on PREMIUM', () => {
    expect(canManageSite('owner-1', site('FREE'))).toBe(true);
    expect(canManageSite('ed-1', site('PREMIUM', ['ed-1']))).toBe(true);
  });
  it('denies an editor on a FREE site', () => {
    expect(canManageSite('ed-1', site('FREE', ['ed-1']))).toBe(false);
  });
  it('denies a removed editor', () => {
    expect(canManageSite('ed-1', site('PREMIUM'))).toBe(false);
  });
  it('denies a stranger on a site that has other editors', () => {
    expect(canManageSite('x', site('PREMIUM', ['ed-1', 'ed-2']))).toBe(false);
  });
  it('denies missing user or site', () => {
    expect(canManageSite(undefined, site('PREMIUM'))).toBe(false);
    expect(canManageSite('', { userId: '', plan: 'PREMIUM', members: [{ userId: '' }] })).toBe(false);
    expect(canManageSite('owner-1', null)).toBe(false);
  });
});

describe('isSiteOwner', () => {
  it('is false for an editor, even on PREMIUM', () => {
    expect(isSiteOwner('ed-1', site('PREMIUM', ['ed-1']))).toBe(false);
  });
});

describe('siteAuthzSelect', () => {
  it("loads plan and only the caller's membership row", () => {
    expect(siteAuthzSelect('u1')).toEqual({
      userId: true,
      plan: true,
      members: { where: { userId: 'u1' }, select: { userId: true } },
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/site-authz.test.ts`
Expected: FAIL (`siteRole` / `siteAuthzSelect` not exported).

- [ ] **Step 3: Implement** in `lib/site-authz.ts`. `siteRole` checks in this order: falsy user or site → `null`; `isSiteOwner` → `'owner'`; no `members.some((m) => m.userId === userId)` → `null`; `plan === 'PREMIUM'` → `'editor'`, else `'lapsed_editor'`. Update the file's header comment (editors now exist; `isSiteOwner` is for the owner-only actions listed in the spec). Keep the file free of Prisma runtime imports (`import type` only) so it stays edge-safe.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/site-authz.test.ts`
Expected: PASS.

- [ ] **Step 5: List the call sites the compiler now rejects**

Run: `cd apps/flowershow && pnpm exec tsc --noEmit -p . 2>&1 | grep -E "error TS" | cut -d'(' -f1 | sort -u`
Expected: exactly the `canManageSite` callers fixed in Tasks 3 to 6 (`server/api/routers/site.ts`, `routers/annotation.ts`, `server/auth.ts`, `site-tabs-layout.tsx`, `app/api/sites/id/[siteId]/{route,status,files}`, `lib/site-auth.ts`, `lib/mcp/deps.ts`, `lib/annotations/http.ts`). Anything else gets added to those tasks.

- [ ] **Step 6: Commit**

```bash
git add apps/flowershow/lib/site-authz.ts apps/flowershow/lib/site-authz.test.ts
git commit -m "feat(authz): canManageSite admits editors on Premium sites; siteRole and siteAuthzSelect" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 3: Site router call sites and owner-only settings keys

**Files:**
- Modify: `apps/flowershow/server/api/types.ts:107-122` (add `SITE_UPDATE_KEY_ROLE` after the enum)
- Modify: `apps/flowershow/server/api/routers/site.ts` at: `getById` `:184-193`; `update` load and check `:304-322`; `setPasswordProtection` load `:526-535`; `updateDbConfig` select `:595-611`; `getDbConfig` `:652-662`; `getAssetUploadUrl` `:682-692`; `getLatestPublishState` `:757-766`; `getPublishHistory` `:837-845` and its publish select `:850-867`
- Test: `apps/flowershow/server/api/routers/__tests__/site.test.ts` (`makeSite` `:75-105`, callers `:429-443`, replace `site.getById authorization` `:1386-1413`, new describes at the end)

**Interfaces:**
- Consumes: `siteAuthzSelect`, `canManageSite`, `isSiteOwner` (Task 2).
- Produces: `export const SITE_UPDATE_KEY_ROLE: Record<SiteUpdateKey, 'owner' | 'editor'>` with `customDomain` and `rootDir` as `'owner'` and every other key `'editor'`. `getPublishHistory` rows gain `publishedBy: string | null` (the publisher's username). `getById` keeps its `fullSiteSchema.nullable()` output.

- [ ] **Step 1: Prepare test helpers.** In `makeSite` add `installationRepository: null` and `members: [] as Array<{ userId: string }>` to the defaults (the first makes `fullSiteSchema` output parsing pass, the second matches the new select). Add next to `createAuthenticatedCaller`:

```ts
function createCallerAs(mockDb: ReturnType<typeof createMockDb>, userId: string) {
  return appRouter.createCaller({
    session: { user: { id: userId }, expires: '' } as any,
    db: mockDb as any,
    headers: new Headers(),
  });
}
const sharedSite = (plan: 'FREE' | 'PREMIUM' = 'PREMIUM') =>
  makeSite({ plan, members: [{ userId: 'editor-1' }] });
```

- [ ] **Step 2: Write the failing tests.**

```ts
describe('site.update key classification', () => {
  it('classifies every SiteUpdateKey', () => {
    expect(SITE_UPDATE_KEY_ROLE).toEqual({
      customDomain: 'owner', rootDir: 'owner',
      enableComments: 'editor', enableSearch: 'editor', enableRss: 'editor',
      syntaxMode: 'editor', giscusRepoId: 'editor', giscusCategoryId: 'editor',
      showSidebar: 'editor', showBuiltWithButton: 'editor', showRawLink: 'editor',
      hideBranding: 'editor',
    });
  });

  it.each(Object.values(SiteUpdateKey))('editor on a Premium site and key %s', async (key) => {
    const db = createMockDb({ site: sharedSite() });
    (db.site as any).update = vi.fn(async () => sharedSite());
    const call = createCallerAs(db, 'editor-1').site.update({ id: 'site-1', key, value: 'true' });
    if (SITE_UPDATE_KEY_ROLE[key] === 'owner') {
      await expect(call).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect((db.site as any).update).not.toHaveBeenCalled();
    } else {
      await call;
      expect((db.site as any).update).toHaveBeenCalled();
    }
  });

  it('owner may still change customDomain', async () => {
    const db = createMockDb({ site: makeSite({ plan: 'PREMIUM' }) });
    (db.site as any).update = vi.fn(async () => makeSite());
    await createAuthenticatedCaller(db).site.update({ id: 'site-1', key: SiteUpdateKey.customDomain, value: 'example.com' });
    expect((db.site as any).update).toHaveBeenCalled();
  });
});

describe('site router: editor allow and deny', () => {
  it('editor on a FREE site is denied every manage procedure', async () => {
    const db = createMockDb({ site: sharedSite('FREE') });
    const c = createCallerAs(db, 'editor-1');
    await expect(c.site.update({ id: 'site-1', key: SiteUpdateKey.enableRss, value: 'true' })).rejects.toThrow('Site not found');
    await expect(c.site.getDbConfig({ siteId: 'site-1' })).rejects.toThrow('Site not found');
    await expect(c.site.getLatestPublishState({ id: 'site-1' })).rejects.toThrow('Site not found');
    expect(await c.site.getById({ id: 'site-1' })).toBeNull();
  });

  it('removed editor (no member row) is denied', async () => {
    const db = createMockDb({ site: makeSite({ plan: 'PREMIUM' }) });
    await expect(createCallerAs(db, 'editor-1').site.getPublishHistory({ id: 'site-1' })).rejects.toThrow('Site not found');
  });

  it('editor on a Premium site can read state, history, config and getById', async () => {
    const db = createMockDb({ site: sharedSite() });
    (db.publish as any).findMany = vi.fn(async () => []);
    const c = createCallerAs(db, 'editor-1');
    await expect(c.site.getLatestPublishState({ id: 'site-1' })).resolves.toBeTruthy();
    await expect(c.site.getPublishHistory({ id: 'site-1' })).resolves.toEqual([]);
    await expect(c.site.getDbConfig({ siteId: 'site-1' })).resolves.not.toThrow();
    expect((await c.site.getById({ id: 'site-1' }))?.id).toBe('site-1');
  });

  it.each([
    ['renameSite', (c: any) => c.site.renameSite({ id: 'site-1', name: 'new' })],
    ['delete', (c: any) => c.site.delete({ id: 'site-1' })],
    ['connectGitHub', (c: any) => c.site.connectGitHub({ siteId: 'site-1', ghRepository: 'a/b', ghBranch: 'main' })],
    ['disconnectGitHub', (c: any) => c.site.disconnectGitHub({ siteId: 'site-1' })],
    ['reconnectSiteToGitHubApp', (c: any) => c.site.reconnectSiteToGitHubApp({ siteId: 'site-1' })],
  ])('editor on a Premium site is denied %s', async (_name, run) => {
    const db = createMockDb({ site: sharedSite() });
    (db.site as any).update = vi.fn();
    (db.site as any).delete = vi.fn();
    await expect(run(createCallerAs(db, 'editor-1'))).rejects.toThrow('Site not found');
    expect((db.site as any).update).not.toHaveBeenCalled();
    expect((db.site as any).delete).not.toHaveBeenCalled();
  });
});
```

Replace the old `scopes the query to the authenticated caller as owner` test with: `getById loads siteAuthzSelect for the caller and returns null for a stranger` (assert `db.site.findUnique` was called with `select` containing `members: { where: { userId: 'user-1' }, select: { userId: true } }`, and a `createCallerAs(db, 'stranger')` gets `null`).

- [ ] **Step 3: Run to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/site.test.ts`
Expected: FAIL (`SITE_UPDATE_KEY_ROLE` missing; editor calls get NOT_FOUND / FORBIDDEN mismatches).

- [ ] **Step 4: Implement.**
  - Each `canManageSite` procedure loads `...siteAuthzSelect(ctx.session.user.id)`: spread into existing `select` objects; for `update` (uses `include`) add `members: siteAuthzSelect(uid).members` to the `include`; for `setPasswordProtection` (bare `findUnique`) switch to `include: { members: siteAuthzSelect(uid).members }`.
  - `update`: after the `canManageSite` check, `if (SITE_UPDATE_KEY_ROLE[key] === 'owner' && !isSiteOwner(uid, site)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the site owner can change this setting' })`.
  - `getById`: `findUnique({ where: { id }, select: { ...fullSiteSelect, ...siteAuthzSelect(uid) } })`, return `null` unless `canManageSite`, then strip `members` and `userId` before returning. Remove the `TODO(#919)`.
  - `getPublishHistory`: add `user: { select: { username: true } }` to the publish select and map it to `publishedBy` on both the legacy and normal row shapes.
  - Owner-only procedures (`renameSite`, `delete`, GitHub trio) keep `isSiteOwner`; no change beyond tests.

- [ ] **Step 5: Run to verify they pass**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/site.test.ts`
Expected: PASS (whole file, including existing tests).

- [ ] **Step 6: Commit**

```bash
git add apps/flowershow/server/api/types.ts apps/flowershow/server/api/routers/site.ts apps/flowershow/server/api/routers/__tests__/site.test.ts
git commit -m "feat(site): editors manage Premium sites; customDomain and rootDir stay owner-only" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 4: Annotation router, Stripe deny tests, dashboard gate, delete `withSiteAuth`

**Files:**
- Modify: `apps/flowershow/server/api/routers/annotation.ts:14-41`
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/site-tabs-layout.tsx:25-35`
- Modify: `apps/flowershow/server/auth.ts:1` (import) and `:440-465` (delete `withSiteAuth`)
- Test: `apps/flowershow/server/api/routers/__tests__/annotation.test.ts` (`makeDb` from `:50`), create `apps/flowershow/server/api/routers/__tests__/stripe.test.ts`

**Interfaces:**
- Consumes: `siteAuthzSelect`, `canManageSite` (Task 2).
- Produces: `annotation.ts` helpers renamed `managedSite(ctx, siteId)` and `managedAnnotation(ctx, id)` (same return shapes).

- [ ] **Step 1: Write the failing tests.** In `annotation.test.ts`, give `makeDb` a second parameter `{ plan = 'FREE', members = [] }` merged into the site row, then:

```ts
it('lets an editor of a Premium site list annotations', async () => {
  const db = makeDb('owner-1', { plan: 'PREMIUM', members: [{ userId: 'user-1' }] });
  await expect(createCaller(db).annotation.listForSite({ siteId: 'site-1' })).resolves.toBeDefined();
});
it('denies an editor once the site is no longer Premium', async () => {
  const db = makeDb('owner-1', { plan: 'FREE', members: [{ userId: 'user-1' }] });
  await expect(createCaller(db).annotation.listForSite({ siteId: 'site-1' })).rejects.toThrow('Site not found');
});
```

Create `stripe.test.ts` with the same top-of-file mocks as `user.test.ts` plus `vi.mock('@/lib/stripe', () => ({ FLOWERSHOW_PLATFORM: 'flowershow', stripe: { subscriptions: { cancel: vi.fn() }, billingPortal: { sessions: { create: vi.fn() } }, checkout: { sessions: { create: vi.fn() } }, customers: { create: vi.fn() } } }))`:

```ts
const sharedSite = { id: 'site-1', userId: 'owner-1', plan: 'PREMIUM', members: [{ userId: 'editor-1' }], user: { id: 'owner-1', email: 'o@x.org' }, subscription: { stripeSubscriptionId: 'sub_1', stripeCustomerId: 'cus_1', status: 'active' } };
const db = { site: { findUnique: vi.fn().mockResolvedValue(sharedSite) }, subscription: { count: vi.fn() } };
const editor = appRouter.createCaller({ session: { user: { id: 'editor-1' }, expires: '' } as any, db: db as any, headers: new Headers() });

it.each([
  ['cancelSubscription', () => editor.stripe.cancelSubscription({ siteId: 'site-1' })],
  ['createCheckoutSession', () => editor.stripe.createCheckoutSession({ siteId: 'site-1', priceId: 'price_1' })],
  ['getBillingPortal', () => editor.stripe.getBillingPortal({ siteId: 'site-1' })],
  ['getSiteSubscription', () => editor.stripe.getSiteSubscription({ siteId: 'site-1' })],
])('editor is denied stripe.%s', async (_n, run) => {
  await expect(run()).rejects.toThrow('Not authorized');
  expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
  expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify the annotation test fails** (the Stripe tests already pass: they pin existing behaviour)

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/annotation.test.ts server/api/routers/__tests__/stripe.test.ts`
Expected: annotation editor test FAILS; Stripe tests PASS.

- [ ] **Step 3: Implement.** `managedSite` selects `{ ...siteAuthzSelect(uid), projectName, customDomain, subdomain, user: { select: { username: true } } }`; `managedAnnotation` selects `site: { select: siteAuthzSelect(uid) }`. In `site-tabs-layout.tsx` spread `...siteAuthzSelect(session.user.id)` into the select (replacing `userId: true`). Delete `withSiteAuth` and its `canManageSite` import from `server/auth.ts` (no callers: `grep -rn withSiteAuth apps/flowershow --include='*.ts*'` returns nothing after).

- [ ] **Step 4: Run to verify they pass**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/server/api/routers/annotation.ts apps/flowershow/server/api/routers/__tests__/annotation.test.ts apps/flowershow/server/api/routers/__tests__/stripe.test.ts "apps/flowershow/app/(cloud)/dashboard/site/[id]/site-tabs-layout.tsx" apps/flowershow/server/auth.ts
git commit -m "feat(authz): editors moderate annotations and open site tabs; billing stays owner-only; drop unused withSiteAuth" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 5: REST publish routes, `premium_required`, and `Publish.userId`

**Files:**
- Modify: `apps/flowershow/lib/site-auth.ts:85-97` (and add `siteAccessDenied`)
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/route.ts` GET select `:50-76` and check `:86-92`; DELETE check `:190-196` (unchanged `isSiteOwner`, test only)
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/status/route.ts:50-75`
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/files/route.ts` POST `:61-80` and `publish.create` `:111-117`; DELETE `:252-270`
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/sync/route.ts:60-64` and `publish.create` `:210-218`
- Modify: `packages/api-contract/src/routes/sites.ts` (403 descriptions for `getSite`, `syncSite`, `publishFiles`, `deleteFiles`, `getSiteStatus`)
- Test: `apps/flowershow/lib/site-auth.test.ts`, `app/api/sites/id/[siteId]/{route,status/route,files/route,sync/route}.test.ts`

**Interfaces:**
- Consumes: `siteRole`, `siteAuthzSelect`, `PREMIUM_REQUIRED`, `PREMIUM_REQUIRED_MESSAGE` (Task 2).
- Produces: `export function siteAccessDenied(role: SiteRole | null): NextResponse | null` in `lib/site-auth.ts`: `null` for `owner`/`editor`; 403 `{ error: 'premium_required', message: PREMIUM_REQUIRED_MESSAGE }` for `lapsed_editor`; 403 `{ error: 'forbidden', message: 'You do not have access to this site' }` otherwise. `authorizeSiteRequest` keeps its `SiteAuthResult` type.

- [ ] **Step 1: Write the failing tests.** In `lib/site-auth.test.ts`:

```ts
it('accepts an editor of a Premium site', async () => {
  validate.mockResolvedValue({ userId: 'ed-1' });
  findUnique.mockResolvedValue({ id: 'site-1', userId: 'u1', plan: 'PREMIUM', members: [{ userId: 'ed-1' }] });
  expect(await authorizeSiteRequest(req('fs_pat_x'), 'site-1')).toEqual({ ok: true, kind: 'user', userId: 'ed-1' });
  expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
    select: expect.objectContaining({ members: { where: { userId: 'ed-1' }, select: { userId: true } } }),
  }));
});
it('refuses an editor of a FREE site with premium_required', async () => {
  validate.mockResolvedValue({ userId: 'ed-1' });
  findUnique.mockResolvedValue({ id: 'site-1', userId: 'u1', plan: 'FREE', members: [{ userId: 'ed-1' }] });
  const r = await authorizeSiteRequest(req('fs_pat_x'), 'site-1');
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect(r.response.status).toBe(403);
    expect(await r.response.json()).toMatchObject({ error: 'premium_required' });
  }
});
it('refuses a removed editor with forbidden', async () => {
  validate.mockResolvedValue({ userId: 'ed-1' });
  findUnique.mockResolvedValue({ id: 'site-1', userId: 'u1', plan: 'PREMIUM', members: [] });
  const r = await authorizeSiteRequest(req('fs_pat_x'), 'site-1');
  expect(!r.ok && (await r.response.json()).error).toBe('forbidden');
});
```

In each route test, add the same three cases (Premium editor 200, FREE editor 403 `premium_required`, removed editor 403 `forbidden`) using that file's existing request helper and `vi.mocked(prisma.site.findUnique)`. In `id/[siteId]/route.test.ts` add `DELETE refuses an editor of a Premium site` (403 `forbidden`, `deleteProject` not called). In `sync/route.test.ts` and `files/route.test.ts` add:

```ts
it('records who published', async () => {
  vi.mocked(validateAccessToken).mockResolvedValueOnce({ userId: 'ed-1' } as any);
  vi.mocked(prisma.site.findUnique).mockResolvedValue({ id: 'site-1', userId: 'owner-1', plan: 'PREMIUM', members: [{ userId: 'ed-1' }] } as any);
  // ...existing request with one new file...
  expect(prisma.publish.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'ed-1' }) }));
});
```

and in the claim-token (anonymous) sync test assert `data.userId` is `null`.

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/site-auth.test.ts "app/api/sites/id/[siteId]"`
Expected: FAIL on the new cases.

- [ ] **Step 3: Implement.** Each route loads `...siteAuthzSelect(userId)` (spread into its existing `select`, dropping the now-duplicate `userId: true`), computes `siteRole`, and returns `siteAccessDenied(role)` when non-null, keeping the existing 404 for a missing site. `status/route.ts` applies this only in its authenticated branch. `sync` passes `userId: access.kind === 'user' ? access.userId : null` to `publish.create`; `files` passes `userId`. Update the five contract route 403 descriptions to "Forbidden, or `premium_required` when the caller is an editor and the site's Premium plan has lapsed", then build the contract.

- [ ] **Step 4: Run to verify they pass, and build the contract**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/site-auth.test.ts "app/api/sites/id/[siteId]" && cd ../.. && pnpm turbo build --filter=@flowershow/api-contract`
Expected: PASS; contract builds.

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/lib/site-auth.ts apps/flowershow/lib/site-auth.test.ts "apps/flowershow/app/api/sites/id/[siteId]" packages/api-contract/src/routes/sites.ts
git commit -m "feat(api): editors publish over REST and sync; premium_required for lapsed sites; record publisher" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 6: Annotation REST, owner-cookie handshake, MCP and the lookup route

**Files:**
- Modify: `apps/flowershow/lib/site-owner-session.ts:120-137` (replace `getSiteOwnerFromRequest`)
- Modify: `apps/flowershow/lib/annotations/http.ts:26-90` (`authorizeOwner` → `authorizeSiteManager`)
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/annotations/route.ts:78-90`, `annotations/settings/route.ts:19-36`, `annotations/bulk/route.ts:25-32`
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/owner/authorize/route.ts:70-79`, `owner/callback/route.ts:62-71`, `owner/me/route.ts:17-25`
- Modify: `apps/flowershow/lib/mcp/deps.ts:85-98` (`assertCanManage`)
- Modify: `apps/flowershow/app/api/sites/[username]/[projectname]/route.tsx:67-70`
- Test: `lib/site-owner-session.test.ts:171-195`, `lib/annotations/http.test.ts`, `app/api/sites/id/[siteId]/owner/owner-routes.test.ts`, `lib/mcp/deps.test.ts:291-358`, `app/api/sites/[username]/[projectname]/route.test.ts`

**Interfaces:**
- Consumes: `siteRole`, `canManageSite`, `siteAuthzSelect`, `PREMIUM_REQUIRED*` (Task 2), `siteAccessDenied` (Task 5).
- Produces:
  - `getSiteManagerFromRequest(request: Request, siteId: string, loadSite: (userId: string) => Promise<SiteAuthzFields | null>): Promise<string | null>` in `site-owner-session.ts` (still no Prisma import: the loader is injected). Verifies the cookie for `siteId` and host first, then loads, then `canManageSite`.
  - `authorizeSiteManager<Site extends { id: string } & SiteAuthzFields>(request: NextRequest, siteId: string, loadSite: (userId: string) => Promise<Site | null>): Promise<{ site: Site; userId: string } | { response: NextResponse }>` in `lib/annotations/http.ts`. Bearer branch returns `siteAccessDenied(siteRole(...))` responses.
  - MCP `assertCanManage(userId, siteId)` throws `ApiError(403, 'premium_required', PREMIUM_REQUIRED_MESSAGE)` for `lapsed_editor`, the existing 404 otherwise.

- [ ] **Step 1: Write the failing tests.**
  - `site-owner-session.test.ts`: `getSiteManagerFromRequest accepts an editor of a Premium site with a valid cookie`; `rejects a cookie for a user who is no longer a member` (loader returns `{ userId: 'owner-1', plan: 'PREMIUM', members: [] }` → `null`); `rejects an editor once the site is FREE`; `does not call the loader without a valid cookie` (`expect(loader).not.toHaveBeenCalled()`).
  - `owner-routes.test.ts`: `authorize sends a Premium editor back to the site host with a one-time code`; `authorize refuses an editor of a FREE site` (403 text); `callback rejects a code whose user was removed as editor`; `me is true for an editor cookie and false after removal`.
  - `lib/annotations/http.test.ts`: `authorizeSiteManager returns premium_required for a lapsed editor's bearer token` and `passes the authenticated userId to loadSite`.
  - `deps.test.ts` inside `listFiles and readFile`:

```ts
it('lets a Premium editor list files', async () => {
  findSite.mockResolvedValue({ userId: 'owner', plan: 'PREMIUM', members: [{ userId: 'u1' }] });
  await expect(realMcpDeps().listFiles('u1', 'site-1')).resolves.toHaveLength(2);
});
it('tells a lapsed editor the plan lapsed, not "not found"', async () => {
  findSite.mockResolvedValue({ userId: 'owner', plan: 'FREE', members: [{ userId: 'u1' }] });
  await expect(realMcpDeps().readFile('u1', 'site-1', 'index.md')).rejects.toMatchObject({ status: 403, code: 'premium_required' });
  expect(findBlobs).not.toHaveBeenCalled();
});
```

(`ApiError` is `{ status, code, message }`, `lib/mcp/publish.ts:110-118`.) Add `{ userId: 'u2', plan: 'PREMIUM', members: [] }` (removed editor) to the existing "refuses %s with the same 404" table.
  - `[username]/[projectname]/route.test.ts`: `returns extended data to a Premium editor` (validate → `{ userId: 'ed-1' }`, `findFirst` returns a site with `user: { id: 'owner-1', username: 'bob' }`, `plan: 'PREMIUM'`, `members: [{ userId: 'ed-1' }]`; expect `json.site.id`) and `returns only public fields to a removed editor`.

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/site-owner-session.test.ts lib/annotations/http.test.ts lib/mcp/deps.test.ts "app/api/sites/id/[siteId]/owner" "app/api/sites/[username]"`
Expected: FAIL on the new cases.

- [ ] **Step 3: Implement.** Replace `getSiteOwnerFromRequest` with `getSiteManagerFromRequest`; `owner/me` and `authorizeSiteManager`'s cookie branch pass `(uid) => prisma.site.findUnique({ where: { id: siteId }, select: siteAuthzSelect(uid) })` (plus any fields the caller needs). `owner/authorize` and `owner/callback` load `...siteAuthzSelect(userId)` and use `canManageSite`; update their "Owner-only ... revisit in #919" comments and user-facing 403 text to "You are signed in, but you cannot manage this site." The three annotation routes call `authorizeSiteManager(request, siteId, (uid) => prisma.site.findUnique({ where: { id: siteId }, select: { ...existingFields, ...siteAuthzSelect(uid) } }))`; in `annotations/route.ts` the owner branch re-loads with `annotationSiteSelect` plus the fragment. `assertCanManage` selects `siteAuthzSelect(userId)` and branches on `siteRole`. The lookup route adds `...siteAuthzSelect(auth.userId)` to the authenticated lookup (keep `internalSiteSelect` for the unauthenticated path) and replaces `site.user.id === auth.userId` with `canManageSite`; remove its `TODO(#919)`. Leave `lib/site-access.ts` (visitor password gate) on `isSiteOwner` and change its `TODO(#919)` to point at the follow-up bead for a signed-in bypass (spec: separate feature).

- [ ] **Step 4: Run all unit tests and typecheck**

Run: `cd apps/flowershow && pnpm test:unit --run && pnpm exec tsc --noEmit -p .`
Expected: PASS, no TypeScript errors.

- [ ] **Step 5: Confirm no inline checks remain**

Run: `cd apps/flowershow && grep -rnE "userId === (auth|ctx|session)|\.user\.id === auth" app lib server --include='*.ts' --include='*.tsx' | grep -v test`
Expected: no authorization comparisons outside `lib/site-authz.ts` (ownership-scoped list queries like `where: { userId }` are fine).

- [ ] **Step 6: Commit and open PR A**

```bash
git add apps/flowershow/lib apps/flowershow/app/api
git commit -m "feat(authz): editors get the site-host owner cookie, annotation API and MCP tools; premium_required on MCP" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

PR body lists every `canManageSite` and `isSiteOwner` call site with the test that covers it (from Tasks 3 to 6), notes behaviour is unchanged for existing users, and ends with the session URL. Run the independent review in `docs/agents/review.md` before merge.

---

# PR B: shared sites and members UI

### Task 7: Owned and shared sites in the dashboard list

**Files:**
- Modify: `apps/flowershow/server/api/routers/user.ts:53-60`
- Modify: `apps/flowershow/app/(cloud)/dashboard/page.tsx:14-36`
- Modify: `apps/flowershow/components/dashboard/site-card.tsx:1-60`
- Modify: `apps/flowershow/components/dashboard/nav.tsx:38-54`
- Test: `apps/flowershow/server/api/routers/__tests__/user.test.ts`

**Interfaces:**
- Consumes: `siteRole` (Task 2).
- Produces: `user.getSites` returns `DashboardSite[]` where `type DashboardSite = { id: string; projectName: string; subdomain: string; customDomain: string | null; plan: Plan; role: 'owner' | 'editor'; lapsed: boolean; ownerUsername: string }`, owned first, then shared, each group sorted by `projectName`. Export the type from `server/api/routers/user.ts`. `SiteCard` props become `{ data: DashboardSite }`.

- [ ] **Step 1: Write the failing test.**

```ts
describe('user.getSites', () => {
  it('returns owned sites first, then shared ones with role and owner, and flags lapsed shares', async () => {
    const row = (id: string, userId: string, plan: string, username: string) => ({
      id, projectName: id, subdomain: id, customDomain: null, plan, userId, user: { username },
    });
    const db = { site: { findMany: vi.fn().mockResolvedValue([
      row('b-shared', 'owner-2', 'PREMIUM', 'bob'),
      row('mine', 'user-1', 'FREE', 'ada'),
      row('c-lapsed', 'owner-3', 'FREE', 'cat'),
    ]) } };
    const sites = await createCaller(db).user.getSites({});
    expect(db.site.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ userId: 'user-1' }, { members: { some: { userId: 'user-1' } } }] },
    }));
    expect(sites.map((s) => [s.id, s.role, s.lapsed, s.ownerUsername])).toEqual([
      ['mine', 'owner', false, 'ada'],
      ['b-shared', 'editor', false, 'bob'],
      ['c-lapsed', 'editor', true, 'cat'],
    ]);
    expect(sites[0]).not.toHaveProperty('accessPasswordHash');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/user.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** One `findMany` with the `OR` above and an explicit select (`id, projectName, subdomain, customDomain, plan, userId, user: { select: { username: true } }`); role is `'owner'` when `userId` matches, otherwise `'editor'` with `lapsed = plan !== 'PREMIUM'`. Apply `input.limit` after sorting. Dashboard page renders "Your sites" then, if any, a "Shared with me" heading with the shared cards. `SiteCard`: for `role === 'editor'` show an "Editor" badge and "by {ownerUsername}"; when `lapsed`, render greyed with "Premium lapsed, ask the owner" and no link to `/site/{id}/...` (the public URL link stays). Use `site.ownerUsername` instead of the session username in the URL fallback. `nav.tsx` filters out `lapsed` sites from the switcher.

- [ ] **Step 4: Run to verify it passes and typecheck**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/user.test.ts && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/server/api/routers/user.ts apps/flowershow/server/api/routers/__tests__/user.test.ts "apps/flowershow/app/(cloud)/dashboard/page.tsx" apps/flowershow/components/dashboard/site-card.tsx apps/flowershow/components/dashboard/nav.tsx
git commit -m "feat(dashboard): Shared with me section with Editor badge and lapsed-Premium state" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 8: `siteMember` router: list, invite, revoke, remove, leave, and the invite email

**Files:**
- Create: `apps/flowershow/lib/site-invites.ts`, `apps/flowershow/lib/site-invites.test.ts`
- Create: `apps/flowershow/server/api/routers/site-member.ts`
- Create: `apps/flowershow/emails/site-invite.tsx` (pattern: `emails/site-created.tsx`, `EmailLayout`, `Markdown`, `Button`)
- Modify: `apps/flowershow/server/api/root.ts` (register `siteMember: siteMemberRouter`)
- Test: create `apps/flowershow/server/api/routers/__tests__/site-member.test.ts` (top-of-file mocks as in `user.test.ts`, including `vi.mock('@/lib/transactional-email', ...)`)

**Interfaces:**
- Consumes: `isSiteOwner`, `canManageSite`, `siteAuthzSelect` (Task 2); `sendTransactionalEmail({ to, subject, react, type, userId, idempotencyKey, properties })` from `lib/transactional-email.ts`.
- Produces (`lib/site-invites.ts`): `MAX_SITE_MEMBERS = 20`, `MAX_PENDING_INVITES = 20`, `INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000`, `generateInviteToken(): string` (`fs_inv_` + `randomBytes(32).toString('base64url')`), `hashInviteToken(token: string): string` (SHA-256 hex, same as `hashToken` in `lib/cli-auth.ts:140-142`), `normalizeInviteEmail(email: string): string`, `inviteUrl(token: string): string` (`https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/invite/${token}`, `http://` in development like `stripe.ts:10-13`), `deleteExpiredInvites(db, siteId: string): Promise<void>`.
- Produces (`siteMember` router):
  - `list({ siteId }) → { role: 'owner' | 'editor'; owner: { username: string }; members: Array<{ userId: string; username: string; name: string | null; email?: string; createdAt: Date }>; invites?: Array<{ id: string; email: string; expiresAt: Date; createdAt: Date }> }` (allowed when `canManageSite`; `email` and `invites` only for the owner)
  - `invite({ siteId, email }) → { id: string; email: string; expiresAt: Date }`
  - `revokeInvite({ siteId, inviteId }) → { ok: true }`
  - `remove({ siteId, userId }) → { ok: true }`
  - `leave({ siteId }) → { ok: true }`
  - `SiteInviteEmail({ inviterName: string; projectName: string; acceptUrl: string })` default export.

- [ ] **Step 1: Write the failing tests.** `site-invites.test.ts`: token has 32 random bytes after the prefix and two calls differ; `hashInviteToken` is 64 hex chars, deterministic, and not the token; `normalizeInviteEmail('  Ada@Example.COM ')` is `'ada@example.com'`.

`site-member.test.ts` builds a `makeDb({ site, members = [], invites = [], users = [] })` whose `site.findUnique`, `siteMember.{findMany,count,findUnique,delete,deleteMany}`, `siteInvite.{findMany,count,create,deleteMany,findFirst}` and `user.findFirst` read from those arrays, plus `$transaction: vi.fn(async (fn) => fn(db))`. Callers via `createCallerAs(db, id)`. Cases:

```ts
const premium = { id: 'site-1', userId: 'owner-1', plan: 'PREMIUM', projectName: 'notes', user: { email: 'Owner@Example.com', name: 'Olu', username: 'olu' } };

it('invite normalises the email and refuses the owner\'s address in any case', async () => {
  const db = makeDb({ site: premium });
  await createCallerAs(db, 'owner-1').siteMember.invite({ siteId: 'site-1', email: '  Ada@Example.COM ' });
  expect(db.siteInvite.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ email: 'ada@example.com', tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/) }),
  }));
  await expect(createCallerAs(db, 'owner-1').siteMember.invite({ siteId: 'site-1', email: 'OWNER@example.com' }))
    .rejects.toMatchObject({ code: 'BAD_REQUEST' });
});
it('invite stores only the hash, sets a 14-day expiry and emails the raw link', async () => { /* expiresAt within 1s of now+INVITE_TTL_MS; sendTransactionalEmail called with to 'ada@example.com', type 'site_invite', and react props acceptUrl containing '/invite/fs_inv_'; created row has no raw token field */ });
it('editor cannot invite', async () => { /* site with members [{userId:'editor-1'}] → createCallerAs(db,'editor-1').invite rejects FORBIDDEN, create not called */ });
it('invite requires Premium', async () => { /* plan FREE → FORBIDDEN 'Inviting editors requires a Premium plan' */ });
it('refuses an address that is already a member or already invited', async () => { /* user.findFirst returns member with that email → CONFLICT; pending invite with same email → CONFLICT */ });
it('refuses a 21st member and a 21st pending invite', async () => { /* siteMember.count → 20 → FORBIDDEN; siteInvite.count → 20 → FORBIDDEN */ });
it('deletes expired invites before counting and checking duplicates', async () => { /* siteInvite.deleteMany called with { where: { siteId, expiresAt: { lt: expect.any(Date) } } } before count */ });
it('owner can revoke and remove on a FREE site', async () => { /* plan FREE: revokeInvite and remove succeed, deleteMany scoped by siteId */ });
it('editor cannot remove or revoke', async () => { /* FORBIDDEN, no deletes */ });
it('editor can leave, even on a FREE site', async () => { /* siteMember.deleteMany({ where: { siteId, userId: 'editor-1' } }) */ });
it('list hides emails and invites from editors', async () => { /* editor: members without email, no invites key; owner: both */ });
it('list refuses a removed editor', async () => { /* NOT_FOUND */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/site-invites.test.ts server/api/routers/__tests__/site-member.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement.** Input schemas: `email: z.string().trim().toLowerCase().email().max(254)`, ids `z.string().min(1)`. Error codes: not owner → `FORBIDDEN 'Only the site owner can manage members'`; site missing or caller cannot see it → `NOT_FOUND 'Site not found'`; not Premium on invite → `FORBIDDEN`; owner's email (compare normalised) → `BAD_REQUEST`; duplicate member (`user: { email: { equals, mode: 'insensitive' } }`) or pending invite → `CONFLICT`; limits → `FORBIDDEN 'This site already has 20 editors'` / `'This site already has 20 pending invites'`. `revokeInvite` and `remove` use `deleteMany` with `siteId` in the `where` so ids from another site do nothing. `invite` creates the row, then sends the email with `idempotencyKey: \`site-invite:${invite.id}\``. Email subject: `${inviterName} invited you to edit ${projectName} on Flowershow`. PostHog `site_members_changed` `{ siteId, memberCount, change: 'removed' | 'left' }` with `distinctId: site.userId` after `remove`/`leave` (mock already in place). Lazy expiry: `invite` and the owner's `list` call `deleteExpiredInvites(ctx.db, siteId)` first; no scheduled sweep.

- [ ] **Step 4: Run to verify they pass**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/site-invites.test.ts server/api/routers/__tests__/`
Expected: PASS.

- [ ] **Step 5: Preview the email**

Run: `cd apps/flowershow && pnpm email:dev` and open `site-invite` at http://localhost:3333
Expected: heading, inviter and site name, an "Accept invite" button, a line that the link expires in 14 days.

- [ ] **Step 6: Commit**

```bash
git add apps/flowershow/lib/site-invites.ts apps/flowershow/lib/site-invites.test.ts apps/flowershow/server/api/routers/site-member.ts apps/flowershow/server/api/root.ts apps/flowershow/emails/site-invite.tsx apps/flowershow/server/api/routers/__tests__/site-member.test.ts
git commit -m "feat(members): siteMember router with email invites, limits and owner-only management" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 9: Accepting an invite

**Files:**
- Modify: `apps/flowershow/server/api/routers/site-member.ts`
- Test: `apps/flowershow/server/api/routers/__tests__/site-member.test.ts`

**Interfaces:**
- Consumes: `hashInviteToken`, `normalizeInviteEmail`, `MAX_SITE_MEMBERS`, `deleteExpiredInvites` (Task 8); the trust rule is `User.emailVerified != null` (not `lib/account-linking.ts`).
- Produces:
  - `getInvite({ token }) → { state: 'ok' | 'not_found' | 'expired' | 'lapsed' | 'owner' | 'email_mismatch' | 'email_untrusted' | 'already_member'; siteId?: string; projectName?: string; ownerUsername?: string; invitedEmail?: string }` (`invitedEmail` only when `state` is `email_mismatch` or `email_untrusted`, as the spec requires the page to name it)
  - `accept({ token }) → { siteId: string }`
  - `pendingForMe() → Array<{ id: string; siteId: string; projectName: string; ownerUsername: string }>` (empty unless the caller's email is trusted)
  - `acceptPending({ inviteId }) → { siteId: string }`
  - Internal `acceptInviteRow(ctx, invite)`: the one transaction both accept paths share.

- [ ] **Step 1: Write the failing tests.** Extend `makeDb` with `user.findUnique` returning `{ email, emailVerified, accounts }` for the caller and `siteInvite.findUnique({ where: { tokenHash } })`.

```ts
const token = 'fs_inv_abc';
const invite = (o = {}) => ({ id: 'inv-1', siteId: 'site-1', email: 'ada@example.com', tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + 86400000), invitedBy: 'owner-1', site: premium, ...o });
const ada = { email: 'Ada@Example.com', emailVerified: new Date(), accounts: [] };

it('accept matches emails case-insensitively and creates the member in one transaction', async () => {
  const db = makeDb({ site: premium, invites: [invite()], me: ada });
  await expect(createCallerAs(db, 'ada-1').siteMember.accept({ token })).resolves.toEqual({ siteId: 'site-1' });
  expect(db.$transaction).toHaveBeenCalled();
  expect(db.siteMember.create).toHaveBeenCalledWith({ data: { siteId: 'site-1', userId: 'ada-1', role: 'EDITOR', invitedBy: 'owner-1' } });
  expect(db.siteInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
});
it.each([
  ['an untrusted email', { me: { ...ada, emailVerified: null, accounts: [{ provider: 'github' }] } }, 'FORBIDDEN'],
  ['a different email', { me: { ...ada, email: 'eve@example.com' } }, 'FORBIDDEN'],
  ['an expired invite', { invites: [invite({ expiresAt: new Date(Date.now() - 1000) })] }, 'NOT_FOUND'],
  ['a lapsed site', { site: { ...premium, plan: 'FREE' }, invites: [invite({ site: { ...premium, plan: 'FREE' } })] }, 'FORBIDDEN'],
  ['the owner', { callerId: 'owner-1', me: { ...ada, email: 'ada@example.com' } }, 'BAD_REQUEST'],
  ['a full site', { memberCount: 20 }, 'FORBIDDEN'],
])('accept refuses %s', async (_l, o, code) => {
  const db = makeDb({ site: premium, invites: [invite()], me: ada, ...o });
  await expect(createCallerAs(db, (o as any).callerId ?? 'ada-1').siteMember.accept({ token })).rejects.toMatchObject({ code });
  expect(db.siteMember.create).not.toHaveBeenCalled();
});
it('accept refuses a token whose invite was revoked and re-sent', async () => {
  const db = makeDb({ site: premium, invites: [invite({ tokenHash: hashInviteToken('fs_inv_new') })], me: ada });
  await expect(createCallerAs(db, 'ada-1').siteMember.accept({ token })).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
it('getInvite names the invited address on a mismatch, and nothing for an unknown token', async () => { /* state 'email_mismatch' with invitedEmail 'ada@example.com'; unknown token → { state: 'not_found' } with no other keys */ });
it('pendingForMe lists invites only for a trusted email', async () => { /* untrusted → []; trusted → one item; query uses normalised email and expiresAt > now */ });
it('acceptPending refuses an invite addressed to someone else', async () => { /* FORBIDDEN, no create */ });
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/site-member.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** `accept` hashes the token, loads the invite with `site: { select: { id, userId, plan, projectName, user: { select: { username } } } }`, loads the caller with `{ email, emailVerified, accounts: { select: { provider } } }`, then inside `ctx.db.$transaction(async (tx) => ...)` re-reads the invite by id (gone → `NOT_FOUND 'Invite not found'`), checks in order: expired → delete it and `NOT_FOUND 'This invite has expired'`; caller is owner → `BAD_REQUEST`; `plan !== 'PREMIUM'` → `FORBIDDEN 'This site is no longer on Premium'`; email mismatch or untrusted → `FORBIDDEN`; `siteMember.count >= MAX_SITE_MEMBERS` → `FORBIDDEN`; already a member → delete invite and return `{ siteId }`; else create member, delete invite. After commit, PostHog `site_members_changed` with `change: 'joined'`. `getInvite` runs the same checks without writing and maps them to `state`. `pendingForMe` returns `[]` unless `emailVerified` is set.

- [ ] **Step 4: Run to verify they pass**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit server/api/routers/__tests__/site-member.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/server/api/routers/site-member.ts apps/flowershow/server/api/routers/__tests__/site-member.test.ts
git commit -m "feat(members): accept invites only for a trusted, matching email on a Premium site" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 10: Invite page and dashboard banner

**Files:**
- Create: `apps/flowershow/app/(cloud)/dashboard/invite/[token]/page.tsx`, `apps/flowershow/app/(cloud)/dashboard/invite/[token]/sign-in-as.tsx` (client)
- Create: `apps/flowershow/components/dashboard/invite-banner.tsx`
- Modify: `apps/flowershow/app/(cloud)/dashboard/page.tsx` (render the banner above the lists)

**Interfaces:**
- Consumes: `siteMember.getInvite`, `siteMember.accept`, `siteMember.pendingForMe`, `siteMember.acceptPending` (Task 9).
- Produces: route `/invite/{token}` on the cloud host (signed-out visitors are sent to `/login?callbackUrl=/invite/{token}` by the existing middleware at `middleware.ts:106-114`).

- [ ] **Step 1: Build the page.** Server component calls `api.siteMember.getInvite.query({ token })` and renders by `state`: `ok` → "{ownerUsername} invited you to edit {projectName}" with an Accept form whose server action calls `api.siteMember.accept.mutate({ token })` then `redirect(\`/site/${siteId}/settings\`)`; `email_mismatch` → "This invite was sent to {invitedEmail}. You are signed in as {session email}." plus `<SignInAs email={invitedEmail} callbackUrl={\`/invite/${token}\`} />` (client: `signIn('email', { email, callbackUrl })`, label "Sign in with {invitedEmail}"); `email_untrusted` → "Confirm {invitedEmail} by signing in with an email link" and the same button; `expired` → "This invite has expired. Ask {ownerUsername} to invite you again."; `lapsed` → "This site is no longer on Premium, so the invite can't be used. Ask the owner."; `owner` → "You own this site."; `already_member` → link to the site; `not_found` → "This invite link is not valid. It may have been revoked." No "accept anyway" control on any branch.

- [ ] **Step 2: Build the banner.** Server component in the dashboard page calls `api.siteMember.pendingForMe.query()`; for each item show "{ownerUsername} invited you to edit {projectName}" and an Accept button (server action → `acceptPending`, then `redirect` to the site). Renders nothing for an empty list.

- [ ] **Step 3: Typecheck and lint**

Run: `cd apps/flowershow && pnpm exec tsc --noEmit -p . && pnpm lint`
Expected: clean.

- [ ] **Step 4: Verify on a preview deployment** (AGENTS.md: verify in the real thing). With two accounts on the PR preview: owner invites a magic-link address; the email arrives; opening the link signed out goes to login and back; accepting lands on the site settings; opening the same link signed in as another account shows the mismatch copy and the "Sign in with" button; the banner shows for a trusted matching account.

- [ ] **Step 5: Commit**

```bash
git add "apps/flowershow/app/(cloud)/dashboard/invite" apps/flowershow/components/dashboard/invite-banner.tsx "apps/flowershow/app/(cloud)/dashboard/page.tsx"
git commit -m "feat(members): invite accept page and dashboard invite banner" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 11: Members tab, role-aware settings, Premium feature line

**Files:**
- Create: `apps/flowershow/app/(cloud)/dashboard/site/[id]/members/layout.tsx` (copy of `annotations/layout.tsx`), `members/page.tsx`
- Create: `apps/flowershow/components/dashboard/members-panel.tsx` (client)
- Modify: `apps/flowershow/components/dashboard/site-tabs.tsx:18-28` (add Members tab)
- Modify: `apps/flowershow/components/dashboard/settings-nav.tsx:5-20` (export `navSectionsFor(isOwner: boolean)`)
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/page.tsx:22-35` (data loading), `:256-258` (nav), `:268-295` (Name/rename form), `:1126-1147` (GitHub), `:1157-1181` (Custom Domain form), `:1189-1215` (Billing, Danger)
- Modify: `apps/flowershow/components/dashboard/publish-history.tsx` (show `publishedBy`)
- Modify: `apps/flowershow/lib/stripe-plans.ts:79-86`
- Test: create `apps/flowershow/components/dashboard/settings-nav.test.ts`

**Interfaces:**
- Consumes: `siteMember.list`, `invite`, `revokeInvite`, `remove`, `leave` (Task 8); `getPublishHistory().publishedBy` (Task 3).
- Produces: `navSectionsFor(isOwner: boolean): Array<{ name: string; id: string }>`.

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, expect, it } from 'vitest';
import { navSectionsFor } from './settings-nav';

describe('navSectionsFor', () => {
  it('hides owner-only sections from editors', () => {
    expect(navSectionsFor(false).map((s) => s.id)).toEqual(['general', 'appearance', 'navigation', 'content', 'features', 'analytics', 'access']);
  });
  it('shows every section to the owner', () => {
    expect(navSectionsFor(true).map((s) => s.id)).toContain('billing');
    expect(navSectionsFor(true).map((s) => s.id)).toContain('danger');
    expect(navSectionsFor(true).map((s) => s.id)).toContain('github');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit components/dashboard/settings-nav.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Settings page: `const session = await getSession(); const isOwner = site.user.id === session?.user.id;` (the comparison drives rendering only; the server enforces). Load `getSiteSubscription`, `getBundleInfo` and `github.listInstallations` only when `isOwner`. For editors hide the Name (rename) form, the GitHub section, the Custom Domain form (keep the password form in Access & Domains), Billing and Danger Zone. Pass `isOwner` to `SettingsNav`, which renders `navSectionsFor(isOwner)`.
  - `site-tabs.tsx`: add `{ href: \`${base}/members\`, label: 'Members' }` after Annotations.
  - Members page: server component calls `api.siteMember.list.query({ siteId })` and renders `MembersPanel` with server actions for invite, revoke, remove, leave. Owner view: invite form (email input, Invite button, error text from the tRPC message), members with Remove, pending invites with email, expiry date and Revoke; a note when the site is not Premium ("Inviting editors needs Premium"). Editor view: read-only list (owner first, then members by username) and a "Leave site" button that redirects to `/` after leaving.
  - `publish-history.tsx`: show "by {publishedBy}" when non-null.
  - `stripe-plans.ts`: add `'Team collaboration (up to 20 editors)'` to `PLANS.PREMIUM.features` after `'Custom navbar & footer'` (the line removed in #1507, now true).

- [ ] **Step 4: Run to verify it passes, typecheck, lint**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit components/dashboard/settings-nav.test.ts && pnpm exec tsc --noEmit -p . && pnpm lint`
Expected: PASS, clean.

- [ ] **Step 5: Verify on the preview** as an editor: settings shows no Name, GitHub, Custom Domain, Billing or Danger; network panel shows no `stripe.*` calls; Members tab is read-only with Leave; History shows who published. As owner: invite, revoke, remove work on a Premium site; remove and revoke still work after switching the site to FREE in the database.

- [ ] **Step 6: Commit and open PR B**

```bash
git add "apps/flowershow/app/(cloud)/dashboard/site/[id]" apps/flowershow/components/dashboard apps/flowershow/lib/stripe-plans.ts
git commit -m "feat(members): Members tab, role-aware settings page and Team collaboration on Premium" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

The PostHog member-count event is emitted in Tasks 8 and 9; record in the PR body how to read it in PostHog (`site_members_changed`, property `memberCount`).

---

# PR C: API and MCP

### Task 12: Contract and REST lists with `role` and `owner`

**Files:**
- Modify: `packages/api-contract/src/schemas.ts:7-22` (`SiteSummarySchema`), add `SiteLookupResponseSchema` after `:55`
- Modify: `packages/api-contract/src/routes/sites.ts:124-145` (`listSites` description), `packages/api-contract/src/routes/anonymous.ts:347-378` (`lookupSite` response and 403)
- Modify: `apps/flowershow/app/api/sites/route.ts:249-280` (GET)
- Modify: `apps/flowershow/app/api/sites/[username]/[projectname]/route.tsx:70-130`
- Modify: `packages/api-contract/README.md` (sites section)
- Test: create `apps/flowershow/app/api/sites/route.test.ts` (GET only; mocks like `[username]/[projectname]/route.test.ts`), extend `app/api/sites/[username]/[projectname]/route.test.ts`

**Interfaces:**
- Consumes: `siteRole`, `siteAuthzSelect` (Task 2).
- Produces:
  - `SiteSummarySchema` gains `role: z.enum(['owner', 'editor'])` and `owner: z.object({ username: z.string() })`.
  - `SiteLookupResponseSchema = z.object({ site: z.object({ id, projectName, ghRepository, ghBranch, customDomain, subdomain, rootDir, plan, url, fileCount, totalSize, updatedAt, createdAt, role: z.enum(['owner','editor']), owner: z.object({ username: z.string() }) }) })` with `type SiteLookupResponse` (matches what the route actually returns today plus the two new fields; fixes the drift with `SiteDetail`).

- [ ] **Step 1: Write the failing tests.**

```ts
// app/api/sites/route.test.ts
it('lists owned sites and sites the caller can edit, with role and owner', async () => {
  vi.mocked(validateAccessToken).mockResolvedValue({ userId: 'ada-1' } as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ username: 'ada' } as any);
  vi.mocked(prisma.site.findMany).mockResolvedValue([
    { id: 's1', projectName: 'mine', subdomain: 'mine-ada', customDomain: null, createdAt: d, updatedAt: d, _count: { blobs: 1 }, userId: 'ada-1', plan: 'FREE', members: [], user: { username: 'ada' } },
    { id: 's2', projectName: 'notes', subdomain: 'notes-bob', customDomain: null, createdAt: d, updatedAt: d, _count: { blobs: 2 }, userId: 'bob-1', plan: 'PREMIUM', members: [{ userId: 'ada-1' }], user: { username: 'bob' } },
  ] as any);
  const json = await (await GET(req())).json();
  expect(prisma.site.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { OR: [{ userId: 'ada-1' }, { members: { some: { userId: 'ada-1' } }, plan: 'PREMIUM' }] },
  }));
  expect(json.sites.map((s: any) => [s.projectName, s.role, s.owner.username])).toEqual([['mine', 'owner', 'ada'], ['notes', 'editor', 'bob']]);
  expect(ListSitesResponseSchema.safeParse(json).success).toBe(true);
});
```

In the lookup test: `extended response includes role and owner and parses with SiteLookupResponseSchema`; `a lapsed editor gets 403 premium_required`.

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit app/api/sites/route.test.ts "app/api/sites/[username]"`
Expected: FAIL.

- [ ] **Step 3: Update the contract, then the routes.** Contract first; build it. `GET /api/sites` uses the `OR` above (lapsed shared sites are left out of REST and MCP lists; only the dashboard shows them), adds `userId`, `plan`, `user.username` to the select, and types the response `satisfies ListSitesResponse`. The lookup route returns `satisfies SiteLookupResponse` with `role` from `siteRole` and `owner: { username: site.user.username }`; for an authenticated `lapsed_editor` it returns `siteAccessDenied(role)`. Update the `lookupSite` contract: 200 union uses `SiteLookupResponse`, add a 403 response. README: document `role`/`owner` and `premium_required`.

- [ ] **Step 4: Build and test**

Run: `pnpm turbo build --filter=@flowershow/api-contract && cd apps/flowershow && pnpm exec vitest run --project=unit app/api/sites`
Expected: PASS; spec builds. Check `http://cloud.flowershow.local:3000/api/docs` shows the new fields.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contract apps/flowershow/app/api/sites/route.ts apps/flowershow/app/api/sites/route.test.ts "apps/flowershow/app/api/sites/[username]"
git commit -m "feat(api): GET /api/sites and site lookup include shared sites with role and owner" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 13: MCP `list-sites` includes shared sites

**Files:**
- Modify: `apps/flowershow/lib/mcp/server.ts:23-28` (`SiteSummary`), `:216-248` (tool description, output schema, text)
- Modify: `apps/flowershow/lib/mcp/deps.ts:235-258`
- Modify: `content/flowershow-app/docs/agents/mcp.md` (list-sites description)
- Test: `apps/flowershow/lib/mcp/deps.test.ts`, `apps/flowershow/lib/mcp/server.test.ts`

**Interfaces:**
- Produces: `SiteSummary` gains `role: 'owner' | 'editor'` and `owner: string` (username).

- [ ] **Step 1: Write the failing tests.** `deps.test.ts`: `listSites returns owned and Premium shared sites with role and owner` (assert `findMany` `where` equals the Task 12 `OR`, and mapped `role`/`owner`). `server.test.ts`: `list-sites text marks shared sites as owner/name` (a shared summary renders as `bob/notes (s2): https://... (editor)`; structured content includes `role` and `owner`).

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/mcp`
Expected: FAIL.

- [ ] **Step 3: Implement.** Same `where` as Task 12; select `userId`; map `role` and `owner: s.user.username`. Tool description: "List the sites in the signed-in Flowershow account and sites shared with it, ...". Text line for an editor site: `${owner}/${name} (${siteId}): ${url} (editor)`.

- [ ] **Step 4: Run to verify they pass**

Run: `cd apps/flowershow && pnpm exec vitest run --project=unit lib/mcp`
Expected: PASS.

- [ ] **Step 5: Commit and open PR C**

```bash
git add apps/flowershow/lib/mcp content/flowershow-app/docs/agents/mcp.md
git commit -m "feat(mcp): list-sites includes sites shared with you" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

---

# PR D: CLI

### Task 14: Shared sites in `fl list` and site resolution

**Files:**
- Modify: `apps/cli/internal/api/client.go:19-29` (`Site`)
- Create: `apps/cli/cmd/site_ref.go`, `apps/cli/cmd/site_ref_test.go`
- Modify: `apps/cli/cmd/site_resolve.go:12-50`, `apps/cli/cmd/list.go:72-84`
- Modify: `apps/cli/cmd/fakeapi_test.go` (shared sites in the fake)
- Test: `apps/cli/cmd/commands_test.go`

**Interfaces:**
- Produces:
  - `api.Site` gains `Role string \`json:"role,omitempty"\`` and `Owner *api.SiteOwner \`json:"owner,omitempty"\``; `type SiteOwner struct { Username string \`json:"username"\` }`.
  - `func (s Site) IsShared() bool` (`s.Role == "editor"`); `func (s Site) DisplayName() string` (`owner/name` when shared, else `ProjectName`).
  - `func parseSiteRef(ref string) (owner, name string)` in `cmd/site_ref.go`: splits on the first `/` (site names cannot contain `/`, `validate-site-name.ts`); no slash → `owner == ""`.
  - Fake API: `fakeAPI.shared map[string]api.Site` keyed `"owner/name"`; `GET /api/sites?includeShared=true` appends them with `Role: "editor"` (without the query it returns owned sites only); the CLI client's list call passes `?includeShared=true` (client method and a test asserting the query is sent); `GET /api/sites/{owner}/{name}` serves them for `owner != testUser`; `fakeAPI` gains a helper `f.share(owner, name string)` that adds `api.Site{ID: "id-" + owner + "-" + name, ProjectName: name, Role: "editor", Owner: &api.SiteOwner{Username: owner}}`.

- [ ] **Step 1: Write the failing tests.**

```go
func TestParseSiteRef(t *testing.T) {
	for in, want := range map[string][2]string{"notes": {"", "notes"}, "bob/notes": {"bob", "notes"}, "bob/My Notes": {"bob", "My Notes"}} {
		o, n := parseSiteRef(in)
		if o != want[0] || n != want[1] { t.Fatalf("%q: got %q,%q", in, o, n) }
	}
}

func TestList_ShowsSharedSitesAsOwnerSlashName(t *testing.T) {
	f := setupFakeAPI(t, true, "blog")
	f.share("bob", "notes")
	out, err := captureOutput(t, runList)
	if err != nil { t.Fatal(err) }
	if !strings.Contains(out, "bob/notes") || !strings.Contains(out, "Shared with you") { t.Fatalf("missing shared site:\n%s", out) }
}

func TestResolveSite_BareNameIgnoresSharedSite(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	if _, err := resolveSite("notes"); err == nil { t.Fatal("bare name must not resolve to a shared site") }
	s, err := resolveSite("bob/notes")
	if err != nil || s.ID != "id-bob-notes" { t.Fatalf("got %+v, %v", s, err) }
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/cli && go test ./cmd/ -run 'TestParseSiteRef|TestList_Shows|TestResolveSite_' -v`
Expected: FAIL (undefined `parseSiteRef`, `share`).

- [ ] **Step 3: Implement.** `resolveSite`: parse the ref; with an owner, match `DisplayName() == ref`; without, match only sites where `!IsShared()` and `ProjectName == name`; the "only site" shortcut and the "Multiple sites found" list consider owned sites only, and the list prints `DisplayName()`. `runList` prints owned sites, then a "Shared with you" heading and shared sites as `owner/name` with `Role: editor`.

- [ ] **Step 4: Run to verify they pass**

Run: `cd apps/cli && go test ./...`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/cli/internal/api/client.go apps/cli/cmd/site_ref.go apps/cli/cmd/site_ref_test.go apps/cli/cmd/site_resolve.go apps/cli/cmd/list.go apps/cli/cmd/fakeapi_test.go apps/cli/cmd/commands_test.go
git commit -m "feat(cli): fl list shows shared sites as owner/name; bare names resolve to your own sites only" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

### Task 15: `fl publish` to `owner/name` and by stored `siteId`

**Files:**
- Modify: `apps/cli/internal/localconfig/localconfig.go:13-33` (doc comment), `:47-60` (`Read`)
- Modify: `apps/cli/cmd/publish.go:266-356` (resolution), `:328`, `:352`, `:382`, `:413` (link writes), `:520-531` (`relinkClaimedSite`)
- Modify: `apps/cli/README.md` (publish `--name`, `.flowershow`, `fl list`), `apps/cli/CHANGELOG.md` (next version)
- Test: `apps/cli/cmd/publish_test.go`, `apps/cli/internal/localconfig/localconfig_test.go`

**Interfaces:**
- Consumes: `parseSiteRef`, `api.Site.DisplayName` (Task 14); `api.GetSiteByID(siteID) (*api.GetSiteDetailResponse, error)`, `api.GetSiteByName(username, name)`.
- Produces:
  - `func linkFolder(folderPath string, site api.Site, siteRef string) error` in `cmd/publish.go`: writes `localconfig.Config{SiteName: siteRef, SiteID: site.ID}` (`siteRef` is `owner/name` for a shared site, bare name for an own site).
  - `.flowershow` for account sites now carries `siteId`; `Read` accepts a non-anon config with `SiteID` and `SiteName`. An old `fl` reading a shared link sees `siteName: "bob/notes"`, looks it up under its own username, and fails on the `/` instead of creating a duplicate (names cannot contain `/`).

- [ ] **Step 1: Write the failing tests.**

```go
func TestPublish_OwnerSlashName_SyncsSharedSite(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	dir := makeFolder(t, "notes", "")
	if err := runPublish([]string{dir}, "bob/notes", true, true, false); err != nil { t.Fatal(err) }
	if !f.syncedTo("id-bob-notes") { t.Fatal("expected sync to the shared site") }
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteID != "id-bob-notes" || cfg.SiteName != "bob/notes" { t.Fatalf("link: %+v", cfg) }
	if len(f.createdNames()) != 0 { t.Fatal("must not create a site") }
}

func TestPublish_OwnerSlashName_NotShared_NeverCreates(t *testing.T) {
	f := setupFakeAPI(t, true)
	dir := makeFolder(t, "notes", "")
	if err := runPublish([]string{dir}, "bob/notes", true, true, false); err == nil { t.Fatal("expected an error") }
	if len(f.createdNames()) != 0 { t.Fatal("must not create a site") }
}

func TestPublish_BareNameMatchingSharedSite_NeverSyncsShared(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	dir := makeFolder(t, "notes", "")
	_ = runPublish([]string{dir}, "notes", true, false, false)
	if f.syncedTo("id-bob-notes") { t.Fatal("bare name synced into a shared site") }
}

func TestPublish_LinkedBySiteID_SyncsAfterRename(t *testing.T) {
	f := setupFakeAPI(t, true, "renamed")
	dir := makeFolder(t, "x", "")
	_ = localconfig.Write(dir, &localconfig.Config{SiteName: "old-name", SiteID: "id-renamed"})
	if err := runPublish([]string{dir}, "", true, false, false); err != nil { t.Fatal(err) }
	if !f.syncedTo("id-renamed") { t.Fatal("expected sync by stored siteId") }
}

func TestPublish_NewLinkStoresSiteID(t *testing.T) {
	setupFakeAPI(t, true)
	dir := makeFolder(t, "fresh", "")
	if err := runPublish([]string{dir}, "", true, false, false); err != nil { t.Fatal(err) }
	if cfg := localconfig.Read(dir); cfg == nil || cfg.SiteID != "id-fresh" { t.Fatalf("link: %+v", cfg) }
}

func TestPublish_SharedSiteLapsed_ReportsPremiumRequired(t *testing.T) {
	f := setupFakeAPI(t, true)
	f.share("bob", "notes")
	f.siteStatus["id-bob-notes"] = 403 // fake returns {"error":"premium_required","message":...} for 403 on shared ids
	dir := makeFolder(t, "x", "")
	_ = localconfig.Write(dir, &localconfig.Config{SiteName: "bob/notes", SiteID: "id-bob-notes"})
	err := runPublish([]string{dir}, "", true, false, false)
	if err == nil || !strings.Contains(err.Error(), "Premium") { t.Fatalf("got %v", err) }
}
```

`localconfig_test.go`: `TestRead_AccountSiteWithSiteID` (config with `SiteName` and `SiteID`, no `Anon`, reads back both and `IsAnon()` is false).

- [ ] **Step 2: Run to verify they fail**

Run: `cd apps/cli && go test ./... -run 'TestPublish_OwnerSlash|TestPublish_BareName|TestPublish_LinkedBySiteID|TestPublish_NewLink|TestPublish_SharedSiteLapsed|TestRead_AccountSiteWithSiteID' -v`
Expected: FAIL.

- [ ] **Step 3: Implement.** Resolution order in `runPublish` (non-anon): (1) a linked config with `SiteID` and no `--name` → `GetSiteByID`; on success sync to it (and rewrite the link if its `SiteName` is stale); on 404 fall through to the name path as today; any other error (403 `premium_required` included) fails with the server's message. (2) Otherwise parse the ref from `--name` / `SiteName` / derived name: with an owner other than the caller → `GetSiteByName(owner, name)`; not found → fail `Site "bob/notes" not found or not shared with you. Run \`fl list\` to see your sites.`; found → sync and link; never create. With no owner (or the caller's own username) → today's flow unchanged (`GetSiteByName(userInfo.Username, name)`). Replace every `localconfig.Write(folderPath, &localconfig.Config{SiteName: X})` with `linkFolder`. `relinkClaimedSite` keeps the claimed site's id in `SiteID` instead of clearing it. Extend the fake so a forced 403 on a site id returns `{"error":"premium_required","message":"This site is shared with you, but its Premium plan has lapsed. Ask the site owner to renew it."}`. Update README and add a CHANGELOG entry.

- [ ] **Step 4: Run to verify they pass**

Run: `cd apps/cli && go test ./...`
Expected: PASS.

- [ ] **Step 5: Commit and open PR D**

```bash
git add apps/cli
git commit -m "feat(cli): publish to shared sites as owner/name and link folders by siteId" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

Log a follow-up bead for the Obsidian plugin (same rule, its own repo).

---

# Closing

### Task 16: Docs, changelog, CONTEXT.md, ADR

**Files:**
- Create: `content/flowershow-app/docs/reference/collaborators.md` (docs pages live in `docs/reference/` next to `password-protection.md` and `custom-domain.md`; the spec's `docs/collaborators.md` path predates that structure)
- Create: `content/flowershow-app/changelog/YYYY-MM-DD-invite-editors.md` (date of release; extend an entry from the last few days if one is on the same theme)
- Create: `docs/adr/0016-site-membership-and-roles.md` (last ADR is `0015-annotations-are-open-and-moderated-off-page.md`)
- Modify: `CONTEXT.md:23-25` (Site), `:80` (Annotation: "only the site owner can resolve or delete one")

- [ ] **Step 1: Docs page.** Use the `write-tutorial` skill (feature overview). Frontmatter `title: Invite editors to a site`, `description`. Cover: Premium only; inviting by email and the 14-day link; what editors can and cannot do (the spec's role table, in user words); signing in with the invited address (magic link works without GitHub); publishing as an editor from the web, MCP, and CLI with `fl --name owner/name`; leaving; what happens if Premium lapses; the replace-mode sync overwrite risk between editors; the 20-editor limit.

- [ ] **Step 2: Changelog entry** per AGENTS.md template, title "Invite editors to your site", linking `[[collaborators|Invite editors to a site]]`, with a screenshot of the Members tab (`image:`, ~1440px `.webp` in `content/flowershow-app/assets/`) taken from the preview.

- [ ] **Step 3: CONTEXT.md.** Site: "A published website on Flowershow, owned by one user (its owner) and optionally managed by editors (site members)". Add a **Site Member / Editor** term (Premium only, what they can do, owner-only actions, `_Avoid_: collaborator role names other than owner and editor`). Annotation: "only the site owner or an editor can resolve or delete one".

- [ ] **Step 4: ADR 0016.** Context (single owner, #919), decision (owner stays `Site.userId`; editors in `SiteMember`; `canManageSite` vs `isSiteOwner`; required `plan`/`members` type and `siteAuthzSelect`; Premium gating and lapse behaviour; invites hashed, 14 days, trusted-email rule; no orgs in phase 1), consequences (lists return shared sites with `role`; CLI addresses shared sites as `owner/name` or by `siteId`; tokens act across every site a user can manage).

- [ ] **Step 5: Check the site renders**

Run: publish the docs to a throwaway preview with `fl` (or check the PR's Flowershow preview) and open the new page and changelog entry.
Expected: both render; wiki link resolves.

- [ ] **Step 6: Commit** (docs go straight to `main` per AGENTS.md once PR B is live)

```bash
git add content/flowershow-app CONTEXT.md docs/adr/0016-site-membership-and-roles.md
git commit -m "docs: invite editors to a site; Site Member in CONTEXT; ADR 0016 site membership and roles" -m "Claude-Session: https://claude.ai/code/session_01KA2bCu1T2cq1s9dwZdBfFK"
```

---

## Call-site coverage (for the PR A description)

| Call site | Check after | Test |
|---|---|---|
| `site.update` | `canManageSite`, plus `isSiteOwner` for `SITE_UPDATE_KEY_ROLE` owner keys | Task 3 key table |
| `site.getById`, `setPasswordProtection`, `updateDbConfig`, `getDbConfig`, `getAssetUploadUrl`, `getLatestPublishState`, `getPublishHistory` | `canManageSite` | Task 3 allow/deny |
| `site.renameSite`, `delete`, `disconnectGitHub`, `reconnectSiteToGitHubApp`, `connectGitHub` | `isSiteOwner` | Task 3 editor deny table |
| `stripe.cancelSubscription`, `createCheckoutSession`, `getBillingPortal`, `getSiteSubscription` | `isSiteOwner` | Task 4 `stripe.test.ts` |
| `annotation.*` | `canManageSite` | Task 4 |
| `site-tabs-layout.tsx` | `canManageSite` | typecheck + Task 11 preview check |
| `server/auth.ts withSiteAuth` | deleted | grep in Task 4 |
| `lib/site-auth.ts` (sync), `id/[siteId]` GET, `status`, `files` POST/DELETE | `siteRole` + `siteAccessDenied` | Task 5 |
| `id/[siteId]` DELETE, `claim` | `isSiteOwner` | Task 5 (DELETE); claim unchanged (owner of the anonymous site) |
| `owner/authorize`, `owner/callback`, `owner/me`, `lib/site-owner-session.ts` | `canManageSite` (spec: editors get the owner cookie) | Task 6 |
| `lib/annotations/http.ts` and the three annotation routes | `siteRole` / `canManageSite` | Task 6 |
| `lib/mcp/deps.ts assertCanManage` | `siteRole` | Task 6 |
| `[username]/[projectname]` | `canManageSite` (was inline) | Task 6, Task 12 |
| `lib/site-access.ts` visitor password gate | `isSiteOwner`, unchanged (signed-in bypass is a separate feature) | existing tests |
