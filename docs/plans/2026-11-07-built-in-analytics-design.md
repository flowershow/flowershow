---
title: Built-in analytics in the dashboard (v1) — design
date: 2026-11-09
status: draft (awaiting Rufus's OK)
bead: flowershow-9bu
github: "#1202"
---

# Built-in analytics in the dashboard (v1)

## The job

> When I've published something, I want to know whether anyone is reading it, and which pages, so I know it's worth carrying on.

The owner has no interest in analytics as such. They want a quick answer, from time to time, with no setup. The bar is Substack's stats: a total you see without looking for it, and a list of your posts with a number next to each one. Rufus's brief: "we want simple. how many people and how many per page."

Other hosts for comparison: [2026-11-07-analytics-comparables.md](2026-11-07-analytics-comparables.md).

## What the owner sees

**1. My sites.** Each site card gains one line. No clicks needed to find out whether anyone came.

```
┌───────────────────────────────────┐
│ Rufus's notes                     │
│ 412 people in the last 30 days    │
│                                   │
│ rufus.flowershow.me ↗             │
└───────────────────────────────────┘
```

**2. Site → Analytics** (a new tab beside Settings, History, Annotations). One page, no sub-tabs, no filters.

```
Analytics                    [ 7 days | 30 days ]

412 people       1,380 views

▁▂▃▅▃▂▆▅▃▂▃▄▂▁▂▅▇▅▃▂▃▄▂▃▂▁▃▄▅▃     (views per day)

Page                               People   Views
Why I use markdown                    180     260
Home                                  150     410
Notes on publishing                    64      91
…
                                     Show all pages

Readers came from
google.com 96 · x.com 41 · news.ycombinator.com 18

Counted without cookies since 12 Nov. Includes your own visits.
Updated 6 minutes ago.
```

- **People** and **Views** are the only two numbers, and those words are used everywhere. A tooltip on People says "An estimate based on device and browser, not a head count."
- **30 days is the default**, as on Substack's home. Small sites look empty over 7.
- **Pages show their title**, not their URL, because that's how the owner thinks of them. Each row opens the page. A path we can't match to a current page (deleted, renamed, a 404) shows as plain text with no link. Sorted by people, top 20, then "Show all pages". On a phone the table keeps all three columns and the title truncates.
- **"Came from" is one line**, top 5 linking sites only. Direct visits aren't shown, because Umami doesn't report them as a referrer. Hidden if there are none.
- **The card's number links straight to Analytics.** The rest of the card still goes to Settings.
- **Nothing else on the page.** No bounce rate, sessions, devices or countries.

**Moments that need their own wording:**

| When | The owner sees |
|---|---|
| New site, or no visits yet | "No readers yet. Counting started on 12 Nov. Numbers update every 10 minutes." and the site link with a copy button. On the card: "No readers yet". |
| Some history, partial range | Chart starts at the first counted day: the later of the launch date (a constant) and the site's creation date. "Counting since" in the footer uses the same date. We never show a run of zeros that looks like nobody came. |
| Every page on the site is raw HTML | "This site's pages are raw HTML, which we can't count yet." and no numbers. On the card, nothing. |
| Some pages are raw HTML | One line: "Pages published as raw HTML aren't counted." |
| Password-protected site | "Password-protected sites aren't counted." We don't send private page titles to a third party. On the card, nothing. |
| Numbers unavailable | "Numbers aren't available right now." on the tab; the card line simply disappears. Nothing else on the page or card breaks. |

A temporary site that gets claimed keeps its numbers, because the site ID doesn't change.

**No setup and no off switch in v1.** It's on for every site, for free. An owner who already runs GA or Umami keeps counting in their own account.

## What's cut from v1

Countries; a small trend line on the card; comparison with the previous period; custom ranges; real-time; a page drill-down; devices; CSV export; an API or MCP tool; excluding the owner's own visits (the footer says they're included); counting raw `.html` pages (the main use of temporary sites, so a likely follow-up); password-protected sites.

Separately beaded: showing "123 views" publicly on each page, opt-in (`flowershow-9bu.2`). Likes are a different feature and aren't in this work.

**Anti-goals:** anything that makes an owner add a script, key or config line; analytics cookies on readers' browsers; showing an owner another site's traffic; claiming legal compliance we haven't checked. We say what we do ("no cookies"), not "GDPR-compliant, no banner needed".

## How it works

### One Flowershow-wide Umami

Rufus's decision: readers' traffic comes from Umami, and PostHog is only for Flowershow's own product analytics. Neither a Flowershow-wide Umami nor a shared GA key exists in the code today (only the per-site `umami` and `analytics` config options), so this is new setup.

