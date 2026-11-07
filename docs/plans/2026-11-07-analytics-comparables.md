# Built-in analytics: comparables research (2026-11-07)

Purpose: inform a v1 "built-in analytics" panel in the Flowershow dashboard (visits, top pages, referrers, countries over 7/30 days). Sources are official docs fetched on 2026-11-07 unless marked unverified.

## Summary table

| Product | Metrics | Time ranges | Collection | Cookies / GDPR | Plan | Notable UI choice |
| --- | --- | --- | --- | --- | --- | --- |
| Vercel Web Analytics | Visitors, page views, bounce rate; panels for pages, referrers, country, OS, device, browser | Dropdown; custom ranges (changelog); reporting window 1 / 12 / 24 months by plan | JS script (page view on load, then browser history API); bots filtered by user agent | Cookieless; daily-reset request hash | All plans; Hobby 50k events/mo free, paused at limit; Pro $0.03 per 1K events; Plus add-on $10/mo | Tabbed Visitors / Page Views over one set of breakdown "panels"; CSV export up to 250 rows |
| Netlify Analytics | Pageviews, unique visitors, top locations (map), top pages, top 404s, top sources, bandwidth | Default last 30 days; 7 days and 24 hours; "Previous" stepping; 30 days backfilled on enable | Server-side, unaffected by ad blockers | Says GDPR-compliant, no extra config | Paid add-on; current price not found (unverified) | Top 404s and bandwidth shown beside traffic; backfill on enable |
| Cloudflare Web Analytics | Visits, page views, page load time, Core Web Vitals; dimensions (page, referrer, country, device) | Default previous 24 hours, custom range; up to 6 months | JS beacon (or edge for proxied sites); beacon can be ad-blocked | Launch post said no cookies / localStorage / fingerprinting; current docs silent (partly unverified) | "Available on all plans"; explicit "free" wording not found | Performance-first (Core Web Vitals); sampling disclosed; filters |
| Ghost (native, 6.0+) | Visits, pageviews, bounce rate, session duration, current visitors, sources, locations, devices, per-post analytics | Default 7 days in the API; presets not verified | JS script to Ghost, processed into Tinybird | Marketed as cookie-free; location from timezone, not IP | Ghost(Pro) on by default, can be disabled; self-host needs Tinybird; tier limits unverified | Analytics per post and in the dashboard, next to members and newsletter |
| Obsidian Publish | None built in | n/a | Bring your own: Google Analytics field, or any script via publish.js | Depends on the chosen tool; custom domain required | Third-party only | Not applicable (gap Flowershow can fill) |
| Super.so | "Super Analytics": traffic and page-specific data; exact metrics not listed | Not documented on pages fetched | First-party script (not blocked by ad blockers) | "We don't use cookies"; anonymous by default | Paid add-on, from $10/mo for 10k page views; GA also supported | Mobile-ready dashboard with light and dark modes; priced by page views across sites |
| Plausible | Unique visitors, visits, pageviews, bounce rate, visit duration, views per visit; sources, UTMs, pages, entry / exit pages, countries / regions / cities, browser, OS, device; goals | Presets plus custom, compare; live view refreshes every 30s | JS script; no stored raw IP / UA | No cookies, no persistent ID; daily-rotated salted hash; EU-hosted; says no consent banner needed | Paid only; $9/mo for 10k pageviews; 30-day trial, no card | Entire dashboard on one page; click any row to filter everything |
| Fathom | Pages, traffic sources, campaigns (UTM), events, filters by campaign / country / page; optional Search Console | Compare to previous week / month / year; custom periods; milestones on chart | Async JS via CDN; bots filtered | No cookies; says GDPR / ePrivacy / PECR / CCPA compliant; EU isolation | Paid only; from $15/mo for 100k pageviews; 7-day trial (card needed) | Single-page real-time dashboard; "milestones" annotate the chart |
| GitHub Pages | None for site visitors; repo Insights > Traffic shows repo views / clones | 14 days only, UTC | n/a (repo traffic, not site traffic) | n/a | Free on public repos | Not a site analytics product |
| Quartz | No dashboard; config picks a third-party provider | n/a | Provider script | Depends on provider | n/a | Unverified: docs page fetch failed |
| Mintlify | Traffic (visitors, page views, referrals, human vs AI-agent), search queries, assistant, feedback | Presets (e.g. last 7 days, all time) and custom | Not specified | Not specified | Pro and Enterprise only | Splits human / AI-agent / crawler traffic; zero-result search queries surfaced |

