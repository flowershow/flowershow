---
title: Blog support
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

All files inside the `<your-content-folder>/blog` will be treated as blog posts.

## Blog post frontmatter fields

- `date` - date that will be displayed on the blog page and that will be used to sort blog search results at `<base-url>/blog` path
- `authors` (optional) - blog authors that will be displayed on the blog page

```md
---
title: Blog post title
date: 2022-11-29
authors: [John Doe, Jan Kowalski]
---
```

## Blog authors

Flowershow will display authors from the `authors` frontmatter list field below the blog title. It will also try to link each author to the corresponding author's page, if such a page exists, so that a user can click on his/hers avatar and visit their "about" page.

Flowershow will look for an author page in `<your-content-folder>/people` with the `id` or `name` frontmatter fields, or a slug matching the value provided in the `authors` list. If no matching page have been found, the provided string will be used. If the page has been found, the author's name and avatar (if set) will be displayed and it will be linked to the author page.

### Blog author frontmatter fields

- `id` (optional) - if set, id can be used in `authors` frontmatter field, instead of slug or `name` (and it will take precedence over both)
- `name` (required) - it will be displayed next to the avatar
- `avatar` (optional) - if you don't specify it, a placeholder image will be used (path should be relative to your content folder)

Example author page in `<your-content-folder>/people/john-doe.md`:

```md
---
id: john123
name: John Doe (required)
avatar: path/to/johns-avatar.jpg
---
```

Now you can reference John in one of your blog pages using e.g. the id you've set like so:

```md
---
title: Some blog page
date: 2022-12-12
authors: [john123]
---
```

...or by using the slug (file name):

```md
---
title: Some blog page
date: 2022-12-12
authors: [john-doe]
---
```

...or just by using his name:

```md
---
title: Some blog page
date: 2022-12-12
authors: [John Doe]
---
```

### Default author

If most of the time the author of the blog is the same - for example it's you - you can configure the default author in your `config.mjs` file using `defaultAuthor` property. It's value should be the `id`, the slug or the `name`. For example:

```js
// <your-content-folder>/config.mjs
...
defaultAuthor: "john-doe"
...
```

This way anytime you don't define `authors` in the frontmatter, the default author will be displayed.
