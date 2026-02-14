
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

# Sitemaps

A sitemap is a file that contains information about your pages, videos and other content on your website, along with their hierarchical structure and relationships. This information is then used by search engines like google to crawl your website, enabling them to quickly locate and index all of your pages, including those that might be hidden or difficult to find through standard navigation.

Having a sitemap for your website is beneficial and recommended by google as it improves search visibility and ultimately drives more traffic to your site.

Sitemaps are typically created in XML format, although there are other formats available as well. In Flowershow it is generated in XML format.

## Generating sitemaps in Flowershow

In order to create a sitemap for your Flowershow website, add a domain on which your website will be hosted to `domain` field in your `config.mjs` file, like so:

```js
// config.mjs

const config = {
  domain: "https://flowershow.app", // replace with your website url here.
};
```

Thats it! Your XML sitemap will be auto generated in `public/sitemap.xml` and ready for search engines to crawl your content.
