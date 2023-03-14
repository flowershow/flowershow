# MarkdownDB

A MarkdownDB is a [[contentbase|ContentBase]] where the primary text files are markdown.

A database where the "data" is markdown.

Markdown with frontmatter combines unstructured content with structured data with an open, highly accessible format.

Combined that with blocks i.e. backtick labelled sections and you have *extensible* unstructured content in which you can embed other structured or unstructured content.

Combine that with web components / JSX and you have a full inline javascript.

More reasons [[notes/markdown-is-eating-the-world]] (aka markdown is cool) 😎

## Job stories

### Parse stuff

- [ ] parse frontmatter
  - [ ] dealing with nested frontmatter
  - [ ] dealing with property types e.g. string, number
- [ ] parse tags
  - [ ] from frontmatter
  - [ ] ...

### Computed fields (or just any operations on incoming records)

cf https://www.contentlayer.dev/docs/reference/source-files/define-document-type#computedfields

When loading a file i want to create new fields based on some computation so that i can have additional metadata

When loading a file i want to add a type based on the folder i found the file so that i can label blog posts

### Validation of data on way in

When loading a file I want to validate it against a schema/type so that I know the data in the database is "valid"

- When validation fails what happens?
- Error messages should be super helpful
- Follow the principle of erroring early

When loading a file i want to allow "extra" metadata by default so that i don't get endless warnings about 

When accessing a File I want to cast it to a proper typescript type so that i can use it from code with all the benefits of typescript

### BYOT (bring your own types)

When working with markdowndb i want to create my own types ...

### Misc

#### CLI tool for indexing

When working with a folder of markdown files I want to create a markdowndb (index) on the command line so that I it to use

## Architecture

### Tasks

- [ ] What is the pipeline
- [ ] How do we have have "plugins" e.g. for adding 

```mermaid
graph LR

walk[Walk files]
frontmatter[Frontmatter extraction]

walk --> frontmatter
```

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