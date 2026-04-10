---
title: Flowershow CLI
description: Learn how to use the Flowershow CLI to publish your notes directly from your terminal.
---

> [!NOTE]
> The Flowershow CLI is currently in Beta.

The Flowershow CLI allows you to publish your Markdown files and folders to Flowershow directly from your terminal.

## Installation

Download the latest binary for your platform from the [GitHub Releases](https://github.com/flowershow/flowershow/releases) page.

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

**Windows** — download `fl_windows_amd64.zip` from the Releases page and add the extracted binary to your `PATH`.

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

- `--overwrite`: Overwrite an existing site if it already exists.
- `--name <siteName>`: Specify a custom name for your site.

**Example with options:**

```bash
fl --name my-awesome-site --overwrite ./my-notes
```

## Syncing Changes

Once a site is published, you can use the `sync` command to update it. This is faster than re-publishing as it only uploads new or modified files.

```bash
fl sync ./my-notes
```

**Note:** If you used a custom name when publishing, remember to use it when syncing:

```bash
fl sync --name my-awesome-site ./my-notes
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
- **"Site already exists"**: Use `--overwrite` or run `fl sync` instead.
- **"Site not found" (during sync)**: Make sure you're using the correct site name (check with `fl list`).
