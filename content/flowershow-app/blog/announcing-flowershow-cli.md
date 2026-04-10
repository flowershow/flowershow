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

With the CLI, you install it, run `fl`, and get a real URL.

Nothing else required.

---

**Get started in 3 steps**

1. Install — download the `fl` binary from the [releases page](https://github.com/flowershow/flowershow/releases), e.g.:
```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_darwin_arm64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

2. Login
```bash
fl login
```

3. Publish
```bash
fl ./my-folder
```

And that’s it 💐

You’ll get a URL that’s ready to share.

▶️ **Watch the short demo video:**

https://www.youtube.com/watch?v=ou1bigOIlPk

📖 **Explore the docs for all available commands and options:** https://flowershow.app/docs/cli (or run `fl --help`)

---

This isn’t meant to replace the UI.

The CLI is for people who are already comfortable in the terminal and want publishing to feel lightweight, reversible, and fast. It’s a single binary — no runtime required.

But if you’ve ever thought “I just want this file on the web”, this exists for that exact moment.
