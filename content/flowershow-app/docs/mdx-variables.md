---
title: MDX Variables
description: Define JavaScript variables in your MDX pages and use them to render dynamic content.
---

> [!warning] Experimental
> MDX variables are supported but experimental. Behaviour may change in future releases.

You can define JavaScript variables at the top of any MDX page and reference them anywhere below — in plain text, JSX expressions, or mapped lists. This is useful for avoiding repetition and for building data-driven layouts without a backend query.

This requires MDX rendering. Make sure your page uses `syntaxMode: mdx` (or has a `.mdx` extension if you're on "auto" mode). See [[syntax-mode|Syntax Mode]] for details.

## Basic example

```mdx
---
title: My Page
syntaxMode: mdx
---

export const author = "Ada Lovelace"
export const year = 2025

This page was written by **{author}** in {year}.
```

Variables are defined with `export const` and referenced with `{curlyBraces}` anywhere in the document.

## Arrays and JSX mapping

You can define arrays and map over them to render lists, cards, or any repeated layout.

```mdx
---
title: Blog Posts
syntaxMode: mdx
---

export const posts = [
  {
    title: "Getting started with Flowershow",
    url: "/blog/getting-started",
    date: "2025-01-10",
    description: "A quick intro to publishing your markdown as a site."
  },
  {
    title: "MDX components guide",
    url: "/blog/mdx-components",
    date: "2025-02-14",
    description: "How to use JSX components inside your markdown pages."
  },
  {
    title: "Custom styles with Tailwind",
    url: "/blog/custom-styles",
    date: "2025-03-01",
    description: "Add your own CSS or Tailwind classes to any page."
  }
]

## Latest posts

<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
  {posts.map((post) => (
    <a key={post.url} href={post.url} className="flex flex-col rounded-lg border p-4 no-underline hover:bg-gray-50">
      <span className="text-sm text-gray-500">{post.date}</span>
      <span className="mt-1 font-semibold text-gray-900">{post.title}</span>
      <span className="mt-1 text-sm text-gray-600">{post.description}</span>
    </a>
  ))}
</div>
```

## Tips

- Variables must be defined with `export const` at the top level of the file, before the first paragraph.
- Arrow functions in JSX (e.g. `.map(item => ...)`) work fine — make sure you're not accidentally escaping the `>` character with `&gt;`.
- You can define as many variables as you need in one page.
- Variables cannot currently make live database queries. For dynamic content from your site's pages, use the [[list-component|List component]] instead.
