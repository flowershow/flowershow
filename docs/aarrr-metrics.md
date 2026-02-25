# AARRR Metrics Analysis for Flowershow

## Overview

Flowershow has three publishing clients feeding into one platform:

| Client              | Auth Method                   | Publish Flow                                   |
| ------------------- | ----------------------------- | ---------------------------------------------- |
| **Obsidian Plugin** | PAT token (`fs_pat_`)         | Direct upload to R2 via presigned URLs         |
| **CLI**             | Device OAuth flow (`fs_cli_`) | Direct upload to R2 via presigned URLs         |
| **Web App**         | GitHub OAuth / Google OAuth   | GitHub webhook sync or anonymous quick-publish |

**Monetization:** Free → Premium ($5/mo or $50/yr) for custom domains, no branding, priority support.

**Analytics constraints:**

- **Obsidian Plugin:** Obsidian discourages client-side telemetry in plugins, so there is no plugin-side analytics. All plugin insight comes from server-side API calls. The plugin sends `Authorization: Bearer fs_pat_...` and `X-Flowershow-Plugin-Version` headers, so we can identify plugin users and their version server-side.
- **CLI:** The CLI collects optional anonymous telemetry (random UUID stored in `~/.flowershow/config.json`, opt-out via `FLOWERSHOW_TELEMETRY_DISABLED=1`). This is **not linked to real user identity** — it provides aggregate product usage stats (command success/failure rates, durations) but cannot be joined with server-side user data. Treat CLI-side telemetry as supplementary. Regardless of telemetry opt-out, the CLI always sends `X-Flowershow-CLI-Version` on every API request (same as the Obsidian plugin with `X-Flowershow-Plugin-Version`), so we can always identify CLI users and their version server-side. The primary source of truth for CLI user behavior is the server-side API events fired when the CLI calls our endpoints.

### Current Tracking Infrastructure

| System                        | Scope           | Identity       | What It Covers                                                                                                                                                                                                                                                       |
| ----------------------------- | --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostHog (server)              | Next.js app     | Real userId    | `sign_up`, `site_created`, `site_deleted`, `site_upgraded`, `subscription_canceled`, `token_created`, `device_authorized`, `site_settings_changed`, `files_synced`, `anon_publish_started`, `anon_claim_completed`, `github_installation_linked`, exception tracking |
| PostHog (client)              | Web app         | Real userId    | Autocapture (page views, clicks), error tracking, anonymous publish flow events                                                                                                                                                                                      |
| PostHog (CLI — supplementary) | CLI tool        | Anonymous UUID | `command_started`, `command_succeeded`, `command_failed` per command with `cli_version`, `duration_ms`, file counts, and sync stats. Cannot be linked to server-side user profiles.                                                                                  |
| OpenTelemetry                 | Next.js app     | —              | Structured logs to PostHog via OTLP                                                                                                                                                                                                                                  |

> **Note on dual tracking:** When a user runs `flowershow publish`, two separate event streams fire: (1) CLI-side `command_succeeded` with an anonymous UUID, and (2) server-side `files_synced` with the real userId. These cannot be joined in PostHog. For AARRR analysis, rely on server-side events for all user-level metrics. CLI-side telemetry is useful only for aggregate product health (e.g., "what % of publish commands fail?" or "what's the p95 publish duration?").

---

## 1. Acquisition — "How do users discover and sign up?"

### Metrics

| Metric                        | How to Measure                                                                         | Why It Matters                        |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| Landing page visits           | PostHog `$pageview` on marketing/landing pages                                         | Top of funnel volume                  |
| Visit → signup conversion     | Signups / unique landing page visitors                                                 | Is the landing page working?          |
| Discovery channel             | `utm_source` / `ref` query param on signup page, or PostHog `$referrer` on first visit | Where users actually find Flowershow  |
| Signups over time             | Weekly new user count                                                                  | Growth trend                          |
| Signups by auth provider      | `user_created` event with GitHub vs Google                                             | User demographic signal (not channel) |
| CLI first contact             | First API call per `fs_cli_` token                                                     | CLI top-of-funnel                     |
| Plugin first contact          | First API call with `X-Flowershow-Plugin-Version` per user                             | Plugin top-of-funnel                  |
| Anonymous publishes           | `/api/sites/publish-anon` call count                                                   | "Try before signup" demand            |
| Anonymous → signup conversion | `site_claimed` / anonymous publishes                                                   | Does try-before-buy work?             |

