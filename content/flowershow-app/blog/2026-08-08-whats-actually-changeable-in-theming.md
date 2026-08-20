---
title: "What's Actually Changeable in Flowershow Theming, and by Whom"
description: An honest map of the four layers of Flowershow theming — what a theme can change, what only a site owner can change, and what nobody can change without a pull request.
date: 2026-08-08
image: https://screenshotit.app/https://github.com/flowershow/themes@social
authors:
  - rufuspollock
---

> **Update, 21 August 2026:** The follow-up theme-building phase is complete;
> its work and findings are collected in
> [#1339](https://github.com/flowershow/flowershow/issues/1339) and
> [flowershow/themes#8](https://github.com/flowershow/themes/pull/8). You can
> now browse the improved [Flowershow themes reference](/docs/reference/themes),
> read the resulting
> [theme-authoring tutorial](https://github.com/flowershow/themes/blob/main/docs/theme-authoring-tutorial.md)
> or
> [AI theme-cloning workflow](https://github.com/flowershow/themes/blob/main/docs/ai-theme-cloning-skill.md),
> and follow the next discovery, authoring, and preview-release phase in
> [#1364](https://github.com/flowershow/flowershow/issues/1364).

I want to build more themes — for my own sites, and to grow the [official themes collection](https://github.com/flowershow/themes). So I sat down to work out what making a theme actually involves today, and hit a question I couldn't answer cleanly: **what can a theme actually change?**

Our internal answer has been "theming is CSS only". That's true, but it's not the whole picture, and the gap between that sentence and reality is where every frustrating theming conversation starts.

So here's the honest map.

## Four layers, not two

### L1 — CSS custom properties

Tokens like `--color-l-background`, `--font-heading`, `--font-size-base`, defined in `apps/flowershow/styles/default-theme.css` under `@layer base`.

This is the real theme API. Redefine the tokens, get a different-looking site. It's stable, it's safe, and it survives us refactoring components underneath you.

### L2 — Semantic class names

There are **216** of them in `default-theme.css`: `site-navbar-link`, `page-header-title`, `list-component-item-headline`, `site-tree-item-self`, `search-modal-hit-title`, and so on. A theme targets these to go beyond token swaps.

We describe these internally as a public API — changes to them are breaking changes. But here's the problem: **we have never published the list.** It isn't in [the themes docs](https://flowershow.app/docs/reference/themes), it isn't in the themes repo README, it isn't anywhere. Today, writing a theme means reverse-engineering the class names out of an existing theme's CSS or out of your browser's inspector.

That's the single biggest thing standing between us and more themes — from us or from anyone else.

### L3 — Config and frontmatter switches

A separate layer that isn't theming at all, but gets confused with it constantly.

Site-level, from the dashboard: `showSidebar`, `showRawLink`, `showBacklinks`, `enableComments`, `enableSearch`, `enableRss`, `showBuiltWithButton`.

Page-level, from frontmatter: `layout: plain`, `showToc`, `showHero`, `hero`, `showEditLink`, `showComments`, `cta`.

This is the *presence* layer — whether a thing appears at all. It belongs to the site owner, and a theme cannot touch it. A theme can't ship "this design assumes no sidebar"; it can only hide the sidebar with CSS and hope.

### L4 — The component tree

This is the layer nobody talks about. The structure of a page is hardcoded in [`page.tsx`](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/app/(public)/site/%5Buser%5D/%5Bproject%5D/%5B%5B...slug%5D%5D/page.tsx), and it looks like this:

```
Hero
└ .layout-inner
  ├ .layout-inner-left      → sidebar
  ├ .layout-inner-center
  │   ├ main.page-main      → page header (title, description, authors, date)
  │   │                       then .rendered-mdx (your content)
  │   ├ .page-edit-button-container   → "Edit this page" / "View raw markdown"
  │   ├ .page-backlinks-container     → "Links to this page"
  │   └ .page-comments-container      → comments
  └ .layout-inner-right     → table of contents
```

That order is fixed. Take the "View raw markdown" link: it is a hardcoded sibling that renders after the main content, before comments. If you want it up in the page header next to the date, no theme can do that. You can hide it, and you can fight it with `order:` on a flex parent, but you can't move it in any way that's robust.

Same for the page header itself: title, then description, then authors and date. Want the byline above the title? That's not a CSS problem.

[Backlinks](https://flowershow.app/docs/reference/backlinks) are the cleanest illustration of the three layers pulling apart. The *look* of the panel is L1/L2 — it has `page-backlinks-container`, `-title`, `-list`, `-item`, all themeable. *Whether it appears* is L3 — `showBacklinks`, owned by the site. *Where it appears* is L4 — hardcoded between the edit links and the comments, and if you want "Links to this page" as a sidebar rail instead of a footer block, there is no amount of theming that gets you there.

## The distinction that actually matters

The useful split isn't "theme vs core". It's:

| Layer | What it controls | Who owns it |
|---|---|---|
| L1 + L2 | **Look** — colour, type, spacing, treatment | Theme author |
| L3 | **Presence** — whether an element exists | Site owner |
| L4 | **Placement** — where elements sit, in what order | Nobody. Needs a PR. |

Most requests that arrive as "I want a theme that does X" are really L3 or L4 requests wearing an L1 costume.

Recreating the feel of Substack, or LessWrong, or a Ghost theme — that's L1/L2 work, and it works today. That's exactly what [Superstack](https://superstack.flowershow.me/), [LessFlowery](https://lessflowery.flowershow.me/) and [Letterpress](https://letterpress.flowershow.me/) are. But "put the date under the title, the byline above it, and a related-posts block in the footer" is L4, and it's currently impossible at any level of CSS skill.

## Where this goes

Three ways to close the L4 gap, cheapest first:

1. **Accept it.** Expand the L1 token surface (border radius, spacing scale, navbar height) and document the fixed skeleton honestly as a constraint. Themes stay a styling layer, and we say so plainly.
2. **Slot ordering.** Let a theme or config declare the order of blocks in the centre column. No new components, no user-authored markup — just a declared sequence. This is the interesting middle ground and nobody has scoped it.
3. **Layout templating.** Generalise the [collection-listing templating design](https://github.com/flowershow/flowershow/issues/1222) to the page shell itself. Most power, most surface area, most ways to break.

Flowershow is deliberately a managed publishing platform — Ghost, not WordPress. Option 3 pulls hard against that. But option 1 is only honest if we *actually publish the constraint*, and option 2 might buy most of what people want without giving up the guarantee that we can refactor our own components.

The immediate work is smaller than any of that, though: **publish the L2 class list.** Everything else is a design debate. That one is just a document we haven't written.

I'm going to go build some themes and find out where I hit the wall. I'll write up what breaks.
