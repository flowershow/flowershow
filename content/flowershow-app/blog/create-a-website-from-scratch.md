---
title: 'Tutorial 1: Create a website from scratch using Markdown and Flowershow'
date: 2023-06-20
authors:
  - Ola Rubaj
description: A step-by-step tutorial for creating a markdown-based website with Flowershow and publishing it with Vercel.
---

> [!warning] This tutorial is outdated
> This tutorial was written for the self-hosted Flowershow template (Vercel + GitHub). Flowershow is now a cloud platform — no Vercel account or GitHub template is needed. For up-to-date instructions, see the [getting started guide](/docs/getting-started).

In this tutorial we will walk you through creating an elegant, fully functional website written in simple markdown and published with Flowershow.

By the end of this tutorial you will:

- have a working markdown-based website powered by Flowershow.
- be able to edit the text and add pages, all from an online interface without installing anything.

Below is a screenshot of how the final website will look like:
![[tutorial-1-result.png]]

## Prerequisites

- A [GitHub](https://github.com/) account.
- A [Vercel](https://vercel.com/) account. You can set it up using your GitHub account.

## Setting up a sandbox website

### 1. Navigate to the [datopian/flowershow repository](https://github.com/datopian/flowershow).

### 2. Scroll down and click on the "Deploy" button

After clicking on it, you'll be redirected to Vercel's "Create Git Repository" page.

![[t1-35cb9df6.png]]

### 3. Select your GitHub account in "Git Scope"

Click on "Select Git Scope" dropdown and select your GitHub account name from the list if it's there.

![[t1-bdd61961.png]]

If your GitHub account is not available in the dropdown list, click on "Add GitHub Account"...

![[t1-879ebed5.png]]

...and authorize Vercel to access your GitHub repositories by clicking "Install".

![[t1-61441f7d.png]]

Now you can select your GitHub account.

![[t1-d2382391.png]]

### 4. Give your repository a name

A good practice is to use lowercase and dashes.

![[t1-a9b6af4c.png]]

### 5. Click on "Create" and wait until the site deploys

After you click "Create", Vercel will create a new repository on your GitHub account, using the `datopian/flowershow` repository as a template. Then, it will immediately start buidling the initial version of your website. This may take about 1-2 minutes.

![[t1-ae740310.png]]

### 6. See your published website!

And voila! Your site is up and running. Once on the "Congratulations" screen, navigate to the project dashboard...

![[t1-1df8967e.png]]

... and click on "Visit" to see your published website!

![[t1-319f8eef.png]]

## Editing a page on your website

Once your site is up and running, the next step is to customize it to your liking. Let's start by editing our home page.

### 1. Navigate to the repository of your website on GitHub

You can get there by going to GitHub, clicking on your profile icon, and going to "Your repositories".

![[t1-adecdf18.png]]

![[t1-8578ff07.png]]

Or, you can navigate to [your Vercel dashboard](https://vercel.com/dashboard), select your project in the "Overview" tab...

![[t1-b7f96b7d.png]]

...and click on "Git Repository". You'll be redirected to the repository of your website on GitHub.

![[t1-2cfbda16.png]]

### 2. Navigate to the "content" folder

This is where all the Markdown-based pages live in a Flowershow-based project.

![[t1-4ce5b74e.png]]

### 3. Edit the "index.md" file

The homepage on your website is built with the "index.md" file in the root of the "content" folder. Click on it to open.

![[t1-b14c059d.png]]

Then, click on the "Edit this file" icon...

![[t1-e4d28cd5.png]]

... and add some content.

![[t1-daad6528.png]]

### 4. Save your changes

To see your changes live, you need to "commit" them. Click on "Commit changes..." buttom in the top-tight corner.

![[t1-74159a33.png]]

In the "Commit message" field add a concise description of your changes. Optionally, if the commit message is not enough, you can add more info in the "Extended description" field.

![[t1-09130863.png]]

Leave "Commit directly to `main` branch" selected and click on "Commit changes". Doing that will trigger rebuilding of your site on Vercel.

![[t1-40bf87e4.png]]

### 5. See your site getting rebuild

If you want to see the current progress of rebuilding your website after you've commited the changes, click on the dot next to your commit message.

> [!note]
> It will be either a dot (if the site is currently being rebuilt after your changes), a check mark (if the site has finished building) or a cross (if something went wrong when rebuilding it).

![[t1-0d273173.png]]

Click on "Details" to see your project's deployment status on Vercel.

![[t1-94b4e4ab.png]]

### 6. Preview your site after changes

Once the site has been rebuilt, click the preview to see your changes live.

![[t1-a1294580.png]]

## Add a single Markdown-based page

### 1. Navigate to the "content" folder in your website's repository

See how to find it in the previous section.

### 2. Create new file

Click on "Add file"...

![[t1-1708e4fa.png]]

...and "Create new file".

![[t1-e79d32ef.png]]

### 3. Type the name of the new file you want to create

![[t1-54c786cb.png]]

### 4. Write the content of the file

![[t1-8ffe1e8c.png]]

### 5. Save your changes

To see your changes live, you need to "commit" them. Click on "Commit changes..." buttom in the top-tight corner.

![[t1-382d133d.png]]

In the "Commit message" field add a concise description of your changes. Optionally, if the commit message is not enough, you can add more info in the "Extended description" field.

![[t1-13c5873d.png]]

Leave "Commit directly to `main` branch" selected and click on "Commit changes". Doing that will trigger rebuilding of your site on Vercel.

![[t1-68002c21.png]]

### 6. Preview your site after changes

As you already know, Vercel will now start rebuilding your website. When it's done, you can navigate to `/about` url on your website to see the new file we've just added.

## What's next?

While editing on GitHub UI is acceptable, it has its limitations – it doesn't support working offline, adding multiple files simultaneously, or previewing many markdown syntax elements supported by Flowershow-based websites. We'll delve into these issues and solutions to overcome them in our next tutorial. Stay tuned!
