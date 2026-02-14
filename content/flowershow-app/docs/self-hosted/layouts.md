---
title: Layouts
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Layouts are simply React components, that wrap around your page's content. By default, all your notes will use the **Docs** layout (`layouts/docs.js`), but if you don't like it or you would like to use a different layout for some of your notes, you can create your own custom layout.

## 🚧 Overriding the default layout

By default all pages, apart from blog posts inside `/blog` folder, will be rendered using our default `docs` layout. In the future, it will be possible to overwrite the default layout in your `config.mjs` file.

## Changing single page layout

In order to use a custom layout instead of a default one on a single page, you need to:

1. Create your custom layout components in `/layouts` folder, e.g. `/layouts/MyLayout.tsx`:

```tsx
// layouts/MyLayout.tsx
export default function MyLayout({ children }) {
  return (
    <article className="text-center font-serif prose prose-invert mx-auto p-6">
      <section>{children}</section>
    </article>
  );
}
```

2. Re-export it from `/layouts/index.ts`, like so:

```ts
...
import MyLayout from "./MyLayout.tsx"

export default {
  ...
  mylayout: MyLayout
};
```

3. Specify the name under which you exported your custom layout in the page frontmatter. For example:

```md
---
title: I'm rendered using Unstyled layout!
layout: mylayout
---
```

## Passing metadata to layouts

All frontmatter data will be passed to the current layout used by a given page. So, if you want to access some page metadata in your custom layout, you can:

1. Add this data as key-value pairs in the frontmatter, along with specifying your custom layout that should be used for this page:

```md
---
title: My Test Page
color: blue
layout: mylayout
---
```

Now, we can extend our `/layouts/MyLayout.tsx` component to receive and display `title` and `color` on the page:

```tsx
export default function MyLayout({ children, color, title }) {
  return (
    <article className="text-center font-serif prose prose-invert mx-auto p-6">
      {title && <h1>{title}</h1>}
      {color && <p>{color}</p>}
      <section>{children}</section>
    </article>
  );
}
```
