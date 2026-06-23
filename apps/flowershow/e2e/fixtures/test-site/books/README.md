---
title: My Book Collection
syntaxMode: mdx
---

# Books

A collection of books tracked with Obsidian Bases.

## Table View

```base
filters:
  and:
  - file.inFolder("books")
  - file.name != "README"
views:
  - type: table
    name: "All Books"
    order:
      - file.name
      - author
      - year
      - genre
      - rating
      - status
```

## Cards View

```base
filters:
  and:
  - file.inFolder("books")
  - file.name != "README"
views:
  - type: cards
    name: "Bookshelf"
    image: note.image
    cardSize: 190
    imageAspectRatio: 1.6
    order:
      - file.name
      - author
      - genre
```

## List View

```base
filters:
  and:
  - file.inFolder("books")
  - file.name != "README"
views:
  - type: list
    name: "Reading List"
    order:
      - file.name
      - author
      - status
```
