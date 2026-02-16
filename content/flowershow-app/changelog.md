---
title: Changelog
description: Latest changes and updates to Flowershow
showToc: false
showEditLink: false
---

# Changelog

Latest updates from the [Flowershow repository](https://github.com/flowershow/flowershow). This page is automatically updated daily via GitHub Actions.

## February 2026

### Features
- **Add one-level dropdown menu support to navbar** — [1dd4258d](https://github.com/flowershow/flowershow/commit/1dd4258d)
- **Hide navbar when nav config is omitted from site config.json** — [1c86b222](https://github.com/flowershow/flowershow/commit/1c86b222)
- **Add social icons for WhatsApp, Telegram, TikTok, Threads, Pinterest, and Spotify** — [c9982c34](https://github.com/flowershow/flowershow/commit/c9982c34)
- **Add script to reindex site content in Typesense from R2** — [d4645af8](https://github.com/flowershow/flowershow/commit/d4645af8)
- **User account deletion and username change** — [bf2632a4](https://github.com/flowershow/flowershow/commit/bf2632a4)
- **Store image dimensions in the db** — [176ae85e](https://github.com/flowershow/flowershow/commit/176ae85e)

### Fixes
- **Set envMode to loose so Turbo passes env vars to build tasks** — [0be99ce7](https://github.com/flowershow/flowershow/commit/0be99ce7)
- **Prefer index.md over README.md when both exist at same appPath** — [6a5226b9](https://github.com/flowershow/flowershow/commit/6a5226b9)
- **Patch gray-matter for js-yaml 4 compatibility** — [df244b4f](https://github.com/flowershow/flowershow/commit/df244b4f)
- **Address 31 of 33 Dependabot security vulnerabilities** — [80f5f1ac](https://github.com/flowershow/flowershow/commit/80f5f1ac)
- **Create Typesense collection for CLI/Obsidian/anon publish paths** — [17af070b](https://github.com/flowershow/flowershow/commit/17af070b)
- **Revalidate site Data Cache in API endpoints for deleting/publishing files** — [b22d6e80](https://github.com/flowershow/flowershow/commit/b22d6e80)
- **Mailto links support** — [8afcd9d2](https://github.com/flowershow/flowershow/commit/8afcd9d2)
- **Don't overwrite inline img styles in html blocks** — [c666e968](https://github.com/flowershow/flowershow/commit/c666e968)
- **Adjust caching time config in S3 objects** — [952c026e](https://github.com/flowershow/flowershow/commit/952c026e)
- **Mark expired tokens** — [407a3ac1](https://github.com/flowershow/flowershow/commit/407a3ac1)
- **Access token validation and storage** — [91874892](https://github.com/flowershow/flowershow/commit/91874892)
- **Option to disconnect repo from a site** — [aafc1fc8](https://github.com/flowershow/flowershow/commit/aafc1fc8)
- **Adjust Obsidian publish instructions in the dashboard** — [d21a76cd](https://github.com/flowershow/flowershow/commit/d21a76cd)
- **Hide irrelevant config options and sync button for non-repo sites** — [c20e406f](https://github.com/flowershow/flowershow/commit/c20e406f)
- **Prevent race condition in file processing** — [877fa7ff](https://github.com/flowershow/flowershow/commit/877fa7ff)
- **Landing page drag n drop sync status monitoring** — [d19957be](https://github.com/flowershow/flowershow/commit/d19957be)

### Documentation
- **Clarify Obsidian Bases requires MDX parsing** — [1a5b2536](https://github.com/flowershow/flowershow/commit/1a5b2536)
- **Add OpenAPI spec for public REST API** — [4a6f0a94](https://github.com/flowershow/flowershow/commit/4a6f0a94)
- **Rewrite ARCHITECTURE.md with comprehensive platform summary** — [ce5dd345](https://github.com/flowershow/flowershow/commit/ce5dd345)

### Maintenance
- **Remove CLI from the monorepo for now** — [2ccae9f6](https://github.com/flowershow/flowershow/commit/2ccae9f6)
- **Remove remark-wiki-link from the monorepo** — [9712bb6b](https://github.com/flowershow/flowershow/commit/9712bb6b)
- **Remove themes from the monorepo for now** — [f6637980](https://github.com/flowershow/flowershow/commit/f6637980)
- **Remove Obsidian plugin from the monorepo for now** — [2f90b3b9](https://github.com/flowershow/flowershow/commit/2f90b3b9)
- **Add single-command local dev setup with Docker Compose** — [52e8a16b](https://github.com/flowershow/flowershow/commit/52e8a16b)
- **Restructure into Turborepo monorepo** — [7c01c5a4](https://github.com/flowershow/flowershow/commit/7c01c5a4)

## January 2026

### Features
- **PAT tokens support and API improvements** — [4354b5ff](https://github.com/flowershow/flowershow/commit/4354b5ff)
- **Fallback home page** — [11b1af3a](https://github.com/flowershow/flowershow/commit/11b1af3a)
- **Add link to /tokens to profile dropdown menu** — [e47c07d2](https://github.com/flowershow/flowershow/commit/e47c07d2)
- **Drag n drop up to 5 files on the new landing page** — [a12783c3](https://github.com/flowershow/flowershow/commit/a12783c3)
- **Example readme file to download** — [70755e4f](https://github.com/flowershow/flowershow/commit/70755e4f)
- **Instant, anon publishing** — [459cff73](https://github.com/flowershow/flowershow/commit/459cff73)
- **Add hero config section and full-width image layout** — [bcaf89e8](https://github.com/flowershow/flowershow/commit/bcaf89e8)
- **Support for pure html pages** — [3494fa21](https://github.com/flowershow/flowershow/commit/3494fa21)
- **Customizable footer** — [dd3c59c3](https://github.com/flowershow/flowershow/commit/dd3c59c3)
- **Google auth option and switch to GitHub App for GitHub auth** — [b61e0ff0](https://github.com/flowershow/flowershow/commit/b61e0ff0)

### Fixes
- **CLI command info on the /tokens dashboard page** — [eb2dc967](https://github.com/flowershow/flowershow/commit/eb2dc967)
- **Resolve url paths in in-markdown html blocks** — [bafabcf4](https://github.com/flowershow/flowershow/commit/bafabcf4)
- **When uploading a single markdown file always set url path to "/"** — [fb738a77](https://github.com/flowershow/flowershow/commit/fb738a77)
- **Improved tracking of file processing stages** — [70b01da5](https://github.com/flowershow/flowershow/commit/70b01da5)
- **Add mime type for js files** — [15fadc7c](https://github.com/flowershow/flowershow/commit/15fadc7c)
- **Footer links** — [860338de](https://github.com/flowershow/flowershow/commit/860338de)
- **Make URL paths of single md/mdx files published with the CLI resolve to "/"** — [7dd6054c](https://github.com/flowershow/flowershow/commit/7dd6054c)
- **Emoji favicons** — [d3f7168d](https://github.com/flowershow/flowershow/commit/d3f7168d)
- **Incorrect wiki links resolution in markdown rendering pipeline** — [2f268082](https://github.com/flowershow/flowershow/commit/2f268082)
- **Incorrect anon site URL paths** — [17f9da6c](https://github.com/flowershow/flowershow/commit/17f9da6c)
- **Hero object now falls back to top-level fields** — [237ee676](https://github.com/flowershow/flowershow/commit/237ee676)
- **Lower drop zone padding** — [465fa00f](https://github.com/flowershow/flowershow/commit/465fa00f)
- **Temp disable image optimization** — [27218976](https://github.com/flowershow/flowershow/commit/27218976)
- **Broken cli auth routes** — [47a336ef](https://github.com/flowershow/flowershow/commit/47a336ef)
- **ToC glitches (empty ToC)** — [f239ccf9](https://github.com/flowershow/flowershow/commit/f239ccf9)
- **Disable custom experimental hero/footer for now** — [babd3206](https://github.com/flowershow/flowershow/commit/babd3206)
- **Change cache-control headers** — [930d58d6](https://github.com/flowershow/flowershow/commit/930d58d6)
- **Remove Content-Encoding header to prevent ERR_CONTENT_DECODING_FAILED** — [6429b52a](https://github.com/flowershow/flowershow/commit/6429b52a)
- **Incorrect content type for html files in cli upload** — [a5a4e599](https://github.com/flowershow/flowershow/commit/a5a4e599)
- **Hide github app migration form for sites published directly with cli** — [bedf7f5a](https://github.com/flowershow/flowershow/commit/bedf7f5a)
- **Display dates in List component in yyyy-mm-dd format** — [44b9b9f2](https://github.com/flowershow/flowershow/commit/44b9b9f2)
- **Temporary patch to fix broken images on password-protected sites** — [9a6ef986](https://github.com/flowershow/flowershow/commit/9a6ef986)
- **Fix allowedOrigins and remove unneeded redirect** — [723036bf](https://github.com/flowershow/flowershow/commit/723036bf)
- **Update terms of service link on login screen** — [45bebe2a](https://github.com/flowershow/flowershow/commit/45bebe2a)
- **Allow same GitHub installation across multiple user accounts** — [55dcb408](https://github.com/flowershow/flowershow/commit/55dcb408)

## December 2025

### Features
- **Sync API route for the CLI** — [dad60736](https://github.com/flowershow/flowershow/commit/dad60736)
- **Flowershow CLI API routes and pages** — [5b79aeaa](https://github.com/flowershow/flowershow/commit/5b79aeaa)

### Fixes
- **Support .html extension** — [279eecef](https://github.com/flowershow/flowershow/commit/279eecef)
- **Images with dimensions** — [667df1c7](https://github.com/flowershow/flowershow/commit/667df1c7)
- **Author attribution display and behavior** — [d016cc58](https://github.com/flowershow/flowershow/commit/d016cc58)

### Documentation
- **Enhance architecture docs with diagram plus refactoring** — [046ee60e](https://github.com/flowershow/flowershow/commit/046ee60e)
