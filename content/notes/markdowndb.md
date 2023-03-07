# MarkdownDB

A MarkdownDB is a [[contentbase|ContentBase]] where the primary text files are markdown.

A database where the "data" is markdown.

Markdown with frontmatter combines unstructured content with structured data with an open, highly accessible format.

Combined that with blocks i.e. backtick labelled sections and you have *extensible* unstructured content in which you can embed other structured or unstructured content.

Combine that with web components / JSX and you have a full inline javascript.

More reasons [[notes/markdown-is-eating-the-world]] (aka markdown is cool) 😎

## Design

### Schema

- Nodes / Files
- Blocks within them

Node properties:

- type
  - - text (markdown)
  - blob
- metadata
- body/payload ? not sure we have this in DB (this is on disk / storage)
- blob_type (? or inferred)