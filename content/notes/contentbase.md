---
date: 2023-03-06
---

# ContentBase

A database where the raw objects are "content" e.g. text files.

In its essence, a database is the data plus an index (plus schema ie. structure for the data it contains).

Emphasize that this is not about searching the text.

What about document database? Document databases are just databases where the record type is not tabular but rather can have a nested structure. Crudely think json rather than csv.

Remember: all databases at some level are the same. (Turing completeness for DBs 😉). What distinguishes them is what they are optimized for.

Aside: storage is probably hybrid. text files etc plus assets.

## Architecture

What are the key components of a ContentBase? Same as a database.

![](../Excalidraw/contentbase-components-2023-03-06.excalidraw.svg)
