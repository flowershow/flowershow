---
title: Self publish your digital garden with Flowershow
description: Learn how to create and publish your first Flowershow website 🌷
layout: blog
date: 2022-09-14
authors:
  - olayway
---
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

> [!warning] Deprecated
>
> Aug 2023: We have a new, better system for publishing your digital garden - see [[publish-howto]]. This old tutorial is now out of date (published in Sep 2022 it represents the old v1 approach).

## Video Tutorial

https://www.youtube.com/watch?v=HxD6NWYCea0

## Prepare the content

> [!note] Pre-requisites
> [Node.js](https://nodejs.org/en/) installed

First, you'll need a folder with some markdown files you'd like to publish. You can use an existing one, e.g. your Obsidian vault. This folder should include at least a single `index.md` file at the root level, which will be used to generate the home page of your website. If it doesn't exist, Flowershow CLI will create it for you.

To create this folder from scratch, you can do:

```bash
mkdir my-digital-garden
cd my-digital-garden
echo 'Hello, world!' > index.md
```

You can create as many subfolders within your content folder as you want. Its directory tree will be reflected in url paths on the published website, e.g.: `my-digital-garden/blog/hello.md` file content will be available under `<base-url-of-your-published-website>/blog/hello`.

Each folder can have it's own `index.md` file, which will be available under it's parent directory path, e.g. `my-content/blog/index.md` will be available under `<base-url-of-your-published-website>/blog`.

In order to embed files (e.g. images or pdfs) in your markdown files, you will also need to create a dedicated folder for them in your digital garden directory.

> [!tip] Obsidian vault setup
> If you're an Obsidian user, you can set this folder as an attachments folder, by right-clicking on it in the sidebar on the left hand side. This way all embedded files will be saved to this folder automatically when you copy them to your notes.

You can create this folder by running:

```bash
mkdir my-digital-garden/assets #this can be any other name
```

> [!tip] Version control
> If you don't use git version control system to track changes in your digital garden yet, we recommend setting it up. Check [GitHub quickstart](https://docs.github.com/en/get-started/quickstart) to learn more.

## Install Flowershow template

In order to build your beautiful personal website out of your digital garden, you first need to install Flowershow template. This template will be linked to your digital garden after the installation process.

So, let's imagine you have the following folder structure:

```sh
some-parent-dir
├── my-digital-garden
│   ├── assets
│   └── index.md
└── ...
```

If you want to install Flowershow in `some-parents-dir` you can either:

1. go to that directory and run `npx flowershow@latest install`

```sh
cd some-parent-dir
npx flowershow@latest install
```

You'll be asked to confirm if you want to install it in the current directory.

```
? Create Flowershow project in current directory? Yes
```

2. ...or you can pass this directory as an argument to the install command.

```sh
npx flowershow@latest install some-parent-dir
```

After running install command you'll be shown a set of prompts, that will allow you to properly setup Flowershow with your digital garden.

```
? Path to the folder with your content files
my-digital-garden

? Select a folder with your assets (attachments) (Use arrow keys)
❯ assets
  ──────────────
  I don't need assets folder
  Cancel

🌷 Installing Flowershow template in /home/me/some-parent-dir/.flowershow
⏳ Installing Flowershow dependencies...
```

At the end you should see `.flowershow` folder created in the target directory. In our example the folder structure will look like this:

```sh
some-parent-dir
├── my-digital-garden
│   ├── assets
│   ├── config.mjs
│   └── index.md
├── .flowershow
└── ...
```

Note that `config.mjs` and `index.md` files will be created automatically if they didn't exist in your digital garden folder yet. The config file will allow you to do some basic configurations of your Flowershow app. See [[config|this guide]] to learn more.

## (Optional) customize your website

You can now customize your website by wrapping your content in custom layouts and more. See [[docs|our docs]] to learn how to do it.

## Build your website

You can preview your website locally by running the following command in the directory where `.flowershow` has been installed:

```bash
npx flowershow@latest preview
```

...or by passing this directory as a command argument:

```bash
npx flowershow@latest preview some-parent-dir
```

After running this command, you will now be able to see your website on http://localhost:3000/

> [!note]
> Note, that the site will auto reload each time you make some adjustments to files inside `.flowershow` folder. At the moment, your site will not hot reload upon changes to your content files though. This is something we may implement in the future, so if you'd like to see this feature, please let us know by starting a discussion or submitting an issue in our repo.

If your ready to publish your site, you can now build it with the following command:

```bash
npx flowershow@latest export
# or npx flowershow@latest export some-parent-dir
```

It will create a `.flowershow/.next` folder with your website files ready to be deployed to any hosting provider that supports Node.js.

If you want to deploy it to a static website hosting provider, the command above will create a `.flowershow/out` folder with static files that you can use.

## Deploy

This part is up to you. Flowershow is Next.js based, so you can use any of these hosting providers: Vercel, Cloudflare, Netlify, and others to deploy your website.

Sources you may find useful:

- [How to deploy a Next.js site with Vercel](https://vercel.com/guides/deploying-nextjs-with-vercel)
- [How to deploy a Next.js site with Cloudflare](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)
- [How to deploy a Next.js site with Netlify](https://www.netlify.com/blog/2020/11/30/how-to-deploy-next.js-sites-to-netlify/)
