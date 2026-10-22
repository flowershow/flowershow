---
title: llms.txt
description: Serve an auto-generated /llms.txt that lists your pages with links to their Markdown, so AI assistants can find and read your content.
---

[llms.txt](https://llmstxt.org) is a plain-text index of a website for AI assistants: the site's name, a one-line summary, and a list of its pages with links to clean Markdown versions. Flowershow can generate one for your site and serve it at `/llms.txt`.

It's off by default.

## Turning it on

In the dashboard, go to **Settings → Features → llms.txt** and toggle it on.

Or set it in `config.json`. Values set in `config.json` take precedence over dashboard settings:

```json
{
  "enableLlmsTxt": true
}
```

After your next publish, your index is at:

```
https://your-site-url/llms.txt
```

You can see a live one at [flowershow.app/llms.txt](https://flowershow.app/llms.txt).

## What's in it

```markdown
# My Site

> A site about interesting things.

Each link below points to the Markdown source of a page on this site.

## Pages

- [Home](https://your-site-url/README.md): Welcome to my site
- [About](https://your-site-url/about.md): Who I am

## Docs

- [Getting started](https://your-site-url/docs/getting-started.md): Set up in five minutes
```

- **Title:** your site name (`siteName` in `config.json`, or your project name).
- **Summary:** your site description (`description` in `config.json`), or the `description` of your home page if the site has none.
- **Pages:** every published Markdown page, with its `title` and `description` from frontmatter. Pages in the root of your site come first under **Pages**, then one section per top-level folder. Each link goes to the page's Markdown source (see [[markdown-access|Markdown access]]).

Left out:

- Pages with `draft: true` or `publish: false` in frontmatter.
- Paths in `contentHide` (and anything `contentExclude` keeps from being published).
- Raw HTML pages, images and other files.

Very large sites list their first 2,000 pages, with a pointer to `/sitemap.xml` for the rest.

The file is cached for a few minutes, so changes show up shortly after you publish.

## Writing your own

If you publish an `llms.txt` file at the root of your content, Flowershow serves it as-is instead, whether or not this setting is on. Use this when you want to hand-pick the pages or add instructions for AI assistants.

## Where it's not available

- **Password-protected sites:** no generated `llms.txt`, since AI assistants can't read the pages behind the password. A published `llms.txt` is only shown to visitors who have entered the password.
- **Temporary sites** published without an account never get a generated `llms.txt`. Claim the site to turn it on.
