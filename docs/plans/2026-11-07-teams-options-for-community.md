# Teams on Flowershow: the options, and what we'd like your view on

Flowershow sites have exactly one owner today. We want several people to be able to run a site together, and we'd like your opinion before we build. This page describes the options in user terms. The detailed design lives in [the phase 1 design](2026-11-07-teams-phase1-site-collaborators-design.md) and what we learned from other products in [the landscape research](2026-11-07-teams-landscape-research.md). Discussion: [GitHub #919](https://github.com/flowershow/flowershow/issues/919).

## The problem

A group (a collective, a course, a small NGO, a family of projects) runs one or more Flowershow sites. Today they share one login, or one person does everything. We want: several people can publish and change settings, one person stays in charge of billing and deletion, and nobody has to hand over their password.

## Option A: invite people to a site (like sharing a Google Doc)

- The site owner types an email address. The person gets an invite, signs in (GitHub, Google or an email link), and the site appears in their dashboard as "shared with me".
- Two roles: **owner** (one person: billing, custom domain, delete, invite) and **editor** (publish, change ordinary settings).
- Editors publish from the web, from the CLI, from Obsidian or through an AI agent, the same as the owner.
- Billing stays per site. Inviting is a Premium feature; editors cost nothing extra.
- Nothing changes for anyone who doesn't use it: your sites, URLs and bills stay as they are.
- This is how Obsidian Publish, Substack and Ghost work.

## Option B: organisations (like a Vercel or GitHub team)

- You create an organisation ("Life Itself"), add members, and the organisation owns sites. Everyone in the org sees and can work on all of its sites.
- Roles live at the org level (owner, admin, member), with one bill for the whole organisation instead of one per site.
- Could later be linked to a GitHub organisation so its repos land under it automatically.
- More to learn and set up, and a bigger change for us: ownership, URLs and billing all move from "a person" to "an org".
- This is how Netlify, Vercel, GitBook and Mintlify work. It is also where per-seat pricing tends to appear, which users of those products dislike.

## Option C: A first, then B on top

- Ship A now. Later, an organisation is simply a thing that can own sites and whose members are automatically editors of them. Sharing a single site by email keeps working alongside.
- This is the path GitHub, Framer and here.now took: individual sharing plus workspaces.

## Option D: access from GitHub

- If you can push to the connected repo, you can manage the site. No invites.
- Only works for GitHub-synced sites (not CLI, Obsidian or agent-published ones), and almost no comparable product does it. We'd treat it as a membership source for an org later, not as the model.

## What we lean towards

Option C: start with A because it is the smallest thing that is honestly "teams" and matches how most of you work today (one person owns a site, a few people help), then decide on organisations with real usage behind us. An organisation subscription could be a different pricing model from today's per-site Premium.

## Questions for you

1. Would inviting people by email to a site cover your case, or do you need an organisation that owns several sites with one bill?
2. Who in your group should be able to do what? Is owner plus editor enough, or do you need an admin or a read-only role?
3. Should editors be able to switch password protection on and off, or should that stay with the owner?
4. Do you publish mostly through GitHub, the CLI, Obsidian or an agent? That tells us where editors need to work first.
5. Anything you've loved or hated about how another tool handles this?

Reply on [GitHub #919](https://github.com/flowershow/flowershow/issues/919) or in Discord.
