---
name: flowershow
description: Publish markdown files and manage Flowershow sites using the fl CLI. Use when the user wants to publish notes, a digital garden, or any markdown content to Flowershow, or when they want to list, view settings for, or delete a site.
metadata:
  author: flowershow
  version: "1.0.0"
---

# Flowershow

Use the `fl` CLI to help users publish markdown files and manage their Flowershow sites.

## Before anything else: check authentication

```
fl whoami
```

If not authenticated:
1. Run `fl login` and capture its output
2. Show the user the URL and code it prints — for example: "Please visit https://... and enter code XXXX to connect your Flowershow account"
3. Wait for the command to complete

If the user doesn't have an account yet, direct them to https://cloud.flowershow.app to sign up first, then come back to authenticate.

When unsure about a command or its flags, run `fl --help` or `fl <command> --help` rather than guessing.

## Publishing content

Publish a folder or file. Creates a new site on first run, syncs only changes on subsequent runs:

```bash
fl --yes ./my-notes                    # publish a folder
fl --yes ./note.md                     # publish a single file
fl --name my-site --yes ./my-notes     # set a custom site name on first publish
```

- Always use `--yes` when running on behalf of a user — it skips the interactive site name confirmation prompt
- Site names default to the folder/file name and are saved in `.flowershow` for future runs (only for folders)
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

Add a `config.json` file to the root of your published content folder to configure the site. `config.json` values always override dashboard settings and are version-controlled alongside the content.

> **IMPORTANT — never guess config.json options.** Before helping the user with any `config.json` work, always fetch the current schema reference first:
>
> ```
> fetch https://flowershow.app/docs/reference/config-file.md
> ```
>
> This URL returns the raw Markdown source with every supported option, type, default, and example. Use it as the authoritative source — do not rely on training knowledge, which may be outdated.

## Reading Flowershow documentation

When you need to read a Flowershow docs page (e.g. to look up a feature or check a reference), fetch the raw Markdown source instead of the rendered HTML — it's faster and cleaner. Append `.md` to the page URL:

```
https://flowershow.app/docs/some/page     →  fetch https://flowershow.app/docs/some/page.md
```

**When it fails:** Landing pages built from `index.md` or `README.md` are served at the directory URL — the filename is stripped. So `/docs/some/index.md` is published at `/docs/some/`, and appending `.md` to that URL won't find the file. In that case, fall back to fetching the plain URL, which returns the rendered HTML.

## What requires the dashboard

These settings cannot be changed via `config.json` — direct the user to https://flowershow.app:
- Setting or changing a site password (private sites)
- Billing and plan management
- Connecting a GitHub repository (requires OAuth)
- Custom domain DNS verification

## Custom styles

Add a `custom.css` file to the root of the published content folder to override any visual aspect of the site. Flowershow uses CSS cascade layers, so rules in `custom.css` win over the default theme without needing `!important`.

> **IMPORTANT — never guess CSS variable names.** Before helping the user with any custom styles work, always fetch the current reference first:
>
> ```
> fetch https://flowershow.app/docs/reference/custom-styles.md
> ```
>
> This URL returns the raw Markdown source with every supported CSS custom property. Use it as the authoritative source — do not rely on training knowledge, which may be outdated.
>
> For more complex styling work (e.g. overriding component styles, understanding cascade layers, or finding variables not listed in the reference), also read the underlying source CSS files:
> - https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/default-theme.css
> - https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/callouts.css