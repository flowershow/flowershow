---
title: "Custom collection cards"
description: Render custom cards for a collection of pages using normal HTML in the page body.
---

> [!warning]
> This is a draft tutorial describing functionality that is not yet implemented or in alpha state.

Sometimes the built-in `List` component is enough.

But often you want more control.

For example:

- a blog index with a custom post card
- a projects page with status badges and featured images
- a people directory with a custom profile card

In all of those cases, the need is the same:

- you have a collection of content items on the page
- you want to repeat a chunk of custom HTML for each item

This draft describes the experience we want for that.

## The idea

The page gets access to a collection called `items`, and then you render each item with a small loop block:

````md
---
collections:
  items:
    from: /projects
    sortBy: date
    sortDirection: desc
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

The important part is that your card markup is written directly in the page body.

You are not writing HTML inside a quoted template string. You are writing normal HTML and using a very small amount of templating around it.

## Example: Projects page

Imagine you have a `/projects` folder with pages like:

```text
projects/
├── alpha.md
├── beta.md
└── gamma.md
```

Each file has frontmatter such as:

```yaml
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
collections:
  items:
    from: /projects
    sortBy: date
    sortDirection: desc
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

This would render one card for each item in the collection.

## When to use this

Use custom collection cards when you want a bespoke layout for a folder of content.

For example:

- a projects grid with status labels
- a custom blog card layout
- a people directory with profile-style cards

Use [[list-component|List]] when you want:

- a standard listing page
- built-in pagination
- the quickest setup

## Available values

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

For v1, the collection definition itself should stay simple:

```yaml
collections:
  items:
    from: /projects
    sortBy: date
    sortDirection: desc
```

Recommended v1 values:

- `from`
- `sortBy: date | title`
- `sortDirection: asc | desc`

For now, all examples use a single collection name: `items`.

## Why this approach

The goal is to keep authoring simple and local to the page.

This approach has a few advantages:

- you write normal HTML directly in the markdown file
- you can style it however you want
- AI tools can edit and generate the markup naturally
- the templating layer stays small: just looping and value insertion

This is intentionally different from putting HTML inside a quoted template string. That style is harder to read, harder to edit, and less natural for both people and AI tools.

The tradeoff is that this draft keeps the templating feature intentionally small. If you want pagination or a standard blog index, `List` remains the better fit.

## What this assumes

This draft assumes collections are defined in page frontmatter.

For example:

```yaml
collections:
  items:
    from: /projects
    sortBy: date
    sortDirection: desc
```

In other words, this page is about:

- how to declare a simple folder-based collection
- how to render that collection once it exists

It is not yet about:

- more advanced query syntax
- pagination
- multiple collection sources beyond the simple folder-based case
- conditional rendering for missing fields

Those questions matter, but they are separate from the templating experience itself.

## Notes for v1

- Missing values should render as empty strings.
- There is no conditional logic in v1.
- If a field may be missing, authors should keep their markup simple and avoid depending on that field.
- This should work in normal `.md` pages, not only `.mdx`.

## v1 non-goals

- pagination
- conditionals
- nested loops
- multiple documented collection names beyond `items`

If you want pagination, use [[list-component|List]].

## The core idea

The core idea is simple:

- get a collection onto the page
- loop over it with a small block syntax
- write your custom card HTML directly in the page body

That should make blog indexes, project galleries, people directories, and other content listings much more flexible without forcing authors into JSX-heavy MDX authoring.
