---
title: Bases Feature Coverage
syntaxMode: mdx
---

# Bases Feature Coverage

Fixtures exercising Obsidian Bases features added in Sep 2026:
empty-filter default, `file.hasTag`, date + duration arithmetic, extra
`file.*` properties, `file.hasLink`, and `file.backlinks`.

## Everything

No filters at all — should include the whole vault (books *and* root pages),
not an empty result.

```base
views:
  - type: list
    name: "Everything"
    order:
      - file.name
```

## Favorites

`file.hasTag("favorite")` narrows the books, and the formula columns exercise
`file.tags`, `file.basename`, and date + duration arithmetic (`date(added) + "1M"`).

```base
filters:
  and:
    - file.inFolder("books")
    - file.hasTag("favorite")
formulas:
  tag_list: 'file.tags.join(", ")'
  basename: 'file.basename'
  deadline: '(date(added) + "1M").format("YYYY-MM")'
views:
  - type: table
    name: "Favorites"
    order:
      - file.name
      - author
      - formula.tag_list
      - formula.basename
      - formula.deadline
```

## Linked to target

`file.hasLink("backlinks-target")` — every note that links to the backlinks
target should appear (the three seeded sources), and nothing else.

```base
filters:
  and:
    - file.hasLink("backlinks-target")
views:
  - type: list
    name: "Linked to target"
    order:
      - file.name
```

## Backlink count

`file.backlinks` on the target resolves the incoming links; `.unique().length`
collapses the duplicated link rows to the three distinct sources.

```base
filters:
  and:
    - file.name == "backlinks-target"
formulas:
  incoming: "file.backlinks.unique().length"
views:
  - type: table
    name: "Backlink count"
    order:
      - file.name
      - formula.incoming
```
