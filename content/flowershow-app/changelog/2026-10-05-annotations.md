---
title: Get feedback on drafts with annotations
date: 2026-10-05
description: Turn on annotations and anyone with the link can select text on your page and leave a note, no account needed. Then your AI agent pulls the open notes, revises your pages and resolves them.
authors:
  - rufuspollock
image: "[[assets/changelog-annotations.webp]]"
showToc: false
---

Send a colleague a link to your draft and get notes back on the exact words, without asking anyone to sign up for anything.

- **One click, or one flag.** Switch on **Annotations** in Settings → Features, or publish with `fl --annotations`. Pages can opt out with `annotations: false`.
- **No account for reviewers.** They select text, tap **Annotate**, write a note and, if they like, their name. Works on phones too.
- **Give it to your agent.** `fl annotations pull` prints the open notes with the quoted text, file and page URL. Claude Code or Codex can run it and revise your pages; you can also paste the output into ChatGPT or any other agent. `fl annotations resolve` marks notes done.
- **Notes that follow your edits.** Annotations stay on their text when it moves; if you rewrite it, they're marked outdated instead of disappearing.

## Try it with colleagues

Want to see it first? Open the [demo draft](https://annotations-demo-rufuspollock.flowershow.me), select any sentence and leave a note.

**You (the author):**

1. Publish your draft with annotations on: `fl --annotations ./draft` (needs `fl` 2.6.0 or later; on macOS or Linux, upgrade by re-running the [[cli|install script]]). Or switch on **Annotations** in Settings → Features for an existing site.
2. Send the link to the people you want feedback from, with the note below.
3. When notes come in, `fl` tells you how many are open. Run `fl annotations pull` and hand the output to your agent ("apply these notes, republish, then resolve them"), or read them in the dashboard under **Annotations**.

**What to send your reviewers:**

> Here's a draft I'd love your feedback on: <link>. Select any text and tap **Annotate** to leave a note on it. No account needed, and adding your name is optional. Notes are visible to anyone with the link.

Learn more in [[annotations|Annotations]].
