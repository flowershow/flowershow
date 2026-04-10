---
title: How to publish Markdown files from the terminal with the Flowershow CLI
description: A step-by-step tutorial covering installation, publishing, syncing changes, and managing your sites from the command line.
date: 2026-04-10
authors:
  - olayway
image: "[[publish-from-cli.png]]"
---

This tutorial walks through everything you need to go from a local folder of Markdown files to a live website — using only your terminal.

By the end you'll know how to publish files, push updates incrementally, preview changes before applying them, and manage your sites.

## What you need

- A Flowershow account (sign up for free at [flowershow.app](https://flowershow.app))
- Some Markdown files you want to publish

---

## 1. Install the CLI

Download the `fl` binary for your platform from the [releases page](https://github.com/flowershow/flowershow/releases).

**macOS (Apple Silicon)**
```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_darwin_arm64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**macOS (Intel)**
```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_darwin_amd64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**Linux (amd64)**
```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_linux_amd64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**Windows** — download `fl_windows_amd64.zip` from the Releases page and add the extracted binary to your `PATH`.

Verify it worked:

```bash
fl --version
```

---

## 2. Log in

Authenticate with your Flowershow account. This uses a browser-based device flow — the CLI will print a URL and a short code, you visit the URL, enter the code, and you're done.

```bash
fl login
```

Your token is saved to `~/.flowershow/token.json`, so you only need to do this once. To check you're logged in at any point:

```bash
fl whoami
```

---

## 3. Publish your first site

### From a folder

The most common case: a folder of Markdown files.

```bash
fl ./my-notes
```

The CLI will:

1. Scan everything inside `./my-notes`
2. Create a new site named after the folder
3. Upload all the files
4. Give you a URL like `https://my.flowershow.app/@{username}/my-notes`

### From a single file

You can also publish just one file:

```bash
fl ./intro.md
```

The site will be named after the file (`intro`).

### With a custom site name

If you don't want the site named after your folder, use `--name`:

```bash
fl --name project-docs ./my-notes
```

Remember the name you used — you'll need it when syncing.

### Overwriting an existing site

If you run `fl` on a folder that already has a site, you'll get an error. Use `--overwrite` to replace it:

```bash
fl --overwrite ./my-notes
```

> **Tip:** `--overwrite` re-uploads everything. If you're just pushing edits, `sync` (covered next) is much faster.

---

## 4. Sync changes

Once your site is published, use `sync` to push updates. It compares your local files against what's on the server using SHA-1 hashes and uploads only what changed.

```bash
fl sync ./my-notes
```

If you used a custom name when publishing:

```bash
fl sync --name project-docs ./my-notes
```

### Preview before syncing

Not sure what changed? Use `--dry-run` to see the plan without touching anything:

```bash
fl sync --dry-run ./my-notes
```

You'll see which files would be uploaded, updated, or deleted.

### See everything, including unchanged files

By default, sync only shows files that need attention. To see the full picture:

```bash
fl sync --verbose ./my-notes
```

---

## 5. Manage your sites

### See all your published sites

```bash
fl list
```

This shows each site name, its URL, and when it was created and last updated.

### Delete a site

```bash
fl delete my-notes
```

You'll be asked to confirm. Sites with an active premium subscription can't be deleted until the subscription is cancelled first.

---

## File filtering

The CLI is smart about what it includes:

- If your folder has a `.gitignore`, those patterns are respected
- Without a `.gitignore`, common clutter is ignored automatically: `node_modules/`, `.git/`, `.env` files, build output (`dist/`, `build/`, `.next/`), and OS files (`.DS_Store`, `Thumbs.db`)

Your folder needs at least one `.md`, `.mdx`, or `.html` file — if it doesn't have any, publish will stop with an error.

---

## Putting it together: a typical workflow

Here's what a day-to-day workflow looks like once you're set up:

```bash
# First time
fl login
fl --name meeting-notes ./notes

# Every time after
fl sync --name meeting-notes ./notes
```

That's it. Write in your editor, run sync, share the URL.

---

## Common errors

| Error | What to do |
|-------|------------|
| "You must be authenticated" | Run `fl login` |
| "Site already exists" | Add `--overwrite`, or use `fl sync` if you want to update |
| "Site not found" during sync | Run `fl list` to check the name, then add `--name` if needed |
| "No markdown files found" | Make sure the folder has at least one `.md`, `.mdx`, or `.html` file |
