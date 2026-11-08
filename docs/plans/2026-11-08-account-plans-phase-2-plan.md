# Account plans phase 2: Pro and Unlimited in Stripe, account billing (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an account buy a Pro (up to 5 sites) or Unlimited plan that makes its covered sites Premium, consolidate its existing per-site subscriptions with a credit, handle plan changes and lapse safely, and give it an account billing page, all dark until phase 3 flips one constant.

**Architecture:** `Site.plan` stays the materialised answer every renderer and gate already reads; a new `Site.planSource` (`SITE | ACCOUNT | MANUAL`) records why. One pure function, `computeSitePlans`, derives each site's plan from the account's state (live per-site subscription, live account subscription, covered flag, manual grant), and one DB function, `reconcileUserSitePlans`, applies the diff. Every billing event (per-site and account webhooks, site create and claim, covered-site toggle) calls the reconciler instead of writing `plan` directly, so handlers are idempotent by construction. Account webhooks re-fetch the subscription from Stripe and sync from the live object, so event order does not matter.

**Tech Stack:** Next.js route handlers and tRPC, Prisma/Postgres, Stripe Node SDK (API `2024-12-18.acacia`), Vitest (unit project), Go (CLI).

**Spec:** Design note (private, authoritative) `product/research/2026-11-07-unlimited-plan-and-limits-model.md`, sections 5.3, 6, 7, 8 (item 4: storage limits never block). Bead `flowershow-syk` (epic `flowershow-gyj`). Phase 0/1 plan: `docs/plans/2026-11-07-account-plans-and-limits-plan.md`. Values needed here are copied below; prices are not.

## Rulings (decided here; reviewers check against these)

1. **Two PRs, both dark.** 2a = schema, resolver, reconciler, account checkout procedure, account webhooks, consolidation (no UI). 2b = account billing page, covered-sites picker, site settings status, ladder and discount retirement (gated), upgrade-link helper; `fl upgrade` moves to phase 3. Both gate every account-plan entry point on `accountPlansEnabled()`, which is false until phase 3 (`flowershow-a7k`) sets `ACCOUNT_PLANS_LIVE = true` in code. Each PR merges safely on its own: with the flag off, users see today's product.
2. **`planSource` is nullable with values `SITE | ACCOUNT | MANUAL`.** Backfill: PREMIUM sites whose `Subscription` row exists with a non-canceled status get `SITE`; every other PREMIUM site gets `MANUAL` (covers the ~70 admin grants and cancel-bonus leftovers); FREE sites stay null. The reconciler never changes a `MANUAL` site, and treats `plan = PREMIUM, planSource = null` (an admin who forgot the column) as `MANUAL`. Downgrade to FREE happens only when the current source is `SITE` or `ACCOUNT` and that source is no longer live. Why not a separate `manualPremium` boolean: one column, one precedence order, and the safe default is built into the reader rather than relying on every writer.
3. **Precedence:** `MANUAL` > live per-site subscription (`SITE`) > live account plan and covered (`ACCOUNT`) > `FREE`. MANUAL and SITE sites never use a Pro slot.
4. **Two status rules.** A per-site subscription keeps its site Premium unless it is `canceled` or `incomplete_expired` (`isLiveSiteStatus`), which is today's behaviour (downgrade only on `canceled`), so the per-site path does not change. An account subscription covers sites only when `active`, `trialing` or `past_due` (`isCoveringAccountStatus`), and consolidation runs only when `active` or `trialing`: an `incomplete` plan (3DS pending) must never cancel per-site subscriptions someone is paying for.
5. **Prices never in the repo.** Account price ids come from four optional server-only env vars (same mechanism as `NEXT_PUBLIC_STRIPE_PREMIUM_*`, but not `NEXT_PUBLIC_` because the client sends `{ plan, interval }`, never a price id). Site allowance is `ACCOUNT_PLAN_SITE_ALLOWANCE = { PRO: 5, UNLIMITED: null }`, keyed by plan; price id maps to plan, never amount to plan. UI amounts are read live from Stripe (`getPriceAmount`).
6. **No new emails in phase 2.** Lapse warning with keep-this-site checkout, account confirmation and account annual renewal reminder are deferred to bead `flowershow-gyj.1`. Phase 2 records `cancel_at_period_end` and emits a PostHog event only. Consolidated per-site cancellations send nothing.
7. **Webhook idempotency:** account handlers sync from `stripe.subscriptions.retrieve` (not the event payload) and upsert `AccountSubscription` by `userId`; a second, different live account subscription for the same user (two checkout tabs) is logged at ERROR and left for a human to refund, never silently overwritten; consolidation is guarded durably by `Subscription.consolidatedAt` plus a lookup of the account customer's balance transactions by `metadata.siteSubscriptionId` (Stripe idempotency keys expire after 24 hours, webhook retries run for 3 days).
8. **Consolidation trigger:** whenever an account subscription is synced live (and when a site is newly covered in 2b), not only on `checkout.session.completed`. It only touches live per-site subscriptions of sites the account plan covers. This also makes the phase 3 grandfathering (a Pro subscription created by hand in the Stripe dashboard with `platform`, `kind: account` and `userId` metadata) work, via `customer.subscription.created`. Sync falls back to finding the user by `User.stripeCustomerId = subscription.customer` when `userId` is missing, and sets `User.stripeCustomerId` when it is null.
9. **Plan change Unlimited to Pro with more than 5 sites:** keep the sites already flagged covered, fill to 5 by most recently published, the rest go FREE through the normal downgrade (custom domain removed, `privacyMode` kept). Product question below.
10. **Unlimited limits:** covered sites get PREMIUM `PLAN_LIMITS`. Limits are advisory (decision 4), so Unlimited's fair-use tripwire is a follow-up, not phase 2.
11. **Bundle ladder:** 2b stops passing `discounts` and hides the ladder only when `accountPlansEnabled()`; deleting `getBundleInfo`, `BUNDLE_TIERS` and the coupon env vars is phase 3 cleanup once the flag is on, so turning the flag off again is a true rollback.

