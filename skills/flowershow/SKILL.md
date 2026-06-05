---
name: flowershow
description: Publish markdown files and manage Flowershow sites using the fl CLI. Use when the user wants to publish notes, a digital garden, or any markdown content to Flowershow, or when they want to list, view settings for, or delete a site.
metadata:
  author: flowershow
  version: "1.0.0"
---

# Flowershow

Use the `fl` CLI to help users publish markdown files and manage their Flowershow sites.
Flowershow turns markdown files into published websites at `https://my.flowershow.app/@username/site-name`.

## Before anything else: check authentication

```
fl whoami
```

If not authenticated:
1. Run `fl login` and capture its output
2. Show the user the URL and code it prints — for example: "Please visit https://... and enter code XXXX to connect your Flowershow account"
3. Wait for the command to complete

If the user doesn't have an account yet, direct them to https://flowershow.app to sign up first, then come back to authenticate.

## Publishing content

Publish a folder or file. Creates a new site on first run, syncs only changes on subsequent runs:

```bash
fl --yes ./my-notes                    # publish a folder
fl --yes ./note.md                     # publish a single file
fl --name my-site --yes ./my-notes     # set a custom site name on first publish
```

- Always use `--yes` when running on behalf of a user — it skips the interactive site name confirmation prompt
- Site names default to the folder/file name and are saved in `.flowershow` for future runs
- Re-running `fl --yes <path>` on the same path syncs only new/modified/deleted files (delta sync)

## Site management

List all sites:
```
fl list
```

View site settings (privacy mode, comments, search, GitHub connection, custom domain):
```
fl settings                      # uses .flowershow config in current directory
fl settings --name <site-name>   # explicit site name
```

Delete a site:
```
fl delete --yes <site-name>
```

## Site configuration

Add a `config.json` file to the root of your published content folder to configure the site. `config.json` values always override dashboard settings and are version-controlled alongside your content.

Key options:
- `title` — site name shown in browser tabs and social previews
- `description` — default description for search and social previews
- `nav` — navbar links, logo title, and call-to-action button
- `contentInclude` / `contentExclude` — filter which files get published
- `enableSearch` — enable full-text search (`false` by default)
- `showComments` — enable comments section (`false` by default)
- `theme` — site theme and default color mode

Full reference: https://flowershow.app/docs/reference/config-file

## What requires the dashboard

These settings cannot be changed via `config.json` — direct the user to https://flowershow.app:
- Setting or changing a site password (private sites)
- Billing and plan management
- Connecting a GitHub repository (requires OAuth)
- Custom domain DNS verification
