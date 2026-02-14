---
title: How to Publish a GitHub Repository with Markdown Content
date: 2025-06-04
authors:
  - garance
  - rufuspollock
description: Learn how to publish your repository containing markdown files with Flowershow in 2 simple steps.
image: /assets/publish-gh-repo.jpeg
---

Hi everyone! In this short guide, we'll show you how to publish your existing markdown files in a GitHub repository quickly and easily using Flowershow. Let's get started!

https://www.youtube.com/watch?v=Pe1c737A3p0

## STEP 0: What You Need

Before we start, you'll need:
1. [GitHub account](https://github.com/)
2. A GitHub repository containing your markdown files

> [!tip] Why GitHub Account?
> 
> A GitHub account is essential for using Flowershow because:
> - It's used for secure authentication when logging into Flowershow
> - It stores your content with version control (track changes, revert if needed)
> - It automatically syncs your content updates to your website
> 
> If you don't have a GitHub account yet, you can create one here - https://github.com/. It's free and only takes a few seconds!


> [!tip] Don't have a repository yet?
> You can use our template repository to get started quickly! Just click [here to create a new repository from our template](https://github.com/new?template_owner=flowershow&template_name=flowershow-cloud-template). It comes with example content to help you understand how things work.

## STEP 1: Sign Up for Flowershow

1. Visit [Flowershow](https://cloud.flowershow.app/)
2. Log in using your **GitHub** account

> [!info] About GitHub Permissions
> When signing in with GitHub, you'll be asked to authorize Flowershow to access your repositories. This is necessary for Flowershow to read your content and set up the website.

## STEP 2: Publish Your Repository

1. Go to the Flowershow Cloud dashboard
2. Choose the "Publish your markdown from GitHub" option (or click here: https://cloud.flowershow.app/new)
3. Select your markdown repository from the list
4. Click **Create Website** — Flowershow will set up your site in a few moments.
5. Once the site shows as "Synced", click **Visit** to preview your published site.

> [!tip] Publishing Part of Your Repository
> If your repository contains both code and documentation (e.g., a software project), you can use the root directory option to publish only the documentation. For example, if your docs are in a `/docs` folder, just set that as the root directory and Flowershow will only publish content from there.

> [!info] About Auto-Sync
> By default, auto-sync is enabled for your website. This means when you push new changes to your GitHub repository, your website will automatically update to reflect those changes.

> [!warning] Getting a 404 Error?
> If you visit your site after it has finished syncing and see a 404 error, this usually means you don't have a top-level `README.md` or `index.md` file in your repository. You can learn more about fixing this issue in our [debugging guide](https://flowershow.app/blog/how-to-debug-404-pages).

## Conclusion

Congratulations! Your markdown files are now published with Flowershow. 💐

Any changes you push to your repository will automatically be reflected on your published site. You can continue working with your content using your favorite markdown editor and version control workflow.

> [!tip] New to GitHub?
> If you're new to GitHub, check out these official guides to get started:
> - [Creating a new repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories)
> - [Uploading files to a repository](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-files-to-a-repository)
> - [Creating new files in a repository](https://docs.github.com/en/repositories/working-with-files/managing-files/creating-new-files)
> - [Using GitHub Desktop app to work with your files locally and push changes to your repository](https://docs.github.com/en/desktop/overview/getting-started-with-github-desktop)