## Global Constraints

- No price amounts, currency amounts or coupon percentages added anywhere in the repo (code, tests, copy, fixtures use placeholder ids like `price_pro_month_test`; fixture `unit_amount` values are arbitrary test numbers and the tests never assert them as product prices).
- Site allowance: `PRO: 5`, `UNLIMITED: null` (null = unlimited). Account guard 1,000 sites is not enforced in phase 2.
- Stripe metadata on account checkouts, on both the session and `subscription_data`: `{ platform: 'flowershow', kind: 'account', userId }`. Per-site metadata unchanged (`{ siteId, platform }`).
- Consolidation metadata: per-site subscription updated with `metadata.reason = 'consolidated'` and `metadata.consolidatedInto = <account stripeSubscriptionId>` before cancelling it with `prorate: false`. Credit is a customer balance transaction on the account customer, negative amount, `metadata: { platform: 'flowershow', reason: 'consolidation_credit', siteSubscriptionId }`.
- Credit = `floor(amountPaidCents × remainingSeconds / periodSeconds)`, where the amount is the `amount_paid` (tax included: what the customer paid) of the paid invoice from `invoices.list({ subscription, status: 'paid' })` whose subscription line period equals the per-site subscription's current Stripe period (not the DB period, which the cancel bonus may have extended); 0 if none. "Now" is the account subscription's `start_date`, so retries compute the same amount. The balance transaction passes `currency` from that invoice; if it differs from the account subscription's currency, skip the credit and log at ERROR.
- Manual grants from now on: `UPDATE "Site" SET plan = 'PREMIUM', plan_source = 'MANUAL' WHERE id = …` (this SQL goes in a comment on `Site.planSource` in the schema). Setting only `plan` on an ACCOUNT site would be lost on lapse.
- Lapse (account subscription not live): sites with `planSource = ACCOUNT` and no live site subscription go `FREE`, custom domain removed (Vercel removal only in production, as today), `privacyMode` and password untouched, storage allowance set as in phase 1 Task 5. No cancel bonus for account plans.
- Never write `Site.plan` directly in billing code; call `reconcileUserSitePlans`.
- No live Stripe products, no deploys, no emails sent. Tests mock Stripe.
- No new REST routes (tRPC only), so `packages/api-contract` is untouched; the webhook route's contract entry is unchanged.
- Owner-only: every account billing procedure acts on `ctx.session.user.id`; `setSiteCovered` also checks `isSiteOwner`. Editors (teams work, `flowershow-dbg`) never see account billing.
- Migrations: one per PR, timestamp prefix `20261108…`; additive only.

## Review Focus

1. **Manual grants on a lapsing account:** an account with 3 MANUAL sites, 1 SITE site and an Unlimited plan cancels. Expected: the 3 MANUAL sites stay PREMIUM/MANUAL, the SITE site stays PREMIUM/SITE, only ACCOUNT sites go FREE. Tests in Tasks 3 and 4 (`never downgrades MANUAL`, `treats PREMIUM with null source as MANUAL`).
2. **Replayed and out-of-order events:** `customer.subscription.updated` (canceled) arriving before `checkout.session.completed`, and `checkout.session.completed` replayed two days later. Expected: final state matches the live Stripe subscription, one credit per per-site subscription, no regression. Tests in Tasks 6 and 7.
3. **Pro bought with per-site subscriptions on more sites than the allowance:** 7 per-site subscriptions, Pro checkout. Expected: 5 sites covered (the ones with subscriptions, most recently published first), those 5 consolidated with credit, the other 2 untouched and still billed; the consolidated subscriptions' `deleted` events neither downgrade nor email nor grant a cancel bonus. Tests in Task 7.
4. **Client-supplied price ids:** today `createCheckoutSession` accepts any `priceId`. Expected: per-site checkout rejects anything but the two Premium price ids, so nobody can buy a Pro price attached to one site; account checkout takes `{ plan, interval }` only. Test in Task 5.
5. **Deleting an account with a live account plan:** expected BAD_REQUEST telling the user to cancel the plan first (as for per-site subscriptions today), so no Stripe subscription keeps billing a deleted user. Test in Task 5.

---

## PR 2a: account plans backend (dark)

### Task 1: Schema, migration and backfill

**Files:**
- Modify: `apps/flowershow/prisma/schema.prisma`
- Create: `apps/flowershow/prisma/migrations/20261108120000_account_plans/migration.sql`

**Interfaces:**
- Produces:
  - `enum PlanSource { SITE ACCOUNT MANUAL }`, `enum AccountPlan { PRO UNLIMITED }`
  - `Site.planSource PlanSource? @map("plan_source")`, `Site.coveredByAccountPlan Boolean @default(false) @map("covered_by_account_plan")`
  - `User.stripeCustomerId String? @unique @map("stripe_customer_id")`, `User.accountSubscription AccountSubscription?`
  - `Subscription.consolidatedAt DateTime? @map("consolidated_at")`
  - `model AccountSubscription { id cuid; userId @unique; stripeCustomerId; stripeSubscriptionId @unique; stripePriceId; plan AccountPlan; interval String; siteAllowance Int?; status SubscriptionStatus; currentPeriodStart; currentPeriodEnd; cancelAtPeriodEnd Boolean @default(false); createdAt; updatedAt; user User @relation(onDelete: Cascade) }` with snake_case column `@map`s and no table map, like `Subscription`.

