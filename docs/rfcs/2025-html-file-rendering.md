# HTML file rendering

## Situation

Flowershow currently:

- Allows to use HTML in Markdown and JSX in MDX.
- Having fully custom HTML page is currently possible with:
  - setting `layout: plain` in the frontmatter in your Markdown page
  - pasting your HTML in page body, below the frontmatter
  - removing empty lines in between tags.

Example of a completely custom page:

- raw: https://raw.githubusercontent.com/life-itself/metacrisis.info/refs/heads/main/index.md
- rendered: https://metacrisis.info/

## Complication

There are some friction points when you want a fully custom page, most notably:

- no way to disable the default navbar and footer,
- newlines cause the HTML to break (need to make sure to remove them),
- no how-to blog post with instructions,
- (you need `layout: plain`).

## Solutions

### Option 1 (Recommended)

- allow disabling the default navbar and footer through `config.json` (global) and frontmatter (per-page)
- write a blog post with instructions (mention `layout: plain` and empty lines that need to be removed).

Why isn't it enough?

...
