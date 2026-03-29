---
title: "Draft: Custom collection cards"
description: A draft tutorial for a proposed Flowershow feature that would let you render custom cards for a collection of pages using normal HTML in the page body.
---

> [!important]
> This page is a draft for a proposed feature. It describes the authoring experience we want, not something currently available in Flowershow.

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

## Why this approach

The goal is to keep authoring simple and local to the page.

This approach has a few advantages:

- you write normal HTML directly in the markdown file
- you can style it however you want
- AI tools can edit and generate the markup naturally
- the templating layer stays small: just looping and value insertion

This is intentionally different from putting HTML inside a quoted template string. That style is harder to read, harder to edit, and less natural for both people and AI tools.

## What this assumes

This draft assumes the page already has access to a collection called `items`.

That is a separate part of the design.

In other words, this page is about:

- how to render a collection once it exists

It is not yet about:

- how the collection gets defined
- whether it comes from a folder query
- whether it is configured in frontmatter
- whether it is created with another page-level construct

Those questions matter, but they are separate from the templating experience itself.

## The core idea

The core idea is simple:

- get a collection onto the page
- loop over it with a small block syntax
- write your custom card HTML directly in the page body

That should make blog indexes, project galleries, people directories, and other content listings much more flexible without forcing authors into JSX-heavy MDX authoring.