- [ ] **Step 1: Write the schema changes** above.
- [ ] **Step 2: Write the migration** (`pnpm prisma migrate dev --create-only --name account_plans` if a local DB is available, then rename the folder to the timestamp above), appending the backfill:
  ```sql
  UPDATE "Site" s SET plan_source = 'SITE'
   WHERE s.plan = 'PREMIUM'
     AND EXISTS (SELECT 1 FROM "Subscription" sub WHERE sub.site_id = s.id
                 AND sub.status NOT IN ('canceled','incomplete_expired'));
  UPDATE "Site" SET plan_source = 'MANUAL'
   WHERE plan = 'PREMIUM' AND plan_source IS NULL;
  ```
- [ ] **Step 3: Verify.** Against a local DB seeded with one FREE site, one PREMIUM site with an active subscription, one PREMIUM site with a canceled subscription and one PREMIUM site with none: `SELECT plan, plan_source FROM "Site"` gives `FREE/null, PREMIUM/SITE, PREMIUM/MANUAL, PREMIUM/MANUAL`. Without a DB: `pnpm prisma validate && pnpm prisma generate`. The PR description includes the read-only count query (`SELECT plan_source, count(*) FROM "Site" WHERE plan='PREMIUM' GROUP BY 1`) for Rufus to run before merge; expected about 39 SITE and 70 MANUAL.
- [ ] **Step 4: Commit** `feat(plans): schema for account plans and plan source`.

### Task 2: Account plan config, entitlements and subscription kind

**Files:**
- Create: `apps/flowershow/lib/account-plans.ts`, `apps/flowershow/lib/account-plans.test.ts`
- Modify: `apps/flowershow/env.mjs` (server: `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_UNLIMITED_MONTHLY_PRICE_ID`, `STRIPE_UNLIMITED_YEARLY_PRICE_ID`, all `z.string().optional()`, comment: price ids only, amounts live in Stripe), `apps/flowershow/vitest.setup.ts` (test ids `price_pro_month_test` etc.)
- Modify: `apps/flowershow/lib/stripe.ts` (`KNOWN_PRICE_IDS` includes configured account price ids; add `getSubscriptionKind`)
- Modify: `apps/flowershow/lib/entitlements.ts`, `entitlements.test.ts`

**Interfaces:**
- Produces (`lib/account-plans.ts`):
  - `export const ACCOUNT_PLANS_LIVE = false;` (comment: flipped in phase 3, `flowershow-a7k`)
  - `export const ACCOUNT_PLAN_SITE_ALLOWANCE: Readonly<Record<AccountPlan, number | null>> = { PRO: 5, UNLIMITED: null }`
  - `export type BillingInterval = 'month' | 'year'`
  - `export function accountPriceId(plan: AccountPlan, interval: BillingInterval): string | null`
  - `export function accountPlanForPriceId(priceId: string): { plan: AccountPlan; interval: BillingInterval } | null`
  - `export function accountPlansEnabled(): boolean` (`ACCOUNT_PLANS_LIVE` and all four price ids set)
  - `export function isLiveSiteStatus(status: SubscriptionStatus | string): boolean` and `export function isCoveringAccountStatus(status): boolean` (Ruling 4)
  - `export function premiumPriceIds(): ReadonlySet<string>` (the two existing Premium ids)
- Produces (`lib/stripe.ts`): `export function getSubscriptionKind(sub: any): 'account' | 'site'` (`metadata.kind === 'account'`, else any line-item price in the account set, else `'site'`).
- Produces (`lib/entitlements.ts`): `getEntitlements(site: { plan?: Plan | null; planSource?: PlanSource | null })` now returns `Entitlements & { planSource: PlanSource | null }`; features and limits unchanged (Ruling 10).

