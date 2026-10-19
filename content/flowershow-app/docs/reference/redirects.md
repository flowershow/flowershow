---
title: "URL Redirects"
description: Send visitors from old URLs to new ones when you move or rename pages, including whole folders at once.
---

## Basic example

> [!tip] Dashboard
> Redirects can be configured in the [Flowershow dashboard](https://cloud.flowershow.app) under **Site Settings → Content** — no `config.json` edits needed. Values set in `config.json` take precedence over dashboard settings.

```json
{
  "redirects": [
    { "from": "/old-path", "to": "/new-path" }
  ]
}
```

Add this to your `config.json` file to redirect visitors from `/old-path` to `/new-path`.

## Properties

Each redirect object in the `redirects` array accepts the following properties:
- **from** (required)  
  The old URL path that should be redirected (starts with `/`). End it with `/*` to redirect a whole folder (see [Redirect a whole folder](#redirect-a-whole-folder)).  
  Type: `string`

- **to** (required)  
  Where visitors go instead: a path on your site (`/blog/new-post`) or a full URL (`https://example.com/new-post`). With a `/*` rule, `:splat` is replaced by the rest of the old path.  
  Type: `string`

- **permanent** (optional)  
  Set to `true` once the move is final, so browsers and search engines remember the new URL (a 308 permanent redirect instead of a 307 temporary one).  
  Type: `boolean`  
  Default: `false`

Example:
```json
{
  "redirects": [
    { "from": "/blog/old-post", "to": "/blog/new-post", "permanent": true }
  ]
}
```

## Redirect a whole folder

When you move or rename a folder, one rule covers every page in it. End `from` with `/*`, and put `:splat` in `to` where the rest of the path should go:

```json
{
  "redirects": [
    { "from": "/notes/*", "to": "/garden/:splat" }
  ]
}
```

| Visitor opens | Goes to |
| --- | --- |
| `/notes` | `/garden` |
| `/notes/recipes` | `/garden/recipes` |
| `/notes/recipes/bread` | `/garden/recipes/bread` |
| `/notesbook` | not redirected |

This works for moving a section to another site too:

```json
{ "from": "/handbook/*", "to": "https://handbook.example.com/:splat" }
```

Leave out `:splat` to send the whole folder to one page, for example `{ "from": "/old-blog/*", "to": "/blog" }`.

`*` only works at the end of `from`. Anywhere else it is matched as a literal character.

### Pages that were renamed inside the folder

If some pages in the folder also changed their names, add a rule for each of them **above** the folder rule. Flowershow uses the first rule that matches, in the order they're listed:

```json
{
  "redirects": [
    { "from": "/notes/old-name", "to": "/garden/new-name" },
    { "from": "/notes/*", "to": "/garden/:splat" }
  ]
}
```

## Behavior

- **Your pages always win.** A redirect only applies when nothing is published at the old path. If you add a page back at `/old-path`, visitors see the page, and the redirect for it stops having any effect. This also means a folder rule never hides pages you still have in that folder.
- **First match wins.** Rules are checked in the order they're listed.
- **Redirects happen on the server**, before the page loads, so they also work for search engines and link previews.
- Paths are matched as written: `/Old-Path` and `/old-path` are different paths.
