---
title: Reply to comments and resolve them on the page
date: 2026-11-07
description: Comments on your drafts are now conversations. Reviewers and authors can reply, anyone can resolve a point when it's dealt with, and your AI agent can reply and resolve with fl.
authors:
  - rufuspollock
image: "[[assets/changelog-reply-and-resolve-comments.webp]]"
showToc: false
---

When [[annotations|annotations]] are on, a comment no longer has to be the last word. Answer a reviewer's question, explain why you kept a sentence, or let your agent say what it changed, all next to the words in question.

- **Reply on the page.** Click **Reply** under any comment. No account needed, and your name is remembered. Replies from the site owner show an **Author** badge.
- **Anyone can resolve.** When a point has been dealt with, click **Resolve**. The comment moves to the **Resolved** group with who resolved it, and its highlight goes. **Reopen** brings it back. Deleting is still for the site owner only.
- **Your agent closes the loop.** `fl annotations reply <id> -m "…"` answers a comment, and `fl annotations resolve <id> -m "Added an example"` replies and resolves in one step. `fl annotations pull` now includes each comment's replies. Needs `fl` 2.10.0 or later.

**Fixes**

- The comments panel now runs the full height of the window on wide screens, above the site's navigation, and uses your site's interface font. Writing a comment and the list of comments are quieter and easier to read.
