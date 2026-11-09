---
title: Invite editors to a site
description: Invite people by email to publish to your Flowershow site and change its settings, while you stay in charge of billing, the domain and who has access.
---

> [!tip] Using an AI assistant?
> Give it this page as Markdown: https://flowershow.app/docs/reference/collaborators.md. For all of Flowershow, point it at https://flowershow.app/llms.txt, or install the Flowershow skill: tell your agent "Install the Flowershow skill from https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md" (or see [[skills|Skills]]).

> [!note]
> Editors need the site to be on Premium. There's no charge per editor.

Run a site with other people, each using their own account, so nobody has to share a login. Once someone accepts your invite, the site appears in their dashboard under **Shared with me**, and they can change its settings and publish to it with `fl`. You stay the site's only owner.

## Invite someone

1. Go to your [Flowershow dashboard](https://cloud.flowershow.app) and open your site
2. Open the **Members** tab
3. Enter the person's email address and click **Invite**

They get an email with a link to accept. The link lasts 14 days. To send a new one, click **Revoke** next to the pending invite and invite the same address again.

A site can have up to 20 editors and 20 pending invites.

## Accept an invite

Open the link in the email and sign in with the address the invite was sent to. An email sign-in link works, so you don't need a GitHub account. Then click **Accept**.

Your account's email must match the invite and be verified. If you're signed in as someone else, or your address isn't verified yet, the page shows a **Sign in with** button for the invited address, which emails you a sign-in link. You can't accept as a different account, so a forwarded invite gives nobody else access. If you already use Flowershow with a different email, ask the owner to invite that email instead. Signing in with an address that has no account creates a new, separate account, and the site is shared with that one.

If your account already has that address, verified, the invite also appears on your dashboard with an **Accept** button.

## What editors can do

| Action | Owner | Editor |
| --- | --- | --- |
| Publish to the site | Yes | Yes |
| See publish history | Yes | Yes |
| Change site settings and site config (search, comments, branding) | Yes | Yes |
| Turn password protection on or off | Yes | Yes |
| Moderate annotations | Yes | Yes |
| Leave the site | n/a | Yes |
| Custom domain | Yes | No |
| Root directory | Yes | No |
| Rename the site | Yes | No |
| Connect or disconnect GitHub | Yes | No |
| Invite and remove people | Yes | No |
| Billing | Yes | No |
| Delete the site | Yes | No |

Editors can add custom head code, which runs scripts for every visitor, so invite only people you trust.

## Publish as an editor

### From the terminal

Sharing needs the latest `fl`, so [update it](/docs/reference/cli#upgrade) first, then run `fl login` with the account that accepted the invite. `fl list` shows sites shared with you as `owner/name`.

**Publishing replaces the whole site.** Anything on the site that isn't in your folder is deleted, so start from a folder that has the site's current content. Then run:

```bash
fl --name owner/name --overwrite ./my-folder
```

`--overwrite` is required the first time. After that the folder is linked to the site, and `fl ./my-folder` is enough.

- A bare name only ever means your own site. `fl --name notes` never publishes to a site called `notes` that someone shared with you.
- Other commands that take a site name, such as `fl settings` and `fl annotations`, accept `owner/name` too.
- `fl sync` doesn't support shared sites.

### From your AI

Chat apps such as Claude and ChatGPT can't sign in to your Flowershow account yet, so they can't publish to shared sites. An MCP client that can set request headers can: connect it with a [personal access token](https://cloud.flowershow.app/tokens), as in [Publish to your own account](/docs/agents/mcp#publish-to-your-own-account). Its `list-sites` tool then shows the sites shared with you, and your AI publishes to one by its `siteId`.

### From Obsidian

The Obsidian plugin doesn't support shared sites yet. Use `fl` instead.

## Avoid overwriting each other

Publishing a folder with `fl` replaces the whole site: files that aren't in the folder are deleted from it. If two people publish from different folders, each publish overwrites the other's, with no warning and no merge.

Agree on one source for the site, such as a folder you all sync. The site's **History** tab shows who published each `fl` or AI run.

- **GitHub-connected sites:** being an editor doesn't give access to the repository, so ask the owner for that separately. An editor can still publish with `fl`, but the next push to the repository replaces what they published.
- **Your AI:** the connector changes only the files it sends, unless you ask it to replace the whole site.

## Leave a site or remove someone

- **To leave:** as an editor, open the site's **Members** tab and click **Leave site**.
- **To remove an editor:** as the owner, open the **Members** tab and click **Remove**.

Either way, the person loses access at once, though a publish already running can finish.

## If Premium lapses

Editors lose access until the owner renews. Memberships are kept, so nobody needs inviting again.

While the site is lapsed, it shows greyed out under **Shared with me**, editors can't open it or leave it from the dashboard, `fl` and your AI can't publish to it, and invites can't be sent or accepted. The owner can still remove editors and revoke invites.

## Change the owner

A site has one owner, and you can't transfer ownership yourself yet. Write to [support@flowershow.app](mailto:support@flowershow.app) if you need to.

## Troubleshooting

- **"This invite was sent to …"** → You're signed in with a different account. Click the **Sign in with** button and use the email link.
- **"This invite has expired."** → Ask the owner to invite you again.
- **"This invite link is not valid. It may have been revoked."** → The invite was revoked, replaced, expired or already used. If the site is under **Shared with me**, you're already in. Otherwise ask the owner for a new invite.
- **The invite form is disabled and says "Inviting editors needs Premium"** → Put the site on Premium, then invite again.
- **"That address already has a pending invite"** → Click **Revoke** next to it, then invite again.
- **`fl` says a site "is shared with you" and publishes nothing** → The folder isn't linked to that site. Check that you mean to replace its content, then add `--overwrite`.
- **A shared site is missing from `fl list`** → [Update `fl`](/docs/reference/cli#upgrade). If it's still missing, the site's Premium may have lapsed: ask the owner.

## Next steps

- [Flowershow CLI](/docs/reference/cli): every `fl` command and flag
- [Flowershow connector](/docs/agents/mcp): publish from AI tools (shared sites need a personal access token)
- [[password-protection|Password protection]]: restrict who can view the site
- [[annotations|Annotations]]: collect and moderate notes on your pages
