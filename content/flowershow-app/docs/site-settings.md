---
title: Site settings
description: Manage settings for your published site
---

> [!info]
> Some features are only available on the [premium plan](https://flowershow.app/pricing).

## Name

Change your site’s name. If you don’t have a custom domain set, it will be used in your site’s URL:
`https://my.flowershow.app/@<your-username>/<site-name>`

![[site-name-option.png]]

## Root Directory

Set the path to the folder in your GitHub repository that you want to publish. For example, if you have a repository with your app's code and you want to publish only it's documentation stored in `/docs`, you can specify that folder here.

Leave this field empty if you want to publish the entire repository.

![[root-dir-option.png]]

## Syntax Mode

Choose how Flowershow parses your content, as regular Markdown or as MDX. Use "auto" for auto-detection based on file extension.

![syntax-mode-config](syntax-mode-config.png)

👉 See [[syntax-mode|Syntax mode]] to learn more.

## Auto-Sync

Automatically publish your site whenever you commit changes to your GitHub repository.

![[auto-sync-option.png]]

## Comments

Show a comments section at the bottom of your pages.

![[comments-option.png]]

👉 See [[/docs/comments|Comments]] to learn more.

## Custom Domain (⭐️ Premium feature)

Set a custom domain for your site.

![[custom-domain-option.png]]

👉 See [[custom-domain|Custom domain]] to learn more.

## Full-Text Search (⭐️ Premium feature)

Enable content indexing and display a search field in the navigation bar to help visitors find information more easily.

![[search-option.png]]

👉 See [[announcing-full-text-search|Full-text search]] to learn more.

## Password Protection (⭐️ Premium feature)

Limit access to your site by requiring a password.

![[password-protection-option.png]]

## Analytics

Enable Google Analytics tracking by adding an `analytics` field to your [[config-file|config file]].

```json
{
  "analytics": "G-XXXXXXXXXX" // Your GA4 Tracking ID
}
```

👉 See [[/docs/analytics|Analytics]] to learn more.

## Favicon (⭐️ Premium feature)

Set your site's favicon by specifying the path to your favicon file in the `favicon` field of your [[config-file|config file]]. You can also use an emoji!

```json
{
  "favicon": "/path/to/favicon.ico"
  // or "favicon": "🐶"
}
```

## Navigation bar

Customize your site's navigation bar. You can set the **logo**, **title**, **links** and more.

```json
{
  "nav": {
    "logo": "/path/to/logo.png"
  }
}
```

👉 See [[navbar|Navigation bar]] to learn more.

## Sidebar

Show your site's sitemap in a sidebar on the left.

```json
{
  "showSidebar": true
}
```

👉 See [[sidebar|Sidebar]] to learn more.

## "Edit this page" links

> [!important] Works only for sites published from **public** GitHub repositories.

Show "Edit this page" links at the bottom of your site's pages to allow visitors to contribute to your content easily. Links will open the underlying files in edit mode in your GitHub repository.

```json
{
  "showEditLink": true
}
```

👉 See [[edit-this-page|"Edit this page" links]] to learn more.

## Excluding files from publishing

Control which files and directories are published.

```json
{
  "contentExclude": [
    "/private-folder",
    "/draft-file.md"
  ]
}
```

👉 See [[content-filtering|Content filtering]] to learn more.