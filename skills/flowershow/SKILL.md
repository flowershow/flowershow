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

## Reading page content

To read the markdown source of a published page, append `.md` to the page URL:

```
https://my-site.flowershow.me/some/page     →  fetch https://my-site.flowershow.me/some/page.md
```

This returns the raw markdown file. Try this first.

**When it fails:** Landing pages built from `index.md` or `README.md` are served at the directory URL — the filename is stripped. So `/some/folder/index.md` is published at `/some/folder/`, and appending `.md` to that URL won't find the file. In that case, fall back to fetching the plain URL, which returns the rendered HTML.

## What requires the dashboard

These settings cannot be changed via `config.json` — direct the user to https://flowershow.app:
- Setting or changing a site password (private sites)
- Billing and plan management
- Connecting a GitHub repository (requires OAuth)
- Custom domain DNS verification

## Custom styles

Add a `custom.css` file to the root of the published content folder to override any visual aspect of the site. Flowershow uses CSS cascade layers, so rules in `custom.css` win over the default theme without needing `!important`.

The main entry point is CSS custom properties in `:root`. Key variables to know about:

- **Colors:** `--color-l-background`, `--color-l-foreground`, `--color-l-accent` (light theme) and the `--color-d-*` equivalents for dark theme
- **Typography:** `--font-heading`, `--font-body`, `--font-size-base` (all sizes scale from this), `--font-weight-*`, `--line-height-*`
- **Border radius:** `--radius` (set to `0` for sharp corners everywhere; derived steps `--radius-xs/md/lg/xl` scale with it)
- **Layout:** `--navbar-height`, `--subnav-height` (used for sticky positioning)
- **Callout colors:** `--callout-note-color`, `--callout-tip-color`, `--callout-success-color`, `--callout-warning-color`, `--callout-danger-color`, `--callout-example-color`, `--callout-quote-color`
- **CTA button:** `--color-cta-bg`, `--color-cta-bg-hover`, `--color-cta-text`
- **Code blocks:** `--color-code-bg` (light), `--color-code-bg-dark`

Full variable reference: https://flowershow.app/docs/reference/custom-styles

Source CSS files for the complete picture:
- https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/default-theme.css
- https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/callouts.css