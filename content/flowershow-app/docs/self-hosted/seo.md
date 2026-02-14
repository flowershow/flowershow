---
title: SEO Configuration
description: How to set up SEO in flowershow
---
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

## What is SEO and meta tags

SEO stands for Search Engine Optimization and is related to the process of improving your site's discovery when people are searching for content related to yours on Google or other search engines.

The simplest form of SEO is setting good metadata (information about data) of your site's content. This can be done with **meta tags** - HTML tags placed in the `<head>` section of an HTML document. While they themselves do not influence ranking of your page in search engines, they play an important role for effective digital marketing. It means that if your site shows up in search results, based on it's title and description users will decide on whether or not to navigate to your website. Or, if they see your website shared on social media, they can either be invited by a good looking tile with title and image of your website, or not even notice it at all.

Let's see how you can set metadata of your website in Flowershow.

## How to configure your meta tags

The most common meta tags you may want to add to your pages include page title and content description. Flowershow allows you to set these values both globally for all your pages as well as per-page.

### Setting global meta-tags

In order to set some meta tags for all your pages, all you need to do is add the following properties to your `config.mjs` file inside your `content` folder.

```js
const config = {
  ...
  nextSeo: {
    title: "MyBlog blog post",
    description: "This is a blog about data management",
  },
  ...
}
```

> [!note]
> Flowershow uses the NextSEO plugin under the hood, so you can also add other metadata to your pages. See their [documentation](https://github.com/garmeeh/next-seo) to learn more.

### Set per-page meta-tags

You can also set title and description for specific pages using corresponding frontmatter fields. For example:

```md
---
title: Publish your Obsidian vault with Flowreshow
description: A tutorial on how to publish Obsidian vault with Flowershow
---
```

## Social media meta tags

Flowershow also supports social meta tags that allow you to control how URLs of your website are displayed when shared on social media platforms. For example, you can set the images used as the website preview, like so:

```js

const config = {
  ...
  nextSeo: {
    ...
    openGraph: {
      images: [
        {
          url: "https://www.example.ie/og-image.jpg" /*image url path*/,
          alt: "",
          width: 1200,
          height: 627,
          type: "image/jpg"
        }
      ]
    },
    twitter: {
      handle: "@example",
      site: "https://yoursite.com",
      cardType: "summary_large_image",
    },
  }
  ...
}
```

> [!note]
> It is advised to upload an image with the same width and height values as specified above for it to display properly.

### Set per-page social media meta tag image

If required, each page can have its own custom image when sharing on social media sites and can be setup by adding the path of the url to the image in page's frontmatter.

The image URL can either be uploaded to your `site/content/assets/` folder or can be any other external path.

Below is an example of how we would add this in frontmatter:

```markdown
---
image: /assets/images/your-image-path.jpg
---
```

> [!info]
> You should set your website's url in your config file so that the correct url path for the image is generated.

```js
// in config.mjs
const config = {
  domain: "https://your-website.com",
};
```

Here is a preview of how it should look when sharing the website link on social sites, for example on Twitter:

![[twitter-card.jpg]]
