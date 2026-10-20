# Internal FAQ: Publish with AI

> Status: draft v2, 2026-10-20. For the team. [press-release.md](press-release.md) is written working backwards: it describes the launch as we want it on launch day, including parts that aren't built or tested yet. [What has to be true by launch day](#what-has-to-be-true-by-launch-day) lists every claim with its state today and the work left. Nothing goes out until each row is true or its claim is cut from the release.
>
> The press release is the canonical text for the second Product Hunt launch. The PH copy, social posts and launch blog post are cut from it, so change facts there first. `social-posts.md` still follows draft v1 and gets recut once v2 is agreed.
>
> This file is in a public repo, so keep internal metrics out; they're in the `flowershow/product` docs referenced below.

## Why now?

The AI apps now share single pages themselves, and the agent-native hosts that appeared in 2026 (here.now, Tiiny Host, HTML Pub) serve files. None of them turns a folder of Markdown into a site that the AI keeps updating at the same address, which is what Flowershow already does for people who publish from Obsidian and GitHub. The 2026 Product Hunt launches that did best in this space shipped a connector and named Claude or ChatGPT in the tagline. Our first launch, on 2026-03-25, used a Markdown tagline. Sources: `product/research/2026-10-ai-publishing-landscape.md` and `product/research/2026-10-here-now-teardown.md`.

## Who is it for?

People who make things in Claude or ChatGPT and want to share them at an address that lasts. The two jobs we lead with are an agent-maintained wiki and a site that grows, because both bring people back to publish again. Developers using coding agents and existing Obsidian and GitHub users are the secondary audience.

## What has to be true by launch day?

Checked 2026-10-20. Every row must read "True" before release, or its claim comes out of the press release.