**North star:** Signups per week, segmented by discovery channel.

### Currently Tracked

- [x] Signups happen via NextAuth (GitHub/Google OAuth) — user records exist in DB with `createdAt`
- [x] PostHog client-side autocapture covers page views, clicks, `$referrer`, and `$referring_domain` automatically
- [x] Landing page visits and referrer data already in PostHog — just needs a dashboard
- [x] New users added to Brevo contact list automatically
- [x] `site_created` event logged with `client_type` and `version`

### Gaps

- [ ] **No UTM parameter discipline.** PostHog captures `$referrer` automatically, but when we post links on Reddit, Obsidian forum, Hacker News, etc., they don't carry UTM parameters. This means we can see _which domain_ sent traffic but can't distinguish e.g. two different Reddit posts or a forum post vs a forum ad. Need to adopt `?utm_source=obsidian-forum&utm_medium=post` on all outbound links we control.
- [ ] **No acquisition dashboard.** The raw data (page views, referrers, signups) is in PostHog but nobody has built the funnel: landing page visit → signup → activation, segmented by referrer/UTM source.
- [ ] **No first-contact tracking for CLI/plugin.** We can't distinguish "new CLI user" from "returning CLI user" without querying whether a token has been seen before.
- [ ] **Anonymous publish → claim funnel not tracked.** The endpoints exist but no events connect the anonymous session to eventual signup.
- [ ] **No npm download tracking.** CLI installs via npm are not captured internally.

---

## 2. Activation — "Do new users experience the aha moment?"

**Aha moment:** User sees their content live on the web for the first time.

### Metrics

| Metric                        | How to Measure                                                | Why It Matters                     |
| ----------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Activation rate               | Users with 1+ successful publish / total signups              | Overall onboarding health          |
| Time to first publish         | `user.createdAt` → first `sync_completed(SUCCESS)`            | Onboarding friction quantified     |
| Setup funnel dropoff          | Signup → Token created → Site created → First successful sync | Exactly where people abandon       |
| First publish by client       | Derive from token type (`fs_pat_` / `fs_cli_` / session)      | Which path converts best           |
| Token creation rate           | Users who create PAT or CLI token / total signups             | Plugin/CLI prerequisite completion |
| Token → first publish         | Time from token creation to first authenticated sync          | Is plugin/CLI config a blocker?    |
| First sync failure rate       | Users whose first-ever sync fails / total first syncs         | First impression reliability       |
| Created but never published   | Sites with 0 blobs, older than 7 days                         | Setup completion failure           |
| Auth failure on first attempt | 401 on first token-authenticated call per user                | Bad token / expired token friction |

**North star:** Activation rate — % of signups who successfully publish within 7 days.

### Currently Tracked

- [x] `sign_up` event fires with `auth_provider` (github/google)
- [x] `device_authorized` event fires when user authorizes a CLI device code — completes the CLI login funnel (`sign_up` → `device_authorized` → `token_created`)
- [x] `token_created` event fires with `token_type` (PAT/CLI) — enables activation funnel for plugin/CLI users
- [x] `site_created` event fires with `client_type` and `version`
- [x] `files_synced` event fires with `client_type`, `client_version`, upload/update/delete/unchanged counts
- [x] Blob records track `syncStatus` (UPLOADING → PROCESSING → SUCCESS / ERROR)
- [x] CLI tracks `command_succeeded` / `command_failed` with duration, file counts, and sync stats (anonymous — supplementary only, not linkable to users)

### Gaps

