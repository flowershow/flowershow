---
title: Annotations
description: Let colleagues select text on your published pages and leave notes, with no account. Then give the open notes to your AI agent with fl annotations pull.
---

Annotations let anyone with the link to your site select text on a page and leave a note. Reviewers don't need an account: they select, type, and add their name if they like. You read the notes on the page, in your dashboard, or with the `fl` CLI, which prints them in a form you can give straight to an AI agent to revise your Markdown.

Annotations are made for sharing drafts with colleagues and friends, for example a review site you send to a few people. Everyone who can open the page can read and add annotations, so think twice before turning them on for a public site. Pages with annotations on are hidden from search engines (`noindex, nofollow`).

> [!note]
> Annotations are not the same as [[comments|Comments]], which are public discussions at the bottom of a page, powered by Giscus and GitHub.

## Turning annotations on and off

Annotations are off by default, and the site setting is final: when it's off, annotations are off on every page, whatever a page's frontmatter says.

In the dashboard, go to **Settings → Features → Annotations** and switch it on. Or publish with the CLI flag:

```bash
fl --annotations ./my-draft         # on
fl --annotations=false ./my-draft   # off
```

Or add this to your `config.json` (it wins over the dashboard setting):

```json
"annotations": true
```

When the site setting is on, you can switch annotations off for a single page in its frontmatter:

```yaml
---
title: About
annotations: false
---
```

Annotations work on Markdown pages (`.md` and `.mdx`), in the page body. They aren't available on HTML pages, canvases or changelog timelines. Sites published without an account (`fl --anon`) can't use annotations yet; sign in and publish with `fl login` first.

## Leaving an annotation

1. Select some text in the page. On a phone, long-press to select.
2. Tap **Annotate** (on a phone it floats near the bottom of the screen).
3. Write your **Note** and click **Save annotation**. The first time, you can add your name; your browser remembers it and shows "Posting as …" with a way to change it. Without a name, the note shows as "Anonymous".

The **Annotations on** button in the bottom-left corner shows how many open notes the page has and opens the list. Click a quote in the list to jump to it, or click highlighted text on the page to see its note. Press Escape to close the list.

Highlights on the page need a browser with the CSS Custom Highlight API. Without it, notes still appear in the list, just without highlighting.

## When the page changes

Each annotation remembers the exact text it was attached to and a little of the text around it. When you republish, annotations follow their text even if it moved or changed slightly. If the text was rewritten or removed, the annotation stays in the list marked **Outdated**, so the note isn't lost.

When you've dealt with a note, mark it resolved (see below). Resolved notes are collapsed at the bottom of the list with a ✓.

## Reading and resolving annotations with the CLI or an AI agent

```bash
fl annotations pull                         # open notes; site linked to this folder, or your only site
fl annotations pull --name my-drafts        # a named site
fl annotations pull --path notes/draft.md   # one file
fl annotations pull --all --format json     # include resolved notes, as JSON
fl annotations resolve <id> <id>            # mark notes as dealt with
fl annotations resolve --all
```

The output groups notes by file and gives each one's page URL, the quoted text, the text just before and after it, the note, the reviewer's name, its ID, and whether the page was edited since the note was left. Coding agents such as Claude Code or Codex can run the command themselves. ChatGPT can't run `fl`, but you can run it yourself and paste the output into any agent, including ChatGPT, and ask it to revise the files.

Notes are written by other people. Each one is wrapped in `<untrusted-annotation>` tags, and the output tells your agent to treat notes as editing requests from unverified reviewers, never as instructions to run commands. Still check what your agent changes.

`fl` and `fl settings` show when annotations are on and how many open annotations are waiting. See the [[cli|CLI reference]] for all options.

## Resolving and deleting annotations

Only the site owner can resolve or delete annotations:

- **Dashboard:** open your site and go to the **Annotations** tab, which shows the open count. Resolve or reopen a note, delete one, or delete all.
- **CLI:** `fl annotations resolve <id>`, `fl annotations delete <id>`, or `fl annotations delete --all`.

## Privacy and limits

- Annotations are visible to everyone who can open the page. On a [[password-protection|password-protected site]], only people with the password can see or add them.
- Turning annotations off hides them from visitors; it doesn't delete them. Deleting the site deletes them.
- Flowershow doesn't store reviewers' IP addresses. The name is whatever the reviewer typed and isn't verified.
- Notes are up to 2,000 characters and names up to 60. A quote is up to 1,000 characters; longer selections are shortened, and the reviewer is told before typing. A page holds up to 500 annotations and a site up to 2,000. These are caps, not rate limiting.
- There are no notifications yet. Check the page, the dashboard or `fl annotations pull`.
