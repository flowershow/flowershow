---
title: "Obsidian plugin 4.0: publish without GitHub"
description: The Flowershow Obsidian plugin now connects directly to Flowershow Cloud. No GitHub repository required. Simpler setup, faster publishing.
date: 2026-01-31
authors:
  - olayway
image: "[[plugin-04-update.png]]"
---

We’re excited to announce **Flowershow Obsidian Plugin 4.0** — a major update that significantly simplifies how you publish your Obsidian vault.

**The biggest change:** you no longer need a GitHub repository. The plugin now publishes **directly to Flowershow** using Personal Access Tokens (PATs).

---

## Background: Why We Changed the Publishing Model

When we first built the Flowershow Obsidian plugin, GitHub was the only way in Flowershow to:

- authenticate users,
- and trigger publishing workflows.

Over time, a clear pattern emerged from user feedback:

- many users don’t use GitHub at all,
- others found the setup intimidating,
- and publishing often felt slower than it needed to be.

Meanwhile, Flowershow has matured enough to handle authentication, uploads, and publishing **directly** — without relying on third-party infrastructure.

---

## What’s New

### No GitHub Required

Previously, publishing required:

1. Creating a GitHub account
2. Setting up a repository
3. Connecting Flowershow to GitHub
4. Configuring the plugin with GitHub credentials

Now, it’s simply:

1. Generate a Flowershow Personal Access Token
2. Enter it in the plugin settings
3. Publish

That’s it!

---

### Simpler Configuration

The plugin settings are now streamlined to just what you need:

- **Flowershow PAT Token** — authentication
- **Site Name** — where your content is published (optional, your vault name will be used by default)
- **Exclude Patterns** — regex rules to skip files (optional)
- **Root Directory** - the directory within your vault that you want to publish (optional; if you're not publishing the entire vault.) 

---

## Getting Started

### New Users

1. Install the Flowershow plugin from Obsidian Community Plugins
2. Sign up at https://cloud.flowershow.app
3. Generate a Personal Access Token at https://cloud.flowershow.app/tokens
4. Enter your token in the plugin settings
5. Click the Flowershow icon and publish (or use Flowershow commands in the commands palette)

---

### Existing Users

If you’re already using the Flowershow plugin with GitHub, you have two options.

#### Option A: Keep Publishing via GitHub

If you want to keep using GitHub for version control, backups, or collaboration:

1. Sync your vault to GitHub using another tool, e.g.:
   - Obsidian Git plugin (or else)
   - GitHub Desktop
   - Git CLI
2. Flowershow will continue to publish from your GitHub repository as before

This keeps your existing workflow intact — the only difference is that vault → GitHub syncing is now handled outside the Flowershow plugin.

#### Option B: Switch to Direct Publishing (Recommended)

If you want the simpler, faster workflow without GitHub:

1. **Disconnect your site from GitHub** in your Flowershow dashboard to prevent any weird sync behavior (especially if you make changes later on in the GitHub repo)
2. Generate a Flowershow Personal Access Token.
3. Enter the token in the plugin settings,
4. **Important:** If you previously used the `rootDir` config to select a subfolder in your repo for publishing, you should now configure this in the plugin settings instead.
5. Publish as usual.

> [!note]
> After switching, all your files will initially show as "changed" in the publish status. This is expected — the plugin now calculates file hashes differently than GitHub did. Simply click **Publish All** once, and subsequent syncs will correctly detect only actual changes.

> [!important]
> If you had `config.json` or `custom.css` files in your GitHub repository that weren't in your local vault, you'll need to copy them over. These files should now live in your vault (or your `rootDir` folder if you use one) and be published alongside your other files.
>
> To see `.json` and `.css` files in Obsidian:
> 
> 1. Go to **Settings → Files and Links**
> 2. Enable **Detect all file extensions**
> 
> Note: Obsidian won't edit these files directly — clicking on them will open them in your OS default text editor. Edit there, save, and publish as usual.

Your **existing site, URLs, and content will continue to work exactly as before**.

You may delete your GitHub repository after switching, or keep it purely as a backup — the choice is yours.

---

## Questions?

Have questions about the update or need help migrating?  
Join us on Discord or leave a comment below — we’re happy to help 🌸

— The Flowershow Team
