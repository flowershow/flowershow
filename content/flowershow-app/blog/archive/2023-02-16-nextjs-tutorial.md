---
title: Jumpstart a content-driven NextJS site with Flowershow
description: This article will guide you through the process of building a basic static blog with Next.js using the Flowershow template.
date: 2023-02-16
authors: [philippe-du-preez]
---

Have you ever considered creating a blog or documentation site for your open-source library or personal project? Maybe you always wanted to, but you didn't really have time to set everything up from scratch, and so you ended up keeping your awesome writings hidden from the world? This is why we started working on Flowershow - a project that can help you focus on your content, while we do the heavy lifting for you.

This article will guide you through the process of building a basic static blog with Next.js using the Flowershow template.

## What is Flowershow

[Flowershow](https://flowershow.app/) is a versatile NextJS template that you can use to create a content-driven website from Markdown/MDX files quickly and easily.

Flowershow uses TypeScript, Contentlayer, and Tailwind, which makes it a frictionless experience to add content and style it. You can deploy your website in seconds on Netlify, Vercel, or any other static site hosting platforms. Whether you are looking to build a blog, a documentation site, or any other content-driven site, Flowershow makes this very easy.

Flowershow uses [Contentlayer](https://www.contentlayer.dev/) to turn your Markdown content into data stored in JSON files. By defining document schemas, Contentlayer can generate data that is validated (making it type-safe) and can be imported from anywhere in your Next.js app.

## Why use markdown and NextJS

When it comes to writing content, markdown offers a number of benefits over traditional HTML. Markdown is a lightweight markup language that is easy to read and write, making it an ideal choice for content creators. It also allows for a separation of content from presentation, making it easier to manage the look and feel of your site. Additionally, markdown files can be version-controlled, allowing for a history of changes to be tracked and reverted to earlier versions if necessary.

Combining Next.js with markdown has the potential to streamline the process of building and maintaining content-driven websites. Next.js provides the infrastructure for delivering fast and scalable sites, while markdown makes it easy for content creators to write and manage their content.

But what benefits does Flowershow add to the vanilla Next.js + Contentlayer combo? Well, let's take a look at the features it has to offer.

## Flowershow template features

Flowershow comes with the following useful features out of the box:

- ✏️ **[Blog support](https://flowershow.app/docs/blog)** - provides a pre-built structure and functionality for creating and managing blog posts, including routing and rendering of content, which saves time and effort in the development process.
- 📑 **[Table of contents](https://flowershow.app/docs/table-of-contents)** - makes it easier to navigate through long pages or articles, improves the user experience, and increases the likelihood that users will engage with the content
- 💬 **[Page comments](https://flowershow.app/docs/comments)** - provides a way for users to engage in discussions and share their thoughts and feedback on the content
- 🔍 **[Full text search](https://flowershow.app/docs/search)** - allows to quickly and easily find the information they are looking for by searching through the site's content
- ✨ **[Light/Dark mode and basic theming](https://flowershow.app/docs/custom-theme)** - allows for easy customization of the site's appearance by providing a centralized and flexible way to manage and apply visual styles, making it easier to maintain a consistent brand identity
- 🎨 **[Tailwind support](https://flowershow.app/docs/tailwind)** - utility-first approach to styling, allowing for fast and efficient development of responsive and customizable user interfaces without having to write custom CSS
- ⬇️ **[Power of MDX](https://flowershow.app/docs/mdx)** - allows for the creation of interactive and dynamic content by combining Markdown syntax and JSX components
- 🤖 **[SEO support](https://flowershow.app/docs/seo)** - helps to increase the visibility and discoverability of the site by optimizing its content and structure for search engines
- 🔢 **[MathJax support](https://flowershow.app/docs/syntax#math)** - ensures that mathematical content is properly formatted and easy to read, making it more accessible to users and improving the overall quality of the content

## Examples of sites built using Flowershow template

https://www.datopian.com/

![[datopian.png]]

https://flowershow.app/

![[dark-theme.jpg]]

https://lifeitself.org/

![[lifeitself.png]]

https://datahub.io/

![[datahub.png]]

## Creating a new Next.js project using Flowershow template

In order to create a new Next.js project using the Flowershow template, you can use Next.js' `create-next-app` CLI tool.

Run the following command in the terminal and then pass a name of your project when prompted (we'll name it `my-flowershow-app` for the purpose of this tutorial).

```shell
npx create-next-app@latest --example https://github.com/datopian/flowershow
```

After the command has finished running, your project structure should look similar to this:

```shell
my-flowershow-app
├── components
├── config
├── layouts
├── lib
├── pages
├── public
├── scripts
├── styles
├── contentlayer.config.ts
├── next.config.mjs
├── tailwind.config.cjs
├── package-lock.json
├── package.json
├── ...
└── README.md
```

The only thing that's missing is a `/content` folder with some markdown files you'd like to publish. If you already have a folder with some markdown files, e.g. your blog pages, you can move them to your Flowershow project, like so:

```
mv <path-to-my-content-folder> my-flowershow-app/content
```

Your `index.md` file in the root of the `content` folder will be your home page.

> [!NOTE]
> Check [Next.js documentation](https://nextjs.org/docs/api-reference/create-next-app) to learn more about this command and other options you can run it with.

### Basic configuration

Flowershow supports setting common configuration values using a `config.mjs` file, which should be placed in the root of the `/content` folder. With it you can customize some things like website title, navigation links in the navbar, or set your google analytics key.

Let's create one:

```shell
touch my-flowershow-app/content/config.mjs
```

Then add some new configuration to your project eg.

```jsx
const config = {
  // title will be displayed on the top of your site
  title: "My Awesome Blog",
  // adding a description helps with SEO
  description: "This is my awesome blog built with Flowershow",
  // author of site displayed on the bottom of your site
  author: "John",
  // logo image
  authorLogo: "/images/logo.svg",
  // url to author website
  domain: "https://john.app/",
  // links to the pages you want to link to in the navbar
  navLinks: [{ href: "/about", name: "About" }],
};

export default config;
```

> [!NOTE]
> If you want to learn more about other available configuration options, see https://flowershow.app/docs/config.

You can now run `npm run dev`. At this point Contentlayer will grab all your markdown files, convert them to JSON files and put them into `.contentlayer` folder. The output JSON files will be structured according to the document schemas defined in `contentlayer.config.ts`. All the files by default will be of `Page` type (apart from files you put inside `content/blog` folder, which we'll talk about later). Flowershow template then imports there files and transforms them into your website's pages.

### Adding blog/news/tutorials pages

By default, all files inside `content/blog` will be parsed as blog posts, which you can then import in any of your markdown pages to create a blog home page, that lists all your blog posts. We'll show you how to do this in sections below. If you're interested how it works, you can look up `Blog` document type in `contentlayer.config.ts` file to see how it differs from the default `Page` document type.

Let's create a post now!

We'll name it `my-blog-post.md` and put it in the `content/blog` folder, so your file structure will look like this:

```shell
my-flowershow-app
├── content
|   └─ blog
|      └─ my-blog-post.md
└── ...
```

If you looked at the schema of the `Blog` type in `contentlayer.config.ts` file, you noticed that apart from shared fields like title or description, this type has the following extra fields:

- `date` - date that will be displayed on the blog page and that will be used to sort your list of blogs (if you'll use our `BlogsList` component)
- `authors` (optional) - this will search for authors and display their images on the post ([Authors docs](https://flowershow.app/docs/blog#blog-authors))

We will also need to add a title and a description of each blog, which will be displayed on the blog home page that we'll create later on.

So your `my-blog-post.md` file will look like this:

```md
---
title: Blog post title
description: This blog post is about how to write a blog
date: 2022-11-29
authors: [John Doe, Jane Doe]
---

All your content for the post will go here.
```

> [!NOTE]
> You can now run `npm run dev` again and see this blog pages under `/blog/my-blog-post`

![[blogpost.png]]

### Creating a home page for your blogs/news/tutorials pages

Let's create a home page for your blog posts now. You can have it anywhere you want in your content folder, but we'll create it in our `content/blog` folder as well. We want it to be accessible under `<base-url>/blog`, so we'll create an `content/blog/index.md` file. Now your content folder structure should look something like this:

```
my-flowershow-app
├── content
|   └─ blog
|      ├─ index.md
|      └─ my-blog-post.md
└── ...
```

In order to list all your blog posts on a given page, you can use our `BlogsList` component and pass it a list of your blog posts. It's globally available, so you don't need to import it into your blog's `index.md` file.

The `BlogsList` component requires a `simple` page layout, which you need to specify in the frontmatter of your `content/blog/index.md` page.

```
---
title: All my blogs
layout: simple
data:
  - blogs
---

<BlogsList blogs={blogs}/>
```

In addition to that, you also need to create a getter function that will fetch all your blog posts at `content/getters/blogs.js` like this:

```
import { allBlogs } from "contentlayer/generated";

export default function getBlogs() {
  return allBlogs.sort((a, b) => new Date(b.date) - new Date(a.date));
}
```

The name of the getter function needs to be the same as the name listed in `data` frontmatter field above.

More information on [BlogList](https://flowershow.app/docs/blog#blogslist-component)

Your blog index page will look something like this:

![[fshowblogindex.png]]

## Custom data getters

The `blogs.js` file is just one example of using getter functions. If you want to fetch data from an external API or you want to use your markdown files as a dataset, you can use any special data frontmatter field to define names of your custom getter functions, which will be called before your page is rendered. This page will then be able to access the values returned from these getters under variables of the same names. You can read more information on getters functionality [here](https://flowershow.app/docs/mdx#use-data-field-type-for-custom-data-getters).

## Conclusion

Using [Flowershow](https://flowershow.app/) as a template to make a content driven site takes the hassle out of implementing a lot of useful features from scratch, so give it a try if you just want to get started getting your content online!
