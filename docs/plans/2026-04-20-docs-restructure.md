# Docs Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize `/content/flowershow-app/docs/` from a flat list into three sections — `getting-started/`, `reference/`, and `guides/` — with all blog how-to posts migrated to `guides/` and proper redirects in `config.json`.

**Architecture:** Create three subdirectories under `docs/`, each with a `README.md` index. Move all 44 existing docs pages into `reference/`, move 26 blog how-to/tutorial posts into `guides/`, and split the current `getting-started.md` into 3 path-specific files under `getting-started/`. Add 70 redirects to `config.json` to preserve existing URLs.

**Tech Stack:** Markdown files, Flowershow wikilinks (`[[filename|label]]`), `config.json` redirects array.

---

## Task 1: Create directory structure

**Files:**
- Create: `content/flowershow-app/docs/getting-started/`
- Create: `content/flowershow-app/docs/reference/`
- Create: `content/flowershow-app/docs/guides/`

**Step 1: Create the three directories**

```bash
mkdir content/flowershow-app/docs/getting-started
mkdir content/flowershow-app/docs/reference
mkdir content/flowershow-app/docs/guides
```

**Step 2: Verify**

```bash
ls content/flowershow-app/docs/
```
Expected: `getting-started/  guides/  reference/  README.md  getting-started.md  [all other .md files]`

---

## Task 2: Write getting-started/ files

Split the existing `getting-started.md` (3 sections) into 3 files + a README.

**Files:**
- Create: `content/flowershow-app/docs/getting-started/README.md`
- Create: `content/flowershow-app/docs/getting-started/from-obsidian.md`
- Create: `content/flowershow-app/docs/getting-started/from-github.md`
- Create: `content/flowershow-app/docs/getting-started/from-cli.md`
- Delete: `content/flowershow-app/docs/getting-started.md`

**Step 1: Create `getting-started/README.md`**

```markdown
---
title: Getting Started
description: Go from markdown files to a live website in under a minute.
showHero: true
---

Pick the method that fits how you work.

- [[from-obsidian|From Obsidian]] — publish directly from your vault, no GitHub needed
- [[from-github|From GitHub]] — auto-sync a repo to your site on every push
- [[from-cli|From the Terminal (CLI)]] — publish any folder of markdown, no repo required

Once your site is live, see the [[reference/README|Reference]] for all configuration options, or browse the [[guides/README|Guides]] for step-by-step walkthroughs.
```

**Step 2: Create `getting-started/from-obsidian.md`**

```markdown
---
title: Publish from Obsidian
description: Publish directly from your Obsidian vault — no GitHub account needed.
---

1. Open **Settings > Community Plugins**, search "Flowershow", install and enable it
2. Sign up at [cloud.flowershow.app](https://cloud.flowershow.app/)
3. Go to [cloud.flowershow.app/tokens](https://cloud.flowershow.app/tokens) and create a Personal Access Token
4. In Obsidian, open **Flowershow plugin settings** and paste your token
5. Click the Flowershow icon in the sidebar, select your notes, and publish

Your site is live at `your-name.flowershow.app`.

## What's next?

- [[themes|Choose a theme]] to change the look
- [[navbar|Configure your navbar]] with links and dropdowns
- [[custom-styles|Customize colors and fonts]] with CSS variables
- [[config-file|Explore all config options]] in `config.json`
```

**Step 3: Create `getting-started/from-github.md`**

```markdown
---
title: Publish from GitHub
description: Push to a repo, your site updates automatically.
---

1. Go to [cloud.flowershow.app](https://cloud.flowershow.app/) and sign in with your GitHub account
2. Click **New Site** and give your site a name
3. Select **Sync with GitHub**, then choose your repository and branch
4. Optionally, set a root directory if you want to publish only part of your repo (e.g. `/docs`)

Your site builds and syncs on every push. Make sure you have a `README.md` or `index.md` at the root (or in the subfolder you choose).

> [!tip]
> Use the [Flowershow template](https://github.com/new?template_owner=flowershow&template_name=flowershow-cloud-template) to start a new repo with the right structure.

## What's next?

- [[themes|Choose a theme]] to change the look
- [[navbar|Configure your navbar]] with links and dropdowns
- [[custom-styles|Customize colors and fonts]] with CSS variables
- [[config-file|Explore all config options]] in `config.json`
```

**Step 4: Create `getting-started/from-cli.md`**