- [ ] **Step 1: Write failing tests:** `ACCOUNT_PLAN_SITE_ALLOWANCE.PRO === 5` and `.UNLIMITED === null`; `accountPlanForPriceId('price_unlimited_year_test')` is `{ plan: 'UNLIMITED', interval: 'year' }`; `accountPlanForPriceId('price_monthly')` (Premium) is null; `accountPlansEnabled()` is false with the default constant even when all ids are set (and true when the module is re-imported with the constant mocked true); `isLiveSiteStatus` is false for `canceled` and `incomplete_expired`, true for `active`, `past_due`, `trialing`, `incomplete`, `unpaid`, `paused`; `isCoveringAccountStatus` is true only for `active`, `trialing`, `past_due`; `getSubscriptionKind({ metadata: { kind: 'account' } })` is `'account'`, a sub with only a Pro price item is `'account'`, a Premium sub is `'site'`; `getEntitlements({ plan: 'PREMIUM', planSource: 'ACCOUNT' }).planSource === 'ACCOUNT'` and `isPaid === true`.
- [ ] **Step 2: Run** `cd apps/flowershow && pnpm vitest --project=unit lib/account-plans.test.ts lib/entitlements.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same plus `lib/feature-flags.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(plans): account plan config and subscription kind`.

### Task 3: Pure site-plan computation

**Files:**
- Create: `apps/flowershow/lib/site-plans.ts`, `apps/flowershow/lib/site-plans.test.ts`

**Interfaces:**
- Consumes: `isLiveSiteStatus`, `isCoveringAccountStatus`, `ACCOUNT_PLAN_SITE_ALLOWANCE` (Task 2).
- Produces:
  - `export type SitePlanInput = { id: string; plan: Plan; planSource: PlanSource | null; coveredByAccountPlan: boolean; siteSubscriptionStatus: SubscriptionStatus | null; lastPublishedAt: Date | null; createdAt: Date }`
  - `export type AccountPlanInput = { status: SubscriptionStatus; siteAllowance: number | null } | null`
  - `export type SitePlanTarget = { id: string; plan: Plan; planSource: PlanSource | null; coveredByAccountPlan: boolean }`
  - `export function computeSitePlans(sites: SitePlanInput[], account: AccountPlanInput, opts: { autoFill: 'all' | 'none' | { siteId: string } }): SitePlanTarget[]` (`'all'` at first activation and plan change; `{ siteId }` on create or claim, so only the new site may take a free slot and slots the owner emptied stay empty)
- Algorithm (not fixed by the signature): (1) MANUAL, or PREMIUM with null source, is returned unchanged with `coveredByAccountPlan: false`. (2) A covering account on Unlimited covers every remaining site without writing flags (the spec: Unlimited ignores the flag, so a later move to Pro keeps the owner's earlier selection). On Pro, the candidates are the remaining sites; slots are counted over flagged candidates, including flagged sites that still have a live site subscription (they are about to be consolidated). Keep flagged candidates up to the allowance, ordered by `lastPublishedAt ?? createdAt` descending, and clear the flag on the rest; if slots remain, flag unflagged candidates allowed by `autoFill` (all of them, or only the named site), sites with a live site subscription first, then most recently published. (3) A site with a live site subscription is `PREMIUM/SITE` whatever its flag. (4) A flagged site (or any remaining site on Unlimited) on a covering account is `PREMIUM/ACCOUNT`. (5) Otherwise `FREE/null`; flags are kept when the account is not covering, so re-subscribing restores the same selection.

- [ ] **Step 1: Write failing table tests** (each asserts the full `SitePlanTarget` for the named site):
  - `never downgrades MANUAL`: MANUAL site, no account: stays `PREMIUM/MANUAL`.
  - `treats PREMIUM with null source as MANUAL`: stays `PREMIUM/null`.
  - `site subscription wins over account`: live site sub plus live Unlimited: `PREMIUM/SITE`.
  - `Unlimited covers all non-manual sites without flagging`: 12 FREE sites: all `PREMIUM/ACCOUNT`, every `coveredByAccountPlan` unchanged.
  - `incomplete account covers nothing`: account `incomplete`: no site becomes ACCOUNT.
  - `create autoFill only considers the new site`: Pro, 3 of 8 flagged, `autoFill: { siteId: 'new' }`: only `new` is added.
  - `Pro autoFill picks site-subscription sites then most recent`: 7 sites, 2 with live site subs, Pro, `autoFill: 'all'`: exactly 5 flagged, including both subscription sites.
  - `Pro without autoFill keeps the owner's selection`: 3 flagged of 8, `autoFill: 'none'`: same 3 flagged, others FREE.
  - `Pro over allowance trims least recently published` (Ruling 9): 8 flagged, Pro: 5 most recently published stay ACCOUNT, 3 go `FREE/null`.
  - `MANUAL sites do not use a Pro slot`: 2 MANUAL plus 6 FREE, autoFill: 5 of the FREE flagged.
  - `lapsed account downgrades ACCOUNT sites only`: account `canceled`: ACCOUNT sites `FREE/null` with flags kept; SITE and MANUAL unchanged.
  - `canceled site subscription on a covered site becomes ACCOUNT`: site sub `canceled`, flagged, live Pro: `PREMIUM/ACCOUNT`.
- [ ] **Step 2: Run** `pnpm vitest --project=unit lib/site-plans.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `computeSitePlans`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(plans): pure site plan computation`.

### Task 4: Reconciler, shared downgrade, and wiring the per-site path

**Files:**
- Modify: `apps/flowershow/lib/site-plans.ts` (DB functions), `site-plans.test.ts`
- Modify: `apps/flowershow/app/api/stripe/webhook/route.ts` (per-site `checkout.session.completed` and the `status === 'canceled'` branch call the reconciler; the inline domain/allowance code moves into `downgradeSiteToFree`)
- Modify: `apps/flowershow/server/api/routers/site.ts` (create), `apps/flowershow/app/api/sites/route.ts` (POST create), `apps/flowershow/lib/claim-anon-site.ts` (after a successful claim)
- Test: `app/api/stripe/webhook/route.test.ts` (existing tests must pass, mocks extended), `server/api/routers/__tests__/site.test.ts`

**Interfaces:**
- Consumes: `computeSitePlans` (Task 3), `getSiteStorageBytes`, `PLAN_LIMITS`.
- Produces:
  - `export async function reconcileUserSitePlans(userId: string, opts?: { autoFill?: 'all' | 'none' | { siteId: string } }): Promise<{ changed: SitePlanTarget[] }>` (default `'none'`): loads the user's non-temporary sites (with subscription status and latest `Publish.createdAt`) and their `AccountSubscription`, computes targets, and writes each differing row with `updateMany({ where: { id, plan: <read plan>, planSource: <read source> } })` so a concurrent admin grant or a second webhook wins the race; a PREMIUM to FREE transition calls `downgradeSiteToFree` only when that conditional update changed exactly one row.
  - `export async function downgradeSiteToFree(site: { id: string; customDomain: string | null; storageAllowanceBytes: bigint | null }): Promise<void>`: today's lapse teardown (Vercel domain removal in production, `customDomain: null`, storage allowance at 110% when over the Free hard cap, `plan: FREE`, `planSource: null`); never touches `privacyMode`, `accessPasswordHash` or `tokenVersion`.
  - `export async function reconcileAfterSiteChange(userId: string, siteId: string): Promise<void>`: calls `reconcileUserSitePlans(userId, { autoFill: { siteId } })` only when the user has an `AccountSubscription`, catches and logs errors at ERROR (site creation never fails because of billing).

