---
title: Publish Word documents
description: Publish a .docx file as a page on your Flowershow site, with the original still available to download. Works from the CLI, dashboard, GitHub, Obsidian and AI tools.
date: 2026-11-19
authors:
  - rufuspollock
---

> [!tip] Using an AI assistant?
> Give it this page as Markdown: https://flowershow.app/docs/publish-word-documents.md. For all of Flowershow, point it at https://flowershow.app/llms.txt.

Publish a Word file and Flowershow turns it into a page on your site. `report.docx` becomes the page `/report`, styled by your site theme, and the original stays downloadable at `/report.docx`.

## What you'll build

A page with the document's headings, text, tables and images, in your site's theme. You'll also learn what is kept, what is left out and how links to the page and to the download differ.

**You'll need:** a Flowershow site and a `.docx` file of up to 10 MB. **Time:** about 2 minutes.

## Step 1: Publish the .docx file

Publish it the same way as any other file. All of these accept `.docx`:

- the `fl` CLI: `fl report.docx`, or a folder containing it (see [[publish-from-terminal|Publish from the terminal]])
- the dashboard's file import
- the drag-and-drop publish page
- GitHub repo sync (see [[publish-github-repo|Publish a GitHub repo]])
- the Obsidian plugin
- AI publishing through MCP

You should see the publish succeed, with no extra setup.

## Step 2: Open the page

`report.docx` is published at `/report`. A file in a folder keeps its folder: `notes/q3.docx` becomes `/notes/q3`. `index.docx` or `README.docx` becomes the index page of its folder.

The page title is the document's first heading (Word's Title or Heading 1 style), or the file name if there is none. You should see your document as a normal page. Search, tags, backlinks and annotations work as they do on Markdown pages, and a `#tag` written in the document counts as a tag.

## Step 3: Link to the page or the download

- `[[report]]` links to the page.
- `[report](report.docx)` or `[[report.docx]]` links to the Word file, which downloads.

You should see the first link open the page and the second download the original.

## Step 4: Update or remove it

Publish the Word file again and the page is replaced. Delete the file and the page is removed. The conversion is one way: edit the Word file, not the page.

## What is kept and what is left out

| Kept | Left out |
| --- | --- |
| Headings (Title and Heading styles), paragraphs | Equations, comments, text boxes |
| Bold, italic, strikethrough, links | Headers, footers, page numbers |
| Bullet and numbered lists, including nested | Word's automatic heading numbers |
| Tables (tables with merged cells are kept as HTML tables) | Fonts, colours and other styling: your site theme styles the page |
| Images (PNG, JPEG, GIF, WebP) | SVG, EMF and WMF images |
| Footnotes, quotes, code styles | |

With track changes, insertions are kept and deletions are dropped, as if all changes were accepted.

## Troubleshooting

- **The page shows Markdown content, not my Word file** → if `report.md` and `report.docx` both exist, the Markdown page wins and the Word file is only a download. The publish shows a warning. Rename or remove one.
- **"Could not convert this Word document: …"** → the file was rejected, for example because it isn't a real `.docx`, is encrypted, or is very large or unusual. It still downloads. Fix the file and publish again. The message appears in `fl` output and in the dashboard's publish history.
- **"Converted with warnings: …"** → the page is live, but something was left out, such as an unsupported image. Compare the page with the table above.
- **Word files over 10 MB** → rejected with a message. Shrink the images and publish again.
- **A folder called `_derived`** → `_derived/` is a reserved top-level folder name, because converted images are stored there. Use another name.

## Good to know

- Images in converted documents on public sites are cached long-term. Switching a site to password protection does not retract image URLs you already shared, the same as for other files.
- Word pages have no "copy as Markdown" or page actions, and are not listed in `llms.txt`.

## Next steps

- [[publish-from-terminal|Publish from the terminal]]
- [[publish-obsidian-vault|Publish an Obsidian vault]]
- [[publish-github-repo|Publish a GitHub repo]]
