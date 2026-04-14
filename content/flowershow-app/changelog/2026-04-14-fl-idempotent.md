---
title: "`fl` now creates or syncs automatically"
date: 2026-04-14
description: The fl command is now idempotent — run it once to publish, run it again to sync. No separate sync command needed.
authors:
  - olayway
showToc: false
---

`fl` now does the right thing whether or not a site already exists. Run the same command every time:

```bash
fl ./my-notes
```

First run creates the site. Every run after that syncs changes — uploading only new or modified files and removing deleted ones.

## What changed

### No more separate sync step

Previously you needed two different commands:

```bash
# Before
fl ./my-notes           # first publish
fl sync ./my-notes      # every update after
```

Now it's just one:

```bash
fl ./my-notes           # always
```

`fl sync` still works but is deprecated.

### New `--yes` flag for scripts and CI

When creating a new site, `fl` now shows a confirmation prompt with the proposed name and URL. To skip it in automated contexts:

```bash
fl --yes ./my-notes
```

Passing `--name` also skips the prompt.

### Folder mode remembers the site name

After the first publish of a folder, `fl` writes a `.flowershow` file to that folder storing the site name. Subsequent runs pick it up automatically — no need to pass `--name` again.
