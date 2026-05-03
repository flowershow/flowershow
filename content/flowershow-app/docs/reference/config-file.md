---
title: "`config.json` file"
---
## What is `config.json` file

`config.json` file is the configuration file for your Flowershow site complementary to site settings in your dashboard. It allows you to customize various aspects of your site, from analytics and comments to navigation and layout options.

> [!info]
> This is just a reference page documenting the correct file structure, fields and value types. To see all the site configuration options we advise you to visit [[site-settings|Site settings]] instead.

## File location

Place the `config.json` file in the root directory of your site's content. For most users, this means placing it in the root of your repository. However, if you publish only a specific folder of your vault/repository, you should place this file within that folder.

## Available options

Here is an overview of all the site-wide configuration options that you can set through `config.json` file.

```json
{
  "title": "Your Site Title",
  "description": "Your site description",
  "image": "/assets/default-social.jpg",
  "favicon": "/path/to/favicon.png",
  "nav": {
    "logo": "logo.jpeg",
    "title": "My Digital Garden",
    "links": [
      {
        "href": "/blog",
        "name": "Blog"
      }
    ]
  },
  "social": [
    {
      "label": "github",
      "href": "https://github.com/yourusername"
    },
    {
      "label": "twitter",
      "href": "https://twitter.com/yourusername"
    }
  ],
  "footer": {
    "navigation": [
      {
        "title": "Resources",
        "links": [
          {
            "name": "Documentation",
            "href": "/docs"
          },
          {
            "name": "Blog",
            "href": "/blog"
          }
        ]
      },
      {
        "title": "Company",
        "links": [
          {
            "name": "About",
            "href": "/about"
          },
          {
            "name": "Contact",
            "href": "/contact"
          }
        ]
      }
    ]
  },
  "analytics": "G-XXXXXXXXXX",
  "umami": {
    "websiteId": "your-website-id",
    "src": "https://your-umami.example.com/script.js"
  },
  "showComments": false,
  "giscus": {
    "repo": "username/repo",
    "repoId": "R_xxx",
    "category": "Discussions",
    "categoryId": "DIC_xxx",
    "theme": "transparent_dark",
    "lang": "en",
    "mapping": "title",
    "strict": "0",
    "reactionsEnabled": "1",
    "inputPosition": "top"
  },
  "showEditLink": true,
  "showSidebar": true,
  "sidebar": {
    "orderBy": "title",
    "paths": ["/docs"]
  },
  "showToc": false,
  "contentInclude": ["/blog", "README.md"],
  "contentExclude": ["/blog/_archive"],
  "contentHide": ["/people"],
  "theme": {
    "theme": "superstack",
    "defaultMode": "light",
    "showModeSwitch": true
  },
  "redirects": [
    { "from": "/blog/old-post", "to": "/blog/new-post" }
  ]
}
```
