---
title: "URL Redirects"
description: Configure URL redirects to maintain backwards compatibility when moving or renaming pages.
---

## Basic example

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
  The old URL path that should be redirected (starts with `/`).  
  Type: `string`

- **to** (required)  
  The new URL path that visitors should be redirected to (starts with `/`).  
  Type: `string`

Example:
```json
{
  "redirects": [
    { "from": "/blog/old-post", "to": "/blog/new-post" }
  ]
}
```

## Behavior

The redirects feature:
- Performs client-side redirects
- Matches exact paths only (no regex or glob patterns)
