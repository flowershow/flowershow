---
title: "Obsidian Bases: tag & link filters, date math, and more file properties"
date: 2026-09-18
description: Bases queries now support tag and link filters, date + duration arithmetic, and more file properties — plus an empty query now returns your whole vault.
authors:
  - olayway
showToc: false
---

We've closed several gaps in our Obsidian Bases support, so more of your existing queries now render on your published site exactly as they do in Obsidian.

**Query the whole vault by default.** A Bases block with no `filters` now returns every page on your site, matching Obsidian's default — instead of an empty result.

**Tag and link filters.** You can now filter on tags and links:

```yaml
filters:
  or:
    - file.hasTag("book")
    - file.hasLink("Reading List")
```

`file.hasTag()` matches nested frontmatter tags too — `hasTag("book")` also matches `book/fiction`.

**Date + duration arithmetic.** Formulas can now add and subtract durations from dates:

```yaml
formulas:
  deadline: '(date(start) + "2w").format("YYYY-MM-DD")'
  isRecent: 'file.mtime > now() - "1 week"'
```

Durations support `y` / `M` / `w` / `d` / `h` / `m` / `s` units, including compound values like `"1y2M3d"`, and the `duration()` function. Month and year math is calendar-aware.

**More file properties.** `file.mtime`, `file.ctime`, `file.tags`, `file.basename`, `file.links`, and `file.backlinks` now resolve in filters and formulas — so you can sort by last-modified time, list a note's outgoing links, or count its backlinks.

```yaml
formulas:
  backlinkCount: file.backlinks.unique().length
```

More of the Bases spec is on the way. See the full [Bases documentation](/docs/reference/obsidian-bases) for what's supported today.
