# Collection-Driven Page Templating in Flowershow

## Summary

This note captures the product need for collection-driven pages in Flowershow, especially pages that render lists of Markdown content such as blog posts, projects, or people. It focuses on the problem, constraints, and desired authoring experience before deciding on implementation or syntax.

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

## Still To Be Specified

- The exact template syntax.
- The exact query syntax beyond the basic folder-based collection model.
- The exact set of built-in page properties exposed to templates.
- Whether sorting and filtering are configured inline, in frontmatter, or another page-local form.
- Whether the rendering model compiles to MDX, HTML, React components, or another internal representation.
- Whether and how this evolves into reusable partials later.
