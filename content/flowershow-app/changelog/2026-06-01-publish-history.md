---
title: "Publish history"
date: 2026-06-01
description: Every publish now has an entry in the history log — when it happened, what triggered it, which files changed, and whether it succeeded.
authors:
  - olayway
showToc: false
---

The dashboard showed you a "last published" timestamp and, for GitHub-connected sites, a sync status badge. What it couldn't tell you was anything about individual publishes: what files changed, what went wrong on a specific run, or what happened across multiple publishes over time.

Every publish — whether triggered by a GitHub push, the CLI, the Obsidian plugin, or a drag-and-drop upload — now gets a history entry you can inspect from the dashboard.

## Publish history

A new **History** tab in your site settings shows a chronological list of every publish. Each entry displays:

- **Status** — Success, Error, Pending, or Canceled
- **Source** — GitHub, CLI, Obsidian, or Dashboard
- **Timestamp** — when the publish started
- **Commit** — for GitHub-connected sites, the commit SHA and message that triggered the push
- **File summary** — counts of added, updated, and deleted files

Expand any entry to see the full per-file breakdown: what changed, and whether each file was processed successfully or failed (with the error message).

## Consistent status across all publish paths

The status badge now shows **Published** and **Publishing...** for all publishing paths — GitHub, CLI, Obsidian, and Dashboard. Previously, GitHub-connected sites showed "Synced" and "Syncing..." while all other paths showed "Published" and "Publishing...".

For GitHub-connected sites this is also a behaviour change. Previously, the Published status was computed by comparing your site's stored tree SHA against the current GitHub repository tree — a live API call on every dashboard refresh. This caused a visible flicker (Synced → Outdated → Synced) and used GitHub API quota on every open tab.

Published is now derived from the latest publish's file records instead. No live GitHub comparison, no flicker. The trade-off: if you suspect a push didn't trigger a publish, the status badge won't reflect that directly — open the History tab to check whether a publish was created for that commit.

## Manual sync removed

The manual Sync button and the *Auto-sync* toggle have been removed. GitHub-connected sites always sync automatically on every push — this was already the case for over 98% of sites, and the toggle added complexity without meaningful benefit.