```markdown
---
title: Publish from the Terminal (CLI)
description: Publish any folder of markdown files. No repo required.
---

1. Install: download the `fl` binary from the [releases page](https://github.com/flowershow/flowershow/releases)
2. Log in: `fl login`
3. Publish: `fl ./my-folder`
4. Update later: `fl sync ./my-folder`

See [[cli|CLI reference]] for all commands and options.

## What's next?

- [[themes|Choose a theme]] to change the look
- [[navbar|Configure your navbar]] with links and dropdowns
- [[custom-styles|Customize colors and fonts]] with CSS variables
- [[config-file|Explore all config options]] in `config.json`
```

**Step 5: Delete the old `getting-started.md`**

```bash
rm content/flowershow-app/docs/getting-started.md
```

**Step 6: Verify**

```bash
ls content/flowershow-app/docs/getting-started/
```
Expected: `README.md  from-cli.md  from-github.md  from-obsidian.md`

---

## Task 3: Move all flat docs files into reference/

Move all `.md` files from `docs/` (except `README.md`) into `docs/reference/`.

**Step 1: Move files**

```bash
cd content/flowershow-app/docs
mv analytics.md blog-setup.md canvas.md cli.md comments.md config-file.md config.md \
   content-filtering.md custom-collection-cards.md custom-domain.md custom-favicon.md \
   custom-fonts.md custom-styles.md dark-mode.md debug-mdx-errors.md debugging-404s.md \
   edit-this-page.md faq.md footer.md forms.md frontmatter-variables.md hero-sections.md \
   home-page.md list-component.md math.md mermaid.md navbar.md page-authors.md \
   page-headers.md page-titles.md password-protection.md privacy.md redirects.md \
   robots-txt.md rss-feed.md seo-social-metadata.md sidebar.md site-settings.md \
   syntax-mode.md syntax.md table-of-contents.md terms-of-service.md themes.md umami.md \
   reference/
```

**Step 2: Verify count**

```bash
ls content/flowershow-app/docs/reference/ | wc -l
```
Expected: `44`

**Step 3: Verify root docs/ has only expected files**

```bash
ls content/flowershow-app/docs/
```
Expected: `README.md  getting-started/  guides/  reference/`

---

## Task 4: Write reference/README.md

**Files:**
- Create: `content/flowershow-app/docs/reference/README.md`

```markdown
# Reference

Configuration options, feature docs, and CLI reference.

## Site configuration

- [[config-file|Config file reference]] — all `config.json` options
- [[site-settings|Site settings dashboard]] — configure from the UI
- [[navbar|Navbar]] — links, dropdowns, CTA button
- [[footer|Footer]] — footer links and layout
- [[sidebar|Sidebar]] — table of contents navigation
- [[themes|Themes]] — switch between official themes
- [[custom-styles|Custom styles]] — override colors, fonts, spacing
- [[dark-mode|Dark mode]] — light/dark/system mode switching
- [[analytics|Analytics]] — Google Analytics and Umami
- [[comments|Comments]] — reader comments on pages
- [[edit-this-page|Edit links]] — "Edit this page" buttons
- [[content-filtering|Content filtering]] — exclude files from publishing
- [[custom-domain|Custom domain]] — use your own domain (Premium)
- [[custom-favicon|Custom favicon]] — browser tab icon (Premium)
- [[custom-fonts|Custom fonts]] — Google Fonts and typography
- [[password-protection|Password protection]] — restrict site access (Premium)
- [[redirects|URL redirects]] — redirect old URLs to new ones
- [[rss-feed|RSS feed]] — syndication feed for your site
- [[robots-txt|robots.txt]] — control search engine crawling

## Page content

- [[syntax|Markdown syntax]] — full syntax reference
- [[page-headers|Page headers]] — titles, descriptions, images
- [[page-authors|Page authors]] — author attribution
- [[page-titles|Page titles]] — how titles are resolved
- [[frontmatter-variables|Frontmatter variables]] — all supported frontmatter fields
- [[hero-sections|Hero sections]] — full-width banners
- [[seo-social-metadata|SEO and social metadata]] — Open Graph, Twitter cards
- [[table-of-contents|Table of contents]] — per-page TOC
- [[math|Math equations]] — LaTeX with KaTeX
- [[mermaid|Mermaid diagrams]] — flowcharts and sequence diagrams
- [[canvas|Canvas]] — Obsidian Canvas support
- [[obsidian-bases|Obsidian Bases]] — database views
- [[list-component|List component]] — content catalogs
- [[custom-collection-cards|Custom collection cards]] — card layout customization
- [[forms|Forms]] — newsletter signups, contact forms, surveys
- [[blog-setup|Blog setup]] — add a blog section with listings and authors

## Reference

- [[cli|CLI reference]] — all CLI commands and flags
- [[syntax-mode|Syntax mode]] — Markdown vs MDX rendering
- [[config.md|Config overview]] — high-level config guide
- [[debug-mdx-errors|Debugging MDX errors]] — common errors and fixes
- [[home-page|Home page]] — how Flowershow picks which file to show at `/`
- [[debugging-404s|Debugging 404 pages]] — URL-to-file mapping and common fixes
- [[faq|FAQ]]
- [[privacy|Privacy policy]]
- [[terms-of-service|Terms of service]]
```

