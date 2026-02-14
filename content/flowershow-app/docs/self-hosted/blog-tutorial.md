---
title: Create a blog/news/articles site with Flowershow!
description: Create a blog/news/articles site with Flowershow!
layout: blog
date: 2023-01-25
updated: 2023-04-25
authors: [philippe-du-preez]
---
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

If you're writing blogs, news, or articles on your site, then this is for you! By using [Flowershow](https://flowershow.app/) as a Next.js template, this is easier than ever!

In no time you will have a page listing all your blogs looking like this:

![[blogs-list.png]]

And blog posts looking like this:

![[blog-layout.png]]

## Content folder's `/blog` directory

All markdown files you add into `<your-content-folder>/blog` directory will be treated as blog posts and displayed on the blog index page, under `/blog` url path.

For example, by adding the following 3 files inside `<your-content-folder>/blog` directory:

```sh
your-content-folder
├── blog
│   ├── my-blog-post2.md
│   ├── my-blog-post3.md
│   └── my-blog-post.md
└── config.mjs
```

...you'd be able to access them at `<base-url>/blog/my-blog-postX`. And all of them would be now listed on the blog home page, i.e. `<base-url>/blog`.

## Blog post frontmatter fields

- `date` - date that will be displayed on the blog page and that will be used to sort blog search results
- `authors` (optional) - authors of the blog that will be displayed on the blog page

```md
---
title: Blog post title
date: 2022-11-29
authors: [John Doe, Jan Kowalski]
---

Blog content here
```

> [!note]
> Flowershow will display authors from the `authors` frontmatter list field below the blog title. It will also try to link each author to the corresponding author's page in `/people` folder, if such a page exists. To learn more about configuring blog authors, read [[blog#blog-authors|a section on blog authors in our docs]].

That's it!

![[blogs-list.png]]

For more details, read our docs on [[blog|blog support in Flowershow]].
