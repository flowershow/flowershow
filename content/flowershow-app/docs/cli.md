---
title: Flowershow CLI
description: Learn how to use the Flowershow CLI to publish your notes directly from your terminal.
---

> [!WARNING]
> **Migrating from the old npm CLI?** If you previously installed `@flowershow/publish` via npm, please uninstall it and use `fl` instead:
>
> ```bash
> npm uninstall -g @flowershow/publish
> ```
>
> Then follow the installation instructions below.

The Flowershow CLI allows you to publish your Markdown files and folders to Flowershow directly from your terminal.

## Installation

**macOS / Linux** — run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh
```

This automatically detects your OS and architecture, downloads the correct binary, and installs it to `/usr/local/bin/`.

**Windows** — download `fl_windows_amd64.zip` from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page and add the extracted binary to your `PATH`.

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
- `--yes`: Skip the site name confirmation prompt (useful for scripts and CI).

**Example with options:**

```bash
fl --name my-awesome-site ./my-notes
```

## Updating a Site

`fl` is idempotent — if the site already exists, it syncs changes automatically instead of creating a new one. Just run the same command every time:

```bash
fl ./my-notes
```

For folder mode, the site name is stored in a `.flowershow` file inside your folder after the first publish, so you don't need `--name` on subsequent runs.

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
- **Site already exists**: `fl` automatically syncs existing sites — just run `fl <path>` again.
- **"Site not found" (during `fl sync`)**: Make sure you're using the correct site name (check with `fl list`), or just use `fl <path>` which handles this automatically.
