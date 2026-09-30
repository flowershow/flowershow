---
title: Flowershow CLI
description: Learn how to use the Flowershow CLI to publish your notes directly from your terminal.
---

The Flowershow CLI allows you to publish your Markdown files and folders to Flowershow directly from your terminal.

## Installation

**macOS / Linux** — run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh
```

This automatically detects your OS and architecture, downloads the correct binary, and installs it to `/usr/local/bin/`.

**Windows** — download `fl_windows_amd64.zip` from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page and add the extracted binary to your `PATH`.

> [!WARNING]
> **If you used the OLD (pre Feb 2026) npm CLI** please uninstall it and use `fl` instead:
>
> ```bash
> npm uninstall -g @flowershow/publish
> ```
>
> Then follow the installation instructions above.

### Manual installation

**macOS (Apple Silicon)**

```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_darwin_arm64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**macOS (Intel)**

```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_darwin_amd64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**Linux (amd64)**

```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_linux_amd64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

**Linux (arm64)**

```bash
curl -L https://github.com/flowershow/flowershow/releases/latest/download/fl_linux_arm64.tar.gz | tar xz
sudo mv fl /usr/local/bin/
```

## Upgrade

**macOS / Linux** — re-run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh
```

**Windows** — download the latest `fl_windows_amd64.zip` from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page and replace your existing binary.

## Authentication

Before you can publish, you need to authenticate with your Flowershow account.

```bash
fl login
```

This command will open your browser to complete the authentication process. Once finished, your authentication token will be stored locally.

To check who you're logged in as:

```bash
fl whoami
```

`fl whoami` exits with status 1 when you are not logged in (or your token has expired), so scripts can use it as an auth check.

To log out:

```bash
fl logout
```

## Publishing a Site

The core command is `fl`. You can publish a single file or an entire folder.

### Publish a Folder

To publish a folder of notes:

```bash
fl ./my-notes
```

This will create a new site (named after the folder) and upload all supported files within it.

### Publish a Single File

To publish a single markdown file:

```bash
fl ./my-note.md
```

### Options

- `--name <siteName>`: Specify a custom name for your site. For folder mode, the name is saved to a `.flowershow` file in the folder and remembered automatically on future runs.
- `--yes`: Skip the new-site name confirmation prompt (useful for scripts and CI). It never allows overwriting an existing site.
- `--overwrite`: Publish a path that isn't linked to a site (no `.flowershow` file) into an existing site with the same name, replacing its content. See [Name collisions](#name-collisions).

**Example with options:**

```bash
fl --name my-awesome-site ./my-notes
```

## Updating a Site

`fl` is idempotent for linked folders — once a folder has been published, it syncs changes automatically instead of creating a new site. Just run the same command every time:

```bash
fl ./my-notes
```

For folder mode, the site name is stored in a `.flowershow` file inside your folder after the first publish, so you don't need `--name` on subsequent runs.

### Name collisions

If a path is **not** linked (no `.flowershow` file — for example a folder you're publishing for the first time, or a single file) and its name matches a site you already have, `fl` will not sync into that site implicitly, because syncing replaces the site's content and deletes its files that aren't in your path. Instead:

- **Interactively**, `fl` warns you with the existing site's name and URL and asks whether to overwrite it or choose a new name.
- **With `--yes`**, `fl` refuses and exits with a non-zero status, suggesting `fl --name <new-name> <path>` (publish as a new site) or `fl --overwrite <path>` (replace the existing site).

```bash
# Publish as a new site instead
fl --yes --name my-notes-2 ./my-notes

# Deliberately replace the existing site's content
fl --yes --overwrite ./my-notes
```

Single files are never linked, so re-publishing `fl ./my-note.md` into its existing site needs `--overwrite` (or confirming the prompt).

## Exit codes

Every `fl` command exits with status `0` on success and a non-zero status on failure (not authenticated, path not found, site not found, refused overwrite, API or upload errors), so you can rely on it in scripts, CI and AI agents.

### `fl sync` (deprecated)

`fl sync` still works but is deprecated. The plain `fl` command now handles both creating and syncing automatically.

If you need `--dry-run` or `--verbose`, `fl sync` is currently the only way to access those options:

```bash
# Preview changes without making them
fl sync --dry-run ./my-notes

# See all files including unchanged ones
fl sync --verbose ./my-notes
```

## Managing Sites

### List Sites

To see all your published sites:

```bash
fl list
```

### Delete a Site

To delete a site and all its content:

```bash
fl delete <site-name>
```

## Troubleshooting

- **"You must be authenticated..."**: Run `fl login`.
- **"A site named ... already exists"**: the path isn't linked to that site. Use `--name <new-name>` to publish a new site, or `--overwrite` to replace the existing one. See [Name collisions](#name-collisions).
- **"Site not found" (during `fl sync`)**: Make sure you're using the correct site name (check with `fl list`), or just use `fl <path>` which handles this automatically.
