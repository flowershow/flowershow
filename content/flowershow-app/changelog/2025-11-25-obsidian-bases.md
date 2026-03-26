---
title: "Obsidian Bases queries now render on your published site"
date: 2025-11-25
description: Flowershow now renders Obsidian Bases blocks live — query your vault, display results as tables, cards, or lists, with filters and formulas intact.
authors:
  - The Flowershow Team
image: "[[assets/obsidian-bases-cards.png]]"
---

Obsidian's Bases feature turns your vault into a queryable database — filter notes by frontmatter, compute formulas, and display results as tables, galleries, or lists. Now those same views render live on your published Flowershow site. No extra setup, no static exports — the query runs on your site just like it does in Obsidian.

![Flowershow changelog powered by Obsidian Bases](https://screenshotit.app/flowershow.app/changelog@social)
*This changelog page is itself powered by a Bases cards block, sorting entries by filename date.*

## Three view types

**Table** — display notes as rows with sortable columns, computed summaries (sum, average, min, max, count), and linked titles.

**Cards** — gallery grid with configurable card width, image support, aspect ratios, and custom field ordering. Ideal for books, projects, and media collections.

**List** — simple bulleted index for reading lists, indexes, or lightweight enumerations.

Switch between views with a dropdown if you define more than one.

## Filters and formulas

Bases queries support the same expression syntax you use in Obsidian:

```yaml
filters:
  and:
    - file.inFolder("notes")
    - status != "archived"
formulas:
  readingTime: (wordCount / 200).ceil()
views:
  - type: table
    name: All notes
    summaries:
      wordCount: sum
```

Filter on any frontmatter property, file path, folder, or extension. Use `and`, `or`, and `not` to compose logic. Formulas support date math, string methods, conditionals, and 100+ built-in functions.

## Getting started

Bases blocks require MDX parsing mode. Set it once in your `config.json`:

```json
{
  "syntaxMode": "mdx"
}
```

Or per-page in frontmatter:

```yaml
---
syntaxMode: mdx
---
```

Then add a `base` code block anywhere on the page:

````
```base
filters: file.inFolder("posts")
views:
  - type: cards
    name: Latest posts
    sort:
      - property: date
        direction: DESC
```
````

This is a beta release. We're tracking the Obsidian Bases spec closely and adding support for new view types and functions as the feature matures.
