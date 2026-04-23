---
title: "`List` component"
description: Create organized lists and content catalogs by automatically listing files in a specified directory.
---

> [!important]
> Using the `List` component requires MDX rendering, since it uses JSX (like `<List />`).
> Make sure to switch to MDX rendering for this page by changing its extension to `.mdx` (if you're using "auto" syntax mode) or by adding `syntaxMode: mdx` in the frontmatter.
> 📚 Read more about different syntax rendering modes and how to enable them: https://flowershow.app/blog/announcing-syntax-mode-configuration

## Basic example

```markdown
<List dir="/blog"/>
```

The List component will display all the markdown files in the specified directory.
By default, it shows the title as the headline and the description as the summary.

## Properties

The `List` component accepts the following props:
- **dir** (optional)
  Directory (relative to site root) to list items from.  
  Default: `""` (root folder)  
  Type: `string`

- **slots** (optional)
  Lets you decide what information should appear in each part of the list item.  

  Available slots:  
  - **media** → usually an image  
  - **eyebrow** → small text shown above the title (for example, a date)  
  - **headline** → the main title  
  - **summary** → a short description  
  - **footnote** → small text shown below (for example, authors)  

  Each slot can be connected to a field from your page’s frontmatter (like `title`, `description`, `date`, `authors`, `image`).  

  Default:  
  ```js
  {
    headline: "title",
    summary: "description"
  }
  ```

- **pageSize** (optional)  
  Number of items per page for pagination. If not provided, all items are shown without pagination.
  Type: `number`

Example:
```md
<List 
  dir="/blog" 
  slots={{
    headline: "title",
    summary: "description",
    eyebrow: "date",
    footnote: "authors",
    media: "image"
  }}
  pageSize={5}
/>
```

👉 Check it out in our interactive documentation: https://components.flowershow.app/?path=/docs/other-list--docs

## Behavior

The List component:
- Ignores `README.md` and `index.md` files
- Is recursive (includes files in subdirectories)
- Sorts by date if available, otherwise by title

> [!info]
> For a detailed guide including examples and step-by-step instructions, check out [[how-to-create-content-catalogs|this blog post]].
