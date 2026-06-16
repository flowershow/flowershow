# ADR 0007: Raw file access via extension suffix

**Status**: Accepted

## Context

Flowershow renders page files (`.md`, `.mdx`, `.canvas`) inside the site layout at extension-free URLs (e.g. `/My+Notes/Cool+Article`). Automated tools (primarly AI agents) need access to the raw source of those files — the underlying markdown or MDX — without the layout.

Additionally, raw assets (`.jpg`, `.pdf`, `.html`, etc.) are always served as raw files regardless of how their URLs are formed.

Alternatives considered for raw page-source access:

- Extension suffix (current) — the raw URL is trivially derived from the page URL by appending the original extension; no DB lookup required
- `?raw=true` query parameter — better UX for humans (no extension knowledge required), but forces a DB lookup on every raw request (slug → blob → original path) since the file path can no longer be inferred from the URL alone. Rejected because the primary consumers are automated tools that already know file types, and the extra DB round-trip on every raw request is not worth it.

## Decision

Any request whose URL path ends with a recognized file extension is served as a raw file via `/api/raw/...`. The rule is uniform — there is no distinction between "raw page source" and "raw asset": both use the same mechanism.

The recognized extensions are maintained as a whitelist (`KNOWN_FILE_EXTENSIONS`) in the middleware. Page file extensions (`.md`, `.mdx`, `.canvas`) are included in this whitelist alongside asset extensions (`.jpg`, `.pdf`, etc.).

Examples:

- `/My+Notes/Cool+Article` → rendered page
- `/My+Notes/Cool+Article.md` → raw markdown source
- `/My+Notes/image.jpg` → raw image file
- `/My+Notes/about.html` → raw HTML file
- `/My+Notes/some` → rendered page with canvas
- `/My+Notes/some.canvas` → raw canvas file

### Why `.canvas` files are treated as page files

Obsidian canvas files (`.canvas`) are JSON files describing a visual node-and-edge diagram. Rather than serving them as raw JSON, Flowershow renders them as interactive visual pages **inside the site layout** — the same way it renders markdown. This means `.canvas` files get the same URL slug treatment as `.md`/`.mdx`: the extension is stripped and the file is routed to the page renderer. The canonical page URL for `My Canvas.canvas` is `/My+Canvas` (no extension), and the raw canvas JSON is accessible at `/My+Canvas.canvas`.

## Consequences

- Raw access URLs are easy to construct: append the original file extension to the page slug.
- Page file extensions must be kept in sync between `KNOWN_FILE_EXTENSIONS` (middleware) and the page file type list used in slug computation. Adding a new page file type requires updating both.
- URL paths without a recognized extension are always treated as page requests (catch-all route). A file with an unrecognized extension in `KNOWN_FILE_EXTENSIONS` would silently fall through to the page route and 404.
