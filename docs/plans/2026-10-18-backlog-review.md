# Backlog review and what's next (October 2026)

> **Tracking bead:** `flowershow-ame`. Its comments are the running log of everything done from this plan. This doc is a dated snapshot: status lives in beads, not here.

**Scope:** a full review on 2026-10-17/18 of all non-closed beads (63), every open issue in flowershow/flowershow (121) and flowershow/product (46), wayofmarkdown (17), the satellite repos, all 10 open PRs on flowershow/flowershow, and the git and changelog history since 2026-07-01. Five review agents ran in parallel, each read-only. The approved cleanup and the first-week fixes ran after that.

## Summary

- **The AI-publishing build shipped; the launch didn't.** Within days of the 2026-09-30 handoff we shipped `/publish-with-ai`, anonymous publish with claim links (`fl` 2.5), the Claude/ChatGPT connector beta (`/api/mcp`, 2026-10-03), annotations and social cards. Distribution never started: abuse controls, agent directory listings and funnel tracking. Work drifted back to site-builder features (listings, magazine view, navbar/footer).
- **We can't measure the new path.** The daily analytics job stopped on 2026-10-03, and nothing tracks anonymous site → claim → signup → Premium. Paid sites: 22 (1 Jul) → 34 (3 Oct), about one a week.
- **Live breakage that had no tracking:** #1468 (default theme stylesheet hung pages, and with them #1467 page scripts), the GitHub non-main-branch sync bug (empty sites since about 2026-06-21), and redirects 404ing on `*.flowershow.me`.
- **Each themed week leaves a tail.** Week 40 created 65 beads. Follow-ups don't get closed, and about 45 beads had no epic.
- **The trackers had drifted.** `.beads/` has been gitignored since 2026-06-22, so Rufus and Ola each have a separate database, while `AGENTS.md` says GitHub Issues is the tracker.
- **Security debt:** on 2026-10-18 GitHub reports 168 Dependabot alerts on main (9 critical, 68 high).

## Plan

### 1. Fix live breakage (this week)

| Item | Status |
|---|---|
| #1468 default theme stylesheet hangs pages (`b52`) | ✅ #1471 merged 2026-10-18 |
| #1467 page scripts on root: root cause was #1468 (`ngt`) | ✅ tests in #1470 merged |
| 2yn: install.sh used `releases/latest` | ✅ #1469 merged; release workflow re-marks the CLI release as Latest |
| akk: rotate `NPM_TOKEN` | ⏳ unblocked by #1469; **human** (Rufus/Ola): rotate the secret, re-run Release, check `gh release list` |
| 7bv: config.json redirects 404 on subdomains | ✅ #1472 merged |
| GitHub sync R2-prefix fix (Ola, 2026-10-15) | Deployed 2026-10-15, but files unchanged since then stay broken: sync skips files whose hash matches. Needs a repair or force-resync plus a cleanup of stray objects → `flowershow-9ac` (P1, suggested owner Ola) |
| Open PRs | Dependabot merges/rebases and #1456 handled by an agent; #1357 and #1380 need work |
| Dependabot alerts (9 critical) | ⏳ triage → new bead |
| skills repo `SKILL.md` still uses `releases/latest` | ⏳ small follow-up |
| Changelog: one "fixes" entry for this week (theme hang, redirects, GitHub sync) | ⏳ |

### 2. Decide the launch (Rufus)

Hold the positioning and Product Hunt session (`l0z`) and un-defer the launch epic `dn5` with a date. Proposed must-ships:

- Abuse controls for anonymous sites (`ctv`). Submit the user-content domain to the Public Suffix List now, since review is slow.
- Rufus's connector test session (`h4a`), which also closes `5fv`, `z4f` and `z4f.4`.
- First-publish reliability: silent page drops (`hi1`), the 404 or false "Already in sync" right after publish (`w5n`, `88b`), under epic `5cr`.
- Fix the analytics job and track the anonymous → claim → signup → Premium funnel.
- Agent directory listings (`k8j`) and skills PR #11, under epic `5qz`.
- Put the AI story on the home page and pricing page. The home page still leads with "Publish Markdown as a Website".

Headline after launch: connector sign-in (`3fr`), which lets chats update claimed sites and opens the path to Premium.

