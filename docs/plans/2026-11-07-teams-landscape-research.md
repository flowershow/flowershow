---
title: Teams and organisations — landscape research
date: 2026-11-07
status: research (input to the teams spec)
---

# Teams and organisations: how 15 products handle multi-person ownership

**TL;DR:** Products for writers and site owners (Obsidian Publish, Ghost, Substack, Squarespace, Read the Docs Community) all start with **collaborators on one site**: invite by email, a single owner who alone deletes and pays, and collaborators who cost nothing or are counted against a small cap. Dev platforms (Vercel, Netlify, Cloudflare, GitHub) start with a **team/org that owns many projects**, and they are the ones that draw per-seat complaints. Flowershow v1 should be site collaborators, two roles (Owner, Editor), email invites accepted on login, free and uncapped on Premium, and no organisation yet.

Research date: 2026-11-07. Prices are list prices seen on that date; figures from third-party sources are marked as such.

## 1. Product notes

### GitHub (organisations, teams, Pages)

- **Model:** Both. An organisation owns many repos; a personal repo can have collaborators; org repos can also have "outside collaborators" who are not org members. [Org roles](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization)
- **Roles:** Org: Owner (full admin), Member (default; can create repos), Moderator, Billing manager (billing only), Security manager, Outside collaborator (per repo). Repos: Read, Triage, Write, Maintain, Admin. Billing is split into its own role so the payer need not be an admin.
- **Invite:** By username or email; an email invite can only be accepted by an account with that verified email; invites expire after 7 days and can be resent. [Inviting users](https://docs.github.com/en/organizations/managing-membership-in-your-organization/inviting-users-to-join-your-organization)
- **Billing:** Free orgs have unlimited members and collaborators; Team is $4/user/month. Pages on private repos needs Team. [Pricing](https://github.com/pricing)
- **Pages:** A Pages site belongs to a repo, so Pages has no access model of its own: repo admins configure it. [Creating a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- **Owner leaves:** A sole org owner must transfer ownership or delete the org before deleting their account. GitHub recommends at least two owners. [Account deletion reference](https://docs.github.com/en/account-and-profile/reference/personal-account-reference)
- **Liked:** Free orgs with unlimited members are the default home for open-source and community projects, so many Flowershow users already have one.

### Netlify

- **Model:** A team owns many projects (sites). Organisations sit above teams on Enterprise.
- **Roles:** Owner (members, roles, delete or transfer projects, delete team, team settings), Developer (deploys and config for projects they can access; can approve Reviewers; cannot remove members), Billing Admin (Enterprise), Reviewer (feedback on Deploy Previews, free), Publisher (Visual Editor), Git Contributor (can trigger deploys, no dashboard access). Every team must keep at least one Owner, and an Owner cannot demote themselves unless another Owner exists. [Roles and permissions](https://docs.netlify.com/manage/accounts-and-billing/team-management/roles-and-permissions/)
- **Invite:** Only Owners add members. Invite by email; the invite also shows in the dashboard the next time the person signs in. Reviewers have to be approved by an Owner or Developer. [Manage team members](https://docs.netlify.com/manage/accounts-and-billing/team-management/manage-team-members/)
- **Billing:** Credit-based plans: Free $0, Personal $9, Pro $20/month with **unlimited members**. [Pricing](https://www.netlify.com/pricing/)
- **Transfer:** A project owner can move a project between teams if they are Owner or Developer on both. Members not on the destination team lose access, and Owners can block outbound transfers. [Team-owned sites](https://docs.netlify.com/manage/accounts-and-billing/team-management/team-owned-sites/)
- **GitHub interaction:** Netlify used to bill "Git Contributors": anyone whose commit to a private repo triggered a successful build counted as a $19 member unless merged with an existing member. This caused years of surprise bills and forum threads. [Forum: Git contributor billing](https://answers.netlify.com/t/git-contributor-billing/74621), [Forum: billing issue](https://answers.netlify.com/t/billing-issue-related-to-git-contributors/89880). The move to a flat Pro plan with unlimited members reads as a response to this.

### Vercel

- **Model:** A team owns many projects. Hobby is a one-person team.
- **Roles:** Owner (everything, including billing, members and roles), Member (projects and domains but no billing and no invites), Developer (deploys, preview env vars, domains; no production env, no invites), Billing (one per Pro team, read-only on projects), Pro Viewer (read-only, free), plus Security and Contributor with project-level roles on Enterprise. [Access roles](https://vercel.com/docs/rbac/access-roles)
- **Billing:** Pro is $20/month including one deploying seat; extra Owner/Member/Developer seats are $20/month each; Viewer seats are free and unlimited. **Hobby doesn't allow collaboration at all.** [Pricing](https://vercel.com/pricing)
- **GitHub interaction:** Before deploying, Vercel checks that the **commit author** is a member of the Vercel team (matched on verified email). Commits from non-members are blocked and the bot comments with a link to request access. [Why aren't commits deploying](https://vercel.com/kb/guide/why-aren-t-commits-triggering-deployments-on-vercel). To connect an org repo you must be an org Owner or a Member with access to the repo, not an outside collaborator. [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- **Transfer:** You must be an Owner of the source team and a member of the target team. Domains, env vars, deployments and the Git link move; usage resets. [Transferring projects](https://vercel.com/docs/projects/transferring-projects)
- **Hated:** $20/seat for every collaborator, especially for agencies that invite clients, and the "collaboration needs Pro" rule. [Community thread](https://community.vercel.com/t/updated-pro-plan/18608.md), [third-party breakdown](https://makerkit.dev/blog/tutorials/vercel-cost)

### Cloudflare (Pages and Workers accounts)

- **Model:** An account owns zones, Workers and Pages projects, with members on the account. Roles can be scoped to the account, a domain or a resource.
- **Roles:** Super Administrator (everything including billing and members; can revoke other Super Admins), Administrator (full access but cannot manage members or billing), Billing, Workers Platform Admin / Read-only, plus many product-specific roles. [Roles](https://developers.cloudflare.com/fundamentals/manage-members/roles/)
- **Invite:** Only Super Admins with a verified email can invite, by email, choosing a policy (scope plus roles). Invites stay Pending until accepted and can be resent. [Manage members](https://developers.cloudflare.com/fundamentals/manage-members/manage/)
- **Billing:** Members are free. A Pages project "can be managed by an unlimited number of users." [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- **Owner leaves:** A Super Admin can delete their user but not the account; the docs assume another Super Admin exists.

### GitBook

- **Model:** An organisation owns spaces and sites.
- **Roles:** Admin (everything including billing and members), Creator (creates and deletes spaces and sites), Reviewer (merges change requests), Editor, Commenter, Reader, Guest (per-content access). [Roles](https://gitbook.com/docs/account-management/member-management/roles)
- **Invite:** Email invites (the recipient signs up and joins at once), role-bound invite links that can be revoked, and email-domain auto-join (defaults to Guest). [Invite members](https://gitbook.com/docs/account-management/member-management/invite-members-to-your-organization)
- **Billing:** Per site plus per user. Free has 1 user; Essential is $65/site/month plus $12/user/month; Ultimate $249/site/month plus $12/user. **Every member is billed, including Readers and Guests.** [Pricing](https://www.gitbook.com/pricing)
- **Hated:** The jump from free to $65+ per site plus seats, and forced upgrades to keep editing. [Third-party review (written by a competitor)](https://ferndesk.com/blog/gitbook-pricing)

### Ghost (Ghost(Pro))

- **Model:** Staff on one publication.
- **Roles:** Contributor (drafts only, cannot publish), Author (publishes own posts), Editor (edits and publishes anyone's posts; invites Authors and Contributors), Administrator (all settings and members; invites anyone), Owner (Admin powers plus billing on Ghost(Pro); exactly one; cannot be deleted). [Managing your team](https://ghost.org/help/managing-your-team/), [Staff roles](https://ghost.org/help/managing-staff-user-profiles/)
- **Invite:** Email invite from Settings → Staff.
- **Billing:** Staff are capped by plan, not charged per seat: Starter $18/month with 1 staff user, Publisher $29 with 3, Business $199 with 15 (yearly billing). [Pricing](https://ghost.org/pricing/)
- **Transfer:** The Owner opens an Administrator's profile and picks "Make owner". [Transfer ownership](https://ghost.org/help/transfer-publication-ownership/)
- **Liked:** A clear publishing ladder and a single owner who is the billing contact.

### Mintlify

- **Model:** An organisation (deployment) with dashboard members.
- **Roles:** Viewer (read), Editor (edit, and publish unless review is required; can invite editors and viewers), Admin (invites admins, changes roles, billing, SSO). Expanded roles add Owner (alone can delete the project or org and transfer ownership), Publisher and Commenter. [Roles](https://www.mintlify.com/docs/dashboard/roles.md)
- **Invite:** Paste up to 250 emails and pick a role; duplicates and existing members go to a review step. CSV bulk invite on Pro.
- **Billing:** Starter is capped at 5 members; Pro and Enterprise allow any number. Third-party trackers report extra editor seats at about $20/month on Pro; not confirmed on the official page. [Pricing tracker](https://pricingsaas.com/companies/mintlify/diffs/2026W20)

### Notion

- **Model:** A workspace owns pages; guests are invited per page.
- **Roles:** Workspace owner, Membership admin, Member, Temporary member (expiry up to a year; no paid seat), Guest (per page). [Add members, admins, guests](https://www.notion.com/help/add-members-admins-guests-and-groups)
- **Invite:** Email, invite link (joins as a **paid** member), allowed email domain, or share a page to an email as a guest. Guests without Notion must sign up to open the page. Invites stay pending until accepted.
- **Billing:** Per member (Plus €9.50, Business €19.50 per member/month on the EU page); guests are free but capped (10 on Free). [Pricing](https://www.notion.com/pricing)
- **Owner leaves:** At least one owner must always exist; a billing owner must hand off billing before stepping down; if the sole owner disappears, support reassigns ownership after checks (third-party). [Guide](https://wisechecker.com/?p=26816)
- **Hated:** Invite links that quietly add paid seats; guest caps.

### Obsidian Publish

- **Model:** Collaborators on one site.
- **Roles:** Owner and Collaborator. Collaborators can publish, update and unpublish pages; only the owner changes site options or manages permissions. [Collaborate on a Publish site](https://obsidian.md/help/publish/collaborate)
- **Invite:** The owner types an email under Site options → Site collaboration → Manage.
- **Billing:** **Only the owner needs a subscription; collaborators need only a free Obsidian account.**
- **Transfer and owner leaving:** Not documented; no multi-owner or transfer feature found.
- **Caveat users hit:** Publish doesn't sync vaults, so collaborators can overwrite each other unless they use Sync or git. Flowershow has the same last-write-wins risk with CLI/MCP publishing.
- **Closest analogue to Flowershow**, and the simplest credible model in this list.

### Substack

- **Model:** A team on one publication.
- **Roles:** Owner (receives all Substack communications; **the only role that can delete the publication**; holds Stripe payouts), Admin (sees and changes everything including settings and stats), Contributor (writes, edits and publishes posts; no settings, stats or financial graphs), plus Byline-only. [Group publishing tools](https://on.substack.com/p/group-publishing-tools-on-substack), [Help: multiple authors](https://support.substack.com/hc/en-us/articles/360039016832-Can-my-Substack-publication-have-multiple-authors-or-contributors)
- **Invite:** Owners and Admins invite by email from Settings → Team. **No limit and no cost.**
- **Transfer:** Self-serve "Transfer ownership" in Settings, confirmed by both parties by email (third-party source; older reports say support had to do it). [Third-party guide](https://simplytrust.com/digital-assets/substack/)

### Webflow

- **Model:** Both, and confusingly so. Workspaces hold seats and sites; each site also needs its own site plan; guests (freelancers and agencies) can be added to a client's site.
- **Roles:** Workspace roles map to seat types: Full seat (Owner, Admin, Site manager, Designer), Limited seat (Marketer, Content editor), free seat (Reviewer: view and comment). Guests can be given site roles. [Seats, roles, permissions](https://help.webflow.com/hc/en-us/articles/33961273067411)
- **Billing:** Site plans (Basic $15, Premium $25/month annual) **plus** workspace plans (Core $19, Growth $49) **plus** seats (Full $39, Limited $15, Reviewer free) (third-party, 2026). [Breakdown](https://www.usecarly.com/blog/webflow-pricing/)
- **Hated:** "Why am I paying twice" for site plans and workspace plans; site transfers to clients failing or losing billing; agencies unsure who pays. [Forum: angry clients](https://discourse.webflow.com/t/site-transfer-issues-angry-clients/204890), [Forum: transfer and invoice](https://discourse.webflow.com/t/transfer-site-plan-and-invoice/296391). An owner leaving needs its own help article. [Owner left](https://help.webflow.com/hc/en-us/articles/38085947127059-The-owner-of-our-Workspace-has-left-our-organization-How-do-I-transfer-ownership)
- **Lesson:** Two billing axes plus seat types is the cautionary tale.

### Framer

- **Model:** Both. Workspace roles cover every project; project roles let you invite someone to one project only.
- **Roles:** Workspace: Admin (settings, members, billing, projects), Editor, Content Editor, Viewer (free, read-only, cannot invite). Project: Owner (can transfer ownership), Editor, Viewer (free). [Members, roles, permissions](https://www.framer.com/help/articles/member-roles-and-permissions/)
- **Billing:** Editors are billed (about $20/month; Content Editor about $10); viewers are free; the workspace owner is free on Basic and Pro; workspaces without a subscription can have up to 3 editors. Viewers can request edit access, which the project owner approves and which may add a charge. [Framer pricing (third-party summary)](https://dupple.com/learn/framer-pricing)
- **Complaint:** New editors are billed within 24 hours, so short-term helpers cost money (third-party).

### Squarespace

- **Model:** Contributors on one site.
- **Roles:** Owner (one; everything plus transfer ownership), Administrator (everything except transfer), Billing (change or cancel plan, invoices; no content), Website editor (content on existing pages; can't add pages or change styles), Store manager, Comment moderator, Analytics, Email Campaign editor, Viewer. [Permissions explained](https://support.squarespace.com/hc/en-us/articles/206537297-Squarespace-permissions-explained)
- **Invite:** Owners and Admins invite by email.
- **Transfer:** Only the owner transfers ownership, to an existing contributor; the old owner typically becomes an Administrator, and billing responsibility moves with ownership (third-party). [Guide](https://sparkplugin.com/blog/squarespace-transfer-ownership)
- **Liked:** The agency handoff (designer builds, adds client, transfers ownership) is a well-worn path.

### Read the Docs

- **Model:** Community: maintainers on one project. Business: organisations with teams.
- **Roles:** Community has one role, Maintainer, which is a full admin. Business teams are Admin or Read-only. [Managing maintainers](https://docs.readthedocs.com/platform/stable/guides/managing-maintainers.html), [Org owners and teams](https://docs.readthedocs.com/platform/stable/guides/manage-read-the-docs-teams.html)
- **Invite:** By username or email; the invitee must accept from an email link before getting access.
- **GitHub interaction:** With SSO via GitHub/GitLab/Bitbucket on Business, **Read the Docs drops its own teams and uses Git repo permissions** (repo admin gives RTD admin). [SSO with Git providers](https://docs.readthedocs.io/page/guides/setup-single-sign-on-github-gitlab-bitbucket.html)
- **Lesson:** One flat "maintainer = admin" role has served a huge open-source user base for years.

### here.now

- **Model:** Personal accounts plus workspaces (shared accounts that own sites). Sites can also be shared with an individual account. [Docs](https://here.now/docs)
- **Roles:** Admin and member (no viewer role documented). Per-site viewer access is separate: public, or restricted to an email and domain allowlist.
- **Invite:** Admins send email invites and can list and revoke pending ones; users accept or decline; existing users can be added directly by email; email-domain auto-join rules. The docs say to prefer invites for people who may not have an account yet.
- **Billing:** Team pricing not documented.
- **Lesson:** A small agent-first host went straight to workspaces, but kept "share a site with an account" too.

## 2. Comparison table

| Product | Model | Roles | Invite | Billing for collaborators | Transfer / owner leaves |
|---|---|---|---|---|---|
| GitHub | Org owns repos; repo collaborators | Owner, Member, Billing mgr, Moderator, Security mgr, Outside collaborator; repo Read→Admin | Username or email; 7-day expiry | Free unlimited; Team $4/user | Sole owner must transfer or delete the org before deleting account |
| Netlify | Team owns sites | Owner, Developer, Billing Admin (Ent), Reviewer, Publisher, Git Contributor | Email, Owners only; dashboard notice | Pro $20/month flat, unlimited members; Reviewers free | Owner moves site between teams; at least one Owner always |
| Vercel | Team owns projects | Owner, Member, Developer, Billing, Viewer (+Ent roles) | Email; commit authors can request access | Hobby: no collaboration; Pro $20/seat; Viewers free | Owner transfers project; domains move |
| Cloudflare | Account owns resources | Super Admin, Admin, Billing, Workers roles, many scoped roles | Email, Super Admins only; Pending | Members free, unlimited | Needs a second Super Admin |
| GitBook | Org owns spaces/sites | Admin, Creator, Reviewer, Editor, Commenter, Reader, Guest | Email, role-bound links, email domain | $65+/site plus $12/user; every member billed | Admin-managed |
| Ghost | Staff on one publication | Owner, Administrator, Editor, Author, Contributor | Email | Staff capped by plan (1/3/15) | Owner → Admin via "Make owner" |
| Mintlify | Org | Viewer, Editor, Admin (+Owner, Publisher, Commenter) | Bulk email | Starter max 5 members; Pro any number | Only Owner deletes or transfers |
| Notion | Workspace; page guests | Owner, Membership admin, Member, Temporary, Guest | Email, link (paid), domain, page share | Per member; guests free but capped | Must always have an owner; support fallback |
| Obsidian Publish | Collaborators on one site | Owner, Collaborator | Email | **Free; only owner subscribes** | Not documented |
| Substack | Team on one publication | Owner, Admin, Contributor, Byline | Email | **Free, unlimited** | Self-serve transfer, both confirm |
| Webflow | Workspace + site plans + guests | Owner, Admin, Site manager, Designer, Marketer, Content editor, Reviewer, Guest | Email | Site plan + workspace plan + seats ($39/$15/free) | Transfer pain widely reported |
| Framer | Workspace + per-project members | Admin, Editor, Content Editor, Viewer; project Owner/Editor/Viewer | Email; viewers request edit | ~$20/editor; viewers free; 3 editors without a subscription | Project owner can transfer |
| Squarespace | Contributors on one site | Owner, Admin, Billing, Website editor, + specialist roles | Email | Included in site plan | Owner-only transfer to a contributor |
| Read the Docs | Community: maintainers; Business: orgs/teams | Maintainer (= admin); Business Admin/Read-only | Username or email; must accept | Community free | Any maintainer is admin; Business can use Git permissions |
| here.now | Personal + workspaces; site sharing | Admin, member; per-site viewer allowlist | Email, pending list, domain auto-join | Not documented | Not documented |

## 3. Patterns

- **Two families.** Publishing products (Obsidian Publish, Ghost, Substack, Squarespace, RTD Community) put collaborators on the site; developer and design platforms (GitHub, Netlify, Vercel, Cloudflare, GitBook, Mintlify, Webflow, Framer) put members on a team or workspace that owns sites. Flowershow's users and pricing (per site; writers and knowledge gardeners) sit in the first family today.
- **Site-first products often stay site-first.** Five of the fifteen offer only site-level collaborators and have stayed that way for years (Obsidian Publish, Substack, Ghost, Squarespace, RTD Community). That shows the model lasts, not that nobody wants more: Ghost and Squarespace are mostly single-site products, and this research found no data on customers lost for lack of orgs. Evidence that would change the call: several Flowershow customers asking for one bill and shared people across many sites. Framer and here.now kept "share one project" alongside workspaces, so the site-level grant survives even where orgs exist. Read the Docs is the clearest case of starting with per-project maintainers and adding orgs later as a paid Business tier.
- **Table-stakes roles:** exactly one **Owner** (billing, delete, transfer, manage people) and a **collaborator/editor** who can publish content. Most also have an **Admin** (owner powers minus billing, delete and transfer), but the simplest products (Obsidian Publish, RTD Community) ship without one. Viewer roles matter only where there are private dashboards or private sites.
- **Who can delete, pay and change domains:** delete and transfer are owner-only nearly everywhere (Substack, Ghost, Squarespace, Mintlify, Netlify, Vercel). Billing is owner-only, or a separate Billing role on bigger products. Custom domains are usually admin-level (Vercel lets Members and Developers manage project domains; Obsidian Publish keeps all site options with the owner).
- **Invites:** email is universal. Common details: it works whether or not the person has an account (they sign up through the link); invites show as pending and can be resent or revoked; some products accept only on a matching verified email (GitHub), which is the main source of "the invite doesn't work" problems (GitBook documents the mismatched-email error). Invite links and domain auto-join are org-scale features.
- **Billing for small teams:** publishing products include collaborators free (Obsidian Publish, Substack, Squarespace) or cap them per plan (Ghost 1/3/15, Mintlify 5, Framer 3 editors without a subscription). Per-seat charging is a dev-platform habit and is the most complained-about part of Vercel, Netlify (Git Contributors), GitBook and Webflow. Free viewers are nearly universal where viewers exist.
- **Ownership continuity:** the robust pattern is "always exactly one owner, transfer is an explicit two-sided action, and an account can't be deleted while it is the sole owner of something shared" (GitHub, Notion, Netlify). Products that don't handle this well (Webflow, Notion's support fallback) produce help articles and angry threads.
- **GitHub-derived access is rare and comes late.** Only Read the Docs Business (with SSO) derives permissions from repo permissions, and Vercel uses team membership to gate deploys from commits. No product here gives dashboard access just because someone can push to the repo. Git push access and dashboard access stay separate by default.

## 4. Recommendations for Flowershow v1

Items marked **(launch)** are the minimum to ship; **(soon after)** can follow without changing the model.

**Model**

- **Ship site collaborators, not organisations.** It matches per-site billing and the Obsidian Publish/Substack model our users know, and it adds one join table (`SiteMember`) without touching billing or URLs.
- **Keep `Site.userId` as the owner** and add members beside it. That avoids rewriting every ownership check at once, and "owner" stays one unambiguous field.

**Roles**

- **Two roles: Owner and Editor (launch).** Owner keeps billing, delete, transfer, custom domain, privacy/password, GitHub repo connection and member management; Editor can publish content and change ordinary site settings. This is the "delete, pay, domain, people" line every product draws. Privacy/password is an owner call because it decides who can read the site, which no comparison product hands to content editors.
- **Editors on GitHub-backed sites edit content through the repo, not through Flowershow (launch).** On those sites an Editor gets the dashboard and ordinary settings, and CLI/MCP/web publishing is refused, because the next push from GitHub would overwrite their change. Editors who need to write content get repo access on GitHub, which the owner already controls. CLI/MCP/folder sites have no such conflict, so editors publish there directly.

Proposed permission matrix (launch):

| Action | Owner | Editor |
|---|---|---|
| Publish or unpublish pages via CLI, MCP or web (non-GitHub sites) | Yes | Yes |
| Change theme, nav, sidebar, comments, search, RSS, config | Yes | Yes |
| View site dashboard and analytics | Yes | Yes |
| Create a personal token that can publish to this site | Yes | Yes (revoked on removal) |
| Custom domain, subdomain change | Yes | No |
| Privacy mode, access password | Yes | No |
| Connect, change or disconnect GitHub repo | Yes | No |
| Invite, remove members | Yes | No |
| Billing, plan changes | Yes | No |
| Delete site, transfer ownership | Yes | No |
| Leave the site | n/a | Yes |
- **Defer Admin.** A second admin-level person is useful but means deciding domain, privacy and member rights for a third tier; add it when people ask, since the role is just an enum value.
- **Defer Viewer.** Private sites already have password access; a viewer role only matters once privacy mode can mean "signed-in members only". Add it with that feature.

**Invites**

- **Invite by email, Owner only (launch).** Every product does email; owner-only keeps v1 free of "can editors invite editors" questions (Ghost and Mintlify allow it; add later).
- **Store pending invites with a token, an expiry and the invited email; the owner can revoke (launch) and resend (soon after).** Expiry is our choice: GitHub uses 7 days; 14 days is the default here, easy to change.
- **Accept on login as well as by link (launch).** When a user signs in, show any pending invites whose email matches a verified email on their account and let them accept in one click (Netlify surfaces pending invites in the dashboard the same way). If someone opens the link while signed in under a different email, show "Accept as <account>?" rather than failing. This avoids the mismatched-email failure GitHub and GitBook document.
- **Account linking caveat:** Flowershow users sign in with GitHub (and email). A GitHub primary email may differ from the invited address, so match against all verified emails we hold (GitHub returns several with the `user:email` scope) and fall back to the confirm screen. Never auto-accept on an unverified email.
- **An invitee without an account** signs up through the link and lands on the site; no separate flow.
- **Editors see shared sites in their dashboard with an "Editor" badge, and CLI/MCP site lookup includes sites where the user is a member.** Without this, collaborators can't publish via CLI or MCP, which is the main point for our users.

**Billing**

- **Collaborators are free and uncapped on Premium (launch).** Obsidian Publish and Substack do this, it avoids per-seat resentment, and a cap would need an answer for the next editor that we don't have until orgs exist. Log member counts per site; add a limit only if one Premium site is clearly being used as a whole organisation's workspace.
- **Free sites: owner only (launch).** Collaboration as a paid feature is common in publishing too: Obsidian Publish is paid-only, so its collaborators always sit on a paid site. What people hate about Vercel is paying per collaborator, not paying once for the site; we charge once per site. Revisit (e.g. one editor on Free) if demand shows up.
- **No per-seat billing in v1.** It is the most-hated pattern in this landscape and needs Stripe quantity handling we don't have.
- **If Premium lapses, the site follows the Free rule: members stay listed but editors can't publish or change settings until it is Premium again (launch).** This is the same "Free = owner only" rule, applied without deleting memberships, so resubscribing restores everyone.

**Ownership and the owner leaving**

- **Existing sites need no migration:** today's `Site.userId` is the owner, and sites start with no members (launch).
- **Ownership transfer to an existing Editor, two-sided (owner initiates, editor accepts) (soon after).** Ghost, Squarespace and Substack all do this. Until it ships, support can transfer ownership by hand; volume will be low at first.
- **Billing does not move automatically.** The old owner's Stripe subscription is set to cancel at period end, and the new owner is prompted to subscribe before then. A payment method can't move between people in Stripe, and Webflow's transfer pain comes from trying.
- **Account deletion with shared sites asks first (launch).** If the user owns sites that have other members, list them and offer: transfer (or ask support to), or "delete these sites too" with an explicit confirmation that names the editors who will lose them. GitHub requires transfer or deletion first; offering the delete path too means no one is trapped when no editor will take over. Today `Site.user` has `onDelete: Cascade` in `apps/flowershow/prisma/schema.prisma`, so deleting an owner silently deletes shared sites; the deletion flow must check before that cascade runs.
- **An inactive owner** (stops paying, stops answering) is handled by the lapse rule above plus a support-assisted transfer to an Editor who asks, after we try to contact the owner. No automatic succession in v1.
- **Removing an editor** revokes dashboard, CLI and MCP access at once (revoke their site-scoped tokens, and bump `tokenVersion` if it gates site sessions).

**GitHub**

- **Don't derive Flowershow access from GitHub repo or org permissions in v1.** No product here does it by default; collaborators on a GitHub-backed site can already edit by pushing to the repo, and the site keeps syncing through the owner's GitHub App installation.
- **Repo connection stays owner-only.** Changing the repo uses the owner's installation; letting editors re-point it would use someone else's GitHub access.

**Defer to the organisations phase**

- Organisations owning many sites, org billing and moving the bundle discount to orgs: wait until several customers ask for "one bill, many sites, many people"; site collaborators plus bundles cover small teams until then.
- GitHub-org mapping (auto-join members of a GitHub org, or RTD-style repo-permission sync): wait until orgs exist, then offer it as an org's membership source.
- Invite links, email-domain auto-join, SSO, audit logs: org-scale features.
- Commenter/reviewer roles: only if annotations become a team workflow.

## 5. Open risks

- **Concurrent edits.** Two editors publishing from different local folders via CLI/MCP can overwrite or delete each other's pages (Obsidian Publish has the same problem and tells users to use Sync or git). The new list-files/read-file MCP tools help; we should also warn or refuse when a sync would delete pages another member published, or at least show who last published each file.
- **GitHub-backed sites limit what editors can do.** The recommendation above (content through the repo only) is safe but makes Editor on a GitHub site mostly a settings role. If users want web or MCP edits on GitHub sites, the edits will have to be committed back to the repo, which is a much bigger feature.
- **Billing edge cases.** Who pays when the owner transfers mid-cycle, whether bundle discounts count sites you only edit (they shouldn't), and what an editor sees when Premium lapses. Settle these in the spec.
- **Email matching and duplicate accounts.** Users who signed up once with GitHub and once with email have two accounts, and invites may attach to the wrong one. Account merging may be needed sooner than planned.
- **No cap means no lever.** If one Premium site gathers a whole organisation, we have no price signal until orgs exist. Watch member counts per site; this is also the demand signal for orgs.
- **Abuse.** Invites send email from our domain to arbitrary addresses; rate-limit invites per site and per user, and allow inviting only on Premium sites.
- **Authorisation surface.** Every route and tRPC procedure that checks `site.userId === session.user.id` must be found and moved to one `canEdit(site, user)` / `isOwner(site, user)` helper. A missed check means an editor can delete or re-domain a site, or a removed editor keeps access.
