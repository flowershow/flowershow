---
title: "`config.json` file"
description: Reference for all available options in the config.json site configuration file.
---

## What is `config.json`?

`config.json` is the file-based configuration for your Flowershow site. It lets you version-control your settings alongside your content.

> [!important]
> `config.json` values always win over dashboard settings.

## File location

Place `config.json` in the root of your published content folder. For most users that means the root of the repository. If you publish only a subfolder of your vault or repo, place the file inside that subfolder.

## Options

### `title`

**Type:** `string`  
**Default:** —

Site name appended as a suffix to every page title in browser tabs, search results, and social shares. [[seo-social-metadata|Learn more →]]

```json
"title": "My Digital Garden"
```

---

### `description`

**Type:** `string`  
**Default:** —

Fallback description used in search results and social previews when a page has no `description` set in its frontmatter. Per-page descriptions override this entirely — they are not combined. [[seo-social-metadata|Learn more →]]

```json
"description": "Notes and essays on software and ideas"
```

---

### `image` (⭐️ Premium feature)

**Type:** `string`  
**Default:** —

Path (relative to your content root) or external URL for the default social share image (Open Graph / Twitter Card). [[seo-social-metadata|Learn more →]]

```json
"image": "/assets/social-card.jpg"
```

---

### `logo`

**Type:** `string`  
**Default:** —

Path to a logo image shown in the navbar. Relative to your content root.

```json
"logo": "logo.png"
```

---

### `favicon` (⭐️ Premium feature)

**Type:** `string`  
**Default:** —

Path to a favicon image, or a single emoji character. [[custom-favicon|Learn more →]]

```json
"favicon": "/assets/favicon.png"
```

---

### `nav`

**Type:** `object`  
**Default:** —

Navbar configuration. [[navbar|Learn more →]]

| Field   | Type                             | Description                      |
| ------- | -------------------------------- | -------------------------------- |
| `title` | `string`                         | Site name shown next to the logo |
| `links` | `Array<NavLink \| NavDropdown>`  | Navigation links or dropdowns    |
| `cta`   | `{ name: string, href: string }` | Call-to-action button            |

Where `NavLink` is `{ name: string, href: string }` and `NavDropdown` is `{ name: string, links: NavLink[] }`.

```json
"nav": {
  "title": "My Site",
  "links": [
    { "name": "Blog", "href": "/blog" },
    {
      "name": "Docs",
      "links": [
        { "name": "Getting started", "href": "/docs/getting-started" },
        { "name": "Reference", "href": "/docs/reference" }
      ]
    }
  ],
  "cta": { "name": "Sign up", "href": "/signup" }
}
```

---

### `social`

**Type:** `Array<{ label: string, href: string }>`  
**Default:** —

Social media links shown in the navbar and footer. [[social-links|Learn more →]]

Supported `label` values: `bsky`, `bluesky`, `discord`, `mail`, `facebook`, `github`, `instagram`, `linkedin`, `mastodon`, `pinterest`, `reddit`, `spotify`, `substack`, `telegram`, `threads`, `tiktok`, `twitter`, `whatsapp`, `x`, `youtube`.

```json
"social": [
  { "label": "github", "href": "https://github.com/yourusername" },
  { "label": "twitter", "href": "https://twitter.com/yourusername" }
]
```

---

### `footer`

**Type:** `object`  
**Default:** —

Footer configuration. [[footer|Learn more →]]

| Field        | Type                      | Description                     |
| ------------ | ------------------------- | ------------------------------- |
| `navigation` | `FooterNavigationGroup[]` | Link groups shown in the footer |

Where `FooterNavigationGroup` is `{ title: string, links: Array<{ name: string, href: string }> }`.

```json
"footer": {
  "navigation": [
    {
      "title": "Resources",
      "links": [
        { "name": "Docs", "href": "/docs" },
        { "name": "Blog", "href": "/blog" }
      ]
    }
  ]
}
```

---

### `showSidebar`

**Type:** `boolean`  
**Default:** `true`

Show or hide the sidebar navigation. [[sidebar|Learn more →]]

```json
"showSidebar": false
```

---

### `sidebar`

**Type:** `object`  
**Default:** —

Fine-grained sidebar options. [[sidebar|Learn more →]]

| Field     | Type                | Description                                 |
| --------- | ------------------- | ------------------------------------------- |
| `orderBy` | `"title" \| "path"` | Sort order for sidebar items                |
| `paths`   | `string[]`          | Limit the sidebar to specific content paths |

```json
"sidebar": {
  "orderBy": "title",
  "paths": ["/docs"]
}
```

---

### `showToc`

**Type:** `boolean`  
**Default:** `true`

Show or hide the in-page table of contents. [[table-of-contents|Learn more →]]

```json
"showToc": false
```

---

### `contentInclude`

**Type:** `string[]`  
**Default:** —

List of paths to include in your published site. If omitted, all files are included by default. [[content-filtering|Learn more →]]

```json
"contentInclude": ["/blog", "README.md"]
```

---

### `contentExclude`

**Type:** `string[]`  
**Default:** —

List of paths to exclude from your published site entirely — not published, not accessible by URL. Exclude rules take precedence over include rules. [[content-filtering|Learn more →]]

```json
"contentExclude": ["/blog/_archive"]
```

---

### `contentHide`

**Type:** `string[]`  
**Default:** —

List of paths to hide from the sidebar and search, but still published and accessible by URL. [[content-filtering|Learn more →]]