---

## Task 5: Move blog how-to/tutorial files into guides/

**Step 1: Move all 26 files**

```bash
cd content/flowershow-app
mv blog/how-to-add-edit-this-page-button.md \
   blog/how-to-add-featured-images.md \
   blog/how-to-add-forms.md \
   blog/how-to-add-hero-sections.md \
   blog/how-to-configure-google-analytics.md \
   blog/how-to-configure-navigation-bar.md \
   blog/how-to-configure-page-headers.md \
   blog/how-to-configure-seo-and-social-media-metadata.md \
   blog/how-to-create-author-pages.md \
   blog/how-to-create-content-catalogs.md \
   blog/how-to-customize-style.md \
   blog/how-to-customize-your-footer.md \
   blog/how-to-debug-404-pages.md \
   blog/how-to-enable-page-comments.md \
   blog/how-to-exclude-files-from-publishing.md \
   blog/how-to-publish-blog.md \
   blog/how-to-publish-repository-with-markdown.md \
   blog/how-to-publish-vault-quickly-and-easily.md \
   blog/how-to-publish-vault-with-enveloppe-plugin.md \
   blog/how-to-set-custom-domain.md \
   blog/how-to-set-custom-favicon.md \
   blog/how-to-set-custom-fonts.md \
   blog/how-to-set-page-title.md \
   blog/publish-markdown-from-the-terminal-tutorial.md \
   blog/enhance-markdown-with-styled-jsx-blocks.md \
   blog/turn-obsidian-vault-into-a-blog.md \
   docs/guides/
```

**Step 2: Verify count**

```bash
ls content/flowershow-app/docs/guides/ | wc -l
```
Expected: `26`

---

## Task 6: Write guides/README.md

**Files:**
- Create: `content/flowershow-app/docs/guides/README.md`

```markdown
# Guides

Step-by-step walkthroughs for common tasks.

## Publishing

- [[how-to-publish-vault-quickly-and-easily|Publish your Obsidian vault]]
- [[how-to-publish-vault-with-enveloppe-plugin|Publish with Enveloppe plugin]]
- [[how-to-publish-repository-with-markdown|Publish a GitHub repository]]
- [[publish-markdown-from-the-terminal-tutorial|Publish from the terminal with the CLI]]
- [[how-to-publish-blog|Publish a blog]]
- [[turn-obsidian-vault-into-a-blog|Turn your Obsidian vault into a blog]]

## Site customization

- [[how-to-configure-navigation-bar|Configure the navbar]]
- [[how-to-customize-your-footer|Customize your footer]]
- [[how-to-customize-style|Customize your site with CSS]]
- [[how-to-set-custom-domain|Connect your own domain]]
- [[how-to-set-custom-favicon|Set a custom favicon]]
- [[how-to-set-custom-fonts|Customize fonts]]
- [[how-to-configure-google-analytics|Set up Google Analytics]]
- [[how-to-enable-page-comments|Enable page comments]]

## Page content

- [[how-to-configure-page-headers|Configure page headers]]
- [[how-to-add-hero-sections|Add hero sections]]
- [[how-to-add-featured-images|Add featured images and social previews]]
- [[how-to-set-page-title|Set a page title]]
- [[how-to-configure-seo-and-social-media-metadata|Configure SEO and social metadata]]
- [[how-to-add-edit-this-page-button|Add an "Edit this page" button]]
- [[how-to-add-forms|Add newsletter and subscription forms]]
- [[how-to-create-author-pages|Show authors with links and avatars]]
- [[how-to-create-content-catalogs|Create content catalogs with the List component]]
- [[enhance-markdown-with-styled-jsx-blocks|Enhance pages with styled JSX blocks]]

## Troubleshooting

- [[how-to-debug-404-pages|Debug 404 pages]]
- [[how-to-exclude-files-from-publishing|Exclude files from publishing]]
```

---

