---
title: Publish without an account
date: 2026-09-30
description: Run fl --anon to put a folder online with no signup, then claim it to keep it.
authors:
  - rufuspollock
image: "[[assets/changelog-publish-without-an-account.webp]]"
showToc: false
---

You can now publish with `fl --anon ./folder` and no account. You get a live link straight away, and a claim link to keep the site. Handy for trying Flowershow, and for AI agents that can't log in for you. See [[cli#publish-without-an-account|Publish without an account]].

- **Live in seconds:** the site gets a random `…-anon.flowershow.me` URL.
- **Claim it to keep it:** anonymous sites expire after 7 days. Open the claim link, sign in or sign up, and the site moves into your account.
- **Re-run to update:** running `fl --anon` on the same folder updates the same URL.
- **Limits:** 200 files and 50 MB per site.

**Also**

- Set `FLOWERSHOW_TOKEN` to a personal access token to use `fl` without `fl login`, for CI and cloud agents. See [[cli#environment-token|Environment token]].
- Agents using the updated [Flowershow skill](/docs/agents/skills) can offer `--anon` when you just want a link now.

**Fixes**

- Expired anonymous sites stop being served immediately, not only after cleanup.
- Anonymous sites are marked `noindex`, so search engines don't index them.

Requires `fl` 2.5.0 or later. Upgrade with the steps in [[cli#upgrade|Upgrade]].
