---
title: Search Feature
---
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

![[search-component.jpg]]

## Adding the search component

There are two kinds of providers to choose from when setting up search functionality on your flowershow site. These are [kbar](https://kbar.vercel.app/) and [algolia](https://www.algolia.com/). The difference between the two is that algolia search allows for a full-text search with external indexing whereas in kbar you don't need an external provider but you can only do keyword searches.

### Kbar

To setup the keyword search feature, set the search provider in your `config.mjs` file to `"kbar"`, like so:

```js
const config = {
  ...
  search: {
    provider: "kbar",
  },
  ...
};
```

**Additional config:**

Using the kbar provider you can also add additional names to the search list with custom search keywords which links to any one of your site's pages.

For example, with the following configuration "Blog" is added to the search list, and writing the word "content" in the search field would show it in search results. Clicking it will lead to your blog page, if exists.

```js
const config = {
  search: {
    provider: "kbar",
    kbarConfig: {
      defaultActions: [
        {
          id: "blog",
          name: "Blog",
          keywords: "content",
          perform: () => (window.location.pathname = "blog"),
        },
      ],
    },
  },
};
```

### Algolia search

[Algolia](https://www.algolia.com/) is a powerful search and discovery provider that generates realtime results on your website and can be easily integrated with flowershow.

> [!note]
> Before adding this feature, you will need to register an account with them by following their instructions at [Algolia Docsearch](https://docsearch.algolia.com/) and requesting access to their api.

There are some required config values that should be included for the search to function accordingly. These are:

- App ID
- Api key
- Index name

These values will be available once you have followed the steps provided to apply for algolia docsearch and your request is granted.

Once these are available, you can then setup the algolia search provider and fill in the provided values in your `config.mjs` file as shown below.

```js
const config = {
  search: {
    provider: "algolia",
    config: {
      appId: "",
      apiKey: "",
      indexName: "",
    },
  },
};
```

### Access

No matter which provider you choose, the search functionality will be available as a search field in the navbar or can also be accessed by pressing the Ctrl+K (⌘+K on macOS) keyboard shortcut to open the search modal.
