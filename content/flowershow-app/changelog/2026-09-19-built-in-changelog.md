---
title: Built-in changelog pages
date: 2026-09-19
description: Put dated Markdown files in a changelog/ folder and Flowershow renders a full timeline with a page for every entry, with no components or config.
authors:
  - rufuspollock
showToc: false
image: "[[assets/changelog-timeline.png]]"
---

Your changelog now looks like one out of the box. Add a `changelog/` folder of dated Markdown files and Flowershow renders it as a timeline at `/changelog`: newest first, with the date and authors beside each entry, then its title, summary, optional image and full content. This page is built with it.

- **One file per entry.** For example `changelog/2026-09-19-my-release.md`, with `title`, `date`, `description`, `authors`, `image` and an optional `version` in the frontmatter. If you leave out `date`, it is read from the date at the start of the file name.
- **A page for every entry.** Each entry also gets its own URL, with a link back to the changelog and links to the previous and next entries.
- **Authors and pages.** Authors are looked up in your `people/` folder, the same way as blog posts. The timeline shows 10 entries per page, with `?page=2` and so on for older ones.
- **Your README is the intro.** Any text in `changelog/README.md` appears above the timeline. With no README you still get a "Changelog" page.
- **Fits your theme.** Colours and fonts come from your theme, and it works with all the official themes. To adjust spacing or the date marker, set the `--changelog-*` CSS variables.

![[assets/changelog-entry-page.png]]

Any other folder can be a changelog too: add `layout: changelog` to its `README.md`, for example for a `releases/` folder. To keep a `changelog` folder as ordinary pages, give its `README.md` a different layout, such as `layout: default`.

If your changelog page used a `<List>` component, remove it: the timeline replaces it. See [[docs/reference/changelog|the changelog docs]] for the full reference.
