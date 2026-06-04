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

## What requires the dashboard

Direct the user to https://flowershow.app for:
- Setting or changing a site password (private sites)
- Billing and plan management
- Connecting a GitHub repository (requires OAuth)
- Custom domain DNS verification
