---
title: How to Share Your Obsidian Notes Online with Flowershow Cloud
description: A beginner-friendly guide to publishing your Obsidian vault online with Flowershow Cloud
date: 2025-02-12
authors:
  - olayway
tags:
  - flowershow-cloud
status: in_progress
isDraft: true
---

Want to share your Obsidian notes online with others? Flowershow Cloud makes it easy to turn your private Obsidian notes into a beautiful, searchable website. This guide will walk you through the process step-by-step.

## Before You Start

You'll need two accounts to publish your notes:
1. A GitHub account - this will store a backup of your notes
2. A Flowershow Cloud account - this will create your website from your notes stored in GitHub

Let's set these up first:

### Step 1: Create Your GitHub Account

GitHub is like a super-powered Dropbox that helps you keep track of changes to your notes.

1. Go to [GitHub](https://github.com) and create a free account
2. Check your email and click the verification link GitHub sends you

### Step 2: Sign Up for Flowershow Cloud

1. Visit [Flowershow Cloud](https://cloud.flowershow.app/login)
2. Click "Login with GitHub" - this uses the GitHub account you just created

## Publishing Your Notes

Now that you have your accounts set up, let's get your notes online! We'll use GitHub Desktop, a simple app that helps you manage your notes.

### Step 1: Set Up GitHub Desktop

1. Download GitHub Desktop from [desktop.github.com](https://desktop.github.com)
2. Install it like any other app on your computer
3. Open GitHub Desktop and sign in with your GitHub account
4. When asked about Git configuration, just use the default settings

### Step 2: Connect Your Obsidian Vault

1. In GitHub Desktop, click "Create a New Repository on your Local Drive"

![[fc-obsidian-3.png]]

2. Fill in the details:
   - For "Name": Type the exact name of your Obsidian vault folder
   - For "Local Path": Click "Choose..." and select the folder that CONTAINS your vault

For example, if your Obsidian vault is in `/Users/o/Projects/my-digital-garden`:
- Name: `my-digital-garden`
- Local Path: `/Users/o/Projects`

> [!tip]
> Look at the path shown at the bottom of the window - it should match where your Obsidian vault is located

> [!important]
> Select the folder that CONTAINS your vault, not the vault itself. This might seem strange, but it's necessary to work correctly!

### Step 3: Back Up Your Notes

1. Click "Create Repository"
2. You'll see this screen:

![[fc-obsidian-4.png]]

3. To make sure everything is correct:
   - Click the "History" tab
   - You should see all your notes listed under "Initial commit"

![[fc-obsidian-5.png]]

> [!note]
> You'll see some Obsidian configuration files included too - that's normal!

4. Now, let's save your notes to GitHub:
   - Click "Publish repository" at the top
   - Keep the repository name as is
   - Add a description if you want (optional)
   - Click "Publish Repository"

![[fc-obsidian-6.png]]

When successful:
- The "Publish repository" button will change to "Fetch origin"
- You can click "View on GitHub" to see your notes on GitHub's website

### Step 4: Create Your Website

Now that your notes are safely backed up, let's turn them into a website:

1. Go to your Flowershow Cloud account
2. Click "Create New Site" at the top of the screen
3. Select your repository (it will have the same name as your Obsidian vault)
4. Click Submit

![[fc-obsidian-8.png]]

You'll see your site's settings page:

![[fc-obsidian-9.png]]

Wait a few moments while Flowershow Cloud processes your notes. Once finished, click "Visit" to see your new website!

> [!tip]
> To create a welcoming homepage, add a file named `index.md` in your vault's main folder. This will be the first page visitors see when they visit your site.

## Making Changes to Your Site

When you update your notes in Obsidian, you'll need to publish those changes to your website. Here's how:

1. Open GitHub Desktop
2. You'll see your changed notes in the "Changes" tab
3. Write a brief note about what you changed in the "Summary" field
4. Click "Commit to main"
5. Click "Push origin" to update your website

Your website will update automatically. If you see "Outdated" under your site's title, just click "Sync" to manually update it.

## Making Updates Even Easier (Optional)

Want to skip GitHub Desktop entirely? The Obsidian Git plugin can automatically update your website whenever you make changes:

1. In Obsidian:
   - Go to Settings → Community plugins
   - Click "Browse"
   - Search for "Obsidian Git"
   - Install and enable the plugin

2. To set up automatic updates:
   - Go to the plugin's settings
   - Find "Auto-push every X minutes"
   - Choose how often you want your changes to be uploaded

For more details about the plugin, check out [its documentation](https://github.com/Vinzent03/obsidian-git).