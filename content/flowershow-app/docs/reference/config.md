---
title: Configuration
description: Overview of all Flowershow configuration options with links to detailed docs for each feature.
---

Flowershow can be configured in two ways:

- **Dashboard settings** — options available in the Flowershow web dashboard under site settings. See [[site-settings|Site settings]].
- **`config.json` file** — a JSON file in the root of your content directory. See [[config-file|`config.json` reference]].

Most features can be configured via either method. The sections below link to detailed documentation for each configurable feature.

## Site-wide settings

- **Title & description** — Set your site's title and meta description. [[config-file|config.json reference]]
- **Favicon** — Custom favicon image or emoji (Premium). [[config-file|config.json reference]]
- **Syntax mode** — Choose Markdown, MDX, or auto-detection. [[syntax-mode|Syntax mode]]
- **Auto-sync** — Automatically publish on git push. [[site-settings|Site settings]]

## Navigation & layout

- **Navbar** — Logo, title, nav links and social links. [[navbar|Navbar]]
- **Footer** — Footer navigation columns and links. [[footer|Footer]]
- **Sidebar** — Show site structure in a left sidebar. [[sidebar|Sidebar]]
- **Table of contents** — Per-page table of contents. [[table-of-contents|Table of contents]]
- **Dark mode** — Light/dark theme and mode switcher. [[dark-mode|Dark mode]]

## Content & publishing

- **Content filtering** — Include/exclude files and directories. [[content-filtering|Content filtering]]
- **Redirects** — URL redirects for moved or renamed pages. [[redirects|Redirects]]
- **Root directory** — Publish a subfolder of your repository. [[site-settings|Site settings]]

## Page features

- **Page titles** — Control how page titles display and appear in search. [[page-titles|Page titles]]
- **Page headers** — Configure headers and meta tags. [[page-headers|Page headers]]
- **Page authors** — Author profiles with avatars and links. [[page-authors|Page authors]]
- **Hero sections** — Full-width banners with images and CTAs. [[hero-sections|Hero sections]]
- **SEO & social metadata** — Open Graph images, descriptions, titles. [[seo-social-metadata|SEO and social metadata]]
- **"Edit this page" links** — Link to source file on GitHub. [[edit-this-page|Edit this page]]
- **Comments** — Page comments via Giscus / GitHub Discussions. [[comments|Comments]]

## Appearance

- **Custom styles** — Override default styles with CSS. [[custom-styles|Custom styles]]
- **Dark mode** — Theme switching and default mode. [[dark-mode|Dark mode]]

## Analytics & integrations

- **Google Analytics** — GA4 tracking for your site. [[analytics|Analytics]]
- **Umami analytics** — Privacy-focused analytics for your site. [[umami|Umami analytics]]
- **Custom domain** — Use your own domain (Premium). [[custom-domain|Custom domain]]
- **Password protection** — Restrict access with a password (Premium). [[site-settings|Site settings]]
- **Full-text search** — Search across all site content (Premium). [[site-settings|Site settings]]

## Content syntax

- **Supported syntax** — Markdown, GFM, and Obsidian syntax. [[syntax|Supported syntax]]
- **Math equations** — LaTeX math via KaTeX. [[math|Math equations]]
- **Mermaid diagrams** — Text-based diagrams and charts. [[mermaid|Mermaid diagrams]]
- **List component** — Auto-generated content catalogs. [[list-component|List component]]
