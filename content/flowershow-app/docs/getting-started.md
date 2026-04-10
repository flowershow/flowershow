---
title: Getting Started
description: Go from markdown files to a live website in under a minute.
showHero: true
---

Pick the method that fits how you work.

## From Obsidian

Publish directly from your vault — no GitHub account needed.

1. Open **Settings > Community Plugins**, search "Flowershow", install and enable it
2. Sign up at [cloud.flowershow.app](https://cloud.flowershow.app/)
3. Go to [cloud.flowershow.app/tokens](https://cloud.flowershow.app/tokens) and create a Personal Access Token
4. In Obsidian, open **Flowershow plugin settings** and paste your token
5. Click the Flowershow icon in the sidebar, select your notes, and publish

Your site is live at `your-name.flowershow.app`.

## From GitHub

Push to a repo, your site updates automatically.

1. Log in at [cloud.flowershow.app](https://cloud.flowershow.app/) with your GitHub account
2. Go to [cloud.flowershow.app/new](https://cloud.flowershow.app/new)
3. Select your markdown repository
4. Click **Create Website**

Your site builds and syncs on every push. Make sure you have a `README.md` or `index.md` at the root (or in the subfolder you choose).

> [!tip]
> Use the [Flowershow template](https://github.com/new?template_owner=flowershow&template_name=flowershow-cloud-template) to start a new repo with the right structure.

## From the Terminal (CLI)

Publish any folder of markdown. No repo required.

1. Install: download the `fl` binary from the [releases page](https://github.com/flowershow/flowershow/releases)
2. Log in: `fl login`
3. Publish: `fl ./my-folder`
4. Update later: `fl sync ./my-folder`

See [[cli|CLI reference]] for all commands and options.

## What's next?

Once your site is live:

- [[themes|Choose a theme]] to change the look
- [[navbar|Configure your navbar]] with links and dropdowns
- [[custom-styles|Customize colors and fonts]] with CSS variables
- [[config-file|Explore all config options]] in `config.json`
