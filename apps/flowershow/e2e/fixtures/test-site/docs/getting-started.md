---
title: Getting Started
---

This is the getting started guide. It is intentionally long so that, when
embedded as a file node in a JSON Canvas, the card's content overflows its
fixed height and becomes scrollable.

## Installation

Install the CLI and log in:

```bash
npm install -g @flowershow/cli
fl login
```

Once installed, you can publish any folder of Markdown files with a single
command. The CLI uploads your content and returns a live URL.

## Creating your first site

1. Create a folder for your notes.
2. Add a few Markdown files.
3. Run `fl publish` from inside the folder.
4. Open the URL that the CLI prints.

Every Markdown file becomes a page. Folders become sections in your sidebar,
and an `index.md` (or `README.md`) becomes the landing page for that section.

## Writing content

Flowershow supports standard Markdown plus a few extras:

- **Wiki links** like `[[getting-started]]` for quick internal linking.
- **Embeds** like `![[diagram.canvas]]` to drop a canvas straight into a page.
- **Callouts**, footnotes, tables, and syntax-highlighted code blocks.
- **Frontmatter** for per-page configuration such as the title and layout.

You can mix and match these freely, and the renderer will resolve links across
your whole site so nothing breaks when you move files around.

## Configuration

Site-wide options live in `config.json` at the root of your content. There you
can set the navigation bar, sidebar paths, footer, theme, and more. Changes
take effect the next time you publish.

## Next steps

- Explore the reference docs to learn about every configuration option.
- Set up a custom domain so your site lives at your own address.
- Enable search, comments, and analytics as your site grows.

Keep scrolling — there is always more to read, and this card should now be tall
enough that the extra lines are hidden until you scroll.
