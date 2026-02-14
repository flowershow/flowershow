---
date: 2022-12-30
title: SQLite Content Layer Idea and other thoughts
authors:
  - rufuspollock
---
Here is another set of notes and thoughts.

## SQL(ite) Content Layer idea

First, what's missing re contentlayer.dev or tina.io?

- contentlayer.dev - lot's of good things: pretty simple, typescript kind of stuff giving validation, reloading of content
  - validation is not that useful - forces you to have fields specified
  - no references (foreign keys) - though see https://github.com/contentlayerdev/contentlayer/issues/86
  - queries are just all of a category (and doc can only be one category)
  - mixes in markdown parsing (and rendering) with content layer itself
- tina ...

What happens if we just loaded markdown into an sql(ite) database?

We have loads of tools for accessing this.

We can do proper orm.

If you want easy to get a graphql wrapper

![[excalidraw/contentlayer-db-idea-2022-12-30.excalidraw.svg]]

## SQLite with NextJS

This leads naturally to the question: is it possible to use sqlite _read-only_ in nextjs server-side (or client side)

- client side seems possible use wasm version of sqlite: https://willschenk.com/articles/2021/running_sq_lite_in_the_browser_using_next_js/
- server-side write is not possible (for obvious reasons i.e. there is no persistent storage for nextjs in most deployments)
- hmmm, it is looking more and more feasible at least client side
  - https://github.com/sql-js/sql.js - this is sql in browser though entire database must be in memory
  - https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/ - this adds virtual memory to a file system at a url so that you can have the database on disk somewhere else. Great demo.
    - Aside: interesting associated project is https://github.com/jlongster/absurd-sql which allows us to persist into indexeddb
  - actual demo using nextjs and sql.js https://github.com/sql-js/sql.js/issues/309

Asides

- KeystoneJS (crud for a CMS) can be embedded in nextjs and load sqlite files - https://keystonejs.com/blog/nextjs-keystone
- datasette: how does he bundle the sqlite file onto the server. examples relate to google cloud run.
- Examples of exactly what we want to make easy in terms of data literate documents: https://phiresky.github.io/blog/2021/hosting-sqlite-databases-on-github-pages/

## And some random extras

### Looking at svelte (again)

- svelte is 1.0
- svelte is very nice
- did an experiment ~ 1y ago (?) to try it out and was nice
- supports MDX style stuff
- https://github.com/josh-collinsworth/sveltekit-blog-starter - good starter blog 148⭐

### What i want to do ...

- Create a list of alternatives e.g. github libraries, tools, products, holidays etc.
- data driven documents / data literate documents
  - visualize stuff quickly
  - play with data quickly
  - publish a dataset quickly
  - investigate a topic
- scratchpad for data
