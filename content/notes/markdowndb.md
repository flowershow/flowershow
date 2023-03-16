# MarkdownDB

A MarkdownDB is a [[contentbase|ContentBase]] where the primary text files are markdown.

A database where the "data" is markdown.

Markdown with frontmatter combines unstructured content with structured data with an open, highly accessible format.

Combined that with blocks i.e. backtick labelled sections and you have *extensible* unstructured content in which you can embed other structured or unstructured content.

Combine that with web components / JSX and you have a full inline javascript.

More reasons [[notes/markdown-is-eating-the-world]] (aka markdown is cool) 😎

## Job Stories High Level

*i.e. why do i want a markdowndb*

When generating rendered pages I want to get a list of all or some of the markdown files we have so that i can render them and create blog index etc

When generating an individual rendered page i want information about all the pages that reference it so that i can list all the backlinks

When creating a tag page I want to list all pages with that tag so that I can generate that page

## Job stories

### Index a folder of files

I want to create a db index given a folder of markdown and other files

Bonus

- Index multiple folders (with support for configuring e.g. prefixing in some way e.g. i have all my blog files in this separate folder over here)

### Structured data extraction

#### Frontmatter

Extract frontmatter

- deal with nested frontmatter
- deal with casting types e.g. string, number so that we can query in useful ways e.g. find me all blog posts before date X

#### Tags

Extracts tags in frontmatter with tags attribute and in body like `#abc`

#### Link extraction

I want to extract links so i can compute backlinks or deadlinks etc

- standard markdown links
- obsidian wiki links
- embeds of files e.g. `![...]`
  - wiki link embeds of files

So all of these

```
[...](...)
![...](...)
[[...]]   # wiki link style including with title
[[...|my title]]   # wiki link style including with title
![[...]]  # for images and other embeds
```

#### Tasks

Extracting tasks like:

```md
- [ ] this is a task
```

See obsidian data view.

### Computed fields (or just any operations on incoming records)

cf https://www.contentlayer.dev/docs/reference/source-files/define-document-type#computedfields

When loading a file i want to create new fields based on some computation so that i can have additional metadata

- Add a type based on the folder of the file so that i can label blog posts
- Add `layout` based on the folder so i can change layouts based on folder

### Validation of data on way in

When loading a file I want to validate it against a schema/type so that I know the data in the database is "valid"

- When validation fails what happens?
- Error messages should be super helpful
- Follow the principle of erroring early

When loading a file i want to allow "extra" metadata by default so that i don't get endless warnings about 

When accessing a File I want to cast it to a proper typescript type so that i can use it from code with all the benefits of typescript

### BYOT (bring your own types)

When working with markdowndb i want to create my own types ... so that when i get an object out it is cast to the right typescript type

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