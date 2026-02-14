---
title: Flowershow CLI
description: Learn how to use the Flowershow CLI to publish your notes directly from your terminal.
---

> [!NOTE]
> The Flowershow CLI is currently in Beta.

The Flowershow CLI allows you to publish your Markdown files and folders to Flowershow directly from your terminal.

## Installation

Install the CLI globally using npm:

```bash
npm i -g flowershow-publish
```

## Authentication

Before you can publish, you need to authenticate with your Flowershow account.

```bash
publish auth login
```

This command will open your browser to complete the authentication process. Once finished, your authentication token will be stored locally.

To check your authentication status:

```bash
publish auth status
```

To log out:

```bash
publish auth logout
```

## Publishing a Site

The core command is `publish`. You can publish a single file or an entire folder.

### Publish a Folder

To publish a folder of notes:

```bash
publish ./my-notes
```

This will create a new site (named after the folder) and upload all supported files within it.

### Publish a Single File

To publish a single markdown file:

```bash
publish ./my-note.md
```

### Options

- `--overwrite`: Overwrite an existing site if it already exists.
- `--name <siteName>`: Specify a custom name for your site.

**Example with options:**

```bash
publish ./my-notes --name my-awesome-site --overwrite
```

## Syncing Changes

Once a site is published, you can use the `sync` command to update it. This is faster than `publish` as it only uploads new or modified files.

```bash
publish sync ./my-notes
```

**Note:** If you used a custom name when publishing, remember to use it when syncing:

```bash
publish sync ./my-notes --name my-awesome-site
```

## Managing Sites

### List Sites

To see all your published sites:

```bash
publish list
```

### Delete a Site

To delete a site and all its content:

```bash
publish delete <site-name>
```

## Troubleshooting

- **"You must be authenticated..."**: Run `publish auth login`.
- **"Site already exists"**: Use `--overwrite` or run `publish sync` instead.
- **"Site not found" (during sync)**: Make sure you're using the correct site name (check with `publish list`).