- [ ] **Step 1: Write failing tests:**
  - reconciler with mocked prisma: one MANUAL, one SITE with canceled sub, one ACCOUNT on a canceled account: `site.update` called for the SITE and ACCOUNT sites only, with `plan: 'FREE', planSource: null`; the MANUAL site is never passed to `site.update`.
  - `reconcile loses the race safely`: the conditional `updateMany` returns `count: 0` (an admin set MANUAL in between): no domain removal.
  - `downgradeSiteToFree` on a password-protected site with a custom domain: update data has no `privacyMode`/`accessPasswordHash`/`tokenVersion` keys and has `customDomain: null`.
  - existing webhook test "per-site cancellation downgrades and keeps password" still passes, now through the reconciler.
  - new webhook test `per-site cancellation keeps MANUAL`: a `canceled` per-site event for a site with `planSource: 'MANUAL'`: no `plan: 'FREE'` write, no domain removal.
  - new webhook test `per-site checkout sets SITE`: after `checkout.session.completed` (per-site) the site is `PREMIUM/SITE`.
  - site create on an account with a live Pro and 4 covered sites: the new site ends `PREMIUM/ACCOUNT`; with no `AccountSubscription` the reconciler is not called; a throwing reconciler does not fail the create.
- [ ] **Step 2: Run** `pnpm vitest --project=unit lib/site-plans.test.ts app/api/stripe/webhook/route.test.ts server/api/routers/__tests__/site.test.ts`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** and wire.
- [ ] **Step 4: Run** the same. Expected: PASS.
- [ ] **Step 5: Commit** `refactor(billing): derive site plans through one reconciler`.

### Task 5: Account checkout, Stripe customer, checkout hardening

**Files:**
- Create: `apps/flowershow/lib/account-billing.ts`, `apps/flowershow/lib/account-billing.test.ts`
- Modify: `apps/flowershow/server/api/routers/stripe.ts`, `apps/flowershow/server/api/routers/user.ts` (`deleteAccount`)
- Create: `apps/flowershow/server/api/routers/__tests__/stripe.test.ts` (if the teams branch has landed it first, extend theirs; same mock shape, see Compatibility)

**Interfaces:**
- Consumes: `accountPriceId`, `accountPlansEnabled`, `premiumPriceIds`, `isLiveSiteStatus` (Task 2; any account subscription not `canceled`/`incomplete_expired`, including `incomplete`, blocks a second checkout and account deletion).
- Produces:
  - `export async function getOrCreateStripeCustomer(user: { id: string; email: string | null; stripeCustomerId: string | null }): Promise<string>`: creates with `metadata: { platform, userId }`, saves with `updateMany({ where: { id, stripeCustomerId: null } })`; if that updates 0 rows, re-reads and returns the stored id (concurrent checkouts).
  - tRPC `stripe.createAccountCheckoutSession` input `z.object({ plan: z.enum(['PRO','UNLIMITED']), interval: z.enum(['month','year']) })`, returns `{ url: string | null }`. Errors: `PRECONDITION_FAILED` when `!accountPlansEnabled()`; `BAD_REQUEST 'You already have an account plan. Change it from Billing.'` when the user's `AccountSubscription` is live. Session: `customer`, `mode: 'subscription'`, one line item, no `discounts`, `client_reference_id: userId`, metadata per Global Constraints, `success_url` `${cloud}/settings/billing?upgrade_success=true`, `cancel_url` `…?upgrade_cancelled=true`.
  - `createCheckoutSession` (per-site): `BAD_REQUEST` unless `premiumPriceIds().has(input.priceId)`; `BAD_REQUEST 'This site is already Premium through your account plan.'` when the site's `planSource` is `ACCOUNT` or `MANUAL`.
  - `deleteAccount`: `BAD_REQUEST 'Please cancel your account plan before deleting your account.'` when a live `AccountSubscription` exists.

