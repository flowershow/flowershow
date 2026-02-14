---
title: Transforming your markdown content with the `preProcess` function
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

## Introduction

The `preProcess` function in Flowershow allows you to apply custom transformations to your Markdown content before it's rendered in the application.

## Why `preProcess`?

The flexibility of the `preProcess` function allows for a wide range of content transformations. Here are some examples of what you can achieve:

- **Character Replacement**: Substitute characters or phrases with custom text or emojis.
- **Content Filtering**: Remove or add specific content based on your project's requirements.
- **Format Adjustments**: Alter the formatting of your content for a better user experience.

## How to Use `preProcess`

You can define your custom `preProcess` function in the `config.mjs` file. For example, to replace all instances of `=>` in Markdown files with `⟹`, you could add the following code:

```javascript
// content/config.mjs
export default {
    preProcess: (content) => {
        return content.replaceAll(/=>/g, '⟹');
    }
}
```

> [!info] Notice
> The above example, which converts => to ⟹, is a default setting in Flowershow's configuration.