- [ ] **No activation rate computed.** The data exists (user creation time + first successful sync) but no dashboard or funnel connects them.
- [ ] **No time-to-first-publish metric.** Requires joining `user.createdAt` with first successful sync — not currently computed.
- [ ] **No per-client activation funnel.** We can't answer "do plugin users activate faster than CLI users?" without tagging API requests by client type.
- [ ] **No "created but never published" alerting.** Sites with 0 blobs exist in the DB but no one is watching for this pattern.
- [x] **First-publish vs subsequent sync is distinguishable.** CLI `publish` creates the site (`site_created` + `files_synced`), while `sync` only fires `files_synced`. A failed `files_synced` co-occurring with `site_created` is a first-publish failure.

---

## 3. Retention — "Do activated users keep publishing?"

### Metrics

| Metric                          | How to Measure                                                  | Why It Matters                      |
| ------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| Weekly active publishers (WAP)  | Distinct users with 1+ sync in trailing 7 days                  | Core engagement                     |
| WAU / MAU ratio                 | Weekly vs monthly active publishers                             | Engagement depth                    |
| Publishing frequency            | Syncs per user per week, by client                              | How often people update             |
| Week-over-week retention        | % of users who published in week N who also publish in week N+1 | Cohort health                       |
| Active sites                    | Sites with 1+ sync in last 30 days                              | Living vs dead content              |
| Content volume growth           | Blob count per site over time                                   | User investment in platform         |
| Zombie sites                    | Sites with 0 syncs in 30+ days                                  | Abandonment signal                  |
| Feature adoption                | Enable rates for custom domain, Giscus, Typesense, password     | What drives stickiness              |
| Multi-site users                | Users with 2+ active sites                                      | Power user signal                   |
| Published site page views       | Platform-level views on `/@user/project` routes                 | Proves value to publishers          |
| Sync failure rate + reasons     | `sync_completed(ERROR)` / total, by error type and client       | Reliability hurting retention       |
| Repeated failures               | Users with 3+ consecutive failed syncs                          | Actively struggling, about to churn |
| Plugin/CLI version distribution | Version headers aggregated server-side                          | Outdated clients causing problems   |

**North star:** Week-over-week retention — % of users who published in week N who also publish in week N+1.

### Currently Tracked

- [x] `site_created` event with `client_type` and `client_version`
- [x] `site_deleted` event with `client_type`, `client_version`, and `deleted_files` count
- [x] `files_synced` event with `client_type`, `client_version`, upload/update/delete/unchanged counts
- [x] `site_settings_changed` event with `setting` name and `new_value` — tracks feature enable/disable moments
- [x] Blob records with `syncStatus` and timestamps in DB
- [x] CLI `command_succeeded` / `command_failed` with `duration_ms`, file counts, and sync breakdown (anonymous — supplementary only, useful for aggregate product health)
- [x] `X-Flowershow-Plugin-Version` and `X-Flowershow-CLI-Version` headers sent with requests (used server-side for identified tracking)

### Gaps

- [ ] **No weekly active publishers metric.** Requires counting distinct users with syncs per week — data exists but not aggregated.
- [ ] **No retention cohort analysis.** No week-over-week or month-over-month retention curves.
- [ ] **No published site page views at platform level.** Users can optionally configure GA4/Umami, but Flowershow itself doesn't track visits to published sites. This means we can't show publishers "your site got 500 views this week" — a key retention motivator.
- [ ] **Sync failures not segmented by client.** Errors exist in Inngest/Blob records but aren't tagged with which client initiated the sync.
- [ ] **No "struggling user" detection.** Users with repeated consecutive failures aren't flagged.
- [ ] **Version headers not aggregated.** Plugin and CLI version info is sent but not collected into a distribution dashboard.

---

## 4. Referral — "Do users bring others?"

### Metrics

