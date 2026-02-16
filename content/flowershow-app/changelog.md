---
title: Changelog
description: Latest changes and updates to Flowershow
showToc: false
showEditLink: false
---

# Changelog

Latest updates from the [Flowershow repository](https://github.com/flowershow/flowershow). This page is automatically updated on every release via [semantic-release](https://github.com/semantic-release/semantic-release).

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
- **Revalidate site Data Cache in API endpoints** — [b22d6e80](https://github.com/flowershow/flowershow/commit/b22d6e80)
- **Mailto links support** — [8afcd9d2](https://github.com/flowershow/flowershow/commit/8afcd9d2)
- **Don't overwrite inline img styles in html blocks** — [c666e968](https://github.com/flowershow/flowershow/commit/c666e968)
- **Prevent race condition in file processing** — [877fa7ff](https://github.com/flowershow/flowershow/commit/877fa7ff)
- **Landing page drag n drop sync status monitoring** — [d19957be](https://github.com/flowershow/flowershow/commit/d19957be)

### Documentation
- **Clarify Obsidian Bases requires MDX parsing** — [1a5b2536](https://github.com/flowershow/flowershow/commit/1a5b2536)
- **Add OpenAPI spec for public REST API** — [4a6f0a94](https://github.com/flowershow/flowershow/commit/4a6f0a94)
- **Rewrite ARCHITECTURE.md with comprehensive platform summary** — [ce5dd345](https://github.com/flowershow/flowershow/commit/ce5dd345)

## January 2026

### Features
- **PAT tokens support and API improvements** — [4354b5ff](https://github.com/flowershow/flowershow/commit/4354b5ff)
- **Fallback home page** — [11b1af3a](https://github.com/flowershow/flowershow/commit/11b1af3a)
- **Drag n drop up to 5 files on the new landing page** — [a12783c3](https://github.com/flowershow/flowershow/commit/a12783c3)
- **Instant, anon publishing** — [459cff73](https://github.com/flowershow/flowershow/commit/459cff73)
- **Add hero config section and full-width image layout** — [bcaf89e8](https://github.com/flowershow/flowershow/commit/bcaf89e8)
- **Support for pure html pages** — [3494fa21](https://github.com/flowershow/flowershow/commit/3494fa21)
- **Customizable footer** — [dd3c59c3](https://github.com/flowershow/flowershow/commit/dd3c59c3)
- **Google auth option and switch to GitHub App for GitHub auth** — [b61e0ff0](https://github.com/flowershow/flowershow/commit/b61e0ff0)

### Fixes
- **Resolve url paths in in-markdown html blocks** — [bafabcf4](https://github.com/flowershow/flowershow/commit/bafabcf4)
- **Incorrect wiki links resolution in markdown rendering pipeline** — [2f268082](https://github.com/flowershow/flowershow/commit/2f268082)
- **Emoji favicons** — [d3f7168d](https://github.com/flowershow/flowershow/commit/d3f7168d)
- **Footer links** — [860338de](https://github.com/flowershow/flowershow/commit/860338de)
- **Broken cli auth routes** — [47a336ef](https://github.com/flowershow/flowershow/commit/47a336ef)
- **ToC glitches (empty ToC)** — [f239ccf9](https://github.com/flowershow/flowershow/commit/f239ccf9)

## December 2025

### Features
- **Sync API route for the CLI** — [dad60736](https://github.com/flowershow/flowershow/commit/dad60736)
- **Flowershow CLI API routes and pages** — [5b79aeaa](https://github.com/flowershow/flowershow/commit/5b79aeaa)

### Fixes
- **Support .html extension** — [279eecef](https://github.com/flowershow/flowershow/commit/279eecef)
- **Images with dimensions** — [667df1c7](https://github.com/flowershow/flowershow/commit/667df1c7)
- **Author attribution display and behavior** — [d016cc58](https://github.com/flowershow/flowershow/commit/d016cc58)
