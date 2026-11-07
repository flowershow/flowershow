---
title: Built-in analytics in the dashboard (v1) — design
date: 2026-11-07
status: draft (awaiting Rufus's OK)
bead: flowershow-9bu
github: "#1202"
---

# Built-in analytics in the dashboard (v1)

## Intent

Site owners (Rufus included) want to see, without setting up Google Analytics or Umami, whether people read their site and what they read. Rufus asked for this in 2026-03 and again on 2026-11-07: "even very simple" analytics in the dashboard. Success: an owner opens their site in the dashboard, clicks **Analytics**, and in a second or two sees visits over the last 7 or 30 days, their top pages, where readers came from and which countries they are in.

Comparable hosts: [2026-11-07-analytics-comparables.md](2026-11-07-analytics-comparables.md). Every one of them shows visitors, page views, top pages, referrers and countries. Most count without cookies, using a daily salted hash. Vercel splits tiers by how long data is kept.

## Goals

- An **Analytics** tab for each site in the dashboard (next to Settings, History, Annotations).
- Metrics: page views and visitors as a daily chart plus totals; top pages; top referrers; top countries. Ranges: last 7 days (default) and last 30 days.
- Works for every site we serve: `*.flowershow.me` subdomains and custom domains.
- No setup for the owner. Existing sites get it, with history going back as far as our data does.
- Readers of user sites get no cookies or local storage from Flowershow's analytics.

## Non-goals (v1)

- Custom ranges, comparison with the previous period, real-time view, events/goals, UTM, device/browser breakdowns, CSV export.
- A public REST/MCP endpoint for analytics (follow-up).
- Excluding the owner's own visits.
- Raw `.html` files: middleware serves them through `/api/raw`, outside the React layout, so they load no PostHog and are not counted. The page says so in one line.
- Changing the existing `analytics` (GA) and `umami` config options.

## Anti-goals

- Anything that makes owners add a script, a key or a config line.
- Cookies, local storage or cross-site identifiers on user sites to power this.
- Showing one owner traffic that belongs to another site, for example one that previously used the same domain.
- A slow dashboard page (more than ~3 s uncached), or analytics errors breaking anything else.
- Building and running our own event pipeline while one already exists.
- Claiming legal compliance we haven't checked. We say what we do ("no cookies, no cross-site tracking, IPs not stored"), not "GDPR-compliant, no banner needed".

## What exists today (recon)

- All sites are served by the Next.js app on Vercel; custom domains are added to the Vercel project (`lib/domains.ts`). The Cloudflare worker only processes markdown and does not see reader traffic.
- **Every published page already loads PostHog** (`app/(public)/site/[user]/[project]/_components/providers.tsx` → `providers/posthog-provider.tsx`) and sends `$pageview` and autocapture events to Flowershow's PostHog EU project through our relay (`/relay-qYYb`, `proxyPostHog` in `middleware.ts`). Events carry `$host`, `$pathname`, `$referring_domain` and GeoIP `$geoip_country_code`.
- Readers of user sites currently get **two cookies**. One is the PostHog client cookie (`persistence: 'cookie'`, `cross_subdomain_cookie: true`). The other is `ph_bootstrap`, which `middleware.ts` (`buildPHBootstrapCookie`) sets on every HTML page, after a PostHog flag lookup (`getAllFlagsAndPayloads`) on every request. No public-site code reads PostHog flags. The `isFeatureEnabled` calls in the site layout are our own plan flags, not PostHog.
- flowershow.app is served as an ordinary custom-domain site.
- No PostHog personal API key exists in the app or the secrets repo, so nothing reads PostHog data back yet.
- `product/reports/analytics.csv` is business metrics, not traffic.

## Decision: read from PostHog, don't build a collector

1. **Query PostHog (chosen).** Data already flows for every site, with history; reads are free. We add one server-side query module and a page.
2. Own beacon → Postgres daily rollups: new ingestion, bot filtering, geo and storage, and no history. Only if PostHog limits or cost bite.
3. Vercel Web Analytics: per project, not per tenant, and no usable query API. Not viable.
4. Counting in middleware or on the server: sees bots and prefetches, and adds a write on the hot path. No.

If option 1 hits limits later, a nightly job rolls PostHog data into a Postgres `SiteDailyStats` table behind the same `getSiteAnalytics` interface.

## Design

### 1. Tracking changes on user sites

These apply to published sites only. The cloud dashboard and Flowershow's own sites keep today's behaviour (see the exemption below).

- `posthog.init` with `cookieless_mode: 'always'`, `autocapture: false`, `capture_pageview: 'history_change'` (SPA navigations count) and `capture_pageleave: false`. Skip `posthog.identify()`. We collect pageviews only, with no click autocapture, which also cuts event volume.
- Register two super properties on every event: `fs_site_id` (the site's DB id, a stable tenant key) and `fs_country`, an ISO country code worked out in the browser from `Intl.DateTimeFormat().resolvedOptions().timeZone` with a static timezone→country map. The reason: in cookieless mode PostHog strips the IP before GeoIP, so `$geoip_country_code` disappears. The timezone is an approximation, stored nowhere, and the UI says "approximate".
- Middleware: skip `buildPHBootstrapCookie` (cookie and flag lookup) for user-site hosts. That removes the second cookie and a PostHog round-trip from every page request.
- **Exemption:** a constant list of Flowershow's own site IDs (flowershow.app etc.) keeps cookie mode, bootstrap and autocapture, because product analytics and web experiments rely on stable IDs there. It is a constant in code, not an env var.
- Ships behind a constant `COOKIELESS_USER_SITES` flag, flipped in a follow-up commit after "Enable cookieless tracking" is turned on in the PostHog project settings. With the setting off, cookieless events lose their IDs.

### 2. Query module

- `apps/flowershow/lib/site-analytics.ts` exports `getSiteAnalytics(site, range: 7 | 30)` and returns `{ series, totals, topPages, topReferrers, topCountries, fetchedAt }`:
  - `series: { date, pageviews, visitors }[]`, one row per UTC day, zero-filled
  - `totals: { pageviews, visitors }`
  - each top list: `{ key, pageviews }[]`, top 10
- HogQL to the private API `https://eu.posthog.com/api/projects/{PROJECT_ID}/query/` (not the ingestion relay), with a personal API key scoped to that project with `query:read` only. The project ID is a constant in code.
- **Tenant filter:** `event = '$pageview' AND timestamp >= {from} AND (properties.fs_site_id = {siteId} OR (properties.fs_site_id IS NULL AND properties.$host IN {hosts} AND timestamp >= {site.createdAt}))`. `hosts` is the current `{subdomain}.{NEXT_PUBLIC_SITE_DOMAIN}` plus `customDomain`. The `createdAt` guard stops a recreated subdomain or reused domain from showing a previous site's history. Older hosts from before a rename are not recovered (accepted). All values go in as HogQL `values` placeholders, never interpolated.
- Ranges are the last 7 or 30 UTC calendar days including today. The UI labels days in UTC.
- Queries: one for the series and totals, one `UNION ALL` (or three) for the top lists, run in parallel. Fewer is better because of PostHog's hourly query and read budgets.
- Referrers: `$referring_domain`. `$direct` shows as "Direct / none"; self-referrals (the site's own hosts) are dropped. These are per-pageview referrers.
- Countries: `coalesce(fs_country, $geoip_country_code)`. Older events use PostHog's GeoIP, newer ones the timezone. Shown with name and flag.
- **Visitors** = distinct `distinct_id` per day, summed. Cookieless IDs rotate daily, so this is the honest number. Label "Visitors" with the tooltip "Counted once per day". Expect a step up in visitors on the switch date (accepted; noted in the changelog).

### 3. Caching and limits

- Authorize first (`canManageSite`), then call the cached function. `unstable_cache` keyed by `(siteId, range, hosts)` with `revalidate: 3600` and tag `site-analytics-{siteId}`, following `lib/post/hosts.ts`. Changing the domain revalidates the tag.
- The page shows "Updated {fetchedAt, relative}" from the cached payload, so stale data looks stale.
- 5 s timeout. On 429, timeout or error, show "Analytics are temporarily unavailable" inline, send the exception to PostHog error tracking, and leave the rest of the page working.

### 4. Dashboard UI

- Route `app/(cloud)/dashboard/site/[id]/analytics/page.tsx` under the shared `SiteTabsLayout`. Add an **Analytics** tab in `components/dashboard/site-tabs.tsx`.
- Top to bottom: range toggle (7 days | 30 days, in `?range=`); stat tiles (Page views, Visitors); daily bar chart of page views; three ranked lists (Top pages linking to each page, Top referrers, Countries), side by side on desktop and stacked on mobile, each with inline proportional bars in the style of Plausible.
- Chart: small hand-rolled SVG, or a chart dependency the app already has. Follow the `dataviz` skill for colours and dark mode.
- Empty state: "No visits recorded yet. Visits show up here within an hour." One line under the lists says raw `.html` pages aren't counted. If the site has GA/Umami configured, one line says those keep working.
- Server component; no new API route, so no api-contract change.

### 5. Access and security

- Only `canManageSite` users see a site's analytics. This is checked in the layout and again in the page before any query.
- `POSTHOG_PERSONAL_API_KEY` is server-only in `env.mjs`, a Vercel secret, never sent to the client or logged. Tenant values come from our DB and go in as placeholders.

### 6. Plans (free vs Premium)

Recommendation for fs-plans (bead `flwrprd-ox8`) to settle: v1 on for **all plans**. It costs us almost nothing, and it gives owners a reason to keep publishing with us. Later Premium extras could be longer ranges (90 days / 12 months, as Vercel does), CSV export and an API/MCP "how's my site doing" tool. Allowed ranges sit in one constant, so a plan gate is a one-line change.

## Testing

- Unit: query building (tenant filter, placeholders, ranges), mapping (zero-fill, self-referral removal, `$direct`, country coalesce), timezone→country map, and the error/429/timeout paths with `fetch` mocked.
- Middleware: no `ph_bootstrap` on user-site hosts; unchanged on exempt and cloud hosts.
- Component: tiles, chart, lists and empty state from fixtures. Authz: a non-owner gets 404.
- Real check: a throwaway `fl` preview site. Visit pages, confirm no cookies in devtools, and see the visits in the Analytics tab.

## Rollout

0. **Pre-check (needs the API key):** sample recent user-site `$pageview` events in PostHog and confirm `$host`, `$referring_domain` and `$geoip_country_code` look right. That also confirms the relay passes readers' real IPs, which today's countries and history depend on.
1. Rufus: create the project-scoped `query:read` personal API key (secrets repo plus Vercel) and turn on cookieless tracking in the PostHog project settings.
2. PR 1: query module, Analytics tab, tracking changes behind `COOKIELESS_USER_SITES = false`, docs page `content/flowershow-app/docs/analytics.md`, changelog entry.
3. After step 1 is done: flip the flag (one-line commit), then verify on a preview site and one of Rufus's sites.

## Follow-ups (beads, not v1)

- API/MCP endpoint for site analytics (contract-first).
- Nightly rollup to Postgres if PostHog limits or latency bite.
- Plan-gated longer ranges and export (after fs-plans).
- Counting raw `.html` pages.
- Excluding the owner's own visits.

## Left to the builder

- Exact HogQL, query merging, chart implementation, copy, the timezone→country map source, test layout.
