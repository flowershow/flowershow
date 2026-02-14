---
title: Edit this page button
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

If you keep your content in a public GitHub repository, and would like to encourage other people to contribute to it, you can show "Edit this page" button at the bottom of the page. It will link to the source file in your repository.

In order to make it work, you first need to set the `editLinkRoot` in your `config.mjs` file:

```js
{
  editLinkRoot: "https://github.com/flowershow/flowershow/edit/main/site/content"; //example
}
```

## Default setting

You can disable or enable showing the button for all your pages by setting this property in your `config.mjs` file. The button is disabled by default.

```js
{
	showEditLink: false,
}
```

## Per-page setting

You can also overwrite the default setting in single pages by including this field in the frontmatter:

```md
---
showEditLink: true
---
```
