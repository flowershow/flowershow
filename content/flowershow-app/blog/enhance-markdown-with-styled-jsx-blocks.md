---
title: Enhancing Markdown Pages with Styled JSX Blocks
description: Learn how to transform simple markdown content into beautiful, JSX components styled with Tailwind CSS. We'll walk through the complete process using a real-world example.
date: 2025-06-05
authors:
  - olayway
---

In Flowershow you can blend markdown content with JSX blocks and style them with Tailwind classes. This allows you to start with simple, readable markdown draft and progressively enhance it with elegant components without losing the simplicity of your content workflow.

In this tutorial, we'll walk through the complete process of transforming a simple markdown section with a list of product features into a grid of styled cards. As an example we'll use a draft of a landing page for a dummy tech product - 404Shield.

We'll cover this transformation in five steps:

0. **Start with markdown** - Clean, simple content and page structure draft in markdown
1. **Create a basic card** - Convert one feature to JSX block
2. **Add Tailwind styling** - Make it look nice with Tailwind
3. **Create a grid of features** - Scale to multiple features
4. **Add icons** - Enhance visual appeal with Material Design icons

Let's dive in!

## Step 0: Start with Pure Markdown

Here's our original markdown section:

```markdown
## Why 404Shield?

### Instant Error Eradication
Our script intercepts 404 errors before they ever reach your visitors.

[Learn more ➝](https:://404shield.com/docs)

### Redirect to Random Meme
Because if you can’t find the page, at least make them laugh.

[Learn more ➝](https:://404shield.com/docs)

### Smart Redirects
Guess the intended page using our AI (Actually Imaginary) engine.

[Learn more ➝](https:://404shield.com/docs)

### Eternal Uptime
If every page exists, then none are ever missing. Think about it.

[Learn more ➝](https:://404shield.com/docs)
```

And currently it renders like this in Flowershow:

![[Pasted image 20250527145145.png]]

This is clean, readable, and perfectly functional. But we can make it much more engaging with some custom styling and layout.

## Step 1: Create a Basic Card

Let's start by converting just one feature into a basic JSX card with no styling. We'll take the first feature and wrap it in a simple card structure:

```jsx
<div>
  <h3>Instant Error Eradication</h3>
  <p>Our script intercepts 404 errors before they ever reach your visitors.</p>
  <a href="https:://404shield.com/docs">Learn more →</a>
</div>
```

This gives us the foundation to work with. The content is the same, but now we have the flexibility to style it. If you now sync your site and preview it, you'll notice no (or almost no) changes, as we have perfectly mirrored how Flowershow renders this piece of markdown as HTML anyway.

## Step 2: Style it with Tailwind

Now let's make our card look nicer with some Tailwind CSS classes:

```jsx
<div className="not-prose flex cursor-default flex-col space-y-4 rounded-lg border border-gray-200 p-10 transition-all duration-150 hover:border-orange-400">
  <h3 className="font-semibold">Instant Error Eradication</h3>
  <p className="flex-grow">Our script intercepts 404 errors before they ever reach your visitors.</p>
  <a href="https:://404shield.com/docs" className="font-semi-bold self-start text-sm text-orange-600">Learn more →</a>
</div>
```

Here is the result:

![[Pasted image 20250605144012.png]]

Here is a description of some of the classes used above:
- `not-prose` - Disables default Tailwind typography styling (more explanation in the callout below) _ ⚠️Important_
- `flex flex-col` - Creates a vertical flex layout
- `cursor-default` - Sets the cursor to default arrow (prevents text selection cursor)
- `space-y-4` - Adds vertical spacing between child elements
- `rounded-lg` - Adds rounded corners to the card
- `border border-gray-200` - Adds a light gray border around the card
- `transition-all duration-150` - Enables smooth transitions for all properties over 150ms
- `hover:border-orange-400` - Changes border color to orange on hover


