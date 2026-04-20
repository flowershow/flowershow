---
title: Comments
description: Enable comments on yout site's pages. Powered by Giscus and GitHub Discussions.
---

## Requirements

1. Your repository must be **public**
2. [GitHub Discussions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository) enabled in your repository
3. [Giscus](https://github.com/apps/giscus) GitHub App installed in your repository

## Getting giscus configuration IDs

Visit [giscus.app](https://giscus.app):
1. Enter your repository name
2. Select your preferred discussion category
3. Find the Repository ID (R_...) and Category ID (DIC_...) in the `script` snippet at the bottom of the page.

## Basic Configuration

To enable comments, turn on the "Comments" option in your site's settings in the dashboard.

![[comments-option.png]]

Then, enter your Giscus Repository ID and Category ID.

![[giscus-config.png]]

## Advanced Configuration

For more control over your comment section, you can configure additional Giscus settings through your site's [[config-file|config.json]] file:

```json
{
  "giscus": {
    "repo": "username/different-repo",
    "repoId": "R_xxx",
    "category": "Discussions",
    "categoryId": "DIC_xxx",
    "theme": "transparent_dark",
    "lang": "en",
    "mapping": "title",
    "strict": "0",
    "reactionsEnabled": "1",
    "inputPosition": "top"
  }
}
```

This advanced configuration allows you to customize:
- Theme appearance
- Language preferences
- Reaction settings
- Comment input position
- Category configuration
- and more...

> [!important]
> Any settings in your `config.json` will override the defaults and values configured in the site dashboard.

## Default behavior and customization

By default, comments will be enabled on all pages. You have two ways to customize this behavior:

### Hide comments on specific pages

To hide comments on a single page, add `showComments: false` to the page's frontmatter:

```yaml
---
title: Page Without Comments Section
showComments: false
---
```

### Show comments only on specific pages

If you prefer to enable comments only on specific pages, you can:

1. Hide comments site-wide by setting `showComments: false` in your site's [[config-file|config file]]:

```json
{
  "showComments": false  // Disable comments site-wide (if you want to enable them only on specific pages)
}
```

2. Enable comments on specific pages by setting `showComments: true` in their frontmatter:

```yaml
---
title: My Page With Comments Section
showComments: true
---
```


> [!info]
> For a detailed guide including examples and step-by-step instructions, check out [[how-to-enable-page-comments|this blog post]].
