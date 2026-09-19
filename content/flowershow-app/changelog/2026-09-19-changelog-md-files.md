---
title: CHANGELOG.md files now render as changelog timelines
date: 2026-09-19
description: A CHANGELOG.md anywhere in your site becomes a timeline page, with an anchor per version.
authors:
  - rufuspollock
showToc: false
---

Publish a project's `CHANGELOG.md` and Flowershow now shows it as a changelog timeline: each version gets its own entry with its date, a link you can share (`/CHANGELOG#1.2.0`), and a **Compare** link when the heading has one. It's also available at `/changelog`.

Keep a Changelog, Changesets, release-please and date-based headings all work without any configuration. To render another file the same way, add `layout: changelog` to its frontmatter. See the [[docs/reference/changelog|changelog docs]] for the details.