```json
"contentHide": ["/people"]
```

---

### `syntaxMode`

**Type:** `"auto" | "md" | "mdx"`  
**Default:** `"auto"`

Controls whether content is parsed as Markdown or MDX. [[syntax-mode|Learn more →]]

```json
"syntaxMode": "md"
```

---

### `analytics`

**Type:** `string`  
**Default:** —

Google Analytics 4 measurement ID. [[analytics|Learn more →]]

```json
"analytics": "G-XXXXXXXXXX"
```

---

### `umami`

**Type:** `{ websiteId: string, src?: string }`  
**Default:** —

Umami analytics configuration. [[analytics|Learn more →]]

| Field       | Type     | Description                                               |
| ----------- | -------- | --------------------------------------------------------- |
| `websiteId` | `string` | Your Umami website ID                                     |
| `src`       | `string` | URL of your Umami script (required for self-hosted Umami) |

```json
"umami": {
  "websiteId": "your-website-id",
  "src": "https://your-umami.example.com/script.js"
}
```

---

### `showComments`

**Type:** `boolean`  
**Default:** `false`

Enable or disable the comments section on pages. To fully set up comments, you must also configure `repoId` and `categoryId` in the [`giscus`](#giscus) object — comments won't work without them. [[comments|Learn more →]]

```json
"showComments": true
```

---

### `giscus`

**Type:** `object`  
**Default:** —

Advanced Giscus options. Required when your site has no GitHub integration (e.g. publishing from Obsidian or CLI) — without it, Giscus has no repository to point to. [[comments|Learn more →]]

| Field              | Type                | Description                                          |
| ------------------ | ------------------- | ---------------------------------------------------- |
| `repo`             | `string`            | GitHub repo in `owner/repo` format                   |
| `repoId`           | `string`            | GitHub repo ID (**required**)                        |
| `category`         | `string`            | Discussion category name                             |
| `categoryId`       | `string`            | Discussion category ID (**required**)                |
| `theme`            | `string`            | Giscus theme name                                    |
| `lang`             | `string`            | Language code (e.g. `"en"`)                          |
| `mapping`          | `string`            | How discussions are mapped to pages (e.g. `"title"`) |
| `strict`           | `"0" \| "1"`        | Strict title matching                                |
| `reactionsEnabled` | `"0" \| "1"`        | Enable emoji reactions                               |
| `inputPosition`    | `"top" \| "bottom"` | Comment box position                                 |

```json
"giscus": {
  "repo": "username/repo",
  "repoId": "R_xxx",
  "category": "Discussions",
  "categoryId": "DIC_xxx"
}
```

---

### `showEditLink`

**Type:** `boolean`  
**Default:** `false`

Show an "Edit this page" link at the bottom of each page. [[edit-this-page|Learn more →]]

```json
"showEditLink": true
```

---

### `enableSearch` (⭐️ Premium feature)

**Type:** `boolean`  
**Default:** `false`

Enable site-wide full-text search.

```json
"enableSearch": true
```

---

### `enableRss`

**Type:** `boolean`  
**Default:** `false`

Enable an RSS feed for your site. [[rss-feed|Learn more →]]

```json
"enableRss": true
```

---

### `showBuiltWithButton` (⭐️ Premium feature)

**Type:** `boolean`  
**Default:** `true`

Hide the "Built with Flowershow" button in the footer.

```json
"showBuiltWithButton": false
```

---

### `showRawLink`

**Type:** `boolean`  
**Default:** `false`

Show a link to the raw Markdown source of each page.

```json
"showRawLink": true
```

---

### `redirects`

**Type:** `Array<{ from: string, to: string }>`  
**Default:** —

URL redirects for moved or renamed pages. Matches exact paths only — no regex or glob patterns. [[redirects|Learn more →]]

| Field  | Type     | Description      |
| ------ | -------- | ---------------- |
| `from` | `string` | The old URL path |
| `to`   | `string` | The new URL path |

```json
"redirects": [
  { "from": "/blog/old-post", "to": "/blog/new-post" },
  { "from": "/old-section", "to": "/new-section" }
]
```

---

### `theme`

**Type:** `string | object`  
**Default:** —

Set the site theme. Pass a theme name as a string, or an object for additional options. [[themes|Themes]] · [[dark-mode|Dark mode]]

| Field            | Type                            | Description                 |
| ---------------- | ------------------------------- | --------------------------- |
| `theme`          | `string`                        | Theme name                  |
| `defaultMode`    | `"light" \| "dark" \| "system"` | Default color mode          |
| `showModeSwitch` | `boolean`                       | Show light/dark mode toggle |

```json
"theme": "superstack"
```

```json
"theme": {
  "theme": "superstack",
  "defaultMode": "dark",
  "showModeSwitch": true
}
```

---

### `showHero`

**Type:** `boolean`  
**Default:** —

Enable hero sections site-wide. When set, the root-level `title`, `description`, `image`, and `cta` fields provide default hero content for all pages. Individual pages can override these with frontmatter. [[hero-sections|Learn more →]]

```json
"showHero": true
```

---

### `cta`

**Type:** `Array<{ href: string, label: string }>`  
**Default:** —

Site-wide default call-to-action buttons used in hero sections. [[hero-sections|Learn more →]]

```json
"cta": [
  { "label": "Get started", "href": "/docs" },
  { "label": "View on GitHub", "href": "https://github.com/yourusername/yourrepo" }
]
```