| Metric                      | How to Measure                                                     | Why It Matters                               |
| --------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| Published site traffic      | Page views on `/@user/project` from external referrers             | Sites as organic acquisition                 |
| Signup referrer attribution | Referrer URL on signup page (PostHog web)                          | Users arriving via someone's Flowershow site |
| Multi-user per GitHub org   | Users sharing the same GitHub org/installation                     | Team word-of-mouth                           |
| Free-tier branding exposure | Page views on free-tier sites (which show "Powered by Flowershow") | Free tier as marketing channel               |
| Sites with active comments  | Sites with `enableComments: true` + external Giscus engagement     | Community forming around content             |

**North star:** % of new signups whose referrer is a `*.flowershow.app` published site.

### Currently Tracked

- [x] PostHog client-side autocapture on the web app captures referrers for dashboard/signup pages
- [x] GitHub installations track `accountLogin` and `accountType` (org vs user)

### Gaps

- [ ] **No published site analytics at platform level.** This is the biggest referral blind spot. We don't know how much traffic published sites generate, which means we can't measure organic acquisition from the product itself.
- [ ] **No referrer-to-signup attribution.** PostHog captures referrers on the web app, but no one is analyzing whether signups come from other Flowershow sites.
- [ ] **Free-tier branding as acquisition not measured.** The "Powered by Flowershow" badge on free sites is the main referral mechanism but its effectiveness is unknown.
- [ ] **No team/org growth tracking.** We can see GitHub installations but don't track when a second user from the same org signs up.

---

## 5. Revenue — "Do users pay, and do they stay?"

### Metrics

| Metric                         | How to Measure                                                           | Why It Matters            |
| ------------------------------ | ------------------------------------------------------------------------ | ------------------------- |
| Free → Premium conversion rate | `site_upgraded` / active free sites                                      | Core business metric      |
| Time to upgrade                | `user.createdAt` → `checkout.session.completed`                          | When does the trigger hit |
| Upgrade trigger                | Last 5 API calls before checkout (especially failed custom domain → 403) | What drives revenue       |
| MRR / ARR                      | Sum of active subscriptions × price                                      | Revenue health            |
| Monthly vs annual split        | Subscription `interval` distribution                                     | Revenue predictability    |
| Churn rate                     | `subscription_canceled` / active subscriptions per month                 | Revenue leakage           |
| Last actions before churn      | 5 most recent API calls before cancellation                              | Why people leave          |
| Net revenue retention          | MRR from existing customers this month / their MRR last month            | Growing within the base   |
| Expansion revenue              | Users upgrading additional sites                                         | Power user monetization   |
| LTV estimate                   | Average subscription duration × price                                    | Unit economics            |

**North star:** MRR and monthly free → premium conversion rate.

### Currently Tracked

