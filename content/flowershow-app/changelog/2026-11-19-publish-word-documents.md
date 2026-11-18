---
title: Publish Word documents
date: 2026-11-19
description: Publish a .docx file as a page on your site, with the original still available to download.
authors:
  - rufuspollock
showToc: false
---

You can now publish Word documents. Publish a `.docx` file the way you publish any other file (CLI, dashboard, drag and drop, GitHub sync or AI tools) and it becomes a page: `report.docx` is at `/report`, and the original stays downloadable at `/report.docx`. Headings, text, lists, tables, images and footnotes come across. If a Markdown page has the same address, the Markdown page wins.

Word pages show up in the sidebar, sitemap, RSS and listings like any other page. Word files already on your site stay downloads until you change and publish them again. A Word file never makes a publish fail: if it can't be converted (for example, it's over 10 MB or not a valid `.docx`), it stays a download, and content that can't be converted, such as equations, is left out.

See [[publish-word-documents|Publish Word documents]] for what is kept and left out.