- **Consequence: no history.** Numbers start the day this goes live, which is why "Counting since" matters in the UI.
- **Account:** one Umami Cloud account, EU region, **Pro plan or above**. The free Hobby plan has no API access. Pro is $20/month for 1M events, 2-year retention and up to 20 websites; each extra million costs $30. Business is $200/month for 10M, so it becomes the cheaper option from about 7M events a month. A pageview is one event, and collection doesn't stop at the limit: overage is billed. We don't yet know our monthly pageviews, so Ola checks that first (`flowershow-9bu.1`). If the bill gets silly, self-hosting Umami uses the same script and API.
- **One Umami website for all sites**, because per-site websites are capped at 20 on Pro. Each page's script carries `data-tag="{site.id}"`, and every query filters by that tag. The site ID is stable across renames, custom-domain changes and claiming, so an owner can't inherit another site's numbers through a reused domain.
- **Script on every published site except password-protected ones**, including temporary sites and flowershow.app, added in the site layout after today's per-site Umami tag: `data-website-id`, `data-tag`, `data-exclude-search="true"`, `data-exclude-hash="true"`. Umami receives the path and the page title, no query strings. Our script comes after an owner's own Umami so that `window.umami` stays theirs and their custom events keep going to their account. Only rendered in production, so previews don't count.
- **Shared website, stated plainly:** Umami hashes the session from website, IP, user agent and a monthly salt, so within our one account a reader on two Flowershow sites has the same hashed ID for that month. Owners can't see it, and per-site counts aren't affected. Setting `data-distinct-id` per site would separate them, but it adds an extra tracked request on each page load with unknown billing, so v1 leaves it out. Don't claim readers can't be linked across sites.
- **Accuracy (accepted):** the script loads from `cloud.umami.is`, which ad blockers often block, so counts run low. Visitor hashes reset monthly, so a range crossing a month boundary can count one person twice. That's why the UI says "estimate". Proxying through our own domain is a follow-up if the undercount turns out to matter.

### PostHog off published sites

- **Claimed sites:** `PostHogProvider` and `SessionProvider` come out of the site layout's providers. `SessionProvider` is there only for PostHog's `identify`, and it causes next-auth cookies on readers' browsers.
- **Temporary (unclaimed) sites:** PostHog stays, because the banner's `anon_banner_*` events are Flowershow's own claim funnel, but with `persistence: 'memory'` and no `identify`. That sets no cookie, so nothing lands on `.flowershow.me` for claimed sites to receive. Both events happen within one page load, so the funnel still works.
- **flowershow.app and the dashboard:** unchanged.
- `buildPHBootstrapCookie` in `middleware.ts` runs only for the cloud, root and flowershow.app hosts. That removes `ph_bootstrap` and a PostHog round trip from every published page load.
- **Effect:** readers of published sites get no analytics cookies from Flowershow. The cost is that Flowershow no longer sees claimed sites' traffic or browser errors in PostHog. The privacy policy draft (`~/src/flowershow/product/legal/2026-10-22-privacy-policy-draft.md`) describes PostHog on published sites and needs updating before this ships.

### Reading the numbers

- `apps/flowershow/lib/site-analytics.ts`, calling `https://api.umami.is/v1/eu` with `UMAMI_API_KEY` (a server-only secret). The website ID and base URL are constants in code.
- Per site: `/stats` (people, views), `/pageviews` with `unit=day` (chart), `/metrics/expanded?type=path` (pages, which Umami returns sorted by people), `/metrics/expanded?type=referrer` (came from, which already leaves out direct visits and self-referrals), all with `tag={site.id}`. Page titles come from our `Blob` table by `appPath`, falling back to the path.
- Site cards: one `/metrics/expanded?type=tag` across all sites, paged with `limit` and `offset` (the default stops at 500 rows), mapped to site IDs, so a long site list doesn't need one call per card. Umami's source allows `type=tag`; Ola's curl confirms it on Cloud.
- Check `canManageSite` first, then read through `unstable_cache` for 10 minutes (following `lib/post/hosts.ts`), keyed by site and range. Ten minutes rather than an hour because an owner's first move is to open their link and come back to look. The API allows 50 calls per 15 seconds per key. Timeout 5 s; failures show the "unavailable" state and are logged.
- Server components only: no new API route, so no api-contract change.
- The chart is a small hand-rolled SVG.

### Security notes

- Only `canManageSite` users can see a site's numbers, checked in the shared layout and again before querying.
- The key is server-only and never logged. The site ID is the only thing added to public pages, and it isn't a secret.
- As with any browser-based analytics, the website ID is public, so someone could send fake events. That can skew a site's numbers and add to our bill. Accepted for v1; watch the Umami bill.

### Plans

On for all plans in v1. Recommendation to fs-plans (`flwrprd-ox8`): Premium extras later could be longer ranges, export and API access. Allowed ranges are one constant.

## Build and rollout

Nothing here starts until Rufus approves this design.

1. **Build against sample data:** the Analytics tab, the card line and all the states above. Needs nothing from Ola.
2. **Ola (`flowershow-9bu.1`):** check monthly pageviews, choose the plan, create the account and website, add the API key.
3. **Connect:** commit the website ID, turn on the script, remove PostHog from published sites, update the privacy policy. Docs page and changelog entry.
4. **Check on a throwaway `fl` preview site:** no analytics cookies in devtools; visits appear with the right tag; two test sites stay separate; a site with its own Umami counts in both accounts and keeps its custom events.

Step 2 blocks real numbers and step 3, not step 1.

## Testing

- Unit: mapping Umami responses to the page (titles, unmatched paths, zero-fill from the first counted day, paging) and the failure paths.
- Middleware: no `ph_bootstrap` on published-site hosts; unchanged on cloud and flowershow.app.
- Component: every state in the table above, from fixtures. Authz: a non-owner gets 404.

## Left to the builder

Exact copy beyond the mock, chart details, test layout, how titles are matched for edge-case paths.
