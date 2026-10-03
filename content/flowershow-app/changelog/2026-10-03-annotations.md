---
title: Get feedback on drafts with annotations
date: 2026-10-03
description: Turn on annotations and anyone with the link can select text on your page and leave a note, no account needed. Then your AI agent pulls the open notes, revises your pages and resolves them.
authors:
  - rufuspollock
image: "[[assets/changelog-annotations.webp]]"
showToc: false
publish: false
---

Send a colleague a link to your draft and get notes back on the exact words, without asking anyone to sign up for anything.

- **One click, or one flag.** Switch on **Annotations** in Settings → Features, or publish with `fl --annotations`. Pages can opt out with `annotations: false`.
- **No account for reviewers.** They select text, tap **Annotate**, write a note and, if they like, their name. Works on phones too.
- **Give it to your agent.** `fl annotations pull` prints the open notes with the quoted text, file and page URL. Claude Code or Codex can run it and revise your pages; you can also paste the output into ChatGPT or any other agent. `fl annotations resolve` marks notes done.
- **Notes that follow your edits.** Annotations stay on their text when it moves; if you rewrite it, they're marked outdated instead of disappearing.

Learn more in [[annotations|Annotations]].
