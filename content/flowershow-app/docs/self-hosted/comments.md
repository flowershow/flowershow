---
title: Empower Your Flowershow Website or Blog with User Comments
description: "Get more feedback or simply increase visitor engagement by easily adding page comments to your Flowershow website or blog."
layout: blog
date: 2023-02-04
authors: [Khalil Ali]
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Flowershow supports the integration of a user commenting feature on your website, allowing visitors to provide their feedback and thoughts on your pages. This functionality can be configured in the config file and can be optionally added to each page's frontmatter for more granular control.

![[page_comments.png]]

## Setup

Page comments can be setup with any one of the following supported providers:

1. [giscus](https://giscus.app/)
2. [utterances](https://utteranc.es/)
3. [disqus](https://disqus.com/)

Each provider has it's own configuration options. It is highly recommended that you store them as environment variables rather than putting them in your config file directly. You can do so by creating a `.env` file in the `.flowershow` folder and adding the values as seen below.

> [!note]
> If you are hosting your website on hosting providers like Netlify, Vercel or Cloudflare, you will also need to add the environment variables there. Please follow their documentation to learn how to do this.

No matter which one you choose, in order to enable comments on your pages you need to add `showComments` property to your config file and set it to `true`.

```js
// config.mjs
...
showComments: true,
...
```

### Giscus

```
NEXT_PUBLIC_GISCUS_REPO=
NEXT_PUBLIC_GISCUS_REPOSITORY_ID=
NEXT_PUBLIC_GISCUS_CATEGORY=
NEXT_PUBLIC_GISCUS_CATEGORY_ID=
```

### Utterances

```
NEXT_PUBLIC_UTTERANCES_REPO=
```

### Disqus

```
NEXT_PUBLIC_DISQUS_SHORTNAME=
```

Then you can use environment variables in your config file with `process.env`. For example, you can see how we can use these in the code below.

```js
// config.mjs

const config = {
  comments: {
    provider: 'giscus',
    config: {
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID
      ...
    }
  }
}
```

## Setting up comments using giscus

[Giscus](https://giscus.app/) uses your github repo's discussions feature to store your comments and display them on your site.

### Prerequisites

1. You have a public [github repository](https://docs.github.com/en/get-started/quickstart/create-a-repo) with the [discussions](https://docs.github.com/en/github/administering-a-repository/managing-repository-settings/enabling-or-disabling-github-discussions-for-a-repository) feature activated which would be used to store your comments.
2. The [giscus app](https://github.com/apps/giscus) installed in your repo by following their configuration setup at https://giscus.app/

Once the above steps are completed, we will have to get our config values. Head over to https://giscus.app and follow the steps there by filling out the fields.

> [!important]
> Make sure to choose `pathname` under page discussions mapping.

After filling out the fields, you will be provided with a script tag that contains your config values. Now you are ready to enable giscus comments by adding these values in your config file.

```js
// config.mjs
const config = {
  comments: {
    provider: "giscus",
    config: {
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID,
      category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
      categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
    },
  },
};
```

### Developers

When a user visits a web page, Giscus searches for a discussion whose title contains the page's pathname URL component. If there are no matches (i.e., no comments have been made about that page), then a new discussion is created for that page.

By using the pathname for mapping with a page, Giscus ensures that each discussion is unique to a particular page and that comments made on that page are kept together.

More info on how this connection is achieved can be found on their '**how it works**' section in their repo - [https://github.com/giscus/giscus#how-it-works](https://github.com/giscus/giscus#how-it-works) and also in the '**Page Discussions Mapping**' section at https://giscus.app/

## Setting up comments using utterances

[Utterances](https://utteranc.es/) uses your github repo's issues to store comments for your pages and display them on your site. To setup comments with utterances, you would need to do the following:

### Prerequisites

1. You have a public [github repository](https://docs.github.com/en/get-started/quickstart/create-a-repo)
2. The utterances app installed in your repo by following their configuration setup at https://utteranc.es/

Once installed fill in the required fields and you will see a script tag with your repo value which you can add in your config file as seen below.

```js
const config = {
  comments: {
    provider: "utterances",
    config: {
      repo: process.env.NEXT_PUBLIC_UTTERANCES_REPO,
    },
  },
};
```

## Setting up comments using disqus

[Disqus](https://disqus.com/) is a feature rich provider which can be used to add comments to your site. You can configure flowershow to use disqus by creating an account on their site and following their process. You will be asked to enter a shortname for your site. Once completed, we can use this shortname in our comments configuration as below.

### Prerequisites

1. Create an account on [Disqus](https://disqus.com/) and follow their setup process.

> [!note]
> You will be asked to enter a shortname for your site. You'll need it for disqus comments configuration as seen below.

```js
const config = {
  comments: {
    provider: "disqus",
    config: {
      shortname: process.env.NEXT_PUBLIC_DISQUS_SHORTNAME,
    },
  },
};
```

## Showing comments on pages

By default, comments show up on all the pages after they have been added in your config file.

### Enable / disable comments for individual pages

You can enable / disable comments on individual pages by adding a `showComments` field in the page's frontmatter and setting it's value to `true` or `false`.

```md
---
showComments: true
---
```

### Enable / disable comments for pages in a directory

We can also enable comments for all pages within a specific directory by passing a pages property whose values are an array of strings.

```js
const config = {
  comments: {
    ...
    pages: ["blog"],
  }
}
```

In the above configuration the pages property allows you to define on which pages you would like the comments feature to be shown. For example, if you have a _blog_ folder in your content and would like the comments to be enabled only on your blog pages then you can add it here.
