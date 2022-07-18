---
title: Essentials
---

## Obsidian internal links

Wiki links are hyperlinks links which give one click access to other pages on the site. These are usually denoted with double square brackets `[[some_page]]` and Obsidian would generate the reference to that page automatically.

Flowershow will convert internal links to html `a` tags, with their `href` attributes pointing to the location referenced by original internal links.

### Internal link types
**Currently supported by Flowershow:**

* Link to a page, e.g. `[[roadmap]]`, which renders as [[quick-start]]
* Link to a page with a custom name, e.g.  `[[roadmap|Planned Features]]`, which renders as [[quick-start|Planned Features]] 

🚧 **We're currently working on support for these types:**
* Link to a specific heading within a given page `[[roadmap#Planned features 🚧]]`
* Link to a specific heading within a given page with a custom name, e.g. `[[roadmap#Planned features 🚧|Work in progress...]]`
* Link to a specific block (paragraph) within a given page, e.g. `[[roadmap#Planned features 🚧|Work in progress...]]`
* Link to a file, e.g. `![[abstract-flowers.png]]`

## Frontmatter

You can add meta data to your pages, by adding key-value pairs to frontmatter, e.g.:

```md
---
title: Flower Show
description: A tool for publishing markdown notes.
mymeta: Some info
---
```

The `title` and `description` fields are pulled from the MDX file and processed using `gray-matter`. Additionally, links are rendered using a custom component passed to `next-mdx-remote`.

## Tailwind support

Flowershow comes with built-in [tailwind](https://tailwindcss.com) support on any markdown page for styling your content.

That means you can do things like:

```hmtl
<div className="text-green-500">
Hello World!
</div>
```

Which will be rendered like this:
<div className="text-green-500">
Hello World!
</div>

And it means you have access to the full ecosystem of tailwind features and components.

>[!Note] className rather than class
>
> You may have noticed we used `className` rather than `class` attribute in our html. That's because we are using [[docs/mdx|MDX]] (markdown extended) rather than pure markdown and so we follow React conventions and use `className` 

## How to use components in your markdown

### Steps

1. Create a component (eg. Hero.js) in components folder
2. Add it to components in `components/MDX'
```javascript
import Hero from './Hero.js'

const components = {
	...
	Hero,
	...
}
```
3. Use directly in markdown file as 
```javascript
---
// frontmatter
layout: ...
---

<Hero />
```

### Passing data in mdx

1. Add the data in `pages/[[slug]].js`
```javascript
const testData = [
  { title: "First", value: 1 },
  { title: "Second", value: 2 },
  { title: "Third", value: 3 },
]

export default function Page({ body, ...rest }) {
  const Component = useMDXComponent(body.code, { testData });
	...
}
```
2. Use as props value in markdown
```javascript
<ExampleComponent data={testData} />
```