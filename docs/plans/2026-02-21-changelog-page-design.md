# Changelog Page Design

Date: 2026-02-21
Status: Approved

## Goal

Ship a public `/changelog` page on the Flowershow website that makes product progress visible and easy to scan, while staying fully content-driven and built with Flowershow-native features.

## Scope

- Use local markdown content files in `content/flowershow-app/changelog/`
- Build the index page as `content/flowershow-app/changelog.mdx`
- Use Obsidian Bases for the changelog listing/query
- Add `/changelog` to top nav and footer product links
- Seed the page with initial entries so it is immediately useful

Out of scope (for this iteration):

- Auto-generation from GitHub Releases, PRs, or external feeds
- New backend routes or API integrations
- New reusable UI components just for changelog

## Architecture

The changelog is implemented as standard Flowershow site content. The route `/changelog` resolves from `content/flowershow-app/changelog.mdx`, and entries live as markdown files inside `content/flowershow-app/changelog/`.

The index page uses a `base` block with:

- `filters` to include only `changelog` folder content
- `sort` by `file.name DESC` so filename date prefixes drive chronology
- a cards view for scannability and image-forward updates

## Content Model

### Changelog Index

File: `content/flowershow-app/changelog.mdx`

- Must be MDX-capable (`.mdx`) to render Bases
- Includes brief intro copy and contributor guidance
- Uses a single Bases query as the canonical listing

### Changelog Entries

Folder: `content/flowershow-app/changelog/`

Filename convention (required): `YYYY-MM-DD-slug.md`

Entry frontmatter:

- `title` (required)
- `description` (recommended)
- `image` (recommended for cards and consistency)

The filename controls ordering; frontmatter controls display content.

## Data Flow

1. Middleware routes `/changelog` to the content site renderer for home domain pages.
2. Renderer resolves `changelog.mdx`.
3. `remark-obsidian-bases` executes the query against site blobs.
4. Results are sorted by filename (descending) and rendered as cards.
5. Card clicks navigate to individual changelog entry pages.

## Validation and Edge Cases

- Malformed filenames still render but may sort incorrectly. We rely on documented naming rules.
- Empty folder renders the built-in “No results found” cards state.
- This iteration does not enforce schema validation at build time.

## Testing Strategy

- Manual verification in local site:
  - `/changelog` resolves and renders
  - cards are sorted newest-first
  - links open the expected entry pages
  - nav and footer links route correctly
- Keep automated tests unchanged for this content-first iteration.

## Future Evolution

- Auto-generate entries from releases/PR labels
- Add template tooling for “new changelog entry”
- Add stronger validation (e.g., filename/date linting)
- Add filters/tags (feature, docs, fix, performance)
