---
title: Changelog
description: "Publish a changelog: Flowershow turns a changelog folder or a CHANGELOG.md file into a timeline page automatically"
---

Flowershow renders a changelog as a full timeline page, with no components or configuration needed. There are two ways to write one:

- **A `changelog` folder** with one Markdown file per update. Each entry shows its date, authors, title, summary, optional image and full content, newest first, and each entry also gets its own page.
- **A single `CHANGELOG.md` file**, the common format in software projects. See [Single `CHANGELOG.md` file](#single-changelogmd-file) below.

## Basic usage

Create a folder called `changelog` and add one Markdown file per update. Start each filename with the date:

```
changelog/
├── README.md                         # optional intro
├── 2026-08-21-monospace-theme.md
├── 2026-08-17-currency-in-prose.md
└── 2026-08-15-custom-head-code.md
```

Each entry is a normal Markdown page:

```yaml
---
title: Monospace theme is now available
date: 2026-08-21
description: Choose the compact Monospace theme from the dashboard or config.
authors:
  - olayway
image: /assets/monospace-theme.png
---

Monospace is now an official Flowershow theme for technical documentation...
```

That's it. `/changelog` now shows the timeline, and `/changelog/2026-08-21-monospace-theme` shows the single entry with links to the previous and next updates.

## Entry fields

| Field | Required | What it does |
| --- | --- | --- |
| `title` | Recommended | Entry heading. If missing, it's derived from the filename (`2026-08-21-dark-mode.md` → "Dark mode"). |
| `date` | Recommended | Entry date and sort order. If missing, the `YYYY-MM-DD` prefix of the filename is used. Undated entries are listed last. |
| `description` | Optional | A one-line summary shown under the title. |
| `authors` | Optional | Author names or handles, shown with avatars. See [[page-authors\|Page authors]]. |
| `image` | Optional | A hero image shown above the entry body. Wiki links like `"[[assets/shot.png]]"` work. |
| `version` | Optional | A version label (e.g. `2.4.0`) shown next to the date. |
| `publish` | Optional | Set to `false` to hide an entry. |

## Authors

Authors work exactly as they do on blog posts. If you list `authors: [olayway]` and your site has a page called `olayway.md` (for example `people/olayway.md`) with a `title` and an `avatar`, the changelog shows that person's full name and avatar and links to their page. See [[page-authors|Page authors]].

## Intro text

If the folder has a `README.md` (or `index.md`), its `title` becomes the page title and its content appears as an intro above the timeline. Without one, the page is simply titled "Changelog".

## Pagination

The timeline shows 10 entries per page. Older entries are on `/changelog?page=2`, `/changelog?page=3`, and so on.

## Using a different folder name

Any folder can be a changelog. Add `layout: changelog` to its `README.md` or `index.md`:

```yaml
---
title: Release notes
layout: changelog
---
```

## Turning it off

To keep a `changelog` folder as normal pages, set a different layout in its `README.md` or `index.md`, for example `layout: default`. If the folder has no `README.md` or `index.md`, add one with `layout: default` to keep it as ordinary pages. An entry's own `layout` does not take it out of the changelog: set `publish: false` to hide an entry.

## Styling

Flowershow provides the changelog's structure, and your theme or [[custom-styles|custom CSS]] adjusts the look. Colours and fonts come from your theme automatically. For layout and spacing, set any of these CSS custom properties, on `:root` or `.changelog`:

| Property | Default | What it controls |
| --- | --- | --- |
| `--changelog-max-width` | `60rem` | Width of the whole changelog |
| `--changelog-columns` | `11rem minmax(0, 1fr)` | Date column and content column. Use `minmax(0, 1fr)` to put dates above entries |
| `--changelog-gap` | `3rem` | Space between the date column and the content |
| `--changelog-entry-spacing` | `3rem` | Vertical space around each entry |
| `--changelog-rule-color` | light foreground | Colour of the line between entries |
| `--changelog-marker-color` | accent colour | Colour of the dot next to each date |
| `--changelog-marker-size` | `7px` | Size of the dot (`0` hides it) |
| `--changelog-marker-radius` | `9999px` | Dot shape (`0` makes a square) |
| `--changelog-title-size` | theme's 3xl size | Size of entry titles on the timeline |
| `--changelog-meta-position` | `sticky` | `static` stops the date following you as you scroll |
| `--changelog-meta-direction` | `column` | `row` puts the date and authors on one line |
| `--changelog-meta-spacing` | `0` | Space below the date and authors on wide screens (useful when stacking) |
| `--changelog-sticky-top` | `5rem` | How far from the top the sticky date sits |

A few examples:

```css
/* Roomy, Linear-style: more space, bigger titles, square marker */
:root {
  --changelog-gap: 5rem;
  --changelog-entry-spacing: 5rem;
  --changelog-title-size: 2.25rem;
  --changelog-marker-radius: 0;
}
```

```css
/* Dense log: tight spacing, narrow date column, no dot */
:root {
  --changelog-entry-spacing: 1.25rem;
  --changelog-gap: 1.5rem;
  --changelog-columns: 7rem minmax(0, 1fr);
  --changelog-marker-size: 0;
  --changelog-title-size: 1.25rem;
  --changelog-meta-position: static;
}
```

```css
/* No date column: date and authors in a row above each title */
:root {
  --changelog-columns: minmax(0, 1fr);
  --changelog-meta-direction: row;
  --changelog-meta-position: static;
  --changelog-meta-spacing: 0.75rem;
  --changelog-max-width: 42rem;
}
```

For deeper changes, target the stable `.changelog-*` classes. See the Changelog section of the [[theme-class-reference|theme class reference]].

## Single `CHANGELOG.md` file

A file called `CHANGELOG.md` (or `changelog.md`, in any case, anywhere in your site) renders as the same timeline on one page. Each version gets its own anchor, so you can link straight to it.

```markdown
# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Dark mode for the dashboard.

## [1.2.0] - 2026-09-18

### Fixed

- Login no longer times out on slow connections.

## [1.1.0] - 2026-08-02

- First public release.

[Unreleased]: https://github.com/you/project/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/you/project/compare/v1.1.0...v1.2.0
```

### Where it's published

`CHANGELOG.md` is published at `/CHANGELOG`, and also at `/changelog`. In a subfolder, `packages/cli/CHANGELOG.md` is at `/packages/cli/CHANGELOG` and `/packages/cli/changelog`.

If the same folder also has a `changelog/` folder, the folder owns `/changelog` and the file stays at `/CHANGELOG`. Likewise, if a lowercase `changelog.md` sits next to a `changelog/` folder, the folder wins; set a `permalink` in the file's frontmatter to publish it at another URL.

### Version headings

Every `##` heading starts a new entry. These formats are recognised, so most tools work out of the box ([Keep a Changelog](https://keepachangelog.com), [Changesets](https://github.com/changesets/changesets), [release-please](https://github.com/googleapis/release-please) and conventional-changelog):

| Heading | Entry title | Date |
| --- | --- | --- |
| `## [1.2.0] - 2026-09-18` | 1.2.0 | Sep 18, 2026 |
| `## [17.11.2](https://…/compare/v17.11.1...v17.11.2) (2026-08-24)` | 17.11.2 | Aug 24, 2026 |
| `## 2.3.0` | 2.3.0 | none |
| `## 2026-09-18 - Big launch` | Big launch | Sep 18, 2026 |
| `## 2026-09-18` | Sep 18, 2026 | Sep 18, 2026 |
| `## Unreleased` | Unreleased | none |
| `## Spring clean-up` | Spring clean-up | none |

Headings like `### Added` or `### Bug Fixes` stay inside the entry. A top-level `#` heading that is itself a version (as in older conventional-changelog files, `# [3.1.0](…) (2019-04-10)`) also starts an entry.

If a version heading links somewhere, like release-please's version links or Keep a Changelog's reference links at the bottom of the file, the entry shows a small **Compare** link next to the date (or **Release** if the link isn't a compare link).

### Title, intro and Unreleased

- **Page title:** the first `#` heading (e.g. `# Changelog` or `# @scope/package`). Without one, the frontmatter `title` is used, and otherwise "Changelog".
- **Intro:** anything between the title and the first version appears above the timeline.
- **Unreleased:** shown first and muted, and hidden while it's empty.

### Linking to a version

Each entry has an anchor made from its version, date or title: `/CHANGELOG#1.2.0`, `/CHANGELOG#unreleased`, `/CHANGELOG#2026-09-18`. The date and the entry title link to it.

### Other file names, and turning it off

Only `CHANGELOG.md` is detected automatically. To render any other page as a changelog (for example `HISTORY.md` or `RELEASES.md`), add `layout: changelog` to its frontmatter:

```yaml
---
title: Release history
layout: changelog
---
```

To keep a `CHANGELOG.md` as a normal page, give it a different layout, such as `layout: default`. A `CHANGELOG.md` with no version headings is always shown as a normal page. Pages inside a changelog folder are always that folder's entries, so this detection and `layout: changelog` apply only to pages outside one.
