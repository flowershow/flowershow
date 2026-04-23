---
title: Publishing from the Terminal
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

**macOS / Linux** — run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh
```

**Windows** — download `fl_windows_amd64.zip` from the [releases page](https://github.com/flowershow/flowershow/releases) and add the extracted binary to your `PATH`.

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

For folder mode, the name is saved to a `.flowershow` file inside your folder after the first publish. Subsequent `fl ./my-notes` runs read it automatically — you only need `--name` once.

### Skipping the confirmation prompt

When creating a new site, `fl` shows a prompt with the proposed name and URL so you can accept or change it. To skip this (useful in scripts):

```bash
fl --yes ./my-notes
```

### Running `fl` on an already-published folder

`fl` is idempotent. If the site already exists, it syncs changes instead of erroring. Just run the same command every time — no special flags needed.

---

## 4. Push updates

After making changes to your files, just run `fl` again:

```bash
fl ./my-notes
```

That's it. `fl` compares your local files against what's on the server using SHA-1 hashes and only uploads what changed. For folder mode it remembers the site name via the `.flowershow` file, so no flags needed.

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
fl --name meeting-notes ./notes   # creates the site, saves name to .flowershow

# Every time after
fl ./notes                         # detects existing site and syncs changes
```

That's it. Write in your editor, run `fl`, share the URL.

---

## Common errors

| Error | What to do |
|-------|------------|
| "You must be authenticated" | Run `fl login` |
| "No markdown files found" | Make sure the folder has at least one `.md`, `.mdx`, or `.html` file |