- [ ] **Step 1: Write failing tests:** account checkout with the flag off returns PRECONDITION_FAILED and never calls Stripe; with the flag on (mock `accountPlansEnabled`) calls `checkout.sessions.create` once with `subscription_data.metadata` equal to `{ platform: 'flowershow', kind: 'account', userId: 'user-1' }`, `line_items[0].price === 'price_pro_year_test'` for `{ PRO, year }`, and no `discounts` key; a user with a live account sub gets BAD_REQUEST; `getOrCreateStripeCustomer` reuses an existing id and handles the lost race; per-site checkout with `priceId: 'price_pro_month_test'` is BAD_REQUEST and with `'price_monthly'` still works; per-site checkout on an ACCOUNT site is BAD_REQUEST; `deleteAccount` with a live account sub is BAD_REQUEST and `user.delete` not called.
- [ ] **Step 2: Run** the new test files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(billing): account plan checkout and per-site price allowlist`.

### Task 6: Account subscription webhooks (sync, lapse, plan change)

**Files:**
- Create: `apps/flowershow/app/api/stripe/webhook/account.ts`, `apps/flowershow/app/api/stripe/webhook/account.test.ts`
- Create: `apps/flowershow/app/api/stripe/webhook/__fixtures__/` with `account-checkout-completed.json`, `account-subscription-created.json`, `account-subscription-updated-cancel-scheduled.json`, `account-subscription-updated-plan-change.json`, `account-subscription-deleted.json`, `site-subscription-deleted-consolidated.json`. Real Stripe event envelopes (`id`, `type`, `api_version: '2024-12-18.acacia'`, `data.object`) trimmed to the fields the code reads, ids like `sub_acct_1`, `cus_acct_1`, `evt_…`.
- Create: `apps/flowershow/app/api/stripe/webhook/__tests__/fake-billing-db.ts`: in-memory fake of the Prisma methods these handlers use (`accountSubscription.findUnique/upsert/update`, `subscription.findMany/update`, `site.findMany/update`, `user.findUnique`), so replay tests observe state rather than call counts.
- Modify: `apps/flowershow/app/api/stripe/webhook/route.ts` (add `customer.subscription.created` to `relevantEvents`; dispatch on `getSubscriptionKind` / `metadata.kind`; per-site `created` events are ignored to keep that path unchanged)

**Interfaces:**
- Consumes: `getSubscriptionKind`, `accountPlanForPriceId`, `ACCOUNT_PLAN_SITE_ALLOWANCE`, `isCoveringAccountStatus`, `reconcileUserSitePlans`, `consolidateSiteSubscriptions` (Task 7; stubbed here, called after sync when live).
- Produces:
  - `export async function syncAccountSubscription(stripeSubscriptionId: string, ctx: { eventId: string; eventType: string }): Promise<void>`: retrieves the live subscription; `userId` from `metadata.userId`, else the user whose `stripeCustomerId` equals `subscription.customer` (log WARN and return if neither resolves); sets `User.stripeCustomerId` when null; maps the price with `accountPlanForPriceId` (throw on unknown price so Stripe retries after a config fix); upserts `AccountSubscription` by `userId`; if the stored row has a different `stripeSubscriptionId` that is still live, log and skip (incoming not live: stale event for an old subscription; incoming also live: duplicate purchase, log at ERROR for a human); writes `siteAllowance` from the constant; on `cancelAtPeriodEnd` false to true captures PostHog `account_plan_cancel_scheduled`; then `reconcileUserSitePlans(userId, { autoFill: <row newly created or plan changed> ? 'all' : 'none' })`; then consolidation when the status is `active` or `trialing`.
  - `export async function handleAccountEvent(event: Stripe.Event): Promise<void>`: `checkout.session.completed` uses `session.subscription`; subscription events use `data.object.id`; `invoice.upcoming` for an account subscription is a no-op (Ruling 6).

- [ ] **Step 1: Write failing fixture tests** (`stripe.subscriptions.retrieve` mocked to return the fixture's subscription, mutated per test):
  - `checkout completed creates the account subscription and covers sites`: Unlimited, 3 FREE sites: row has `plan: 'UNLIMITED', siteAllowance: null, status: 'active'`; all 3 sites `PREMIUM/ACCOUNT`.
  - `replaying checkout completed is a no-op`: same event twice: identical fake-db state; reconciler writes nothing the second time.
  - `deleted before completed converges`: process `account-subscription-deleted` then `account-checkout-completed` (retrieve returns `status: 'canceled'` both times): row `canceled`, no site PREMIUM/ACCOUNT.
  - `cancel scheduled records the flag and sends nothing`: `cancelAtPeriodEnd: true`, sites still PREMIUM, `sendEmail` and `sendTransactionalEmail` not called, `cancelBonusGrantedAt` not written.
  - `deleted downgrades ACCOUNT sites only` (Review Focus 1): MANUAL, SITE and ACCOUNT sites: only ACCOUNT goes FREE, its custom domain removed, its `privacyMode` untouched.
  - `plan change Unlimited to Pro trims to five`: 8 covered sites, retrieve returns a Pro price: `siteAllowance: 5`, 5 ACCOUNT sites remain.
  - `stale event for an old subscription is ignored`: stored row `sub_acct_2` active, event for `sub_acct_1` canceled: row unchanged.
  - `created incomplete then expired never consolidates or covers` (fixture with `status: 'incomplete'`, then `incomplete_expired`): no cancel, no credit, sites unchanged.
  - `duplicate live account subscription is not overwritten`: stored `sub_acct_2` active, event for a live `sub_acct_3`: row unchanged, ERROR logged.
  - `missing userId falls back to the customer id` and sets nothing else; with neither, logs and returns 200; `unknown account price returns 500`.
  - `foreign subscriptions are still ignored` (existing test extended to `customer.subscription.created`).
- [ ] **Step 2: Run** `pnpm vitest --project=unit app/api/stripe/webhook`. Expected: new tests FAIL.
- [ ] **Step 3: Implement** `account.ts` and the dispatch.
- [ ] **Step 4: Run.** Expected: PASS, existing per-site tests unchanged.
- [ ] **Step 5: Commit** `feat(billing): account subscription webhooks`.

### Task 7: Consolidation with credit

**Files:**
- Modify: `apps/flowershow/lib/account-billing.ts`, `account-billing.test.ts`
- Modify: `apps/flowershow/app/api/stripe/webhook/route.ts` (per-site `customer.subscription.*` with `metadata.reason === 'consolidated'`: update the `Subscription` row and reconcile, skip the cancel email, cancel bonus and expiry email)
- Test: `app/api/stripe/webhook/account.test.ts`, `route.test.ts`

**Interfaces:**
- Consumes: Task 6 sync, fake db, fixtures.
- Produces:
  - `export function computeUnusedCreditCents(input: { amountPaidCents: number; periodStart: number; periodEnd: number; now: number }): number` (unix seconds; floor; 0 when `now >= periodEnd` or amount is 0)
  - `export async function consolidateSiteSubscriptions(account: { userId: string; stripeCustomerId: string; stripeSubscriptionId: string }): Promise<{ consolidated: string[]; creditedCents: number }>`: for each `Subscription` of the user's sites where `consolidatedAt` is null, status is live and the site is `coveredByAccountPlan` (or the account is Unlimited): retrieve the per-site subscription with `expand: ['latest_invoice']`; if Stripe already shows it canceled, just set `consolidatedAt`; else, unless a balance transaction with that `metadata.siteSubscriptionId` already exists on the account customer (`stripe.customers.listBalanceTransactions`, auto-paginated), create the credit (idempotency key `consolidation-credit:<siteSubId>`, currency and amount per Global Constraints); then `subscriptions.update(id, { metadata: { reason: 'consolidated', consolidatedInto } })`, `subscriptions.cancel(id, { prorate: false })`, and set `consolidatedAt`.

- [ ] **Step 1: Write failing tests:**
  - `computeUnusedCreditCents({ amountPaidCents: 1000, periodStart: 0, periodEnd: 100, now: 25 }) === 750`; returns 0 after period end; floors fractional cents.
  - `consolidates covered per-site subscriptions with one credit each`: Unlimited, 2 live per-site subs: two negative balance transactions with the right metadata, two cancels with `prorate: false`, both rows `consolidatedAt` set.
  - `replay after partial failure does not double credit`: first run's `cancel` throws after the credit; second run finds the balance transaction by metadata, creates no second credit, cancels, sets `consolidatedAt`.
  - `Pro leaves uncovered per-site subscriptions alone` (Review Focus 3): 7 per-site subs, Pro: 5 cancelled, 2 untouched.
  - `consolidated deletion keeps the site Premium and is silent`: `site-subscription-deleted-consolidated` fixture: site ends `PREMIUM/ACCOUNT`; no `sendEmail`, no `sendTransactionalEmail`, no `cancelBonusGrantedAt` write, no domain removal.
  - `no credit when there is no paid invoice for the current period`; `credit uses the invoice whose line period matches, not a later proration invoice`; `currency mismatch skips the credit and logs ERROR but still consolidates`.
  - `retries compute the same credit`: two runs a day apart pass identical `amount` (now = account `start_date`).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the whole webhook folder and `lib/account-billing.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(billing): consolidate per-site subscriptions into an account plan with credit`.

### Task 8: PR 2a

- [ ] **Step 1:** `cd apps/flowershow && pnpm test -- --run`, `pnpm lint`, typecheck. Expected: green.
- [ ] **Step 2:** Security review per `AGENTS.md` (account procedures act only on the session user; metadata `userId` from Stripe is trusted only after signature verification and only maps to an existing user; per-site price allowlist).
- [ ] **Step 3:** Independent review per `docs/agents/review.md`, briefed with Rulings and Review Focus.
- [ ] **Step 4:** Push, open PR `Plans: account plans backend, dark (phase 2a)`, body `Refs flowershow-syk`, the rulings, the backfill count query, and "no UI entry point; `ACCOUNT_PLANS_LIVE = false`". Wait for CI. Do not merge (merging deploys; needs Rufus's yes).

---

## PR 2b: account billing UI and links (dark)

### Task 9: Account billing procedures

**Files:**
- Modify: `apps/flowershow/server/api/routers/stripe.ts`, `server/api/routers/__tests__/stripe.test.ts`

**Interfaces:**
- Consumes: `reconcileUserSitePlans`, `consolidateSiteSubscriptions`, `getPriceAmount`, `accountPlansEnabled`, `ACCOUNT_PLAN_SITE_ALLOWANCE`.
- Produces:
  - `stripe.getAccountPlan` query → `{ enabled: boolean; plan: AccountPlan | null; interval; status; cancelAtPeriodEnd; currentPeriodEnd; siteAllowance: number | null; creditBalanceCents: number; prices: Record<AccountPlan, { month: LivePrice | null; year: LivePrice | null }>; sites: Array<{ id; projectName; plan; planSource; covered: boolean; hasSiteSubscription: boolean }> }` (`creditBalanceCents` from the customer's live `balance`, negated; 0 without a customer).
  - `stripe.setSiteCovered` mutation input `{ siteId: string; covered: boolean }` → `{ covered: boolean }`. `FORBIDDEN` unless `isSiteOwner`; `PRECONDITION_FAILED` without a live Pro plan; `CONFLICT 'All 5 sites on your Pro plan are in use. Remove one first.'` (number from the constant) when covering would exceed the allowance; `BAD_REQUEST` for MANUAL sites. Then `reconcileUserSitePlans(userId)` and, when covering, `consolidateSiteSubscriptions`.
  - `stripe.getAccountBillingPortal` mutation → `{ url }` for `user.stripeCustomerId`, `return_url` `${cloud}/settings/billing`; `NOT_FOUND` without a customer.

- [ ] **Step 1: Write failing tests:** editor of a site cannot `setSiteCovered` it (FORBIDDEN, no update); covering a sixth site on Pro is CONFLICT and its message contains `5`; uncovering an ACCOUNT site leads to the reconciler being called and the site going FREE; covering a site with a live per-site subscription calls `consolidateSiteSubscriptions`; `getAccountPlan` for a user without a plan returns `plan: null` and all their sites; `getAccountBillingPortal` without a customer is NOT_FOUND.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(billing): account plan procedures and covered-site toggle`.

