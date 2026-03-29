# Collection-Driven Page Templating in Flowershow

Issue: [#1222 - Clarify collection-driven page templating for Markdown content](https://github.com/flowershow/flowershow/issues/1222)

## Summary

This note captures the product need for collection-driven pages in Flowershow, especially pages that render lists of Markdown content such as blog posts, projects, or people. It focuses on the problem, constraints, and desired authoring experience before deciding on implementation or syntax.

## Tutorial-Shaped Example

The design should be strong enough that we can comfortably teach it with a tutorial like this:

````md
---
title: Projects
showToc: false
---

{% for item in items %}
<article class="project-card">
  <a class="project-card__link" href="{{ item.url }}">
    <img class="project-card__image" src="{{ item.image }}" alt="{{ item.title }}" />
    <p class="project-card__eyebrow">{{ item.date }}</p>
    <h3 class="project-card__title">{{ item.title }}</h3>
    <p class="project-card__summary">{{ item.description }}</p>
    <p class="project-card__status">{{ item.status }}</p>
  </a>
</article>
{% /for %}
````

Key properties of this example:

- The page author writes normal page content plus normal HTML.
- The repeated card markup lives directly in the page body.
- AI tools can edit and generate the markup naturally.
- The templating layer only provides loop control and variable interpolation.
- This example assumes `items` already exists on the page. How it gets there is a separate concern.

## Tutorial Draft

Below is a draft of the kind of tutorial we should be able to publish once this feature exists.

### Custom Collection Cards

Sometimes a standard list layout is enough. But often you want more control.

For example:

- a blog index with a custom post card
- a projects page with status badges and featured images
- a people directory with a custom profile card

In all of those cases, the need is the same:

- you already have a collection of content items on the page
- you want to repeat a chunk of custom HTML for each item

This feature is designed for exactly that.

### What This Looks Like

The page gets access to a collection called `items`, and then you render each item using a small loop block:

````md
{% for item in items %}
<article class="project-card">
  <a class="project-card__link" href="{{ item.url }}">
    <img class="project-card__image" src="{{ item.image }}" alt="{{ item.title }}" />
    <p class="project-card__eyebrow">{{ item.date }}</p>
    <h3 class="project-card__title">{{ item.title }}</h3>
    <p class="project-card__summary">{{ item.description }}</p>
    <p class="project-card__status">{{ item.status }}</p>
  </a>
</article>
{% /for %}
````

The important part is that your card markup is written directly in the page body.

You are not writing HTML inside a string. You are writing normal HTML and using a small amount of templating around it.

### Example: Projects Page

Imagine you have a `/projects` folder with pages like:

```text
projects/
├── alpha.md
├── beta.md
└── gamma.md
```

Each file has frontmatter such as:

```md
---
title: Project Alpha
description: A short summary of the project.
date: 2026-03-01
image: /assets/project-alpha.png
status: In Progress
---
```

Now you want a custom projects index page.

Your page might look like this:

````md
---
title: Projects
description: A selection of current and recent projects
showToc: false
---

{% for item in items %}
<article class="project-card">
  <a class="project-card__link" href="{{ item.url }}">
    <img class="project-card__image" src="{{ item.image }}" alt="{{ item.title }}" />
    <p class="project-card__eyebrow">{{ item.date }}</p>
    <h3 class="project-card__title">{{ item.title }}</h3>
    <p class="project-card__summary">{{ item.description }}</p>
    <p class="project-card__status">{{ item.status }}</p>
  </a>
</article>
{% /for %}
````

This renders one card for each item in the collection.

### Available Values

Each `item` can expose page data that Flowershow already knows about.

For example:

- `item.title`
- `item.description`
- `item.date`
- `item.image`
- `item.url`
- `item.path`
- custom frontmatter fields such as `item.status`

This means you can keep using frontmatter as the source of truth for your card content.

### Why This Approach

The goal is to keep authoring simple and local to the page.

This approach has a few advantages:

- You write normal HTML directly in the markdown file.
- You can style it however you want.
- AI tools can edit and generate the markup naturally.
- The templating layer stays small: just looping and value insertion.

This is intentionally different from putting HTML inside a quoted template string. That style is harder to read, harder to edit, and less natural for both people and AI tools.

### What This Tutorial Assumes

This tutorial assumes the page already has access to a collection called `items`.

That is a separate part of the design.

In other words, this tutorial is about:

- how to render a collection once it exists

It is not yet about:

- how the collection gets defined
- whether it comes from a folder query
- whether it is configured in frontmatter
- whether it is created with another page-level construct

Those questions matter, but they are separate from the templating experience itself.

### The Core Idea

The core idea is simple:

- get a collection onto the page
- loop over it with a small block syntax
- write your custom card HTML directly in the page body

That should make blog indexes, project galleries, people directories, and other content listings much more flexible without forcing authors into JSX-heavy MDX authoring.

## Related Issues

- [#1120 - [blog] have an amazing listing page that is super easy to setup](https://github.com/flowershow/flowershow/issues/1120)
- [#923 - [inbox] List / Blog v1.1](https://github.com/flowershow/flowershow/issues/923)
- [#950 - Can we use MDX variables (and run queries)](https://github.com/flowershow/flowershow/issues/950)
- [#170 - Support obsidian dataview (or equivalent)](https://github.com/flowershow/flowershow/issues/170)
- [#861 - Support obsidian new Bases syntax and render the views in the frontend](https://github.com/flowershow/flowershow/issues/861)
- [#895 - List component should resolve authors, link to them and display their names (if set by title)](https://github.com/flowershow/flowershow/issues/895)
- This note is intended to define the product need beneath those scattered efforts before choosing an implementation direction.

### Situation

- Flowershow sites often contain collections of Markdown content files with frontmatter.
- Common examples include blog posts, projects, people, and similar content sets.
- A recurring publishing need is to turn those collections into visually strong listing pages.
- Those pages should work for both standard and non-standard content types.
- For now, the scope is Markdown content files with frontmatter only.

### Complication

- Predefined layouts such as cards, lists, and grids are helpful, but they stop being sufficient once a collection has custom fields or needs a non-standard presentation.
- Flowershow already supports HTML in pages and has a styling model that makes custom visual design feasible.
- The missing capability is not mainly styling. The missing capability is a lightweight way to:
- query a collection of Markdown items
- iterate over those items
- insert item values into markup
- keep the authoring model close to normal HTML
- The author preference is to avoid MDX or JSX-heavy authoring where possible.
- The desired feel is closer to Vue, Svelte, Handlebars, or other HTML-first templating styles.
- At the same time, Flowershow runs on Next.js and React, so there is tension between the simplest author experience and the underlying implementation model.
- The key product concern is not primarily security. The key concern is product fit, renderer complexity, and avoiding an awkward reinvention of React or a full template engine.
- A key nuance from review: putting HTML inside a YAML string inside a fenced block is significantly worse than writing HTML directly in the page body. It is less readable, less editable, and less AI-friendly.

### Question

- What is the right author-facing abstraction for Flowershow to support collection-driven pages for Markdown content?
- More specifically, how should Flowershow let authors:
- obtain a collection of content items
- iterate over those items
- render custom HTML for each item
- do so in a way that feels simple, page-local, and close to normal HTML
- The question is how to provide this without making the renderer too heavy or pushing Flowershow beyond its natural scope.

### Hypothesis

- The core need is not only better built-in listing layouts.
- The deeper need is a lightweight, HTML-first templating model for collection pages.
- The author should be able to define custom per-item markup directly inside a page.
- The first version should be page-local rather than introducing reusable partials or a broader component system.
- Simplicity should be prioritized over theoretical flexibility.
- The authoring experience should prefer direct page-body markup over stringified template markup.

## Clarified Scope

- In scope:
- listing pages generated from Markdown content files with frontmatter
- folder-based collections as the initial collection model
- page-local authoring
- custom item rendering
- simple querying, iteration, and variable insertion
- Out of scope for now:
- arbitrary JSON or API-backed data sources
- reusable partials or shared template components
- reactive UI behavior
- a broad frontend framework model
- a fuller collection query language

## Two Concerns

- This problem should be treated as two separate concerns.

### Concern 1: Getting the collection onto the page

- Somehow the page gets access to a collection value such as `items`.
- That may eventually come from folder-based querying, frontmatter configuration, page variables, MDX props, or another mechanism.
- For now, this concern is intentionally bracketed.
- We can assume that `items` is available on the page.

### Concern 2: Rendering each item once `items` already exists

- This is the immediate design focus.
- The need is to repeat a chunk of normal HTML for each item.
- The page author should write the card markup directly in the page body.
- The templating layer should be minimal:
- loop over items
- interpolate values such as `item.title`, `item.description`, `item.image`, `item.url`
- We are not trying to introduce a full component framework here.

## Collection Model

- The first version should treat a collection primarily as "all pages in a folder".
- That gives a simple and legible mental model for authors.
- Filtering and sorting may exist in a basic form, but should not define the core abstraction.
- A richer query model may be added later, but it is intentionally unspecified in this note.

## Data Available To Templates

- The first version should expose whatever item metadata is already easy to obtain from the backend or metastore.
- That should include frontmatter fields.
- It may also include a small set of built-in page properties that are already available, such as path, URL-like fields, and inferred values such as title.
- The goal is not to design a perfect schema up front.
- The goal is to use the data shape that Flowershow already has available with minimal extra complexity.

## Author Preference

- Prefer a simple authoring model over one that mirrors the implementation stack.
- Prefer HTML-first templating over MDX or JSX.
- Accept some standard built-in layouts, but not as the main answer.
- The desired end state is something that feels lightweight and local to the page rather than component-heavy.
- Prefer writing HTML directly in the page body over embedding HTML inside a quoted or YAML `template:` field.
- Prefer something AI tools can generate and edit naturally.

## Selected Direction For Now

- We should assume the collection already exists on the page as `items`.
- For the rendering concern, the selected direction is a Markdoc-style loop block wrapped around normal HTML.
- The desired authoring shape is:

````md
{% for item in items %}
<article class="project-card">
  <a href="{{ item.url }}">
    <h3>{{ item.title }}</h3>
    <p>{{ item.description }}</p>
  </a>
</article>
{% /for %}
````

- This keeps the HTML in the page body.
- It keeps the control flow very small and explicit.
- It gives AI tools and human authors a natural editing surface.
- It separates iteration from data acquisition cleanly.
- This is a design choice for now, not yet an implementation commitment to Markdoc as a full rendering system.

## Markdoc And Evidence Research

- Markdoc describes itself as a superset of CommonMark and adds tags, attributes, variables, functions, and partials.
- Markdoc tags use `{% ... %}` syntax and are designed for custom, structured authoring inside markdown.
- Markdoc variables and functions indicate that it already has an expression and templating model, rather than only a component embedding model.
- Evidence documents that its pages are written in markdown, that its component syntax uses Markdoc, and that it combines markdown with query-like code fences and reusable component tags.
- This is relevant because Evidence appears to solve a closely related authoring problem by keeping custom logic in markdown while letting richer structures appear inline in the page.
- This suggests that Flowershow should at least evaluate whether a Markdoc-like authoring model is a better fit than extending MDX ad hoc.
- At the same time, Flowershow's current rendering stack is based on unified, custom remark/rehype plugins, and `next-mdx-remote-client`, so adopting Markdoc would be a substantial architectural decision rather than a small syntax tweak.
- Therefore the design question is not just "can Markdoc do this?" but "do we want to adopt Markdoc wholesale, partially borrow its syntax ideas, or implement a narrow compatible subset in the existing pipeline?"

## Rejected Or Weaker Directions

- HTML inside a YAML `template:` string inside a fenced code block:
- This is possible, but it is not the preferred UX.
- It makes authoring feel indirect and mechanical.
- It is worse for hand editing and worse for AI-assisted authoring.
- Purely predefined cards/list/grid layouts:
- These remain useful, but they do not satisfy the actual need for custom per-item markup.

## Still To Be Specified

- How `items` gets onto the page.
- Whether the eventual collection source is configured in frontmatter, page syntax, or another page-local mechanism.
- Whether the loop syntax is implemented by adopting Markdoc, by borrowing its syntax, or by implementing a narrow compatible subset in the existing pipeline.
- The exact query syntax beyond the basic folder-based collection model.
- The exact set of built-in page properties exposed to templates.
- Whether sorting and filtering are configured inline, in frontmatter, or another page-local form.
- Whether the rendering model compiles to MDX, HTML, React components, Markdoc AST, or another internal representation.
- Whether and how this evolves into reusable partials later.
