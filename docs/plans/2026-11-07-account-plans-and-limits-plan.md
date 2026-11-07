# Account plans and limits model: implementation plan (phases 0 and 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure storage use weekly (phase 0), then enforce per-tier storage limits on publish, add a plan resolver the account plans and teams work will build on, and stop lapsed subscriptions from making password-protected sites public (phase 1).

**Architecture:** Plan logic moves into one module, `lib/entitlements.ts`, which owns the `Feature` enum, premium features and plan limits; `lib/feature-flags.ts` re-exports `Feature` and keeps `isFeatureEnabled` as a thin wrapper. Storage is computed from `Blob.size` on demand, not cached, so it cannot drift (a deliberate simplification of the design's reservation counter); the publish routes compare the site's projected size after the change against the resolver's limits. Grandfathering uses one nullable per-site allowance column, backfilled once by migration; grandfathered sites sit outside the Free pool.

**Tech Stack:** Next.js route handlers and tRPC, Prisma/Postgres, Vitest (unit project), Zod contract in `packages/api-contract`. Phase 0 is a Node script and GitHub Action in the private product repo.

**Spec:** Epic `flowershow-gyj`, beads `flowershow-41t` (phase 0) and `flowershow-da3` (phase 1, folds in `flowershow-bp8`). The design note is private (product repo, `research/2026-11-07-unlimited-plan-and-limits-model.md`); this plan copies the values it needs. Prices are not in this repo and must not be added.

## Global Constraints

- Byte units are binary: 1 MB = 1,048,576 bytes, 1 GB = 1,073,741,824 bytes.
- Free: per-site soft 100 MB, per-site hard 200 MB, per-account hard pool 1 GB across the owner's Free sites that have no grandfathered allowance.
- Premium: per-site soft 5 GB, per-site hard 10 GB. No pool.
- Anonymous sites keep their existing limits (200 files, 50 MB) unchanged; the new storage check does not apply to anonymous callers.
- Existing per-request guards stay: 100 MB per file, 500 MB and 1000 files per request.
- A publish that does not grow the site (projected bytes ≤ current bytes) is never rejected, even when the site is over its limit.
- Rejection: HTTP 413, body `{ error: 'storage_limit_exceeded', message, upgradeUrl }`. `upgradeUrl` is `https://${NEXT_PUBLIC_CLOUD_DOMAIN}/site/${siteId}/settings#billing` for Free sites; for Premium sites it is a `mailto:` to the support address the app already uses (grep for it).
- Enforcement is advisory against declared sizes: presigned URLs don't sign Content-Length and in-flight uploads have no `Blob` row yet, so a determined client can overshoot once; the next publish sees the real `Blob.size`. The PR says so; a follow-up bead signs Content-Length.
- Site creation by signed-in users: at most 20 new sites per user per fixed 1-hour window, HTTP 429 / tRPC `TOO_MANY_REQUESTS`. Count the hit immediately before `site.create` on the new-site branch only (not on 400s, 409s, name retries or `overwrite=true`).
- No prices, Stripe price ids or plan names other than FREE and PREMIUM in this phase. No emails. No pricing-page change (that ships with phase 3 on Rufus's yes).
- Every changed API route updates `packages/api-contract` first (repo `AGENTS.md`).

## Review Focus

1. **Grandfathered sites editing content:** a Free site already at 1.2 GB publishes a one-line edit to a note. Expected: accepted (allowance backfilled to 110% of its size, and the site sits outside the pool). Test in Task 3.
2. **Merge mode with deletes and replacements:** projected size must subtract replaced and deleted paths, not just add incoming sizes, or a user replacing a big image with a smaller one is blocked. Test in Task 3.
3. **Pool counting the site being published twice:** the Free pool is the owner's other non-grandfathered Free sites plus this site's projected size, never plus its current size as well. Test in Task 2.
4. **MCP callers:** MCP publishes go through `/sync` as an internal caller; the 413 message must reach the chat as readable text naming the limit and the next step. Test in Task 3 asserts the message text.
5. **Premium lapse:** after a per-site subscription is cancelled the site stays password-protected, its owner can still turn the password off, and a lapsed 3 GB site can still publish edits and does not fill the owner's Free pool. Tests in Task 5.

---

## Phase 0: weekly usage report (product repo, straight to main). DONE 2026-11-07 (product commit 2a23a11, first run green)

### Task 0: Weekly usage report workflow

**Files (in `~/src/flowershow/product`):**
- Create: `scripts/usage-report.mjs`
- Create: `.github/workflows/usage-report.yml`
- Reference: `scripts/subscription-stats.mjs` (reuse its pool setup and queries)

**Interfaces:**
- Produces: `reports/usage-weekly.md` (overwritten each run) and `reports/usage/YYYY-MM-DD.md` (dated copy).

- [ ] **Step 1: Write `scripts/usage-report.mjs`**, read-only SQL via `pg` and `DATABASE_URL`, rendering Markdown tables (no emails, usernames only) with these sections: totals (users, sites, active subscriptions by interval); accounts by paid-site count; accounts by total-site bucket (1, 2, 3–5, 6–10, 11–25, 26+); Free sites over 100 MB and over 200 MB (username, project, MB, files), Premium sites over 5 GB; Free accounts whose Free sites sum over 1 GB; top 20 sites by storage; publishes in the last 7 days by source and the top 20 accounts by publish count. Cast every `SUM(size)` to `bigint` before arithmetic (an `int4` overflow broke the first stats run).
- [ ] **Step 2: Run locally** if `DATABASE_URL` is available; otherwise run `node --check scripts/usage-report.mjs`. Expected: no syntax errors.
- [ ] **Step 3: Write the workflow:** `schedule: cron '17 6 * * 1'` (Mondays 06:17 UTC) plus `workflow_dispatch`; Node 18; `npm ci`; run the script with `DATABASE_URL` from secrets; commit `reports/usage-weekly.md` and the dated file with message `Update weekly usage report` and push, as `analytics.yml` does.
- [ ] **Step 4: Commit, push, trigger with `gh workflow run usage-report.yml`, and check the run is green and the report reads correctly.**

---

## Phase 1: resolver, storage limits, lapse fix (one PR in `flowershow/flowershow`)

### Task 1: Entitlements resolver

**Files:**
- Create: `apps/flowershow/lib/entitlements.ts`
- Create: `apps/flowershow/lib/entitlements.test.ts`
- Modify: `apps/flowershow/lib/feature-flags.ts` (`Feature` enum moves to `entitlements.ts` and is re-exported here, avoiding a circular import; `isFeatureEnabled` delegates)
- Test: `apps/flowershow/lib/feature-flags.test.ts` must still pass unchanged

**Interfaces:**
- Produces:
  - `export const MB = 1_048_576; export const GB = 1_073_741_824;`
  - `export type PlanLimits = { siteSoftBytes: number; siteHardBytes: number; freePoolHardBytes: number | null }`
  - `export const PLAN_LIMITS: Record<Plan, PlanLimits>` with FREE `{100*MB, 200*MB, 1*GB}` and PREMIUM `{5*GB, 10*GB, null}`
  - `export enum Feature { … }` (moved verbatim from `feature-flags.ts`)
  - `export type Entitlements = { plan: Plan; isPaid: boolean; features: ReadonlySet<Feature>; limits: PlanLimits }`
  - `export function getEntitlements(site: { plan?: Plan | null }): Entitlements` (pure, no DB). Phase 2 adds the plan source and account plans.

- [ ] **Step 1: Write failing tests** in `entitlements.test.ts`: `getEntitlements({ plan: 'FREE' })` returns `isPaid false`, empty features, `limits.siteHardBytes === 200 * MB`, `limits.freePoolHardBytes === GB`; `getEntitlements({ plan: 'PREMIUM' })` returns `isPaid true`, all eight `Feature` values, `limits.siteHardBytes === 10 * GB`, `freePoolHardBytes === null`; `getEntitlements({ plan: null })` behaves as FREE.
- [ ] **Step 2: Run** `cd apps/flowershow && pnpm vitest --project=unit lib/entitlements.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `entitlements.ts`; move the `PREMIUM_FEATURES` list there; make `isFeatureEnabled(feature, site)` return `getEntitlements(site).features.has(feature)`.
- [ ] **Step 4: Run** entitlements and feature-flags tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(plans): entitlements resolver with plan limits`.

### Task 2: Storage usage and limit check

**Files:**
- Modify: `apps/flowershow/prisma/schema.prisma` (Site: `storageAllowanceBytes BigInt? @map("storage_allowance_bytes")`). Before adding it, grep for places that return a whole `Site` row through `NextResponse.json` or `unstable_cache`, which cannot serialise BigInt, and add explicit selects where needed.
- Create: `apps/flowershow/prisma/migrations/20261107200000_storage_allowances/migration.sql`
- Create: `apps/flowershow/lib/storage-limits.ts`
- Create: `apps/flowershow/lib/storage-limits.test.ts`

**Interfaces:**
- Consumes: `getEntitlements`, `MB`, `GB` from Task 1.
- Produces:
  - `export async function getSiteStorageBytes(siteId: string): Promise<number>`: `SELECT COALESCE(SUM(size),0)::bigint` over `"Blob"` for the site, returned as `Number`. Used by `/files`; `/sync` computes from the blob list it already loads.
  - `export async function getFreePoolBytes(userId: string, excludeSiteId: string): Promise<number>`: sum over the user's sites with `plan = 'FREE'`, `storage_allowance_bytes IS NULL` and `id <> excludeSiteId`.
  - `export type StorageCheckInput = { site: { id: string; plan: Plan | null; storageAllowanceBytes: bigint | null }; currentSiteBytes: number; projectedSiteBytes: number; otherFreeSitesBytes: number }`
  - `export type StorageViolation = { scope: 'site' | 'pool'; limitBytes: number; projectedBytes: number }`
  - `export function checkStorageLimit(input: StorageCheckInput): StorageViolation | null` (pure)
  - `export function storageLimitResponse(v: StorageViolation, site: { id: string; plan: Plan | null }): NextResponse` (the 413 from Global Constraints)

- [ ] **Step 1: Write failing tests** for `checkStorageLimit`:
  - Free site, current 50 MB, projected 150 MB, other Free sites 0: returns null.
  - Free site, projected 201 MB: returns `{ scope: 'site', limitBytes: 200 * MB }`.
  - Free site with `storageAllowanceBytes = 1320 * MB`, projected 1300 MB: null.
  - Free site, current 1200 MB, projected 1199 MB, no allowance: null (non-growing).
  - Free site, projected 150 MB, other Free sites 900 MB: returns `{ scope: 'pool', limitBytes: GB, projectedBytes: 1050 * MB }`.
  - Free site with an allowance (grandfathered), projected 1300 MB, allowance 1320 MB, other Free sites 900 MB: null (pool check skipped for grandfathered sites).
  - Premium site, projected 9 GB, other Free sites 5 GB: null (pool ignored for Premium).
  - Premium site, projected 11 GB: `{ scope: 'site', limitBytes: 10 * GB }`.
  - `storageLimitResponse` returns status 413 and a body whose `message` contains `200 MB` and the word `Premium` for a Free site-scope violation, and `1 GB` for a pool violation.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Implement** the schema change, migration and module. Effective site limit is `max(limits.siteHardBytes, Number(storageAllowanceBytes ?? 0))`; the pool check runs only for Free sites with no allowance. Messages (exact copy):
  - Site: `This publish would take {site name or "this site"} to {projected} of storage, over the {limit} limit for {Free|Premium} sites. Remove some large files, or upgrade to Premium for 5 GB per site: {upgradeUrl}` (for Premium: `… over the 10 GB limit. Get in touch for more: {upgradeUrl}`).
  - Pool: `Your free sites would use {projected} together, over the 1 GB limit for free sites on one account. Remove some large files, or upgrade this site to Premium: {upgradeUrl}`.
  Format bytes as MB with no decimals under 1 GB and GB with one decimal above.
- [ ] **Step 4: Write the migration SQL**: add the column on `"Site"`; backfill `storage_allowance_bytes = CEIL(total * 1.1)::bigint` for Free sites whose `SUM("Blob".size)::bigint` (joined on `site_id`) exceeds 200 MB. The two accounts over the 1 GB pool today are covered because their large sites become grandfathered and leave the pool; the PR description lists any account still over 1 GB after backfill (query it). Run `pnpm prisma migrate dev` against the local database if one is available, else `pnpm prisma validate` and `pnpm prisma generate`.
- [ ] **Step 5: Run** tests and `pnpm tsc --noEmit -p apps/flowershow` (or the package's typecheck). Expected: PASS.
- [ ] **Step 6: Commit** `feat(limits): storage usage and limit check with grandfathered allowances`.

### Task 3: Enforce storage limits on /sync and /files

**Files:**
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/sync/route.ts` (after `toDelete` is computed, before any Publish row or presigned URL; skip when `access.kind === 'anon'`; applies to dry runs too so `--dry-run` reports it)
- Modify: `apps/flowershow/app/api/sites/id/[siteId]/files/route.ts` (after validation; add `size` to the existing-blob select)
- Modify: `packages/api-contract/src/routes/*.ts` for both routes (document 413 `storage_limit_exceeded`) and the shared error schema if one exists
- Test: both routes' `route.test.ts`

**Interfaces:**
- Consumes: Task 2 (`getSiteStorageBytes`, `getFreePoolBytes`, `checkStorageLimit`, `storageLimitResponse`).
- Site row: `/sync` has none today (`authorizeSiteRequest` in `lib/site-auth.ts` selects only `id, userId`). Extend it to also select and return `plan` and `storageAllowanceBytes` (and the owner id), updating its other callers' types. `/files` adds the same fields to its existing site select.
- Projected bytes: in `/sync`, from `existingBlobs` returned by `loadServerFileState` (it has `size`): `current = Σ existingBlobs.size`; `projected = Σ size of existing blobs not in toDelete and not in the request + Σ size of request files`. In `/files`, `current = getSiteStorageBytes(siteId)`; `projected = current − Σ existing size of request paths + Σ request sizes` (add `size` to the existing-blob select). The pool sum is keyed on the site's owner, not the caller (editors publish to the owner's site).
- MCP: `/sync` is called in-process (`lib/mcp/deps.ts`) and `explain()` in `lib/mcp/publish.ts` passes a 413 `message` through. Its 429 branch says "Too many anonymous sites" for every 429; in user mode pass the server's 429 message through so the Task 4 create limit reads correctly.
- Contract: add optional `upgradeUrl` to `ErrorSchema` in `packages/api-contract/src/schemas.ts`, and update the existing 413 description on the sync route in `routes/sites.ts`, which mentions only claim tokens.

- [ ] **Step 1: Write failing route tests** (use a partial `vi.mock('@/lib/storage-limits', importOriginal)` that stubs only `getSiteStorageBytes` and `getFreePoolBytes`, so the real `checkStorageLimit` runs; `/files` accepts both bearer tokens and dashboard sessions):
  - `/sync` replace, Free site, request totals 250 MB: 413, `error === 'storage_limit_exceeded'`, no `publish.create` call.
  - `/sync` merge on a Free site at 190 MB, replacing a 20 MB file with a 5 MB one and adding a 10 MB file: 200 OK (projected 185 MB).
  - `/sync` merge on a grandfathered Free site (current 1200 MB, allowance 1320 MB, other Free sites 900 MB) editing a note +2 KB: 200 OK.
  - `/sync` from an MCP internal caller over the limit: 413 and `message` contains `limit` and the upgrade URL; `explain()` in `lib/mcp/publish.ts` turns a user-mode 429 with a message into that message (unit test there).
  - `/sync` anonymous: storage check not called (existing anon tests still pass).
  - `/files` on a Premium site pushing it to 10.5 GB: 413.
- [ ] **Step 2: Run** both route test files. Expected: new tests FAIL.
- [ ] **Step 3: Implement** the checks and contract entries; build the contract with `pnpm turbo build --filter=@flowershow/api-contract`.
- [ ] **Step 4: Run** route tests, the contract build, and `pnpm lint` in `apps/flowershow`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(limits): enforce storage limits on sync and files`.

### Task 4: Site-creation rate limit

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts` (create procedure)
- Modify: `apps/flowershow/app/api/sites/route.ts` (POST create) and its contract route (document 429)
- Create: `apps/flowershow/lib/site-create-limit.ts` and test

**Interfaces:**
- Consumes: `hitFixedWindow` from `lib/fixed-window-limit.ts`.
- Produces:
  - `export const SITE_CREATE_LIMIT_PER_HOUR = 20;`
  - `export async function siteCreateAllowed(userId: string): Promise<boolean>`: `hitFixedWindow(\`site-create:${userId}\`, 3_600_000) <= 20`.

- [ ] **Step 1: Write failing tests**: `siteCreateAllowed` returns true for hits 1 to 20 and false for hit 21 (mock `hitFixedWindow`); tRPC create and REST POST return `TOO_MANY_REQUESTS` / 429 with message `You've created 20 sites in the last hour. Try again later, or get in touch if you need more.` when not allowed; a 409 name conflict and an `overwrite=true` call do not count a hit.
- [ ] **Step 2: Run** tests. Expected: FAIL.
- [ ] **Step 3: Implement**, calling `siteCreateAllowed` immediately before `site.create` on the new-site branch.
- [ ] **Step 4: Run** tests and lint. Expected: PASS.
- [ ] **Step 5: Commit** `feat(limits): site-creation rate limit`.

### Task 5: Make a Premium lapse safe

**Files:**
- Modify: `apps/flowershow/app/api/stripe/webhook/route.ts` (cancellation branch around the `plan: 'FREE'` update)
- Modify: `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/page.tsx` (password form: allow removing a password on a Free site; setting a new one stays Premium-only)
- Test: `apps/flowershow/app/api/stripe/webhook/route.test.ts`

- [ ] **Step 1: Write the failing test**: a `customer.subscription.updated` event with `status: 'canceled'` for a site with `privacyMode: 'PASSWORD'` updates the site with `plan: 'FREE'` and does not include `privacyMode`, `accessPasswordHash` or `tokenVersion` in the update data; the custom-domain removal still happens; when the site's blobs total over 200 MB the update sets `storageAllowanceBytes` to `CEIL(total × 1.1)` so it can keep publishing edits and stays out of the Free pool.
- [ ] **Step 2: Run**. Expected: FAIL.
- [ ] **Step 3: Implement**: drop the privacy reset from the update and set the allowance as tested. The password gate in `lib/site-access.ts` is plan-independent, so the site stays protected. In the settings page, keep the form's set/change action Premium-only but enable its remove action for Free sites (the server mutation is already ungated for removal; confirm, and add a test if it is not).
- [ ] **Step 4: Run** webhook tests. Expected: PASS.
- [ ] **Step 5: Commit** `fix(billing): keep password protection and storage headroom when a subscription lapses`.

### Task 6: PR

- [ ] **Step 1:** Run the full unit suite `cd apps/flowershow && pnpm test -- --run`, lint, and the contract build. Expected: all green.
- [ ] **Step 2:** Security review per repo `AGENTS.md` (editors hitting the owner's limits get no owner data beyond sizes; extended `authorizeSiteRequest` still enforces access).
- [ ] **Step 3:** Push `worktree-account-plans` and open a PR titled `Plans: entitlements resolver and storage limits (phase 1)` with `Refs flowershow-da3, flowershow-bp8`, a summary of limits, the grandfathering rule, the advisory-enforcement caveat, the on-demand-sum deviation from the design, and the follow-ups below. Wait for CI green. Do not merge: merging deploys, which needs Rufus's yes.

## Follow-ups (beads, not in this PR)

- Enforce storage limits on GitHub-synced sites in the Cloudflare worker's sync workflow (`flowershow-9qo`).
- Soft-limit warnings: dashboard storage meter plus emails at 80% and 100% (`flowershow-hj8`).
- Sign Content-Length on presigned uploads so declared sizes are enforced.
- Discord summary for the weekly usage report (`flowershow-dje`).
- Phase 2 and 3 plan sections (account plans, launch), appended to this file by the next session.