### Task 10: Account billing page and covered-sites picker

**Files:**
- Create: `apps/flowershow/app/(cloud)/dashboard/settings/billing/page.tsx` (server; `notFound()` when `!accountPlansEnabled()`)
- Create: `apps/flowershow/components/dashboard/account-billing.tsx` (client), `account-billing.test.tsx`
- Modify: `apps/flowershow/app/(cloud)/dashboard/settings/page.tsx` and `components/dashboard/nav.tsx` (a "Billing" link only when enabled)

**Interfaces:**
- Consumes: Task 9 procedures, `createAccountCheckoutSession` (Task 5).
- Produces: `<AccountBilling data={GetAccountPlanOutput} />`.

Copy (exact, numbers from data, never literals): no plan: two cards, "Pro: up to {allowance} sites on Premium" and "Unlimited: every site on Premium", annual shown first, prices from `data.prices`, button "Choose Pro" / "Choose Unlimited". With a plan: "{Pro|Unlimited}, {n} of {allowance|all} sites covered", "Credit applied: {amount}" when `creditBalanceCents > 0`, "Ends on {date}" when `cancelAtPeriodEnd`, button "Manage billing" (portal). Pro picker: one checkbox per site; MANUAL sites shown checked-disabled "Premium (granted)", per-site-subscription sites labelled "Own subscription; covering it cancels that subscription and credits the unused time".