## Task 7: Rewrite docs/README.md

**Files:**
- Modify: `content/flowershow-app/docs/README.md`

Replace the entire file with:

```markdown
# Flowershow Docs

Flowershow turns markdown into elegant websites. Docs, blogs, knowledge bases, landing pages — publish from Obsidian, GitHub, or the terminal.

- [[getting-started/README|Getting Started]] — go from zero to a live site in under a minute
- [[reference/README|Reference]] — all config options, features, and CLI commands
- [[guides/README|Guides]] — step-by-step walkthroughs
```

---

## Task 8: Add redirects to config.json

**Files:**
- Modify: `content/flowershow-app/config.json`

Add to the `"redirects"` array. These preserve all existing URLs after the file moves.

**Reference redirects** (44 entries — `/docs/X` → `/docs/reference/X`):

```json
{ "from": "/docs/analytics", "to": "/docs/reference/analytics" },
{ "from": "/docs/blog-setup", "to": "/docs/reference/blog-setup" },
{ "from": "/docs/canvas", "to": "/docs/reference/canvas" },
{ "from": "/docs/cli", "to": "/docs/reference/cli" },
{ "from": "/docs/comments", "to": "/docs/reference/comments" },
{ "from": "/docs/config-file", "to": "/docs/reference/config-file" },
{ "from": "/docs/config", "to": "/docs/reference/config" },
{ "from": "/docs/content-filtering", "to": "/docs/reference/content-filtering" },
{ "from": "/docs/custom-collection-cards", "to": "/docs/reference/custom-collection-cards" },
{ "from": "/docs/custom-domain", "to": "/docs/reference/custom-domain" },
{ "from": "/docs/custom-favicon", "to": "/docs/reference/custom-favicon" },
{ "from": "/docs/custom-fonts", "to": "/docs/reference/custom-fonts" },
{ "from": "/docs/custom-styles", "to": "/docs/reference/custom-styles" },
{ "from": "/docs/dark-mode", "to": "/docs/reference/dark-mode" },
{ "from": "/docs/debug-mdx-errors", "to": "/docs/reference/debug-mdx-errors" },
{ "from": "/docs/debugging-404s", "to": "/docs/reference/debugging-404s" },
{ "from": "/docs/edit-this-page", "to": "/docs/reference/edit-this-page" },
{ "from": "/docs/faq", "to": "/docs/reference/faq" },
{ "from": "/docs/footer", "to": "/docs/reference/footer" },
{ "from": "/docs/forms", "to": "/docs/reference/forms" },
{ "from": "/docs/frontmatter-variables", "to": "/docs/reference/frontmatter-variables" },
{ "from": "/docs/hero-sections", "to": "/docs/reference/hero-sections" },
{ "from": "/docs/home-page", "to": "/docs/reference/home-page" },
{ "from": "/docs/list-component", "to": "/docs/reference/list-component" },
{ "from": "/docs/math", "to": "/docs/reference/math" },
{ "from": "/docs/mermaid", "to": "/docs/reference/mermaid" },
{ "from": "/docs/navbar", "to": "/docs/reference/navbar" },
{ "from": "/docs/page-authors", "to": "/docs/reference/page-authors" },
{ "from": "/docs/page-headers", "to": "/docs/reference/page-headers" },
{ "from": "/docs/page-titles", "to": "/docs/reference/page-titles" },
{ "from": "/docs/password-protection", "to": "/docs/reference/password-protection" },
{ "from": "/docs/privacy", "to": "/docs/reference/privacy" },
{ "from": "/docs/redirects", "to": "/docs/reference/redirects" },
{ "from": "/docs/robots-txt", "to": "/docs/reference/robots-txt" },
{ "from": "/docs/rss-feed", "to": "/docs/reference/rss-feed" },
{ "from": "/docs/seo-social-metadata", "to": "/docs/reference/seo-social-metadata" },
{ "from": "/docs/sidebar", "to": "/docs/reference/sidebar" },
{ "from": "/docs/site-settings", "to": "/docs/reference/site-settings" },
{ "from": "/docs/syntax-mode", "to": "/docs/reference/syntax-mode" },
{ "from": "/docs/syntax", "to": "/docs/reference/syntax" },
{ "from": "/docs/table-of-contents", "to": "/docs/reference/table-of-contents" },
{ "from": "/docs/terms-of-service", "to": "/docs/reference/terms-of-service" },
{ "from": "/docs/themes", "to": "/docs/reference/themes" },
{ "from": "/docs/umami", "to": "/docs/reference/umami" }
```

