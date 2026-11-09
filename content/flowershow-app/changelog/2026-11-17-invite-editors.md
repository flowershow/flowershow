---
title: Invite editors to your site
date: 2026-11-17
description: Invite people by email to publish to your site and manage it with you, each with their own account. Included with Premium.
authors:
  - rufuspollock
showToc: false
---

Running a site with other people no longer means sharing a login. Open your site's **Members** tab, enter an email address, and that person can publish to the site and manage it with you. See [[collaborators|Invite editors to a site]] for the details.

- **You stay the owner.** Editors can publish, change settings and site config, turn password protection on or off, and moderate annotations. The custom domain, root directory, renaming, the GitHub connection, inviting and removing people, billing and deleting the site stay with you.
- **Invites go to one address.** A link lasts 14 days and only works for an account with that verified email. Signing in with an email link is enough, so editors don't need a GitHub account.
- **Included with Premium.** No charge per editor, up to 20 editors per site. If Premium lapses, editors lose access until you renew, and nobody needs inviting again.
- **Publish from the terminal or your AI.** Update `fl`, then `fl list` shows shared sites as `owner/name` and `fl --name owner/name --overwrite <folder>` publishes to one. The Flowershow connector's `list-sites` shows them too. The Obsidian plugin doesn't support shared sites yet.

Publishing a folder with `fl` replaces the whole site, so two editors publishing from different folders overwrite each other. Agree on one source for the site; the **History** tab shows who published each run.
