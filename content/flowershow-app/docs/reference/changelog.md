---
title: Changelog
description: Publish a changelog with dated entries: Flowershow turns a changelog folder into a timeline page automatically
---

Flowershow renders a changelog folder as a full timeline page, with no components or configuration needed. Each entry shows its date, authors, title, summary, optional image and full content, newest first, and each entry also gets its own page.

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

To keep a `changelog` folder as normal pages, set a different layout in its `README.md` or `index.md`, for example `layout: default`. An individual entry that sets its own `layout` is also rendered normally.

## Styling

Changelog pages use stable `.changelog-*` classes that themes and custom CSS can target. See the Changelog section of the [[theme-class-reference|theme class reference]].

## Coming soon

Support for a single `CHANGELOG.md` file (the common format in software projects, such as [Keep a Changelog](https://keepachangelog.com)) is planned.
