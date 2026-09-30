---
title: Flowershow CLI
description: Learn how to use the Flowershow CLI to publish your notes directly from your terminal.
---

The Flowershow CLI allows you to publish your Markdown files and folders to Flowershow directly from your terminal.

## Installation

The CLI is a single binary called `fl` (the install script also adds a `flowershow` alias).

**macOS / Linux** — run the install script:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh
```

This detects your OS and architecture, downloads the latest binary, and installs it to `/usr/local/bin/` (using `sudo` if needed). To install without `sudo`, for example from an AI agent or in CI, choose another directory:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | FL_INSTALL_DIR="$HOME/.local/bin" sh
```

**Windows** — download `fl_windows_amd64.zip` (or `fl_windows_arm64.zip` for ARM) from the [latest release](https://github.com/flowershow/flowershow/releases/latest) and add the extracted `fl.exe` to your `PATH`.

Check it worked:

```bash
fl --version
```

> [!WARNING]
> **Not on npm.** The npm packages `flowershow` and `@flowershow/publish` are the old (pre Feb 2026) Node CLI and are deprecated. If you have one installed, remove it and use `fl` instead:
>
> ```bash
> npm uninstall -g @flowershow/publish flowershow
> ```

**Using an AI agent?** Install the [Flowershow skill](/docs/agents/skills) and your agent can install and run `fl` for you. See [Supported agents](/docs/agents/supported-agents).

### Manual installation

Download the archive for your platform from the [latest release](https://github.com/flowershow/flowershow/releases/latest) and put the `fl` binary on your `PATH`.

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

**Windows** — download the latest `fl_windows_amd64.zip` (or `fl_windows_arm64.zip`) from the [latest release](https://github.com/flowershow/flowershow/releases/latest) and replace your existing binary.

## Authentication

Before you can publish, you need to authenticate with your Flowershow account.

```bash
fl login
```

This prints a URL with a one-time code. Open it in your browser and approve, and the CLI finishes logging in (the code expires after 15 minutes). Your token is stored in `~/.flowershow/token.json`.

To check who you're logged in as:

```bash
fl whoami
```

To log out:

```bash
fl logout
```

## Publishing a Site

The core command is `fl`. You can publish a single file or an entire folder, of Markdown, HTML, or both. `.html` files are served as-is, with the CSS, JavaScript and other files they reference (see [Publishing HTML](/docs/agents/html)).

### Publish a Folder

To publish a folder of notes:

```bash
fl ./my-notes
```

This will create a new site (named after the folder) and upload all supported files within it. The site URL (`https://<site-name>-<username>.flowershow.me`) is printed at the end.

> [!WARNING]
> If you already have a site with the same name, `fl` publishes to that site instead of creating a new one, and removes files from it that aren't in your folder. Check `fl list` first and use `--name` to choose a different name if needed.

### Publish a Single File

To publish a single Markdown or HTML file:

```bash
fl ./my-note.md
fl ./report.html
```

To publish an HTML page together with its CSS, JavaScript or images, put them in a folder and publish the folder, so relative paths keep working.

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
fl delete --yes <site-name>   # skip the confirmation prompt
```

### Site settings

To see a site's plan, privacy, comments, search, GitHub connection and custom domain:

```bash
fl settings                  # uses the .flowershow file in the current folder
fl settings --name <site-name>
```

## Troubleshooting

- **"You must be authenticated..."**: Run `fl login`.
- **Site already exists**: `fl` automatically syncs existing sites — just run `fl <path>` again.
- **"Site not found" (during `fl sync`)**: Make sure you're using the correct site name (check with `fl list`), or just use `fl <path>` which handles this automatically.
