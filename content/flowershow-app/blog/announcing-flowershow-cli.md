---
title: Publishing a local Markdown file shouldn’t feel like starting a project
description: Publish markdown files directly from your terminal with the new Flowershow CLI.
date: 2026-01-14
authors:
  - abeelha
image: "[[cli-launch.png]]"
---

Most things we write never turn into projects.

They’re notes, drafts, short explanations, half-finished ideas. Files that live locally and are good enough to share, but not worth setting up properly yet.

Until now, publishing usually meant extra steps: creating a repo, syncing content, logging into a dashboard, deciding where it belongs.

The Flowershow CLI is for a simpler case.

You already have a local file.
You want it accessible on the web.
You don’t want a UI.
You don’t want to make more decisions.

With the CLI, you install it, run `publish`, and get a real URL.

Nothing else required.

---

**Get started in 3 steps**

1. Install
```bash
npm i -g flowershow-publish
```

2. Login
```bash
publish auth login
```

3. Publish
```bash
publish ./my-folder
```

And that’s it 💐

You'll get a URL that's ready to share.

▶️ **Watch the short demo video:**

https://www.youtube.com/watch?v=ou1bigOIlPk

📖 **Explore the docs for all available commands and options:** https://flowershow.app/docs/cli (or run `publish --help`)

---

This isn’t meant to replace the UI.

The CLI is for people who are already comfortable in the terminal and want publishing to feel lightweight, reversible, and fast. It’s currently in beta, requires a Node.js environment, and comes with a small learning curve if terminal tools are new to you.

But if you’ve ever thought “I just want this file on the web”, this exists for that exact moment.
