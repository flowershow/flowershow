# Built-in Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners see how many people read their site and which pages, in the dashboard, with numbers from our self-hosted Umami; PostHog comes off published sites.

**Architecture:** A small Umami client (HTTP, plus a fixture client for dev and tests) feeds `getSiteAnalytics` and `getPeopleBySite`, which read live and cache for 10 minutes via `unstable_cache`. Server components render an Analytics tab and a line on each site card. The site layout adds one Umami script tagged with the site ID, and chooses a PostHog mode per site. Everything stays dark in production until the Umami constants and `UMAMI_API_KEY` are set; turning it on is a separate bead.

**Tech Stack:** Next.js app router (server components), Prisma, `next/cache` `unstable_cache`, `next/script`, posthog-js, vitest + @testing-library/react (jsdom), Storybook.

**Spec:** `docs/plans/2026-11-07-built-in-analytics-design.md` (approved 2026-11-11). Read it first. The owner-facing copy and states table there are binding.

All paths below are relative to `apps/flowershow/` unless they start with `content/` or `docs/`. Run tests from `apps/flowershow` with `pnpm vitest run --project=unit <file>`.

## Global Constraints

- Words on screen: **People** and **Views**, never "visitors" or "pageviews".
- Ranges: `7 | 30` days, default `30`, held in one constant (`ANALYTICS_RANGES`).
- Cache: `revalidate: 600` (10 minutes) for every Umami read.
- Umami request timeout: 5000 ms. Any failure → the "unavailable" state; never throws into the page.
- Pages table: sorted by people (Umami's order), first 20 shown, then "Show all pages".
- "Came from": top 5 referrer domains, hidden when empty; no "Direct".
- Instance URL and website ID are constants in `lib/site-analytics/config.ts`; only `UMAMI_API_KEY` is an env var (server-only, optional).
- No query strings or hashes are sent to Umami (`data-exclude-search="true"`, `data-exclude-hash="true"`).
- Password-protected sites get no Umami script and show "Password-protected sites aren't counted."
- Readers of claimed sites get no Flowershow PostHog and no `SessionProvider`; temporary sites get PostHog with `persistence: 'memory'` and no identify; flowershow.app and the dashboard are unchanged.
- No new API route (server components only), so no api-contract change.

## Review Focus

- **Umami down or slow** → the tab shows "Numbers aren't available right now." and the card line disappears; the rest of the dashboard renders. (Task 3 and Task 4 tests.)
- **Brand-new site created after launch** → "Counting since" and the chart start at `site.createdAt`, not the launch date, so there's no run of zeros. (Task 3 `rangeWindow` test.)
- **Paths Umami saw that aren't current pages** (deleted, renamed, 404s, listing routes) → plain text, no link, still counted. (Task 3 `attachTitles` test.)
- **Owner with more than 500 sites in Umami's tag list** → paging continues until a short page, so no active site wrongly shows "No readers yet". (Task 4 paging test.)
- **Production with no key yet** → no Analytics tab, no card line, no script, so nothing half-works. (Task 2 `getUmamiClient` test, Task 6 tab test, Task 7 script test.)

---

### Task 1: PostHog scope on published sites

**Files:**
- Create: `lib/posthog-scope.ts`, `lib/posthog-scope.test.ts`
- Modify: `middleware.ts` (the `const phBootstrap = await buildPHBootstrapCookie(...)` line, ~84), `providers/posthog-provider.tsx`, `app/(public)/site/[user]/[project]/_components/providers.tsx`, `app/(public)/site/[user]/[project]/layout.tsx` (`<Providers>` ~326)

**Interfaces:**
- Produces: `FLOWERSHOW_OWN_DOMAINS: readonly string[]` (`['flowershow.app', 'www.flowershow.app']`); `type PostHogMode = 'full' | 'memory' | 'off'`; `posthogModeForSite(site: { customDomain: string | null; user: { id: string } }): PostHogMode`; `shouldBootstrapPostHog(hostname: string): boolean`.

- [ ] **Step 1: Failing tests** in `lib/posthog-scope.test.ts`:
  - `posthogModeForSite({ customDomain: 'flowershow.app', user: { id: 'u1' } })` → `'full'`
  - anonymous site (`user.id === ANONYMOUS_USER_ID` from `lib/anonymous-user-constants`) → `'memory'`
  - claimed site on a subdomain (`customDomain: null`) → `'off'`; claimed site on `example.com` → `'off'`
  - `shouldBootstrapPostHog` is true for `env.NEXT_PUBLIC_CLOUD_DOMAIN`, `env.NEXT_PUBLIC_ROOT_DOMAIN` and `'flowershow.app'`, and false for `'rufus.flowershow.me'` and `'example.com'` (stub `@/env.mjs` with `vi.mock`, as other tests do)
- [ ] **Step 2:** Run them; expect FAIL (module not found).
- [ ] **Step 3: Implement `lib/posthog-scope.ts`** with no Node-only imports (middleware runs on the edge). Use `isAnonymousSite` from `lib/anon-site-safety`, and check it's edge-safe.
- [ ] **Step 4: Middleware:** `const phBootstrap = shouldBootstrapPostHog(hostname) ? await buildPHBootstrapCookie(req, posthog) : null;` Everything downstream already handles `null`.
- [ ] **Step 5: `PostHogProvider`** gains props `{ persistence?: 'cookie' | 'memory'; identify?: boolean }`, defaults `'cookie'` and `true` (the cloud root providers stay unchanged). Move the `useSession` + `posthog.identify` effect into an inner `IdentifyUser` component rendered only when `identify` is true, so memory mode needs no `SessionProvider`. Memory mode passes `persistence: 'memory'`, drops `cross_subdomain_cookie` and `bootstrap`.
- [ ] **Step 6: Site providers** take `posthog: PostHogMode`: `'full'` → today's tree; `'memory'` → `<PostHogProvider persistence="memory" identify={false}>` with no `SessionProvider`; `'off'` → children only. The layout passes `posthog={posthogModeForSite(site)}`. Grep `app/(public)/site` and `components/public` for `useSession`/`signIn`/`signOut` and confirm there are none, so removing `SessionProvider` is safe. If any turn up, stop and report.
- [ ] **Step 7:** `pnpm vitest run --project=unit lib/posthog-scope.test.ts middleware.test.ts` → PASS; `pnpm tsc --noEmit -p .` → no new errors.
- [ ] **Step 8: Commit** `feat(analytics): PostHog only on Flowershow's own sites; memory mode on temporary sites`

### Task 2: Umami client, fixture client and config

**Files:**
- Create: `lib/site-analytics/config.ts`, `lib/site-analytics/umami-client.ts`, `lib/site-analytics/fixture-client.ts`, `lib/site-analytics/umami-client.test.ts`
- Modify: `env.mjs` (server: `UMAMI_API_KEY: z.string().optional()` plus `runtimeEnv` entry), `.env.example` (`UMAMI_API_KEY=` with a comment pointing at the secrets repo)

**Interfaces:**
- Produces, from `config.ts`: `UMAMI_HOST = ''`, `UMAMI_WEBSITE_ID = ''` (filled by the connect bead), `ANALYTICS_COUNTING_SINCE = new Date('2026-11-11T00:00:00Z')` (reset to the real launch day at connect), `ANALYTICS_RANGES = [7, 30] as const`, `type AnalyticsRange = 7 | 30`, `DEFAULT_RANGE: AnalyticsRange = 30`, `ANALYTICS_CACHE_SECONDS = 600`.
- Produces, from `umami-client.ts`:
  ```ts
  type UmamiWindow = { startAt: number; endAt: number; tag?: string };
  type UmamiRow = { name: string; pageviews: number; visitors: number };
  interface UmamiClient {
    stats(w: UmamiWindow): Promise<{ pageviews: number; visitors: number }>;
    pageviewsByDay(w: UmamiWindow): Promise<Array<{ date: string; pageviews: number }>>; // date = YYYY-MM-DD UTC
    metrics(w: UmamiWindow & { type: 'path' | 'referrer' | 'tag'; limit: number; offset?: number }): Promise<UmamiRow[]>;
  }
  function createHttpUmamiClient(opts: { host: string; websiteId: string; apiKey: string; fetchImpl?: typeof fetch; timeoutMs?: number }): UmamiClient;
  function getUmamiClient(): UmamiClient | null;
  ```
- `fixture-client.ts`: `createFixtureUmamiClient(): UmamiClient`. Returns deterministic sample data seeded from `tag`, plausible paths (`/`, `/blog/why-markdown`…), referrers (`google.com`, `x.com`, `news.ycombinator.com`), and a tag list. A tag starting `empty-` returns zeros and empty lists, for the empty-state stories.

- [ ] **Step 1: Failing tests:**
  - `createHttpUmamiClient(...).stats(...)` calls `${host}/api/websites/${websiteId}/stats?startAt=…&endAt=…&tag=…` with the API-key header and returns `{ pageviews, visitors }` from a v3 body `{ pageviews: 12, visitors: 5, visits: 6, bounces: 1, totaltime: 9 }`
  - `pageviewsByDay` calls `/pageviews` with `unit=day&timezone=UTC` and maps `pageviews: [{ x: '2026-11-01 00:00:00', y: 3 }]` to `[{ date: '2026-11-01', pageviews: 3 }]`
  - `metrics` calls `/metrics/expanded?type=path&limit=500&offset=0…` and keeps `name, pageviews, visitors`
  - a non-2xx response rejects; a response slower than `timeoutMs` rejects (AbortSignal)
  - `getUmamiClient()` returns `null` when `NEXT_PUBLIC_VERCEL_ENV` is `'production'` or `'preview'` and the key or constants are empty, and returns the fixture client when local with no key
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement.** Send the key in both `x-umami-api-key` and `Authorization: Bearer` headers. Self-hosted v3 accepts one of them, and the connect bead pins which one. Put the header-building in one function.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5: Commit** `feat(analytics): Umami client with fixture client for local dev`

### Task 3: Site analytics data

**Files:**
- Create: `lib/site-analytics/site-analytics.ts`, `lib/site-analytics/site-analytics.test.ts`

**Interfaces:**
- Consumes: Task 2 `UmamiClient`, `getUmamiClient`, config constants.
- Produces:
  ```ts
  type PageRow = { path: string; title: string | null; href: string | null; people: number; views: number };
  type SiteAnalytics =
    | { status: 'ok'; range: AnalyticsRange; countingSince: string /* YYYY-MM-DD */; fetchedAt: string /* ISO */;
        totals: { people: number; views: number }; series: Array<{ date: string; views: number }>;
        pages: PageRow[] /* up to 500 */; referrers: Array<{ domain: string; people: number }> /* ≤5 */ }
    | { status: 'unavailable' };
  type SiteCountability = { kind: 'counted' | 'password' | 'html-only'; hasRawHtml: boolean };
  function rangeWindow(range: AnalyticsRange, now: Date, siteCreatedAt: Date): { startAt: number; endAt: number; countingSince: string };
  function attachTitles(rows: UmamiRow[], pages: Array<{ appPath: string; permalink: string | null; title: string | null }>, siteUrl: string): PageRow[];
  function siteCountability(site: { privacyMode: string }, files: { pages: number; rawHtml: number }): SiteCountability;
  function getSiteAnalytics(site: { id: string; createdAt: Date; url: string }, range: AnalyticsRange, deps?: { client?: UmamiClient | null; now?: Date; loadPages?: (siteId: string) => Promise<Array<{ appPath: string; permalink: string | null; title: string | null }>> }): Promise<SiteAnalytics>;
  function loadSiteCountability(site: { id: string; privacyMode: string }): Promise<SiteCountability>;
  ```

- [ ] **Step 1: Failing tests:**
  - `rangeWindow(30, now=2026-12-20T15:00Z, createdAt=2026-01-01)`: start is 00:00 UTC on 2026-11-21 (30 days including today), `countingSince` is `'2026-11-21'`; with `createdAt=2026-12-15T10:00Z`, start and `countingSince` move to 2026-12-15; with a launch date later than the range start, the launch date wins
  - `series` is zero-filled for every day from `countingSince` to today and never earlier
  - `attachTitles`: `/` with blob title `'Home'` → title `'Home'`, href `siteUrl + '/'`; a row matching a blob's `permalink` gets that blob's title; an unmatched `/old-page` → `title: null, href: null` and keeps its numbers
  - `siteCountability`: `privacyMode 'PASSWORD'` → `'password'`; `{ pages: 0, rawHtml: 3 }` → `'html-only'`; `{ pages: 4, rawHtml: 1 }` → `'counted'` with `hasRawHtml: true`
  - `getSiteAnalytics` with a client whose `stats` rejects → `{ status: 'unavailable' }`; with `client: null` → `'unavailable'`
  - referrers are cut to 5 and `name === ''` rows are dropped
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement.** Make the four Umami calls in parallel inside `unstable_cache(fn, ['site-analytics'], { revalidate: ANALYTICS_CACHE_SECONDS, tags: [`site-analytics-${site.id}`] })`, keyed by `(site.id, range)`. Inside the cached function, throw on failure so failures aren't cached; outside it, catch and return `'unavailable'` with `console.error`. Page titles come from `prisma.blob.findMany({ where: { siteId, appPath: { not: null } }, select: { appPath, permalink, metadata } })`, using `metadata.title`. Countability counts blobs with `appPath` not null against blobs whose `path` ends `.html`.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5: Commit** `feat(analytics): per-site numbers from Umami, cached 10 minutes`

### Task 4: People per site for the site cards

**Files:**
- Create: `lib/site-analytics/people-by-site.ts`, `lib/site-analytics/people-by-site.test.ts`

**Interfaces:**
- Produces: `getPeopleBySite(siteIds: string[], deps?: { client?: UmamiClient | null; now?: Date }): Promise<Record<string, number> | null>`. `null` means unavailable. A listed site with no row maps to `0`.

- [ ] **Step 1: Failing tests:** paging calls `metrics({ type: 'tag', limit: 500, offset: 0 })`, then `offset: 500`, and stops at the first page shorter than 500. A site on page 2 is found. Sites not in `siteIds` are left out. A rejected call → `null`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement** with one cached fetch of the whole tag list for the last 30 days (`unstable_cache`, key `['people-by-site-30d']`, `revalidate: 600`), filtered to `siteIds` outside the cache.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5: Commit** `feat(analytics): people per site for the dashboard cards`

### Task 5: Analytics view components

**Files:**
- Create: `components/dashboard/analytics/analytics-view.tsx` (server-safe, presentational), `components/dashboard/analytics/views-chart.tsx` (SVG bars), `components/dashboard/analytics/pages-table.tsx` (`'use client'`, "Show all pages" toggle), `components/dashboard/analytics/analytics-view.test.tsx`, `stories/SiteAnalytics.stories.tsx`

**Interfaces:**
- Consumes: Task 3 `SiteAnalytics`, `SiteCountability`; config `ANALYTICS_RANGES`.
- Produces: `AnalyticsView(props: { data: SiteAnalytics; countability: SiteCountability; range: AnalyticsRange; siteUrl: string; basePath: string /* /site/{id}/analytics */; now?: Date })`.

Load the `dataviz` skill before writing the chart. Match the dashboard's stone/zinc Tailwind palette and dark-mode classes (see `components/dashboard/site-tabs.tsx`).

- [ ] **Step 1: Failing tests** (render with @testing-library/react), one per state. Text must match exactly:
  - ok: shows `412` with label `people` and `1,380` with label `views`; range links `?range=7` and `?range=30`, with the current one marked `aria-current="page"`; the People tooltip text is `An estimate based on device and browser, not a head count.`
  - pages: 25 rows → 20 visible plus a `Show all pages` button; clicking it shows 25. A row with `href: null` renders its path with no link.
  - referrers: `Readers came from` plus up to 5 domains; the whole line is absent when there are no referrers.
  - footer: `Counted without cookies since 12 Nov. Includes your own visits.` and `Updated 6 minutes ago.` (format `countingSince` as `d MMM`; the relative time comes from `fetchedAt` and `now`)
  - empty (totals 0): `No readers yet. Counting started on 12 Nov. Numbers update every 10 minutes.` plus the site link and a copy button
  - `hasRawHtml`: `Pages published as raw HTML aren't counted.`
  - `html-only`: `This site's pages are raw HTML, which we can't count yet.` and no numbers
  - `password`: `Password-protected sites aren't counted.` and no numbers
  - unavailable: `Numbers aren't available right now.`
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement.** Mobile: the stat tiles stack, and the table keeps three columns with the title truncating. Stories: one per state, fed from the fixture client's shapes.
- [ ] **Step 4:** Tests PASS; `pnpm storybook` renders each story with no console errors. Check this once by hand at a 375 px width.
- [ ] **Step 5: Commit** `feat(analytics): analytics view with every owner-facing state`

### Task 6: Analytics tab, route and site card line

**Files:**
- Create: `app/(cloud)/dashboard/site/[id]/analytics/layout.tsx` (same as `history/layout.tsx`), `app/(cloud)/dashboard/site/[id]/analytics/page.tsx`
- Modify: `components/dashboard/site-tabs.tsx` (+ its test if one exists, else create `components/dashboard/site-tabs.test.tsx`), `app/(cloud)/dashboard/site/[id]/site-tabs-layout.tsx` (pass `showAnalytics`), `components/dashboard/site-card.tsx`, `app/(cloud)/dashboard/page.tsx`

**Interfaces:**
- Consumes: Tasks 2–5. Use `getUmamiClient() !== null` as the single "analytics available" check.

- [ ] **Step 1: Failing tests:**
  - `SiteTabs` with `showAnalytics` renders an `Analytics` tab linking to `/site/{id}/analytics`, after `Settings`; without it, no tab
  - `SiteCard` with `people={412}` renders `412 people in the last 30 days` as a link to `/site/{id}/analytics`; with `people={0}` it renders `No readers yet`; with `people` undefined it renders no line
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement.** The page reads `?range=` (anything else → `DEFAULT_RANGE`). It calls `canManageSite` again (the layout already does), then `notFound()` when analytics isn't available. Then `getSiteAnalytics`, `loadSiteCountability` and `AnalyticsView`. The dashboard page calls `getPeopleBySite(sites.map(s => s.id))` once and passes `people` to each card. It passes `undefined` when the result is `null` or the site is password-protected, because the design shows nothing on those cards. Put the card's number line in its own link, outside the existing Settings `<Link>`, so the links don't nest.
- [ ] **Step 4:** Tests PASS. Run `pnpm dev`, open a site's Analytics tab locally (the fixture client supplies data), and screenshot the ok and empty states.
- [ ] **Step 5: Commit** `feat(analytics): Analytics tab and people count on site cards`

### Task 7: Umami tracking script on published sites

**Files:**
- Create: `components/public/flowershow-analytics.tsx`, `components/public/flowershow-analytics.test.tsx`
- Modify: `app/(public)/site/[user]/[project]/layout.tsx` (render right after the owner's `siteConfig?.umami` `<Script>`)

**Interfaces:**
- Produces: `flowershowUmamiAttrs(site: { id: string; privacyMode: string }, opts: { host: string; websiteId: string; vercelEnv?: string }): Record<string, string> | null` and `FlowershowAnalytics({ site })`.

- [ ] **Step 1: Failing tests:** with host `https://u.example`, website `w1`, `vercelEnv: 'production'` and a public site `s1`, the attributes are `{ src: 'https://u.example/script.js', 'data-website-id': 'w1', 'data-tag': 's1', 'data-exclude-search': 'true', 'data-exclude-hash': 'true' }`. `null` when `privacyMode === 'PASSWORD'`, when `vercelEnv` isn't `'production'`, or when host or websiteId is empty.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3: Implement.** `FlowershowAnalytics` renders `<Script defer {...attrs} />`, or nothing. It reads constants from config and `env.NEXT_PUBLIC_VERCEL_ENV`.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5: Commit** `feat(analytics): Umami script on published sites, tagged by site`

### Task 8: Docs, changelog and privacy wording

**Files:**
- Modify: `content/flowershow-app/docs/reference/analytics.md`: lead with "Built-in analytics" (what owners see, where, what's counted and not, no cookies), then the existing GA/Umami options as "Use your own analytics too"
- Create: `content/flowershow-app/changelog/YYYY-MM-DD-see-who-reads-your-site.md` (date = merge day; title "See who reads your site"; follow the template in the repo `AGENTS.md`; no screenshot until real numbers exist)
- Modify: `apps/flowershow/README.md` if it lists env vars (add `UMAMI_API_KEY`)
- Modify (other repo, own commit): `~/src/flowershow/product/legal/2026-10-22-privacy-policy-draft.md`. Published sites now use Flowershow's Umami (no cookies; IP used only to derive location and a monthly hashed ID; not stored); PostHog is only on flowershow.app, the dashboard and temporary sites (memory only, no cookies); remove `ph_bootstrap` from the cookie table for published sites. Commit it there; don't push unless that repo's AGENTS.md allows it.

Use the `write-tutorial` skill's rubric for the docs page. Keep the changelog to what owners can now do. Mark the page and changelog as live only once the connect bead lands: the changelog file's `date` is set then.

- [ ] **Step 1:** Write the pages and grep for broken wiki links (`[[`).
- [ ] **Step 2: Commit** `docs(analytics): built-in analytics docs and changelog`

### Connect (separate bead, blocked on flowershow-9bu.1; not in this PR)

Set `UMAMI_HOST`, `UMAMI_WEBSITE_ID` and `ANALYTICS_COUNTING_SINCE`, pin the auth header, add the key to Vercel. Verify on a throwaway `fl` preview site against the design's check list: no analytics cookies, the right tag, two sites kept separate, an owner's own Umami still counting and keeping its custom events. Set the changelog date.
