# Job stories overview

**Overall vision: Instant publishing**. When I have a Markdown file, folder, image, or PDF on my machine, I want to publish it to a public (or private) URL in seconds, so that sharing it is faster than using Google Drive or similar tools.

* Time-to-live measured in seconds.  
* Single command (CLI) or single drag-and-drop (desktop/UI).  
* Authentication required, but frictionless (GitHub / Google).

## CLI publish

- **JS 2 + 3 Publish a file or folder**: Publish a single Markdown file or a folder 
- **JS 4 Republish a file / folder (or just publish something to an existing project)** with stable URLs, so I can get a site quickly and iterate without breaking links.

---
---

# Future

## UX speed aspects

- **JS5 — Preset-driven site behavior**
- **JS8 — Immediate availability with progressive processing**: when i publish a file or folder is is available asap, while processing continues in the background (with some notice in UI). ❓ this needs some real shaping
  - **Misc: speed to live** make processing as fast as possible.

## Versioned publishing

- **JS9 — Versioned publishing**: Create a unique, shareable URL per publish, so I can reference or preview specific states.
- **JS10 — Canonical pinning and rollback**: Repoint the canonical URL to earlier versions, so recovery from mistakes is simple and safe.

## UI alternatives

- JS-NEW — Web UI publishing: Publish via a simple web UI instead of the CLI, so I can use the same workflow without local tooling.

## Processing pipelines and new content types

- JS13 — Pluggable processing for more content types: Publish formats beyond Markdown with appropriate processing and rendering, so those formats are as easy to publish as Markdown.
- JS14 — datasets etc

---

# Already supported

- Render the uploaded files 😉
- JS11 Custom domains (already supported via the UI)
- JS12 Git-based publishing (via the UI)
