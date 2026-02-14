---
title: Syntax Mode Configuration
---

Flowershow lets you choose how your content is parsed: Markdown or MDX. This is particularly useful when publishing content from Obsidian or other Markdown editors.

## Configuration

### Global Setting

Set the default rendering mode in site settings in your dashboard.

**Options:**
- `"md"` - Regular Markdown rendering
- `"mdx"` - MDX rendering (default)
- `"auto"` - Decide based on file extension (`.md` vs `.mdx`)

### Per-Page Override

Override the global setting using frontmatter:

```markdown
---
title: My Page
syntaxMode: md
---

Your content here...
```

## When to Use Markdown Mode

MDX has stricter parsing rules and may not handle certain syntax that works fine in plain Markdown:
- HTML blocks (MDX expects JSX syntax, though some HTML may work)
- Special characters like `<` that aren't part of valid JSX
- Unescaped curly braces like `{a}` in regular text

**If you experience issues** when publishing plain Markdown content, try switching to `"md"` mode globally and use MDX only where needed.

## When to Use MDX Mode

Use MDX when you want to:
- Use Flowershow components like [[list-component|List]]
- Write [[custom-styles#jsx-blocks-styled-with-tailwind|JSX blocks styled with Tailwind]]
- Embed interactive React components

## Example Workflow

For Obsidian users, set global mode to Markdown (you can't edit `.mdx` files there, so "auto" option will make it harder for you to edit and create new files). Then enable MDX for specific pages that need components:

```markdown
---
title: My Catalog
syntaxMode: mdx
---

<List path="notes" />
