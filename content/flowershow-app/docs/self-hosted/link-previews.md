---
title: Link previews (tooltips)
---
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

🚧 THIS FEATURE NEEDS TO BE RE-IMPLEMENTED AFTER SWITCH TO MARKDOWNDB

You can enable tooltips with page preview content showing when hovering over wiki-links.

> [!note]
> Tooltips are only supported for internal links ie. links to other pages within your site and not for external links eg. `https://some-other-site.com/`

After hovering over a link, the tooltip will be displayed as seen in the screenshot below:
![[link-preview.jpg]]

If your page has an image in the frontmatter, the image will also be displayed in the following style
![[link-preview-with-image.jpg]]

This feature is enabled by default and if not required, it can be toggled off by adding the `showLinkPreviews` property and setting it to false in your `config.mjs` file.

```js
// config.mjs

const config = {
  showLinkPreviews: false,
};
```

### Disable/Enable link preview for page

You can also add/remove link previews for specific pages by setting `showLinkPreview` to **true** or **false** in the page's frontmatter like below.

```md
---
showLinkPreview: true
---
```
