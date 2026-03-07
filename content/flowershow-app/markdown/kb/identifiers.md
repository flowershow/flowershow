---
title: Heading identifiers in Pandoc-style Markdown
created: 2025-12-04
---

Pandoc introduced the syntax:

```
# Heading title {#custom-id}
```

to allow authors to define **explicit heading identifiers**.

### What supports it

Supported in:

* **Pandoc** (the defining implementation).
* **Hugo** (via Goldmark with the `attribute` extension enabled).
* **MkDocs / Material for MkDocs** (through the Python Markdown `attr_list` extension).
* **Obsidian** (supports reading these IDs though not all plugins write them).

### What does *not* support it (natively)

* **GitHub Flavored Markdown** rendering on github.com (it strips the `{#id}` block).
* **CommonMark** and the CommonMark spec do not include this extension.
* Many simpler Markdown renderers (including some JavaScript ones) ignore it.

Pandoc allows attribute blocks **only in specific syntactic positions, not anywhere**.

The authoritative specification is in the *Pandoc User’s Guide* (“Extension: `attr_parser`” and the descriptions of `header_attributes`, `fenced_code_attributes`, etc.).

### Where Pandoc allows attributes

1. **Headings**

   ```
   ## Title {#id .class key=val}
   ```

2. **Fenced code blocks**

   ````
   ```lang {#id .class}
   ````

   ```
   ```

3. **Images** (using the general attribute syntax after the link)

   ```
   ![alt](img.png){#id .class}
   ```

4. **Div / span elements** via fenced syntax

   ```
   ::: {.myclass}
   Content
   :::
   ```

5. **Inline spans**

   ```
   [text]{.class}
   ```

### Where Pandoc does *not* allow attributes

* You cannot attach arbitrary `{#id}` immediately after **ordinary paragraphs**, list items, blockquotes, or arbitrary inline text unless you are using the **span** or **div** syntaxes above.
* You cannot place `{#id}` in the middle of a paragraph and expect it to attach to the paragraph itself.

### Minimal conclusion

Pandoc’s `{#id}` syntax is **not universal**; it works only in constructs that explicitly support attributes (headings, code blocks, images, spans, and divs).