- [x] `site_upgraded` event in PostHog with `siteId`, `interval`, `priceId`
- [x] `subscription_canceled` event in PostHog with `siteId`, `interval`, `priceId` — enables churn rate calculation
- [x] Stripe webhooks handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [x] Subscription model stores `status`, `interval`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`
- [x] Site `plan` field (FREE / PREMIUM) updated on subscription changes

### Gaps

- [ ] **No conversion rate dashboard.** `site_upgraded` events fire but aren't compared against total active free sites.
- [ ] **No time-to-upgrade metric.** Requires joining user creation with first subscription — not computed.
- [ ] **No upgrade trigger analysis.** We don't track what the user was doing right before upgrading (e.g., attempting to set a custom domain and hitting a paywall).
- [ ] **No MRR dashboard.** Subscription data is in the DB and Stripe but not surfaced as a time series.
- [ ] **No churn reason capture.** We know _when_ someone cancels (Stripe webhook via `subscription_canceled` event) but not _why_. No cancellation survey, no last-actions-before-churn analysis.
- [ ] **No revenue cohort analysis.** Can't answer "do users who signed up in January have higher LTV than December users?"

---

## Implementation Roadmap

### Foundation — DONE

| Item                          | What                                                                                                                | Status |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| **Client-type tagging**       | `getClientInfo()` derives `client_type` from request headers; used across endpoints                                 | Done   |
| **`token_created` event**     | PostHog event fires on PAT and CLI token creation with `token_type`                                                 | Done   |
| **`sign_up` enrichment**      | `sign_up` event now includes `auth_provider` (github/google)                                                        | Done   |
| **`site_deleted` event**      | PostHog event fires on site deletion with `client_type` and `deleted_files`                                         | Done   |
| **`subscription_canceled`**   | PostHog event fires on Stripe cancellation with `siteId`, `interval`, `priceId`                                     | Done   |
| **`site_settings_changed`**   | Enriched with `setting` name and `new_value`                                                                        | Done   |
| **`device_authorized` event** | PostHog event fires when user authorizes a CLI device code — enables CLI login funnel tracking                      | Done   |
| **CLI telemetry enrichment**  | `command_succeeded` now includes file counts and sync breakdown (anonymous — supplementary to server-side tracking) | Done   |

### Next: PostHog dashboards (queryable from existing data)

| Item                            | AARRR Stage | What                                                                                | Effort |
| ------------------------------- | ----------- | ----------------------------------------------------------------------------------- | ------ |
| Activation rate dashboard       | Activation  | Join `user.createdAt` with first successful Blob sync                               | Low    |
| Time to first publish           | Activation  | Same data, compute duration                                                         | Low    |
| Setup funnel                    | Activation  | `sign_up` → `device_authorized` → `token_created` → `site_created` → `files_synced` | Low    |
| Weekly active publishers        | Retention   | Count distinct users with syncs per week                                            | Low    |
| Free → Premium conversion rate  | Revenue     | `site_upgraded` count / active free sites count                                     | Low    |
| Churn rate                      | Revenue     | `subscription_canceled` count / active subscriptions                                | Low    |
| MRR time series                 | Revenue     | Sum active subscriptions from Stripe/DB                                             | Low    |
| Plugin/CLI version distribution | Retention   | Aggregate version headers from request logs                                         | Low    |

### Medium effort

| Item                             | AARRR Stage | What                                                           | Effort |
| -------------------------------- | ----------- | -------------------------------------------------------------- | ------ |
| Sync failure reasons by client   | Retention   | Enrich sync events with error type + client type               | Medium |
| Week-over-week retention cohorts | Retention   | Cohort analysis in PostHog                                     | Medium |
| Last actions before churn        | Revenue     | Track last 5 API calls per user before `subscription_canceled` | Medium |
| Signup referrer attribution      | Referral    | Analyze PostHog referrer data on signup page                   | Medium |
| UTM parameter discipline         | Acquisition | Add `utm_source` / `utm_medium` to all outbound links          | Medium |

### Larger investments

| Item                                     | AARRR Stage          | What                                                                              | Effort |
| ---------------------------------------- | -------------------- | --------------------------------------------------------------------------------- | ------ |
| Platform-level published site page views | Retention + Referral | Add basic view counting on `/@user/project` routes                                | High   |
| Cancellation reason survey               | Revenue              | UI flow on subscription cancel with reason selection                              | High   |
| Upgrade trigger analysis                 | Revenue              | Track paywall hits (403 on premium features) and correlate with upgrades          | High   |
| "Struggling user" detection              | Retention            | Flag users with 3+ consecutive sync failures, optionally trigger support outreach | High   |

---

## Summary of Remaining Gaps by Severity

### Critical

1. **No activation funnel dashboard.** Events now exist (`sign_up` → `token_created` → `site_created` → `files_synced`) but no PostHog funnel connects them yet.
2. **No published site traffic data.** We can't prove value to publishers or measure organic referral.

### Important (have data, need dashboards)

3. **No retention cohorts.** We have sync timestamps but no week-over-week analysis.
4. **No churn reason capture.** We now know _when_ (`subscription_canceled` event) but not _why_.
5. **No MRR dashboard.** Revenue data exists in Stripe and DB but isn't surfaced as a trend.
6. **No time-to-first-publish metric.** Data exists, needs a computed PostHog insight.
7. **No UTM discipline.** Outbound links lack UTM parameters for channel attribution.

### Nice to have

8. Upgrade trigger correlation (paywall hit → checkout)
9. Struggling user detection and alerting
10. Cancellation reason survey UI