> [!hint] Supported classes
> Flowershow supports **Tailwind CSS 3** so you can look up style classes in their [documentation](https://v3.tailwindcss.com/docs).

> [!tip] Tailwind Playground
> To make component development easier, you can use [Tailwind Play](https://play.tailwindcss.com/) - an online playground for quickly prototyping and testing your Tailwind-styled components. Note that the playground uses HTML syntax, so when copying your final version to Flowershow, you'll need to convert HTML `class` attributes to `className` for JSX compatibility.
>
> **Pro tip**: When you're happy with your component in the playground, use ctrl+f to find all `class` attributes, then click the `>` button to open the replacement panel and quickly replace them with `className` before copying the code to your markdown file.

> [!info] Why `not-prose` is needed
> The `not-prose` class is crucial when creating custom JSX components in Flowershow. By default, Flowershow applies Tailwind's typography plugin styles (prose classes) to all markdown content, which includes automatic styling for headings, paragraphs, links, and other elements.
>
> Without `not-prose`, your custom Tailwind classes might conflict with or be overridden by the default prose styling. For example, your custom `text-orange-600` link color might be ignored in favor of the default prose link styling.
>
> Adding `not-prose` to your JSX components ensures that only your intentional styling is applied, giving you complete control over the appearance.
>
> If you’re planning a **bespoke landing page** (custom hero, layout, typography), consider writing most of the page as JSX blocks inside markdown—or switch the entire page to a `plain` layout (see below) and build the whole thing in JSX. This gives you pixel‑level control typical for landing pages.

## Step 3: Create a Grid of Features

Now that we have a perfect card, first let's create cards for the rest of the features and then organize them in a nice grid:

```jsx
<div className="grid lg:grid-cols-2 gap-4">
	...Put all features cards here...
</div>
```

Key layout classes:
- `grid lg:grid-cols-2 gap-4` - Creates a responsive 2-column grid

The result will look like this:

![[Pasted image 20250605145521.png]]

## (Bonus) Step 4: Adding Icons for Visual Enhancement

Now let's enhance our cards with icons to make it more visually appealing. We'll use Material Design Icons through CSS classes:

```jsx
<div className="not-prose flex cursor-default flex-col space-y-4 rounded-lg border border-gray-200 p-10 transition-all duration-150 hover:border-orange-400">
  <h3 className="font-semibold flex items-center">
    <div className="i-mdi-lightning-bolt-outline text-2xl text-orange-600 mr-2"/>Instant Error Eradication</h3>
  <p className="flex-grow">Our script intercepts 404 errors before they ever reach your visitors.</p>
  <a href="https:://404shield.com/docs" className="font-semi-bold self-start text-sm text-orange-600">Learn more →</a>
</div>
```

Final result:

![[Pasted image 20250605150620.png]]

> [!tip] Icon Options
> Flowershow supports Material Design Icons through CSS classes. You can browse available icons at [Iconify's Material Design Icons collection](https://icon-sets.iconify.design/mdi/). Simply prefix any icon name with `i-mdi-` to use it as a CSS class.

## JSX-only landing pages

For landing pages, you often want zero interference from default styles. Flowershow lets you opt out of `prose` typography styles entirely with a `plain` layout.

### Use `layout: plain` to disable page‑level styling

Add this to your frontmatter to remove Flowershow’s typography for the entire page:

```
---
layout: plain
---
```

With `layout: plain`:

- The default `prose` typography styles are not applied, so you don’t need `not-prose` on each component.
- You’re free to build the entire page in JSX (hero, grids, pricing, testimonials) with your own Tailwind classes.
- Perfect for **bespoke landing pages** that need full visual control.

When to stick with `not-prose`:
- You’re building a regular content page (blog post, docs) but want one or two custom sections (e.g., a CTA card or feature grid) to ignore prose styles.
- You still like the default typography everywhere else.

## Summary

We took a simple markdown list and turned it into a landing‑page‑ready features grid. The progression shows how you can start with content‑first thinking and then layer in JSX + Tailwind for precise layout and styling.

![[Pasted image 20250605151131.png]]

## Tips for Component Development

1. **Start with content**: Always begin with clean, well-structured markdown. This ensures your content is accessible and readable on Flowershow even without styling, so you can publish it quickly.
2. **Enhance progressively**: Build your components incrementally. Start simple and add complexity.
3. **Semantic HTML**: Even when using JSX, maintain semantic HTML structure for accessibility and SEO.
4. **Use Tailwind Playground for development**: Instead of styling directly in your markdown files (e.g., in GitHub's web editor), use [Tailwind Playground](https://play.tailwindcss.com/) to prototype and test your components. This is much faster as you can preview your components live without waiting for your site to sync after each change. It also keeps your commit history clean by avoiding incomplete styling iterations.
5. **Leverage free Tailwind component libraries**: Don't reinvent the wheel.
6. **Ask ChatGPT for some help with styling and quick prototyping 😉**

## Working with Flowershow

When developing with Flowershow, you can see your changes in real-time:

1. **Edit directly on GitHub** - Use GitHub's web editor for quick changes
2. **Sync your site** - Wait for the site to sync automatically (or sync it manually)
3. **Preview** - See your components live on your site
4. **Iterate** - Make adjustments and see results

## Conclusion

The ability to seamlessly blend markdown with JSX components gives you the best of both worlds: the simplicity of markdown for content creation and the power of React components for styling.

By following this step-by-step approach, you can transform any markdown content into beautiful, functional components that enhance your site's user experience while maintaining the content-first workflow that makes markdown so appealing.

