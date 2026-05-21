---
title: Comments
description: Enable comments on your site's pages. Powered by Giscus and GitHub Discussions.
---

Configure comments from the **Flowershow dashboard** under **Site Settings → Features**, or using `config.json` if you prefer to version-control your settings or manage them via an automated workflow.

> [!note]
> Comments require a public GitHub repository — but it doesn't have to be the one your site content lives in. See [Using a dedicated comments repository](#using-a-dedicated-comments-repository) if you publish without GitHub integration or your content repo is private.

## Requirements

1. Your repository must be **public**
2. [GitHub Discussions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository) enabled in your repository
3. [Giscus](https://github.com/apps/giscus) GitHub App installed in your repository

## Getting your Giscus IDs

Visit [giscus.app](https://giscus.app):
1. Enter your repository name
2. Select your preferred discussion category
3. Find the Repository ID (R_...) and Category ID (DIC_...) in the `script` snippet at the bottom of the page.

## Enabling comments

Go to **Settings → Features → Comments** and toggle it on. Once enabled, two additional fields appear:

- **Giscus Repository ID** — the ID of your GitHub repository (starts with `R_`)
- **Giscus Category ID** — the ID of the discussion category (starts with `DIC_`)

> [!note]
> By default, comments are shown on all pages once enabled. Individual pages can override this with `showComments` in their frontmatter.

## Using a dedicated comments repository

There are a few situations where you need or want a dedicated public repository just for discussions:

- **No GitHub integration** (publishing via Obsidian, CLI, or direct upload) — there is no content repository connected to your site, so Giscus has nowhere to point without one.
- **Private content repository** — Giscus requires a public repository, so if your content repo is private you need a separate public one for comments.
- **Preference for separation** — you simply want to keep discussions in a dedicated repo, independent of where your content lives.

1. Create a new public GitHub repository (e.g. `username/my-site-comments`)
2. Enable [GitHub Discussions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository) in that repository
3. Install the [Giscus](https://github.com/apps/giscus) GitHub App on that repository
4. Visit [giscus.app](https://giscus.app) to get the Repository ID and Category ID for that repository

Then enable comments in the dashboard (**Settings → Features → Comments**) and add `giscus.repo` to your `config.json`. This is required — without it, Flowershow has no repository to point Giscus at and comments will not appear. The dashboard has no field for this, so it must be set in `config.json`:

```json
{
  "giscus": {
    "repo": "username/my-site-comments",
    "repoId": "R_xxx",
    "categoryId": "DIC_xxx"
  }
}
```

## Controlling comments per page

### Hide comments on a specific page

Add `showComments: false` to that page's frontmatter:

```yaml
---
title: Page Without Comments
showComments: false
---
```

## Using config.json

If you want to version-control your configuration, or have your editor's AI agent manage settings without touching the dashboard, you can define everything in `config.json` instead. Values set in `config.json` take precedence over dashboard settings.

`config.json` also exposes advanced Giscus options not available in the dashboard:

```json
{
  "showComments": true,
  "giscus": {
    "repo": "username/repo",
    "repoId": "R_xxx",
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

- `showComments`: `true` to enable comments site-wide, `false` to disable
- `giscus.repo`: GitHub repository in `username/repo` format. Required if your site has no GitHub integration (e.g. publishing from Obsidian or CLI); optional otherwise, where it defaults to your connected content repository.
- `giscus.repoId`: Repository ID (starts with `R_`)
- `giscus.categoryId`: Discussion category ID (starts with `DIC_`)
- `giscus.theme`: Giscus theme (e.g. `light`, `dark`, `transparent_dark`)
- `giscus.lang`: Language code (e.g. `en`, `fr`)
- `giscus.mapping`: How pages are mapped to discussions (`pathname`, `title`, `url`, etc.)
- `giscus.strict`: Strict title matching (`"0"` or `"1"`)
- `giscus.reactionsEnabled`: Enable reactions (`"0"` or `"1"`)
- `giscus.inputPosition`: Comment box position (`"top"` or `"bottom"`)

## Troubleshooting

**Comments section not appearing?**
- Verify GitHub Discussions is enabled in your repository
- Check if Giscus app has correct repository permissions
- Ensure Repository ID and Category ID are entered correctly

**Users can't comment?**
- Confirm they are logged into GitHub
- Check if Discussions are locked in your repository
- Verify the discussion category still exists
