# What to ship next (2026-10-24)

**Scope:** open beads in both DBs (`flowershow-*`, 213; `flwrprd-*` launch DB, 43), open issues/PRs in flowershow/flowershow and flowershow/product, git log since 10-15, and the AI-age launch docs in `product/marketing/`. Builds on [2026-10-18-backlog-review](2026-10-18-backlog-review.md). Status lives in beads; this is a snapshot.

## Situation

- **Shipped since 10-18:** MCP OAuth 1–4 (#1483–#1486), per-caller anon limits (#1488), anon HTML sandbox + abuse report (#1480), frontmatter no longer drops pages (#1476), account linking (#1477), annotations stream A (#1478/#1479), owner sign-in on site pages (#1481), CLI claim/`--json` (#1496–#1499), page actions + llms.txt (#1497), `/support`, `/home-next` (#1492), skills PR #12.
- **Launch:** repositioning ("Publishing for the AI age"), go/no-go Thu 11-12, launch Tue 11-17. Behind on week-1 gates due Tue 10-27: OAuth client test, directory/Registry/PSL submissions, skill file-list confirmation. The hardest blocker, connector site-wipe (`flwrprd-4oi.3`, P0, unassigned), has no fix and no main-DB bead — `apps/flowershow/lib/mcp/server.ts` still says "files left out are removed".
- **Constraint:** Ola's capacity (~8 gate items at ~3 days/week). Cut order (pitch comparison §6): shelves beyond skills.sh, then the Obsidian section build. Never cut: partial publish, OAuth test, funnel, skill confirmation.

## Top 5

1. **Partial publish (`flwrprd-4oi.3`, P0).** An AI that sends a subset of files wipes the rest of the site; without this the connector can't be the hero demo. M, land by 11-03.
2. **OAuth/connector client test (`3fr.5` + `h4a` + `z4f.4`), one session.** S, due 10-27. Unblocks `3fr.6`, `flwrprd-4oi.10`, `k8j.5/6`, the Registry account entry; lets `5fv`, `z4f` close.
3. **First-publish bugs `w5n` + `88b`.** The demo moment (`flwrprd-4oi.15`). Raise to P1, assign, add AC. M, likely one root cause (async Blob update).
4. **Funnel + `ai`/`host_app` flags + UTMs.** No bead anywhere; without it the success targets (`flwrprd-4oi.14`) and 12-18 review can't judge the launch. M, by 11-03.
5. **Directory shelves this week:** `k8j.2` Registry (DNS TXT), publish privacy policy (`k8j.4`), `k8j.3`, PSL `w1y.1`. Each S; review lead time is the cost.

## Now (before go/no-go 11-12)

| # | Item | Why now | Size | Owner | Blocked by |
|---|---|---|---|---|---|
| 1 | Partial publish `flwrprd-4oi.3` (needs main-DB bead) | Hardest launch blocker; decides connector in hero | M | Ola (unassigned) | — |
| 2 | Client test `3fr.5` + `h4a` + `z4f.4` | Week-1 gate; unblocks 5 beads | S | Rufus + Ola + agent | — |
| 3 | `w5n` + `88b` first-publish 404 / "Already in sync" | Demo path | M | Ola | — |
| 4 | Funnel + flags + UTMs (no bead) | Must-have gate | M | Ola + agent | — |
| 5 | `k8j.2`, `k8j.4` (privacy + 512px icon + `destructiveHint`), `k8j.3` | Approval lead time | S each | Rufus + agent | — |
| 6 | PSL `w1y.1` | Weeks of review | S | Rufus | — |
| 7 | Skill shows file list + asks before publish; wiki-link title leak check (no beads) | "Publish control" gate, never-cut | S | agent + Ola | — |
| 8 | `3fr.6` docs/changelog/drop beta + `flwrprd-4oi.10` retitle | Front door; ChatGPT directory prereq | S | agent | `3fr.5` |
| 9 | `flwrprd-4oi.11` homepage review → `flwrprd-4oi.9` swap | Launch page is the homepage | S | Rufus by 10-29, then Ola | — |
| 10 | `k8j.5` Claude connectors, `k8j.6` ChatGPT apps | Approval lead time | S | agent + Ola | `k8j.4`, `3fr.5` |
| 11 | Load test at 10× March peak (no bead) | Launch-load gate | S–M | Ola | — |
| 12 | Ops: `akk` NPM_TOKEN, `5cr.1` worker deploy check, `8r9` magic link | Release workflow red on every push since 10-05 | S | Ola / Rufus | human |
| 13 | `9ac` GitHub-sync repair | ~4 months broken; base email goes to these users 11-16 | M | Ola | — |
| 14 | Pricing-page AI line (no bead) | Front-door gate | S | Rufus copy, agent | — |

## Next (post-launch, 2–4 weeks)

| # | Item | Why | Size | Owner | Blocked by |
|---|---|---|---|---|---|
| 1 | Obsidian: #1254 folder note as index, #1301 surface sync failures | Promised in base email | M each | Ola | — |
| 2 | #1394 custom domain + upgrade from CLI/chat | Anon/connector → paid path | M–L | Ola | `3fr` |
| 3 | `bp8` publish limits, `gsb` server size limit, `cze` | Post-launch anon/MCP traffic | M | Ola | design |
| 4 | `1gh` Dependabot (88 open, 11 critical); `1gh.3` = PR #1380 | Security debt growing | M | agent | — |
| 5 | Registry account entry, `k8j.7` Cursor/Codex | Deferred shelves | S | agent | `3fr.5`, `k8j.4` |
| 6 | `zcs` SEO task pages | Follow-through | S–M | agent | — |
| 7 | #1427 inline SVG `<animate>` blanks page | Hits AI-made HTML | S | agent | — |
| 8 | `a3j` quick wins: `itv`, `0ar`, `97p`, `0ea`, `e46` | Cheap, unanswered users | S each | agent | — |
| 9 | `e8z`, `wsy`, `1bg`; #1361, #1286, #1206 | AI HTML / big-repo rough edges | S–M | agent / Ola | — |
| 10 | Annotations stream B: `1pr.11`, `1pr.4` | Annotations is GO | M | — | job stories |
| 11 | Pricing (product#76) | Decide at 12-18 review | — | Rufus + Ola | launch data |

## Close / park

- **Close after the `h4a` session:** `5fv`, `z4f` (scope shipped).
- **Close or merge:** `l0z` (positioning done, `flwrprd-4oi.2/.8`) and `dn5` (superseded by `flwrprd-4oi`).
- **Re-scope:** `32c` to post-launch channels.
- **Trim:** `5qz` to directories + SEO (llms.txt shipped).
- **Park:** `ja8`, `eiz`, `dlx`, `49f`, `dbg`, `1pr.5`, `1pr.6`, `a6e`, `7z0`, `lb3`, `flwrprd-9gf.7.*`, `9gf.10`, `9gf.11`, `9gf.14`, `flwrprd-abk`.
- **GH closes:** #1503 (promo), #1460 (with `akk`), #1489 (or P4 bead), stale #1369, #1367, #1183, #1184, #1180, #854.

## Hygiene

- **Overlaps between the two DBs:** `flwrprd-4oi.5`↔`k8j`, `flwrprd-4oi`/`.4`↔`dn5`/`l0z`, `flwrprd-4oi.10`↔`3fr.6`, `flwrprd-4oi.15`↔`w5n`/`88b`, `flwrprd-9gf.9`↔`i11`. Resolve by merging the DBs (`clx`).
- **Gates with no bead:** funnel/UTMs, load test, skill file-list confirmation, wiki-link leak check, pricing AI line.
- **Priorities:** raise `w5n`, `88b`, `k8j.*` to P1; assign `flwrprd-4oi.3`.
- **Missing AC:** all open `flwrprd-*` (start with `4oi.3`, `4oi.15`, `4oi.14`); `w5n`, `88b`, `h4a`, `9ac`.
- **GH issues needing beads:** #1427, #1254, #1301, #1394, #1361, #1286, #1206, #1293, #1148.

## Human-only

- **Rufus:**
  - `3fr.5`/`h4a` session by 10-27.
  - DNS TXT for `k8j.2` and `w1y.1`.
  - Approve the privacy policy draft.
  - Homepage review by 10-29.
  - Success targets by 11-10.
  - Blog post + quote by 11-11.
  - Proof: a clip, 5+ outside sites, 1–3 quotes.
  - Sign off the `1gh.7` dismissals.
- **Ola:**
  - Confirm capacity 10-27 → 11-10, else apply the cut order.
  - Own `4oi.3`, `w5n`/`88b`, funnel, load test, `9ac`.
  - Rotate `akk`; check `5cr.1`.
  - Reply on `clx`.
- **Both:** go/no-go 11-12. Keep the date. If partial publish or OAuth isn't green, demote the connector to "try it". Directory listings don't gate launch.