- [ ] **Step 1: Write failing component tests:** no plan renders both cards with live prices and no hard-coded amount; Pro with 5 covered disables unchecked boxes and shows "5 of 5 sites covered"; a MANUAL site checkbox is disabled; clicking "Choose Pro" with the yearly toggle calls the mutation with `{ plan: 'PRO', interval: 'year' }`; the page returns notFound when disabled.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests and lint. Expected: PASS.
- [ ] **Step 5: Commit** `feat(billing): account billing page with covered-sites picker`.

### Task 11: Site settings status, ladder and discount gating

**Files:**
- Modify: `apps/flowershow/components/dashboard/billing.tsx`, `apps/flowershow/app/(cloud)/dashboard/site/[id]/settings/page.tsx`, `apps/flowershow/server/api/routers/stripe.ts` (`createCheckoutSession`: no `discounts` when enabled)
- Test: `components/dashboard/billing.test.tsx` (create), `__tests__/stripe.test.ts`

**Interfaces:**
- Consumes: `getEntitlements(site).planSource`, `accountPlansEnabled()` (passed from the server page as a prop).
- Produces: `BillingProps` gains `planSource: PlanSource | null; accountPlansEnabled: boolean; accountPlan: AccountPlan | null`.

- [ ] **Step 1: Write failing tests:** ACCOUNT site renders "Premium through your {Pro|Unlimited} plan" with a link to `/settings/billing` and no upgrade or cancel button; MANUAL site renders "Premium (granted by Flowershow)" with no buttons; FREE site with the flag on shows the per-site upgrade, the line "Have several sites? Pro covers up to 5." linking to `/settings/billing`, and no ladder, and `bundle_ladder_shown` is not captured; with the flag off the component renders exactly as today (existing snapshot or assertions); per-site checkout with the flag on sends no `discounts`, with it off still applies the coupon.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The settings page skips `getBundleInfo` when enabled.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(billing): site billing shows plan source; ladder off with account plans`.

### Task 12: Upgrade link helper

**Files:**
- Modify: `apps/flowershow/lib/account-plans.ts` (add `accountBillingUrl()`), `apps/flowershow/lib/storage-limits.ts` (Free `upgradeUrl` becomes `accountBillingUrl()` when enabled)

**Interfaces:**
- Produces: `export function accountBillingUrl(): string` → `https://${NEXT_PUBLIC_CLOUD_DOMAIN}/settings/billing`. The MCP upgrade hint (`flowershow-wup`) consumes it. `fl upgrade` is not in phase 2: a CLI release would ship a link to a page that 404s until the flag flips, so it moves to the phase 3 launch checklist (prints `<config.APIURL()>/settings/billing`, plus the site's billing URL with `--site`).

- [ ] **Step 1: Write failing tests:** `accountBillingUrl()` with `NEXT_PUBLIC_CLOUD_DOMAIN=cloud.test` is `https://cloud.test/settings/billing`; storage `upgradeUrl` for a Free site is the account URL when enabled and the site URL when not; no other link changes.
- [ ] **Step 2: Run** `pnpm vitest --project=unit lib/account-plans.test.ts lib/storage-limits.test.ts` Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(billing): account billing link for upgrade prompts`.

### Task 13: PR 2b

- [ ] **Step 1:** Full unit suite, lint, typecheck.
- [ ] **Step 2:** Security and independent review as in Task 8 (picker cannot cover another user's site; editors see no account billing).
- [ ] **Step 3:** Push, open PR `Plans: account billing page and picker, dark (phase 2b)` with `Closes flowershow-syk` once 2a is merged, screenshots taken with the flag mocked on locally. Do not merge.

---

## Compatibility with the teams branch (`flowershow-dbg`, worktree `teams-orgs`)

That branch is docs-only so far; its plan adds `SiteMember`, `SiteInvite`, `Publish.userId`, `canManageSite(userId, site: { userId, plan, members })` and creates `server/api/routers/__tests__/stripe.test.ts`.
- `Site.plan` stays materialised, so `canManageSite`'s `plan === PREMIUM` check stays correct for ACCOUNT and MANUAL sites with no change on their side.
- Schema edits touch different lines of `Site`; migrations have distinct timestamps and are additive; whichever lands second rebases `schema.prisma` and regenerates.
- `stripe.test.ts`: whoever lands second extends the other's file and keeps its mock shape (`stripe.customers.create` is in both).
- Account billing is per user and owner-only; the new procedures use `ctx.session.user.id` and `isSiteOwner`, matching their rule that all of `stripe.*` is owner-only. Their settings-nav change hides the site Billing section from editors, which covers the new plan-source line.

## Launch checklist (phase 3, `flowershow-a7k`, not this plan)

Create the Pro and Unlimited products and four prices in Stripe (test mode first); set the four env vars; add `customer.subscription.created` to the webhook endpoint's events; configure the billing portal to allow switching between the two account products; grandfather the three multi-site accounts (Pro subscription created on an account customer with `platform`, `kind: account` and `userId` metadata and a forever `amount_off` coupon; consolidation runs on sync); flip `ACCOUNT_PLANS_LIVE`; ship `fl upgrade` (Task 12 note); then delete the ladder, `getBundleInfo`, `BUNDLE_TIERS` and the coupon env vars.

## Follow-ups (beads)

- Account plan emails: lapse warning with keep-this-site checkout, confirmation, annual reminder: `flowershow-gyj.1`.
- Unlimited fair-use tripwire (50 GB pooled, report only) and 1,000-site guard: fold into `flowershow-hj8` or a new bead when phase 3 lands.
