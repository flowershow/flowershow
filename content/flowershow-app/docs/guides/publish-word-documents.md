---
title: Publish Word documents
description: Publish a .docx file as a page on your Flowershow site, with the original still available to download. Works from the CLI, dashboard, GitHub and AI tools.
date: 2026-11-19
authors:
  - rufuspollock
---

> [!tip] Using an AI assistant?
> Give it this page as Markdown: https://flowershow.app/docs/guides/publish-word-documents.md. For all of Flowershow, point it at https://flowershow.app/llms.txt.

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
- AI publishing through MCP

You should see the publish succeed, with no extra setup.

## Step 2: Open the page

`report.docx` is published at `/report`. A file in a folder keeps its folder: `notes/q3.docx` becomes `/notes/q3`. `index.docx` or `README.docx` becomes the index page of its folder.

The page title is the document's first heading (Word's Title or Heading 1 style), otherwise the file name. You should see your document as a normal page. Search, tags, backlinks and annotations work as they do on Markdown pages, and a `#tag` written in the document counts as a tag.

## Step 3: Link to the page or the download

- `[[report]]` links to the page.
- `[report](report.docx)` or `[[report.docx]]` links to the Word file, which downloads.

You should see the first link open the page and the second download the original.

## Step 4: Update or remove it

Publish the Word file again and the page is replaced. Delete the file and the page is removed. The conversion is one way: edit the Word file, not the page.

Word files that were already on your site before Word pages existed stay downloads until the file changes: publishing again skips unchanged files. Save or edit the file and publish it again to turn it into a page.

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

A Word file never makes a publish fail. When something goes wrong, the publish still succeeds and the file stays available:

- **The page shows Markdown content, not my Word file** → if `report.md` and `report.docx` both exist, the Markdown page wins and the Word file is only a download. Rename or remove one.
- **My Word file only downloads, with no page** → it could not be converted, for example because it is over 10 MB, isn't a real `.docx`, is encrypted, or is very unusual. It stays a download (if an earlier version was converted, that page stays up). Fix the file (for a large file, shrink its images) and publish again.
- **Something is missing from the page** → content Flowershow can't convert, such as equations or SVG images, is left out without a message. Compare the page with the table above.
- **A folder called `_derived`** → `_derived/` is a reserved top-level folder name, because converted images are stored there. Use another name.

## Good to know

- Images in converted documents on public sites are cached long-term. Switching a site to password protection does not retract image URLs you already shared, the same as for other files.
- Word pages appear in the sidebar, sitemap, RSS feed and listings, like Markdown pages. To keep a Word file out of the sidebar and search, add it to [[content-filtering#hide-paths|Content Hide]]: it stays published and downloadable. To not publish it at all, add it to [[content-filtering#exclude-paths|Content Exclude]].
- Word pages have no "copy as Markdown" or page actions, and are not listed in `llms.txt`.

## Next steps

- [[publish-from-terminal|Publish from the terminal]]
- [[publish-github-repo|Publish a GitHub repo]]
