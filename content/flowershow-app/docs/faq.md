# FAQs

### Mermaid diagrams aren't rendering on my page — they just show as a code block

Mermaid diagrams require **MDX rendering mode** to work. In Markdown (`md`) mode, Mermaid code blocks are treated as plain text and won't be processed.

**Fix — enable MDX for that page:**

You have three options:

1. **Change the file extension** to `.mdx` — Flowershow will automatically parse it as MDX.
2. **Add `syntaxMode: mdx` to the frontmatter** of the page:

```md
---
title: My Page
syntaxMode: mdx
---
```

3. **Enable MDX globally** via your site settings in the Flowershow Cloud dashboard.

See [[mermaid|Mermaid diagrams]] and [[syntax-mode|Syntax Mode Configuration]] for more details.

---

### The copy button on code blocks isn't working

The copy button on code blocks is a client-side feature and requires **MDX rendering mode**. In plain Markdown (`md`) mode, interactive features like the copy button may not initialise.

**Fix — enable MDX for that page:**

You have three options:

1. **Change the file extension** to `.mdx` — Flowershow will automatically parse it as MDX.
2. **Add `syntaxMode: mdx` to the frontmatter** of the page:

```md
---
title: My Page
syntaxMode: mdx
---
```

3. **Enable MDX globally** via your site settings in the Flowershow Cloud dashboard.

---

### Is there a way to remove the footer all together?

Only with CSS. `display: none`
