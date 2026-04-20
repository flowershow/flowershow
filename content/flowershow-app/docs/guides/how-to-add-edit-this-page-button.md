---
title: How to Add 'Edit this page' Button
description: Learn how to add an edit button to your Flowershow pages that links directly to GitHub, allowing readers to contribute improvements to your content.
date: 2025-03-18
authors:
  - olayway
---

Want to make your Flowershow site more collaborative? Adding an "Edit this page" button is a great way to encourage community contributions to your content. In this quick guide, I'll show you how to enable this feature.

## What is the "Edit this page" Button?

The "Edit this page" button appears at the bottom of your pages and links directly to the GitHub edit interface for that page. When visitors click it, they'll be taken to GitHub where they can:
- Suggest improvements to your content
- Fix typos or broken links
- Add new information
- Submit changes through GitHub's pull request system

>[!important]
> Before enabling this feature, ensure your repository is public on GitHub (this is required for the edit links to work).

## How to Enable

Add the following line to your `config.json` file:

```json
{
  "showEditLink": true
}
```

That's it! Once you add this configuration and deploy your site, every page will display an "Edit this page" button at the bottom.

![[edit-this-page-button.png]]

## Benefits

Adding an edit button to your pages:
- Encourages community engagement
- Helps maintain up-to-date content
- Builds a collaborative knowledge base
- Makes it easy to fix small issues quickly

## Troubleshooting

If the edit button isn't appearing:

1. Verify your repository is public
2. Check your `config.json` syntax
3. Try clearing your browser cache