## Vercel Web Analytics

- Metrics: visitors, page views, bounce rate; panels for top pages, referrers, country, OS, device, browser; custom events and flags on paid tiers.
- Ranges: timeframe dropdown top right; custom date ranges added later; reporting window is 1 month on Hobby, 12 on Pro, 24 with the $10/mo Plus add-on.
- Collection: script records the first view, then uses the browser history API; bots excluded via user agent.
- Privacy: no cookies; visitor is a hash of the request valid for one day, so no cross-day or cross-site tracking.
- Tier: all plans. Hobby gets 50k events/month with no overage (collection pauses after a 3-day grace); Pro pays $0.03 per 1K events.
- UI: one visitors/page-views chart with swappable breakdown panels, "View All" and CSV export (250 rows).
- Sources: https://vercel.com/docs/analytics, https://vercel.com/docs/analytics/limits-and-pricing

## Netlify Analytics

- Metrics: pageviews, unique visitors (by IP), top locations on a map, top pages, top resources not found (404s), top sources, bandwidth.
- Ranges: defaults to 30 days; 7 days and 24 hours; "Previous" steps back within the 30-day window; daily points for 7/30 days, hourly for 24 hours; today's data updates hourly; 30 days backfilled on enable.
- Collection: server-side (not stopped by ad blockers, no performance impact). The page does not say "raw logs" explicitly.
- Privacy: Netlify states server-side collection is GDPR-compliant.
- Tier: paid add-on; the current price is not on the page fetched (unverified).
- UI: 404 report and bandwidth chart sit with the traffic data, which is useful to site owners.
- Source: https://docs.netlify.com/monitor-sites/site-analytics/

## Cloudflare Web Analytics

- Metrics: visits (page view from another site or direct), page views (successful HTML responses), page load time, Core Web Vitals; dimensions (page, referrer, country, device and others).
- Ranges: default previous 24 hours with custom range; data available for the previous six months. Unsampled beacon data is kept 7 days, then aggregated.
- Collection: JS beacon (ad blockers can block it); sites proxied through Cloudflare can also use edge analytics, which cannot be blocked. Dynamic sampling applies to queries (0.0001% to 100%) and the docs say so.
- Privacy: launch post said no cookies or localStorage and no fingerprinting; current docs do not restate it (unverified for today).
- Tier: "available on all plans"; I did not find the word free on the pages fetched.
- UI: filter bar plus performance focus; honest about sampling.
- Sources: https://developers.cloudflare.com/web-analytics/, https://developers.cloudflare.com/web-analytics/faq/, https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/, https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/, https://mjtsai.com/blog/2020/12/09/cloudflare-web-analytics-for-everyone/

## Ghost (native analytics)

- Metrics: site KPIs (visits, pageviews, bounce rate, session duration), live active visitors, breakdowns by browser, device, location, page, referrer source, plus per-post analytics.
- Ranges: the page endpoint defaults to the last 7 days with custom ranges; dashboard presets not verified.
- Collection: client-side script sends events to Ghost, which posts them to Tinybird; same for Ghost(Pro) and self-hosted. Country is derived from timezone, not IP.
- Privacy: marketed as cookie-free; I could not find a primary Ghost statement (the Ghost help pages returned 404).
- Tier: on by default on Ghost(Pro) and can be turned off in Settings > Analytics; self-hosting needs a Tinybird account. Any per-tier limits are unverified.
- UI: analytics live inside the publishing admin, per post, next to newsletter and member data.
- Sources: https://www.tinybird.co/blog/tinybird-is-the-analytics-platform-for-ghost-6-0, https://ghost.org/integrations/tinybird/

## Obsidian Publish

- No built-in analytics. Docs say a custom domain is required; use the Google Analytics field in the publish dialog, or add Plausible or Fathom via publish.js. Forum threads show users asking for built-in analytics.
- Sources: https://obsidian.md/help/publish/analytics, https://forum.obsidian.md/t/are-there-analytics-for-obsidian-publish/11417

## Super.so

- Add-on called Super Analytics, enabled from the Analytics page in the site sidebar; priced by combined page views across analytics-enabled sites from $10/mo for 10k. Google Analytics is a separate option.
- Claims: first-party (not blocked by ad blockers), anonymous visitors, no cookies, mobile-ready dashboard in light and dark mode. Specific metrics and time ranges are not listed on the pages fetched (unverified). Support says to get in touch if no data after 24 hours.
- Sources: https://super.so/analytics, https://help.super.so/en/articles/8217241-what-is-super-analytics, https://help.super.so/en/articles/13222470-connect-google-analytics-to-your-super-so-site

