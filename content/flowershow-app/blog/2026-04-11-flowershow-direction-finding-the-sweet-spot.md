---
title: "Flowershow's Direction: Finding the Sweet Spot"
description: Reflections on Flowershow's product boundary, and why its strength is opinionated markdown publishing rather than becoming a lighter Astro.
date: 2026-04-11
authors:
  - rufuspollock
---

## The Core Tension

There's a general question about the direction of Flowershow. At some point you end up duplicating things like Astro, so what's the sweet spot?

### Option A: Stay narrow — a publishing tool for markdown/HTML

- Focus on publishing markdown and HTML files quickly, even individual files or very simple sites
- Very restrictive: don't allow lots of customizability for cards, layouts, etc.
- Lay things out in a standard way; people customise styling with custom CSS
- The value proposition: you're not coding, not creating templates, not writing MDX. Just content.

### Option B: Go more generic

- Add catalogue features, collection views, custom templates
- But this starts duplicating what Astro/Next.js already do well
- And if you add catalogues without templates, how useful is it really?

### The real advantage of Flowershow over Astro

- **No install, no build, no deploy pipeline to maintain.** Astro is geeky — you install it, build it, deploy it, maintain it.
- Flowershow forces a very standard structure. Most of the time you're just writing content, not code.
- That simplicity is the product. The moment you need templates and custom components, you're essentially asking for a static site generator — and good ones already exist.

## Commentary

This tension is a classic **product scope question** and the answer probably comes from asking: **who is Flowershow for?**

**If it's for people who would otherwise use Notion/Google Docs/WordPress** — people who want to publish content without touching code — then Option A is right. The value is radical simplicity. You add opinionated, non-customisable collection views (e.g. "any folder with an `index.md` that has `layout: collection` renders its children as cards"). Users don't write templates; they get a good default. The constraint *is* the feature — it means there's nothing to break, nothing to maintain, nothing to learn.

**If it's for developers who want a lighter-weight Astro** — then you're competing on the framework's turf with fewer resources, and that's a losing game.

The strongest version of Flowershow is probably: **opinionated defaults with zero code, targeting the gap between "folder of markdown files" and "full static site generator."** That means:

1. **Built-in collection rendering** — if a folder has markdown files with frontmatter, Flowershow knows how to render them as a list/grid of cards using standard fields (title, description, image, date). No template needed. Just put files in a folder.
2. **Styling only, not structure** — custom CSS yes, custom layouts no. You pick a theme/variant, not a template.
3. **Convention over configuration** — e.g. `people/` folder automatically gets a people-card layout if frontmatter includes `role:` or `image:`. `blog/` gets date-sorted post cards. Smart defaults beat flexible templates.

This would actually solve the pain point that's driving the Astro question for *this* site — the team page and podcast list — without turning Flowershow into a framework. The question is whether that opinionated approach serves enough use cases to be worth building, or whether people will immediately want "just one more customisation" and you're back to building a template system.

The litmus test: **can you define 3-5 collection types (blog, people, projects, events, generic) that cover 90% of what users need?** If yes, build those as built-in layouts. If every site needs something different, the abstraction doesn't hold and Astro is the right answer.

## Can We Define Collection Types?

Yes — and it's more tractable than it first looks. Most content collections on the web boil down to a small number of card patterns. Here's a concrete proposal:

### Proposed built-in collection types

#### 1. Blog / Posts

- **Frontmatter**: `title`, `date`, `description`, `image` (optional), `authors` (optional)
- **Card**: image top, title, date, description snippet
- **Sort**: reverse chronological by default
- **Example**: blog, newsletter archive, news

#### 2. People / Team

- **Frontmatter**: `title` (name), `role`, `image`, `description` (optional), `links` (optional list of urls)
- **Card**: avatar/photo, name, role, short bio
- **Sort**: alphabetical or manual via `order` field
- **Example**: team page, contributors, advisors, fellows

#### 3. Projects / Initiatives

- **Frontmatter**: `title`, `description`, `image` (optional), `status` (optional), `url` (optional)
- **Card**: image, title, description, status badge
- **Sort**: manual (`order`) or alphabetical
- **Example**: research projects, labs, programs, portfolio

#### 4. Events

- **Frontmatter**: `title`, `date`, `end_date` (optional), `location` (optional), `description`, `image` (optional)
- **Card**: date prominently displayed, title, location, description
- **Sort**: chronological, with past/upcoming split
- **Example**: events, workshops, gatherings, calls

#### 5. Generic / Catalogue

- **Frontmatter**: `title`, `description`, `image` (optional)
- **Card**: image (if present), title, description
- **Sort**: alphabetical or manual
- **Example**: anything that doesn't fit the above — podcasts, resources, tools, reading lists

### How it would work in practice

A collection page would just need frontmatter like:

```markdown
---
title: Our Team
layout: collection
collection: people
source: /people
---

Optional introductory text goes here.
```

That's it. No templates, no code. Flowershow reads the files in `/people/`, applies the `people` card layout to each, and renders the page.

### Minimal customisation without templates

For cases where the built-in types almost-but-don't-quite fit (e.g. podcasts = generic + a `date` and `duration` field), there could be a lightweight way to specify which frontmatter fields to display, perhaps in a markdown code block on the collection page itself:

```markdown
---
title: Podcast Episodes
layout: collection
collection: generic
source: /podcast
sort: date desc
---

<!--
  fields:
    - date
    - title
    - description
    - duration
-->
```

This keeps it declarative — you're saying *which fields*, not *how to render them*. Flowershow decides the card layout. This is a long way from writing JSX templates but gives enough control to cover edge cases.

### Does this cover 90%?

Looking at this site alone: blog, team, research projects, events, podcast episodes, hubs, initiatives, programs, learn topics — every one maps to one of the five types above. The generic type is the escape hatch for anything unusual.

The remaining 10% — truly custom layouts, interactive features, complex filtering — is where you'd say "you've outgrown Flowershow, use Astro." That's a clean product boundary.

## Summary

Five types — blog, people, projects, events, generic — cover essentially everything on this site and most content sites. The key insight is that the user specifies *which fields* to show, not *how* to render them. A collection page is just frontmatter (`layout: collection`, `collection: people`, `source: /people`) and Flowershow does the rest.

The generic type with an optional field list (like for podcasts where you want `duration` shown) is the escape hatch that avoids needing full templates while still handling edge cases.

The clean product boundary becomes: **"if you need to control *how* cards render, you've outgrown Flowershow — use Astro."** Everything up to that point is declarative and zero-code.
