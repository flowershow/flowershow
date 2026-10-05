---
title: Wordpress to Flowershow migration tutorial
description: Easily migrate your Wordpress content in 3 easy steps!
date: 2022-11-30
authors: [philippe-du-preez]
---

> [!warning] Historical page: these install steps are out of date
> This page describes an old version of Flowershow (a Node.js / Next.js template and the old `npx flowershow` CLI). None of that is needed today. To publish, install the single-binary CLI with `curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh` and run `fl ./my-folder`. See the [CLI reference](/docs/reference/cli) or [Publish with AI](/publish-with-ai).

Is your Wordpress site's speed comparable to a tortoise with cramping legs? 🐢 Server costs bleeding you dry? 🖥️ Lucky for you, migrating your content over to Flowershow has never been easier! Flowershow 🌷 is an **awesome** open source Next.js template that comes with batteries included 🔋

In this tutorial we are covering how to convert your Wordpress site into a Flowershow site, where all the content will be converted to simple markdown compatible with flowershow.

- First we are going to export our wordpress instance.
- Then get the conversion script and run it
- Then fill in the wizard
- Copy content to flowershow site

And **VOILÀ!** Your Flowershow site will be up and running!

**Example blog post before:**

![[blogbefore.png]]

**Example blog post after:**

![[blogafter.png]]

All your pages will be created in the root directory inside your newly created `content` folder. All your posts will be created in a subdirectory called `blogs` inside your `content` folder. All your images will go to an `assets` folder. Custom components that includes HTML or Javascript, however, will have to be remade.

Example format:

```
content
├── about.md
├── contact.md
├── assets
│   └── picture.png
├── blogs
│   └── someblogpost.md
└── index.md
```

## Here's how it works in 4 simple steps:

> [!note]
> You should have Node installed

### 1. Export your wordpress instance content to xml

Export your wordpress instance content to xml. Use the in-built standard wordpress tool: https://wordpress.com/support/export/

1. Got to the tools section and choose export

![[toolexport.png]]

2. Choose the `All content` export option

![[exportall.png]]

3. Save the resulting file on your local computer by pressing the `Download Export File` button

> Exporting from Wordpress.com will look a bit different and you will need to unzip the exported file

### 2. Get this Wordpress to Flowershow conversion script

Run the following in your preferred terminal:

1. `git clone https://github.com/flowershow/wordpress-export-to-markdown-plus`
2. `cd wordpress-export-to-markdown-plus`
3. `npm install`
4. `node index.js`

### 3. Then fill in the wizard

![[tpO8ISZ.png]]

- In this example the Wordpress export xml file has been renamed to `new` and placed in a folder `wordpress-test` next to where the tool is being run. Use the relative path to where the xml file is located.
- The path of your output folder should end with `/content`
- For more information on options you can go [here](https://github.com/flowershow/wordpress-to-markdown/blob/master/README.md)

### 4. Integrate content into Flowershow

- Your content folder is now ready to be converted into a flowershow site! 🚀 See [publish-tutorial](https://flowershow.app/docs/publish-tutorial) to create your site!

> [!note]
> If you have created a flowershow site prior to this, just copy all the files from the `content` folder created by the script into the `content` folder used by flowershow.

### FAQ

- What happens to categories?
  They get outputted to the categories front matter
- What happens to tags?
  They get outputted to the tags frontmatter
- What happens to featured image?
  This is set in the image property of frontmatter
- What happens to my blog index page.
  See our tutorial on setting up your blog [here](https://flowershow.app/docs/blog-tutorial).
- Where will all the images be located?
  The name of your assets/attachement folder is where all your images will be located and linked to.

---

We 💙 feedback! If you have any ideas for new features or if you’ve noticed any bugs, please submit an issue [here](https://github.com/flowershow/flowershow/issues) or start a discussion [here](https://github.com/flowershow/flowershow/discussions). Thank you! 🌷