| # | Claim in the release | Today | To do | Owner |
|---|---|---|---|---|
| 1 | Flowershow is in Claude's connector directory and ChatGPT's apps | Not listed in either. People add the connector by URL, and ChatGPT needs Developer mode for that | Submit both once row 2 passes. Both need OAuth (live) and a privacy policy (`/privacy` exists); ChatGPT also needs Apps SDK metadata and org verification. Review time is out of our hands, so submit early and set the launch date after approval | Agent drafts; submission unassigned (`k8j`) |
| 2 | Sign in with Google, GitHub or email from Claude and ChatGPT, creating a free account if needed | Built and live: `/api/mcp/account` answers 401 with OAuth discovery (#1483 to #1486). Not yet tried in claude.ai, Claude Desktop, Claude mobile or ChatGPT, including a first-time user signing up mid-flow | Manual test: connect, sign up, publish, update in a new chat, revoke, reconnect | Unassigned (`h4a`, `3fr.5`) |
| 3 | No "beta" anywhere | `docs/agents/mcp.md`, `publish-with-ai.md` and the docs sitemap still say beta and "can't sign in yet" | The drop-beta checklist in `docs/plans/2026-10-18-mcp-oauth-design.md`, after row 2 | Agent |
| 4 | In a later chat, the AI adds pages and leaves the rest of the site as it was | Missing. A signed-in AI can find the site (`list-sites`) and publish to it, but every publish replaces the whole site, so files it doesn't send are deleted, and no tool returns the files already there. Once sign-in is public this can wipe a site | Change `publish` to add and replace only the files sent, with explicit deletes, or add a tool that reads a site's files. Without one of these, cut the "Pick up where you left off" section | Ola or agent (new bead) |
| 5 | One page grows into a site with a blog, a theme and navigation, from the chat | Expected to work, because connector publishes go through the same sync and `config.json` is an ordinary file, but nobody has tried it through the connector. Until row 4 lands, the whole site must fit in one 50-file, 3 MB call | Publish a blog with a theme through the connector in claude.ai and ChatGPT | Agent |
| 6 | Coding agents install the skill with `npx skills add flowershow/skills` | True: the skill is on skills.sh. Its description is generic ("Help users publish and manage Flowershow sites") and doesn't list the phrases people type. The skills release PR (flowershow/skills#11) is open | Rewrite the description around "publish this", "put this online" and "turn this folder into a site"; merge #11. Optional: a Claude Code plugin and a Cursor listing | Agent (`5qz`) |
| 7 | A live link in seconds | Not measured | Time 10 publishes each from claude.ai, ChatGPT and Claude Code, first and repeat. Put the median in the PH first comment, or change the wording | Agent |
| 8 | Publish without an account, claim link, 7-day expiry, not indexed | True: `fl --anon` and `/api/mcp` (changelog `2026-09-30-publish-without-an-account`) | None | |
| 9 | HTML is published as written | True on owned sites. On unclaimed sites HTML runs sandboxed (#1480), which the FAQ explains | None | |
| 10 | Annotations: readers need no account; `fl annotations pull` | True (changelog `2026-10-05-annotations`) | None | |
| 11 | flowershow.app tells this story ("available today at flowershow.app") | `/publish-with-ai` is live. The home page title still reads "Publish Markdown as a Website", and the pricing page doesn't mention AI | Update the home page hero and the pricing page | Agent |
| 12 | Anonymous publishing holds up under launch traffic | Sandboxed HTML, abuse banner and report route (#1480) and per-caller MCP limits (#1488) are shipped. `flowershow.me` isn't on the Public Suffix List | Submit to the PSL now, since review is slow; finish `ctv` | PSL submission unassigned; agent (`ctv`) |
| 13 | A first publish works the first time | Open: silent page drops (`hi1`), and a 404 or a false "Already in sync" just after publishing (`w5n`, `88b`) | Fix under epic `5cr` | Ola |
| 14 | More than 2,300 sites | True: 2,376 permanent sites on 2026-10-18 (Neon, `"Site"` where `not is_temporary`) | Recount on launch day | Agent |
| 15 | Pricing and limits | True per `content/flowershow-app/pricing.md` and `docs/agents/mcp.md` | Recheck on launch day | Agent |
| 16 | Claude artifacts and ChatGPT Sites | Checked 2026-09-30 (`product/research/2026-10-ai-publishing-landscape.md` §1) | Recheck in launch week | Agent |
| 17 | Quotes | The founder quote is drafted, not said. No user quote | Get the founder quote approved or rewritten. Get 3 to 5 people to publish through the connector before launch and ask one of them for a quote | Unassigned |

## What are we leaving out?

- Custom domain and Premium upgrade from the chat (flowershow/flowershow#1394). Billing and DNS verification stay in the dashboard. This is the biggest candidate to add if we want the release to say "on your own domain, from the chat".
- Annotations in Claude and ChatGPT. Today only coding agents can pull and resolve notes.
- Per-site `llms.txt` (flowershow/flowershow#1315).
- An `npx` or `brew` install for `fl`. The skill installs it with `install.sh`.

## What's still undecided?

- The launch date. It depends on directory approval (row 1), so pick it after submitting.
- Which connector goes in the directories. This draft lists the signed-in one, because directory users then get permanent sites and can update them from any chat. Trying without an account stays available through coding agents and the no-account URL.
- Whether this launch leads with the AI path or with Markdown and Obsidian site builders, who bring the largest share of today's growth.
- Whether to pull custom domain and upgrade from the chat into this launch.

## How will we know it worked?

Count these weekly from launch, with targets set before launch: [[TBD: targets]].

- Connections: `mcp_oauth_grant_created`.
- Publishes by source, where `PublishSource.mcp` counts the connector.
- Temporary sites claimed: `anon_site_created` and `anon_claim_completed`.
- Signups from the launch week.
- Sites republished in weeks 2 to 4, because a site that grows is the retention story.

The events exist. The PostHog funnel that joins them doesn't yet.

## What could go wrong?

- Directory review takes longer than planned. Then we launch with the connector URL, reword row 1's claims and keep the date, or move the date.
- An AI wipes a site by publishing only some of its files. That is possible today for signed-in users, so row 4 has to land before we promote sign-in.
- Launch traffic brings abuse on anonymous sites. Rows 12 and 13 cover it.
