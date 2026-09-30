---
title: "Safer publishing with fl: no more silent overwrites"
date: 2026-09-30
description: fl no longer overwrites an existing site just because a new folder has the same name, adds an explicit --overwrite flag, and now exits non-zero on every failure.
authors:
  - rufuspollock
showToc: false
---

**No more silent overwrites.** Previously, publishing a folder that wasn't linked to a site yet (no `.flowershow` file) would sync straight into any existing site with the same name, deleting that site's files that weren't in your folder, with no prompt. Now `fl` stops and warns you, naming the existing site and its URL, and asks whether to overwrite it or pick a new name.

**`--yes` no longer means "overwrite".** `--yes` only skips the new-site name prompt. If a scripted or agent run would overwrite an existing site, `fl` exits with an error and suggests `--name <new-name>` or the new `--overwrite` flag, which you pass when you really do want to replace that site's content. Folders that are already linked keep syncing as before.

**Reliable exit codes.** Every `fl` failure (not logged in, path or site not found, refused overwrite, API or upload errors) now exits non-zero, and `fl whoami` exits 1 when you're not logged in, so CI, scripts and AI agents can tell when something went wrong.

Update with the install script and see [[cli#name-collisions|the CLI reference]] for details.
