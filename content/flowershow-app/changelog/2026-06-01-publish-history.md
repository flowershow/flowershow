---
title: "Publish history and reliable site status"
date: 2026-06-01
description: Every publish now has a permanent record — when it happened, what triggered it, which files changed, and whether it succeeded. Site status is derived from these records instead of polling GitHub, eliminating the flicker between Success and Outdated.
authors:
  - olayway
showToc: false
---

Until now, Flowershow had no record of publishing events. You could see whether your site was up to date, but you couldn't see *when* it was last published, *what* changed, or *why* something might have gone wrong. Errors were overwritten on the next publish, so diagnosing a broken site meant guessing.

That changes today. Every publish — whether triggered by a GitHub push, the CLI, the Obsidian plugin, or a drag-and-drop upload — now creates a permanent record you can inspect from the dashboard.

## Publish history

A new **History** tab in your site settings shows a chronological list of every publish. Each entry displays:

- **Status** — Success, Error, Pending, or Canceled
- **Source** — GitHub, CLI, Obsidian, or Dashboard
- **Timestamp** — when the publish started
- **Commit** — for GitHub-connected sites, the commit SHA and message that triggered the push
- **File summary** — counts of added, updated, deleted, and errored files

Expand any entry to see the full per-file breakdown: what changed, and whether each file was processed successfully or failed (with the error message).

### Canceled publishes

If a publish is interrupted mid-flight — for example, because a second push arrives while the first is still syncing — the incomplete publish is marked **Canceled** rather than left stuck as Pending forever. Files that made it through before the interruption show as successful; files that didn't are marked canceled. You can see exactly where it was cut off.

## More accurate site status

Previously, status for GitHub-connected sites was computed by polling the GitHub tree API every 10 seconds and comparing SHA values. This caused a visible flicker (Success → Outdated → Success) as the comparison raced against the database write, and used GitHub API quota on every open dashboard tab.

Status is now derived directly from the latest publish's file records. No polling, no flicker, no wasted API calls.

## Manual sync removed

The manual Sync button and the *Auto-sync* toggle have been removed. GitHub-connected sites always sync automatically on every push — this was already the case for over 98% of sites, and the toggle added complexity without meaningful benefit.
