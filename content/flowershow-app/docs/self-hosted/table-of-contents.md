---
title: Table of contents
---
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

## Inline

You can add an "inline" table of contents to your markdown pages by including a heading with `Table of contents` string in it (case insensitive).

The table of contents will only include headings placed below the `Table of contents` heading.

**Example:**

```md
# Some blog page

## Table of contents

## Some heading

## Another heading

### Yet another heading
```

**Renders as:**

# Some blog page

## Table of contents

## Some heading

## Another heading

### Yet another heading

---

## Right hand side

You can also enable a table of contents in form of a right hand side sidebar:

![[rhs-toc.jpg]]

To enable it on all your markdown pages, simply set a `showToc` variable to true in your config file as shown below:

```js
// config.mjs

const config = {
  ...
  showToc: true,
  ...
};
```

You can also override the value set in the config file on per-page basis, by setting `showToc` to **true** or **false** in its frontmatter, like so:

```md
---
title: Some page
showToc: true
---

Some content
```
