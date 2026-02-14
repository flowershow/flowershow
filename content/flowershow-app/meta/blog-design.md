---
title: Flowershow blog feature design
---

What is a blog?

- [Technical] A page with set of posts usually shown in reverse order
- [User Needs] show news / updates. usually more polished or "featured" content (not so much a notebook)

Note: the functionality of a blog and a news section are pretty much identical from a technical perspective. So in everything we write here about blogs also can be used to implement news.

# Job Stories

### Overall story

When publishing my site/garden I often want a section of news or articles so that people can read the latest updates or articles

This high level story breaks down into two parts:

- Index page listing posts
- Way to create/designate blog posts

### Index page

When publishing my site I want to have a blog/article index page that lists my articles in latest first order

- chronicle listing in backwards order
- read more / infinite scroll (no pagination) - see https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- Search etc **not** necessary

### Creating blogs / articles

When publishing my site I want a way to create or designate pages as blog posts so that they show up on the blog/article index page

- Can have this as a dedicated folder e.g. `/blog/`
- Or just a special type of note e.g. there is frontmatter field: `blog: true` or something
- Frontmatter: some requirements e.g. to have a `date` field for the publication date

# MVP Design

## Features

- Simple way to make a note into a blog/article
- Simple way to show list of blog posts in reverse date order

Specifically

- Can make a blog post by creating something in blog folder OR adding `type: blog` (case insensitive?)
- List of blog posts show up under `/blog/` (with pagination)
- Presentation - simple and functional (cf nextjs or vercel blog, or tailwindcss)
- Pagination - infinite scroll would be nice

## Implementation

As a default follow Pliny however we have quite a few changes. We cover specific items

### Index page

make the searchable blogs list a component, which users can use in any of their pages - even on the home page

- this way it's an "opt-in" out of the box
- "/blog" url is not reserved for the blogs list
- we could even use query params for the search terms I think
- re pagination: see section below. summary: don't have pagination just load more / infinite scroll

> 👍👍 ~rufus though note this requires an allBlogs variable to be available to pass to the component. I guess we can have this work with our `data` attribute (which i more and more think is a stroke of genius. it's a way to have global variables that can be used on demand from content level - or, in nextjs terms a way to sort of have `getStaticProps` at content/markdown level\*\*

### Individual blog page

- Use layout approach instead of having `blog/[...slug]` 👍
- Use our SEO or pliny's? **Can we use our own SEO (do we need to update it?)**
- Frontmatter for blog: TODO

### Pagination

We probably want to take a look at https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading

> rufus 👍 to incremental loading (either load more or infinite scroll)

Discussion (now maybe irrelevant if we go for load more etc)

- ?? Change pagination to use query params instead of `/page/<nr>` paths. For this, we would only need a single `blog/index.js` page. **2022-11-17 not really sure what we gain from this**
  - it's just unnecessarily complex atm, and it's not DRY, similar logic is written in both /blog/index.js and /blog/page/[page].js - because in principle /blog/index.js is almost the same as /blog/page/1 **✅2022-11-18 ok then simplify - or as per above obsolete by removing pagination**

### Questions

- Do we want to support blog pages in the current (default) app template, or do we want to create a new "blog" template? **✅2022-11-17 use the current template**
- Do we provide an example / obsidian template for blog (in docs for now) **✅2022-11-17 👍 yes we do**
- **How to make it opt-in:** **❌2022-11-18 ~rufus for now ok to make this hard-coded (KISS)**
  - Idea A (simpler): /pages/blog could be renamed to e.g. /pages/\_blog and we could define a new property in the config file for specifying what path should point to it (could be `/blog` by default) and use next redirects to handle it (https://nextjs.org/docs/api-reference/next.config.js/redirects) **❌2022-11-18 i don't think redirects are good**
  - Idea B: create a new package, an add-on that could be added by `npx flowershow add blog`, which would create /pages/blog and add Blog type to contentlayer config