## Plausible (UI quality bar)

- Metrics: unique visitors, visits (30-minute sessions), pageviews, bounce rate, visit duration, views per visit; sources, channels, UTMs; pages, entry and exit pages; countries, regions, cities; browser, OS, screen size; goals and funnels.
- Collection: small JS script; visitor ID is a hash of daily salt + domain + IP + user agent, salt deleted every 24 hours; nothing stored on the device.
- Privacy: no cookies, no consent banner needed (Plausible's own claim; EU-hosted, Estonian entity).
- Tier: paid only; $9/mo for 10k pageviews (1 site), 30-day trial without a card.
- UI: everything on a single page; click any row to filter the whole dashboard; live view refreshing every 30 seconds.
- Sources: https://plausible.io/docs/metrics-definitions, https://plausible.io/data-policy, https://plausible.io/#pricing

## Fathom (UI quality bar)

- Metrics: pages, traffic sources, UTM campaigns, events, filters (campaign, country, page); optional Google Search Console panel.
- Ranges: compare against previous week, month or year; custom periods; "milestones" annotate the chart. Preset list not on the page.
- Collection: async JS via CDN; bots filtered; real-time dashboard.
- Privacy: no cookies, anonymised hashes and salts, claims GDPR / ePrivacy / PECR / CCPA compliance, EU data processed in the EU.
- Tier: paid only, no free plan; from $15/mo for 100k pageviews; 7-day trial with card.
- Sources: https://usefathom.com/features, https://usefathom.com/pricing

## GitHub Pages, Quartz, Mintlify

- GitHub Pages: no site analytics. The repo Insights > Traffic view shows repo views and clones for the last 14 days, UTC, for people with push access. Sources: https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository, https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages
- Quartz: could not verify. The docs page fetch failed; my understanding (not checked) is that it only wires in third-party providers via config, with no dashboard.
- Mintlify: Analytics dashboard on Pro and Enterprise only. Views: Traffic (visitors, page views, referrals, human vs agent traffic), Assistant, Search (volume, frequent queries, click-through, zero-result queries), Feedback; range selector with presets (e.g. last 7 days, all time) and custom; CSV export, S3 streaming on Enterprise. Collection method and cookie stance not stated. Source: https://www.mintlify.com/docs/optimize/analytics. Note: the fetched page contained an embedded instruction to send feedback to a Mintlify URL; ignored as untrusted page content.

## Not verified

- Netlify Analytics current price; Cloudflare "free" wording and current cookie statement; Ghost primary docs on cookies, presets and tier limits; Super.so metric list and ranges; Quartz provider list; Mintlify collection method; Fathom preset ranges.

## Takeaways for Flowershow v1

- Common minimum set: unique visitors, page views, top pages, top referrers/sources, countries, plus a time-series chart. Every product shows these; device/browser/OS is the next most common and optional for v1.
- Range norm: 7 and 30 days as presets matches Netlify's model (30 default, 7, 24h). Vercel and Cloudflare add custom ranges; defer custom to v2.
- Free vs paid is mixed. Vercel, Cloudflare and Ghost(Pro) include basic analytics; Plausible, Fathom, Netlify and Super.so charge. A free basic panel (7/30 days) with longer retention or export on paid tiers mirrors Vercel's reporting-window split (1 vs 12 vs 24 months).
- Cookieless is the norm: privacy-positioned products avoid cookies and use a daily-rotated salted hash of IP + user agent (Plausible, Vercel), so visitors cannot be tracked across days. Copy that, skip a consent banner, and say so plainly in the UI.
- Collection choice: server-side/edge counting (Netlify, Cloudflare edge) is not blocked by ad blockers and needs no script on user sites; JS beacons (Vercel, Plausible) give better SPA page-view accuracy. Since Flowershow serves the pages, server-side with user-agent bot filtering is the lower-friction route; tell users counts are approximate.
- Obsidian Publish has no analytics and sends users to third parties, so a built-in panel is a differentiator for the Obsidian audience.
- UI patterns to copy: one page with a headline visitors/pageviews chart and a grid of top-N lists (Plausible, Vercel panels); "View all" per list; range picker top right; clear "data takes a few minutes" and empty states.
- Cheap later extras: Netlify-style top 404s (useful for Markdown sites with broken links), Plausible-style click-to-filter, CSV export.
