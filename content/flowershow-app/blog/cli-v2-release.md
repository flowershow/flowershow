---
title: Flowershow CLI V2
description: Flowershow CLI V2 is a single binary that requires nothing else. Run `fl`, your notes are online.
date: 2026-04-13
---

Today we're releasing Flowershow CLI V2 — a complete rewrite that removes the two biggest sources of friction in getting your notes online: a complicated install process and a confusing two-command workflow.

## The problem with V1

Publishing notes with the old CLI required Node.js v20+, an npm global install, and knowing which command to use at which time:

```bash
# Install — requires Node.js v20+ already installed
npm install -g @flowershow/publish

# First publish
publish ./my-notes

# Made a change? You need a different command.
publish sync ./my-notes

# Forgot and ran publish again?
# Error: "Site already exists. Use --overwrite or run sync instead."

# Want to log in? Nested under an auth subcommand.
publish auth login
publish auth logout
publish auth status
```

Non-developers hit a wall at `npm install -g`. Everyone hit a wall at the publish/sync split. The error on re-run was the most commonly reported friction point. Nobody should have to think this hard about getting their notes online.

---

## What's new in V2

### One command. Always works.

```bash
fl ./my-notes
```

Whether it's your first time or your hundredth, `fl` does the right thing — no flags, no switching commands, no errors on re-run.

### Simpler install

V2 is written in Go and ships as a single self-contained binary. No Node.js, no npm, no `node_modules`. One command and you're done:

**macOS / Linux:**

```bash
curl -fsSL https://flowershow.app/install.sh | sh
```

**Windows:** download the zip from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page and add the binary to your PATH.

Works in CI pipelines and scripts. Works on machines that have never seen a `package.json`.

---

## Publishing: full reference

### Publishing a folder

```bash
fl ./my-notes
```

**First run:** `fl` prompts you to confirm the site name and URL before creating anything. If you don't like the auto-derived name, type a new one and press Enter.

```
Creating new site: my-notes
URL: flowershow.app/username/my-notes

Change name? (press Enter to confirm, or type a new name): _
```

After a successful publish, `fl` writes a small `.flowershow` config file to the folder:

```json
{ "siteName": "my-notes" }
```

**Every subsequent run:** `fl` reads the config, skips the prompt, and syncs only what changed — new, modified, and deleted files. No full re-upload.

**With a custom name:**

```bash
fl --name my-awesome-site ./my-notes
```

Skips the prompt (you were explicit about the name) and uses `my-awesome-site` as the site name. The name is saved to `.flowershow` for future runs.

**For scripts and CI (skip the prompt):**

```bash
fl --yes ./my-notes
```

### Publishing a single file

```bash
fl ./my-note.md
```

Site name is derived from the filename (`my-note`). First run shows the confirmation prompt. No `.flowershow` config is written — every run re-uploads the file. With `--name` or `--yes` to skip the prompt:

```bash
fl --name my-note --yes ./my-note.md
```

### Publishing multiple files

```bash
fl ./file1.md ./file2.md ./file3.md
```

Site name is derived from the first file. No `.flowershow` config is written — every run re-uploads all listed files. Use `--name` to set an explicit name, `--yes` to skip the prompt.

---

## Authentication

```bash
fl login
fl logout
fl whoami
```

**What changed:** Auth commands are now top-level instead of nested under `auth`. The namespace added no value. `auth status` is renamed to `whoami` — more intuitive and consistent with other CLI tools.

---

## Site management

```bash
fl list
fl delete my-notes
```

No functional change — just the new binary name.

---

## Full before/after summary

| Action                                                                    | V1                                                            | V2                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Install                                                                   | `npm install -g @flowershow/publish` (requires Node.js v20+)  | `curl … \| sh` (or download ZIP on Windows)     |
| First publish (folder)                                                    | `publish ./my-notes`                                          | `fl ./my-notes` (with name confirmation prompt) |
| First publish, custom name                                                | `publish --name my-site ./my-notes`                           | `fl --name my-site ./my-notes`                  |
| Update after changes                                                      | `publish sync ./my-notes`                                     | `fl ./my-notes` (same command!)                 |
| Re-running publish when site already exists                               | Error: "Site already exists" — needed `--overwrite` to bypass | Just works and publishes diff — no flag needed  |
| Force full re-upload on existing site (e.g. to recover from broken state) | `publish --overwrite ./my-notes`                              | Not needed — `fl` handles this automatically    |
| Non-interactive / CI (skip first-run confirmation prompt)                 | No prompt existed — `--overwrite` was used as a workaround    | `fl --yes ./my-notes`                           |
| Publish a single file                                                     | `publish ./my-note.md`                                        | `fl ./my-note.md`                               |
| Publish multiple files                                                    | `publish ./a.md ./b.md`                                       | `fl ./a.md ./b.md`                              |
| Log in                                                                    | `publish auth login`                                          | `fl login`                                      |
| Log out                                                                   | `publish auth logout`                                         | `fl logout`                                     |
| Show current user                                                         | `publish auth status`                                         | `fl whoami`                                     |
| List sites                                                                | `publish list`                                                | `fl list`                                       |
| Delete a site                                                             | `publish delete my-site`                                      | `fl delete my-site`                             |

**Removed in V2:** `--overwrite` (no longer needed — `fl` is idempotent) and `fl sync` (deprecated alias — prints "use `fl` instead").

---

## Who this is for

**Writers and researchers** who just want their notes online and don't want to manage a dev environment. Install once, run one command, never think about it again.

**Developers** who want to publish from scripts or CI without fighting with Node version managers or remembering which subcommand to use.

**AI agents** automating note publishing. A dependency-free binary with a single idempotent command is exactly what agents need — no runtime, no state management, no error handling for "wrong command" cases.

---

## Get started

Flowershow CLI V2 is available today.

```bash
curl -fsSL https://flowershow.app/install.sh | sh
fl login
fl ./my-notes
```

Full documentation at [flowershow.app/docs/cli](https://flowershow.app/docs/cli).
