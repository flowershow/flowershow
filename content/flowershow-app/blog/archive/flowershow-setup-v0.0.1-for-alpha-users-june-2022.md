---
title: Flowershow Setup Guide v0.0.1 for Alpha Users (June 2022)
authors: [rufuspollock, olayway]
date: 2022-06-26
last-updated: 2022-07-18
---

> [!warning]
> Please see the [[docs/publish-tutorial|new publishing tutorial]]. This is an old tutorial for alpha users that is now out of date.

> [!note]
> 🚧 The following steps describe the current, temporary process of using Flowershow (as of June 2022). In the future, many of these tasks will be done by the CLI tool.

> [!info] Pre-requisites
>
> - [Node.js](https://nodejs.org/en/) installed
> - [Git](https://git-scm.com/) installed

Currently, there is only one starter template - the default template. The fastest way to use it to bootstrap your website is:

```bash
npx create-next-app@latest -e https://github.com/flowershow/flowershow/tree/main/templates/default
# or
yarn create next-app -e https://github.com/flowershow/flowershow/tree/main/templates/default
```

---

❕ At the moment, we are in the process of testing Flowershow's core features by using it to create this website's code and content. Thus, for now, Flowershow's GitHub repository is a repository of this website. If you go to [the repo](https://github.com/flowershow/flowershow), you'll notice it has the following structure:

```bash
.
├── templates
│   └── default
│       ├── content -> ../../site/content # symlink to site/content
|      ...
├── site # this website's content and configuration
│   └── content # folder with our md notes and userConfig.js
│       ├── userConfig.js
│       ├── index.md
│       ├── docs
|       ├── demo
│      ...
├── README.md
├── LICENSE
└── .gitignore
```

`/site` is where all Flowershow website's data resides. All content that you can read on this website lies inside of the `/content` subdirectory. To write this content, most of the time we use Obsidian, so if you also use Obsidian, you can imagine `/content` being your Obsidian vault.

An Important thing to notice here, is that apart from folders with our markdown notes (eg. `/demo`) there are also two additional files: `userConfig.js` and `index.md`.

- `userConfig.js` is where all the user configuration should be written.
- `index.md`, which serves as a front page for our website.

At the moment both of these files are required by Flowershow and should be placed at the root of your notes folder (i.e. inside your Obsidian vault) [^3].
[^3]: In the future, these files will be added automatically by the CLI tool.

---

Now, after you've created a Next.js app using Flowershow template, two things that will prevent you from running it: an incorrect `content` symlink and a missing `userConfig.js` file. Let's fix this!

**Updating symlink to content folder**

If you go to the folder where you've next-created your Flowershow app, you'll notice there is a symlink named `content`, which will point to a non-existing directory `../../site/content` - a folder we're using to store this website's markdown. You simply need to update it to point to the directory with your markdown notes (e.g. your Obsidian vault). You can do it with the following commands:

```bash
# go to the folder where you've next-created your app
cd my-flowershow-app-folder
# update the incorrect symlink
ln -sfn ~/Path/to/your/md/notes content
```

To check where the `content` link points now, you can do:

```bash
readlink -f content
```

**Adding `userConfig.js` file**

Now, let's add an empty `userConfig.js` file to the directory with your notes:

```bash
cd ~/Path/to/your/md/notes
touch userConfig.js
```

At this point, you should be able to run the app. You can check that it compiles by running:

```bash
npm run dev
# or
npm run build
npm start
```

However, when you [open the app in your browser](http://localhost:3000/), you'll notice the website is welcoming you with 404 page. That's because you don't have an `index.md` file in the root of your content directory. (All other markdown files will already be available under their corresponding paths.) You can fix this by adding a basic `index.md` page to the root of your content folder.

```bash
cd ~/Path/to/your/md/notes
touch index.md
echo "# Welcome to my Flower Show\!" > index.md
```

Hurray 🎊! You've just created a website of your markdown notes with a little help from Flowershow 🌷!

## Deploying

This part is up to you. Our app is Next.js based, so you can use any of these hosting providers: Vercel, Cloudflare, Netlify, and others to deploy the site.

Sources you may find useful:

- [How to deploy a Next.js site with Vercel](https://vercel.com/guides/deploying-nextjs-with-vercel)
- [How to deploy a Next.js site with Cloudflare](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)
- [How to deploy a Next.js site with Netlify](https://www.netlify.com/blog/2020/11/30/how-to-deploy-next.js-sites-to-netlify/)