**Guides redirects** (26 entries — `/blog/X` → `/docs/guides/X`):

```json
{ "from": "/blog/how-to-add-edit-this-page-button", "to": "/docs/guides/how-to-add-edit-this-page-button" },
{ "from": "/blog/how-to-add-featured-images", "to": "/docs/guides/how-to-add-featured-images" },
{ "from": "/blog/how-to-add-forms", "to": "/docs/guides/how-to-add-forms" },
{ "from": "/blog/how-to-add-hero-sections", "to": "/docs/guides/how-to-add-hero-sections" },
{ "from": "/blog/how-to-configure-google-analytics", "to": "/docs/guides/how-to-configure-google-analytics" },
{ "from": "/blog/how-to-configure-navigation-bar", "to": "/docs/guides/how-to-configure-navigation-bar" },
{ "from": "/blog/how-to-configure-page-headers", "to": "/docs/guides/how-to-configure-page-headers" },
{ "from": "/blog/how-to-configure-seo-and-social-media-metadata", "to": "/docs/guides/how-to-configure-seo-and-social-media-metadata" },
{ "from": "/blog/how-to-create-author-pages", "to": "/docs/guides/how-to-create-author-pages" },
{ "from": "/blog/how-to-create-content-catalogs", "to": "/docs/guides/how-to-create-content-catalogs" },
{ "from": "/blog/how-to-customize-style", "to": "/docs/guides/how-to-customize-style" },
{ "from": "/blog/how-to-customize-your-footer", "to": "/docs/guides/how-to-customize-your-footer" },
{ "from": "/blog/how-to-debug-404-pages", "to": "/docs/guides/how-to-debug-404-pages" },
{ "from": "/blog/how-to-enable-page-comments", "to": "/docs/guides/how-to-enable-page-comments" },
{ "from": "/blog/how-to-exclude-files-from-publishing", "to": "/docs/guides/how-to-exclude-files-from-publishing" },
{ "from": "/blog/how-to-publish-blog", "to": "/docs/guides/how-to-publish-blog" },
{ "from": "/blog/how-to-publish-repository-with-markdown", "to": "/docs/guides/how-to-publish-repository-with-markdown" },
{ "from": "/blog/how-to-publish-vault-quickly-and-easily", "to": "/docs/guides/how-to-publish-vault-quickly-and-easily" },
{ "from": "/blog/how-to-publish-vault-with-enveloppe-plugin", "to": "/docs/guides/how-to-publish-vault-with-enveloppe-plugin" },
{ "from": "/blog/how-to-set-custom-domain", "to": "/docs/guides/how-to-set-custom-domain" },
{ "from": "/blog/how-to-set-custom-favicon", "to": "/docs/guides/how-to-set-custom-favicon" },
{ "from": "/blog/how-to-set-custom-fonts", "to": "/docs/guides/how-to-set-custom-fonts" },
{ "from": "/blog/how-to-set-page-title", "to": "/docs/guides/how-to-set-page-title" },
{ "from": "/blog/publish-markdown-from-the-terminal-tutorial", "to": "/docs/guides/publish-markdown-from-the-terminal-tutorial" },
{ "from": "/blog/enhance-markdown-with-styled-jsx-blocks", "to": "/docs/guides/enhance-markdown-with-styled-jsx-blocks" },
{ "from": "/blog/turn-obsidian-vault-into-a-blog", "to": "/docs/guides/turn-obsidian-vault-into-a-blog" }
```

**Step: Apply the edits to config.json**

Open `content/flowershow-app/config.json` and append all 70 redirect entries to the existing `"redirects"` array (before the closing `]`).

**Step: Verify config.json is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('content/flowershow-app/config.json', 'utf8')); console.log('valid')"
```
Expected: `valid`

---

## Task 9: Commit

```bash
git add content/flowershow-app/docs/ content/flowershow-app/blog/ content/flowershow-app/config.json
git commit -m "docs: restructure into getting-started/, reference/, guides/"
```

---

## Verification checklist

After all tasks are done:

- [ ] `docs/` contains only `README.md`, `getting-started/`, `reference/`, `guides/`
- [ ] `docs/getting-started/` has 4 files (README + 3 paths)
- [ ] `docs/reference/` has 44 files + README = 45 files
- [ ] `docs/guides/` has 26 files + README = 27 files
- [ ] `config.json` is valid JSON
- [ ] `config.json` has 70 new redirect entries
- [ ] `blog/` no longer contains any `how-to-*.md` or tutorial files
