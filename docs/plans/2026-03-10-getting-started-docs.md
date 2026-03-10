# Getting Started Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Getting Started guide and redesign the docs README so new users can go from "I have content" to "I have a live site" in under 2 minutes of reading.

**Architecture:** Two files: a new `docs/getting-started.md` with 3 publishing paths (Obsidian, GitHub, CLI), and a rewritten `docs/README.md` that leads with those paths instead of a wall of links. Plain markdown, no JSX components. Follow the Tier 0 north star: result first, one page one job, AI-agent friendly.

**Tech Stack:** Markdown content only. No code changes.

---

### Task 1: Create `docs/getting-started.md`

**Files:**
- Create: `content/flowershow-app/docs/getting-started.md`

**Step 1: Write the file**

Create `content/flowershow-app/docs/getting-started.md` with the following content. Key principles:
- Hero enabled for visual consistency with other docs
- Three clear paths, each self-contained
- Config snippet first in each path
- No path requires reading another page to get a result

```markdown
---
title: Getting Started
description: Go from markdown files to a live website in under a minute.
showHero: true
---

Pick the method that fits how you work.

## From Obsidian

Publish directly from your vault — no GitHub account needed.

1. Open **Settings > Community Plugins**, search "Flowershow", install and enable it
2. Sign up at [cloud.flowershow.app](https://cloud.flowershow.app/)
3. Go to [cloud.flowershow.app/tokens](https://cloud.flowershow.app/tokens) and create a Personal Access Token
4. In Obsidian, open **Flowershow plugin settings** and paste your token
5. Click the Flowershow icon in the sidebar, select your notes, and publish

Your site is live at `your-name.flowershow.app`.

## From GitHub

Push to a repo, your site updates automatically.

1. Log in at [cloud.flowershow.app](https://cloud.flowershow.app/) with your GitHub account
2. Go to [cloud.flowershow.app/new](https://cloud.flowershow.app/new)
3. Select your markdown repository
4. Click **Create Website**

Your site builds and syncs on every push. Make sure you have a `README.md` or `index.md` at the root (or in the subfolder you choose).

> [!tip]
> Use the [Flowershow template](https://github.com/new?template_owner=flowershow&template_name=flowershow-cloud-template) to start a new repo with the right structure.

## From the Terminal (CLI)

Publish any folder of markdown. No repo required.

1. Install: `npm i -g @flowershow/publish`
2. Log in: `publish auth login`
3. Publish: `publish ./my-folder`
4. Update later: `publish sync ./my-folder`

See [[cli|CLI reference]] for all commands and options.

## What's next?

Once your site is live:

- [[themes|Choose a theme]] to change the look
- [[navbar|Configure your navbar]] with links and dropdowns
- [[custom-styles|Customize colors and fonts]] with CSS variables
- [[config-file|Explore all config options]] in `config.json`
```

**Step 2: Verify the file**

Open the file and confirm:
- [ ] Frontmatter has title, description, showHero
- [ ] Three paths are self-contained (no required cross-page reading)
- [ ] First actionable step appears within 3 lines of each section
- [ ] All links use wikilink syntax for internal pages
- [ ] External URLs are full https links

**Step 3: Commit**

```bash
git add content/flowershow-app/docs/getting-started.md
git commit -m "docs: add getting started guide with 3 publishing paths"
```

---

### Task 2: Redesign `docs/README.md`

**Files:**
- Modify: `content/flowershow-app/docs/README.md`

**Step 1: Rewrite the file**

Replace the entire contents of `content/flowershow-app/docs/README.md`. The current version has a 20+ item how-to list with many links pointing to blog posts or non-existent pages. The new version leads with the getting-started paths and provides a compact reference index.

```markdown
# Flowershow Docs

Flowershow turns markdown into elegant websites. Docs, blogs, knowledge bases, landing pages — publish from Obsidian, GitHub, or the terminal.

## Start here

**[[getting-started|Getting Started]]** — go from markdown files to a live site in under a minute.

Three ways to publish:
- **[[getting-started#From Obsidian|From Obsidian]]** — publish directly from your vault
- **[[getting-started#From GitHub|From GitHub]]** — auto-sync a repo to your site
- **[[getting-started#From the Terminal (CLI)|From the CLI]]** — publish any folder, no repo needed

## Configure your site

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
- [[redirects|URL redirects]] — redirect old URLs to new ones

## Page content

- [[syntax|Markdown syntax]] — full syntax reference
- [[page-headers|Page headers]] — titles, descriptions, images
- [[page-authors|Page authors]] — author attribution
- [[page-titles|Page titles]] — how titles are resolved
- [[hero-sections|Hero sections]] — full-width banners
- [[seo-social-metadata|SEO and social metadata]] — Open Graph, Twitter cards
- [[table-of-contents|Table of contents]] — per-page TOC
- [[math|Math equations]] — LaTeX with KaTeX
- [[mermaid|Mermaid diagrams]] — flowcharts and sequence diagrams
- [[canvas|Canvas]] — Obsidian Canvas support
- [[obsidian-bases|Obsidian Bases]] — database views
- [[list-component|List component]] — content catalogs

## Reference

- [[cli|CLI reference]] — all CLI commands
- [[syntax-mode|Syntax mode]] — Markdown vs MDX rendering
- [[debug-mdx-errors|Debugging MDX errors]] — common errors and fixes
- [[faq|FAQ]]
```

**Step 2: Review changes**

Confirm:
- [ ] No links to blog posts — all links point to docs pages
- [ ] No links to non-existent pages (removed `how-to-create-author-pages` etc.)
- [ ] Removed the 🚧 placeholder item
- [ ] "Start here" section is the first thing a reader sees
- [ ] Reference section is a clean, scannable list — no prose filler
- [ ] All wikilinks resolve to files that exist in `content/flowershow-app/docs/`

**Step 3: Commit**

```bash
git add content/flowershow-app/docs/README.md
git commit -m "docs: redesign docs README with getting-started-first structure"
```

---

### Task 3: Update config.json nav to include Getting Started

**Files:**
- Modify: `content/flowershow-app/config.json`

**Step 1: Check if Getting Started should be in the nav**

The current "Docs" nav link points to `/docs` which renders `docs/README.md`. Since the README now leads with Getting Started, no nav change is strictly needed — users landing on `/docs` will see the right thing.

However, consider whether a direct "Getting Started" link should be added. This is optional and depends on product preference — skip if the README redesign is sufficient.

**Step 2: Commit (if changes made)**

```bash
git add content/flowershow-app/config.json
git commit -m "docs: add getting started link to navbar"
```

---

### Task 4: Final review

**Step 1: Check all internal links resolve**

Run a search for every wikilink in both files and confirm the target file exists:

```bash
# Extract wikilinks from both files and check each one
grep -oP '\[\[([^|#\]]+)' content/flowershow-app/docs/getting-started.md content/flowershow-app/docs/README.md
```

For each extracted link (e.g. `cli`, `themes`, `navbar`), confirm a matching `.md` file exists in `content/flowershow-app/docs/`.

**Step 2: Read both files end-to-end**

Apply the north star test to each page:
- Can a new user go from "I want X" to a working result in under 60 seconds?
- Does the page open with the result, not the explanation?
- Is every link to an existing page?

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "docs: fix links and polish getting started docs"
```
