---
title: "All site settings now configurable from the dashboard"
date: 2026-05-21
description: Most config options previously required editing config.json manually. They're now all in the dashboard — theme, nav links, analytics, content filters, redirects, sidebar, and more.
authors:
  - olayway
showToc: false
---

Flowershow has always had a rich set of configuration options, but most of them required editing a `config.json` file — something that's not obvious if you've never heard of it, and a barrier for anyone who isn't comfortable with JSON. Even for technical users, discovering what was actually configurable meant digging through the docs.

That changes today. Every major config option is now available in the dashboard, and the single settings page has been split into focused sections so features are easy to find without ever opening a file.

## What you can now configure from the dashboard

### Appearance

- **Theme** — choose from Default, Letterpress, Superstack, Less Flowery, or Leaf (was config.json only)
- **Color mode** — set the default to light, dark, or auto (was config.json only)
- **Show/hide the dark mode toggle** (was config.json only)

### Navigation

- **Logo** — upload an image directly (was config.json only)
- **Nav title** (was config.json only)
- **Nav links** — full dropdown support via a JSON editor (was config.json only)
- **Social links** (was config.json only)
- **Footer navigation** (was config.json only)

### Content

- **Show sidebar** (was config.json only)
- **Sidebar sort order** and **path restrictions** (was config.json only)
- **Show table of contents** (was config.json only)
- **Content include / exclude / hide paths** (was config.json only)
- **Redirects** (was config.json only)

### Analytics

- **Google Analytics ID** (was config.json only)
- **Umami website ID** and **script URL** (was config.json only)

### Features

- **Show edit-this-page link** (was config.json only)

## Other improvements

**Image upload for favicon and social image** — instead of pasting a URL, you can now upload images directly. Files are processed and stored automatically.

**Settings are split into sections** — General, Appearance, Navigation, Content, Features, Analytics, GitHub, Access & Domains, and Billing replace the single long form.

## What's still config.json only

A handful of options aren't in the dashboard yet:

- **`showHero`, `hero`, `cta`** — homepage hero section and call-to-action. We're still evaluating whether to keep these in their current form before surfacing them as dashboard settings.
- **Advanced Giscus config** — `repoId` and `categoryId` are manageable from the dashboard, but other Giscus options (`mapping`, `theme`, `lang`, `inputPosition`, `reactionsEnabled`, etc.) are still config.json only.

## config.json format changes

Two fields have been updated. Old forms still work for now but are deprecated:

**Logo** — the canonical location is now root-level `logo` instead of nested `nav.logo`:

```json
// before (still works, deprecated)
{ "nav": { "logo": "/logo.png" } }

// now
{ "logo": "/logo.png" }
```

**Umami** — the plain string shorthand is deprecated in favour of the object form:

```json
// before (still works, deprecated)
{ "umami": "your-website-id" }

// now
{ "umami": { "websiteId": "your-website-id" } }
```

Self-hosted Umami users can now also set the script URL from the dashboard (no longer requires `config.json`).

## How config.json still works

Dashboard settings and `config.json` coexist. If you have a `config.json` in your connected repository, its values are merged on top of the dashboard config at render time — **`config.json` always wins**. This means existing file-based config continues to work without any changes. The dashboard only shows and controls DB state; it won't surface values that come from your file.