### 3. Annotations go/kill by about 2026-11-02

The dogfood window (`1pr.3`) ends between 2026-10-19 and 2026-11-02. Decide before spending time on `1pr.4/.5/.8`. The changelog already presents the feature as finished.

### 4. Pause new site-builder features

Fill gaps with cheap community asks, mostly from Obsidian users who've had no reply. They're collected in epic `a3j`:

- `1z3` (#1042): sign-in with Google then GitHub on the same email.
- `itv` (#1329): GitHub org members can't publish.
- `0ea` (#932): custom 404 page.
- `e46` (#1033): last-updated date.
- `8qy` (#937): hide the navbar logo.
- `0ar` (#1004): hydration error when an image is followed by text.
- `97p` (#1198): grainy Bases thumbnails.
- `zno` (#1189): grouped sidebar.

### 5. Teams and organisations (dedicated session)

Epic `flowershow-dbg`. Today every site has exactly one owner, with about 56 inline owner checks and per-site Stripe billing. We found no explicit external demand in GitHub; Discord, support email and Stripe aren't checked yet. The options are site collaborators (M), organisations with seats (L, the only clear new revenue line), mapping GitHub orgs to editors (M–L, GitHub-published sites only), or deferring. These first steps make sense whatever we choose:

- fix #1329
- remove the false "Team collaboration" claim from the Premium plan's feature list in `lib/stripe-plans.ts`
- pull the owner checks into one helper

### 6. Tracker pattern (decided 2026-10-18)

- **Beads is the team's work tracker:** planning, breaking work down, and tracking during and across sessions, for Rufus, Ola and agents.
- **GitHub Issues is the public front door:** user reports, and things outside people follow. A triaged issue that becomes work gets a bead with `external_ref gh-N`, the fix PR says `Fixes #N`, and the bead is closed too. Internal work only needs a bead.
- **`docs/plans/`** holds dated planning, design and research docs like this one. Beads link to them.
- **Sharing:** `bd sync` with a Dolt remote, hosted in a separate private GitHub repo (e.g. `flowershow/beads`) over `git+ssh`. That keeps everything in git with no DoltHub or R2 account, and keeps tracker changes out of code PRs.
  - Tested: Dolt pushes to `refs/dolt/data` and adds a `__dolt_remote_info__` branch. That branch is why bd warns against using the code repo itself as the remote.
  - A committed `issues.jsonl` snapshot in the beads repo is a cheap plain-text backup against Dolt corruption.
  - The repo could also hold beads for other flowershow repos.
- Next: Ola has been asked why `.beads/` was removed in June. Then merge the two databases and rewrite `AGENTS.md` and `docs/agents/issue-tracker.md` → `flowershow-clx`.

## Cleanup done (2026-10-18)

| Where | What |
|---|---|
| flowershow issues | 29 closed (fixed, obsolete or duplicate), each with an evidence comment |
| product issues | 27 closed; #82, #107, #108, #39 moved to beads (`bp8`, `zcs`, `9w3`, `dlx`); #109 checklist refreshed |
| wayofmarkdown / florist | 9 + 1 closed |
| Beads closed | 8f8, ep3, ale, 1o5, 1pr.7, 61h, jfk; then b52, ngt, 2yn, 7bv after their fixes. 5fv, z4f, z4f.4 wait on `h4a` |
| Beads created | 9 from GitHub issues, 4 from product, 3 split out of catch-all beads (`nds`, `wkc`, `uj4`), plus `9ac`, `dbg`, `clx` |
| Epics created | `5cr` Publish reliability, `w1y` Anonymous publish & connector hardening, `d8v` Social cards & images, `9ag` Listings & blog follow-ups, `5qz` AI discoverability, `a3j` Community quick wins |

The issue lists and close comments are in the comments on `flowershow-ame`.

## Human-only items

- **Rufus:**
  - `l0z` launch session
  - `h4a` connector test
  - rotate `NPM_TOKEN` (akk)
  - annotations go/kill
  - `2cg`: delete the stray R2 bucket in the non-Datopian account
- **Ola:**
  - `9ac` sync repair
  - reply on beads sharing (`clx`)
- **Both:** the teams/orgs session (`dbg`)
