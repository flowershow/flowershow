
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

# Tailwind support

Flowershow comes with built-in [tailwind](https://tailwindcss.com) support. You can use it to style your custom layouts or in-markdown HTML blocks.

That means you can do things like:

```md
<div className="text-green-500">
Hello World!
</div>
```

Which is rendered like this:

<div className="text-green-500">
Hello World!
</div>

> [!Note] className rather than class
>
> You may have noticed we used `className` rather than `class` attribute in our html. That's because we are using [[docs/mdx|MDX]] (markdown extended) rather than pure markdown, so we follow React conventions and use `className`
