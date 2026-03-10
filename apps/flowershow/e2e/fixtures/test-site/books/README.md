---
title: My Book Collection
syntaxMode: mdx
---

# Books

A collection of books tracked with Obsidian Bases.

## Table View

```base
filters:
  file.inFolder("books")
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
  file.inFolder("books")
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
  file.inFolder("books")
views:
  - type: list
    name: "Reading List"
    order:
      - file.name
      - author
      - status
```
