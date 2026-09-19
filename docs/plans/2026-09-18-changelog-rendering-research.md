# Changelog Rendering: Research and Inspiration

Date: 2026-09-18
Status: Research (feeds the changelog rendering design spec)

Blog-post seed: "How to build a really good changelog page — what the best sites do, and how we brought it to Flowershow out of the box."

## Why

Changelogs are among the most common documents in software projects, yet most static site and docs tools render a `CHANGELOG.md` as a wall of headings and bullets. Flowershow should render changelogs beautifully out of the box, both as a single `CHANGELOG.md` file and as a `changelog/` folder of dated entries (like a blog).

Prior art in this repo: the Flowershow product changelog at `/changelog` (`content/flowershow-app/changelog/`, design in `2026-02-21-changelog-page-design.md`) is hand-built from a folder plus the generic `<List>` component. It works, but it's a list of links rather than a changelog experience. That gap is exactly what this feature fills.

No existing GitHub issues or beads cover generic changelog rendering (checked 2026-09-18).

## The three patterns

| Pattern | Examples | Index shows | Detail page |
|---|---|---|---|
| Full-entry timeline | Linear, Raycast, Mintlify | Every entry in full: date/version, hero image, prose, then New / Improvements / Fixes sublists | Permalink per entry |
| Excerpt list | Vercel, GitHub Changelog | Date, title, 1–2 line summary, "Learn more" | Full entry |
| Dense log | Supabase, Clerk, Keep a Changelog | Date, type badge (Feature/Fix/Breaking), short body | Optional |

**Our preference: the full-entry timeline**, taking Linear and Mintlify as primary inspiration. You can read the changelog without clicking through, and it still has permalinks for sharing.

## Site notes

### Linear — linear.app/changelog

- Date shown prominently above a descriptive title (e.g. "Loops for product management").
- Hero image or video per entry, then full prose with thematic subsections.
- Each entry ends with "Fixes" / "Improvements" (and sometimes "Keyboard shortcuts", "API") bullet lists: the headline feature gets prose, the long tail gets bullets.
- Per-entry permalinks: `/changelog/2026-09-14-loops-for-product-management` (date-prefixed slug, same as our folder filename convention).
- Paginated: "Older updates" → `/changelog/page/2`.
- Top-level filter tabs (Changelog, Product launches, …) and search.

### Mintlify — `<Update>` component

- The changelog is a single MDX page made of stacked `<Update label="2024-10-11" description="v0.1.0" tags={[...]}>` blocks.
- The label (date) sits in a **sticky left column**, with content on the right. This gives a timeline feel with no extra chrome.
- Each update gets an automatic anchor, so it can be linked.
- `tags` drive filters in the right-hand panel.
- RSS is generated automatically from updates, and an `rss` prop overrides the title/description for the feed.
- Lesson: a single-file changelog can feel as good as a folder-based one if each entry is a first-class, anchored, styled block.

### Raycast — raycast.com/changelog

- Version number (e.g. "v2.4") plus date, with a hero image per release.
- Full content on the index, with emoji-marked sections: ✨ New, 💎 Improvements, 🐞 Fixes.
- Per-version permalinks: `/changelog/macos/2.4`, with numbered pagination.

### Vercel — vercel.com/changelog

- Excerpt pattern: date, title, one-line summary, authors, "Learn more".
- Paginated at `/changelog/page/2`. Very scannable, but you must click through to understand anything.

### GitHub Changelog — github.blog/changelog

- Grouped by month, with labels Release / Improvement / Retired and product-area filters.
- Headlines only on the index. RSS, social and newsletter subscription are prominent.

### Supabase / Clerk

- Dense timeline: date, category badge (New Feature / Improvement / Breaking Change / Deprecation), service tags, and a short body.
- Breaking changes and deprecations are visually distinct and include deadlines.

## Single-file formats in the wild

### Keep a Changelog (keepachangelog.com, v1.1.0)

```md
## [Unreleased]

## [1.1.2] - 2024-09-27
### Added
- ...
### Fixed
- ...

[1.1.2]: https://github.com/org/repo/compare/v1.1.1...v1.1.2
```

- Versions are `##` headings with bracketed version and ISO date, and there's an `Unreleased` section at the top.
- Standard categories: Added, Changed, Deprecated, Removed, Fixed, Security.
- Reference-style compare links sit at the bottom.

### Changesets (used by our own `apps/cli/CHANGELOG.md`)

```md
# CHANGELOG

## 2.3.0

- Fix: `fl publish` now respects ...
```

- Version-only `##` headings with no dates. Some variants have `### Minor Changes` / `### Patch Changes` subsections.
- Lesson: dates are optional, so the parser must handle version-only entries.

### Other common shapes

- Date-only headings (`## 2026-09-18`), common in personal and product logs.
- Conventional Changelog / release-please: `## [1.2.0](compare-link) (2026-09-18)` with `### Features` / `### Bug Fixes`.

## Prior art in docs frameworks

- **Starlight Changelogs** (HiDeoo/starlight-changelogs): loads Changesets, Keep a Changelog, Conventional Changelog, and GitHub/Gitea releases. It generates a paginated index, a page per version, and "all changes since version X" pages. This is the most complete open-source precedent.
- **Docusaurus** website: a custom plugin turns `CHANGELOG.md` into per-version blog-style pages. The file was later split by major version because it got too long to edit.
- **Mintlify**: an `<Update>` component approach (see above).

## Takeaways for Flowershow

1. **Two sources, one model, one renderer.** A `CHANGELOG.md` and a `changelog/` folder both normalise into a list of entries `{version?, date?, title, body, sections}` and render through the same changelog view.
2. **Full-entry timeline** is the default look, with a sticky date/version column (Mintlify) and prose-then-bullets entries (Linear).
3. **Every entry is linkable.** In a single file that means anchors (`/changelog#v1-2-0`). In a folder each entry is also its own page.
4. **Recognise category sections** (Added / Fixed / New / Improvements / Breaking …) and style them as badges or labelled groups rather than plain `###` headings.
5. **Dates and versions are both optional**, so each entry must render well with either one or both.
6. **Pagination and RSS** are table stakes for folder changelogs. For single files, RSS is a nice-to-have.
7. **Themes must be able to restyle it**, so it should use stable, documented `.changelog-*` classes.
8. **It should work with zero configuration** by auto-detecting `CHANGELOG.md` / `changelog.md` and a `changelog/` folder, with a frontmatter override.

## Sources

- https://linear.app/changelog
- https://www.mintlify.com/docs/components/update
- https://raycast.com/changelog
- https://vercel.com/changelog
- https://github.blog/changelog/
- https://supabase.com/changelog
- https://keepachangelog.com/en/1.1.0/
- https://github.com/HiDeoo/starlight-changelogs
- https://github.com/facebook/docusaurus/pull/11287
- https://www.productlift.dev/blog/best-changelog-examples/
- https://features.vote/changelog-examples
