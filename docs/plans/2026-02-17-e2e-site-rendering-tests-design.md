# E2E Site Rendering Tests — Design

**Date:** 2026-02-17
**Status:** Approved
**Branch:** e2e-tests-rewrite

## Context

The previous E2E test suite was deleted (commit `7435048d`) to make way for a rewrite. The old tests used a git submodule for fixtures and Inngest-based seeding. This design replaces that with a simpler, more maintainable approach focused exclusively on site rendering (no dashboard tests).

## Decisions

- **Seed method:** Direct R2 (MinIO) upload + Prisma DB records. No Inngest processing — frontmatter is parsed at seed time with `gray-matter`.
- **Fixtures:** Local in-repo at `apps/flowershow/e2e/fixtures/`. No git submodule.
- **Scope:** Core rendering features first (~8 spec files). Wiki-links, embeds, MDX components, math, mermaid deferred to later milestones.
- **Server:** Dev server via Docker Compose (`pnpm dev:up`). Tests assume services are already running.
- **Site tiers:** One free site only. Premium features deferred.

## Architecture

```
apps/flowershow/e2e/
├── fixtures/
│   ├── config.json              # Site config (nav, footer, sidebar)
│   ├── index.md                 # Home page
│   ├── basic-syntax.md          # Headings, bold, italic, lists, blockquotes
│   ├── links.md                 # Standard markdown links
│   ├── images.md                # Markdown images
│   ├── code-blocks.md           # Fenced + inline code
│   ├── tables.md                # GFM tables
│   ├── frontmatter.md           # Title, description, date, authors, image
│   └── assets/
│       ├── image.jpg
│       └── sample.png
├── global-setup.ts              # Prisma upsert + MinIO upload
├── global-teardown.ts           # Delete test user (cascades)
├── playwright.config.ts
├── helpers/
│   ├── seed.ts                  # DB + R2 seeding logic
│   └── decode-image-src.ts      # Next.js Image URL decoder
└── specs/
    ├── basic-rendering.spec.ts
    ├── links.spec.ts
    ├── images.spec.ts
    ├── code-blocks.spec.ts
    ├── tables.spec.ts
    ├── frontmatter.spec.ts
    ├── layout.spec.ts
    └── not-found.spec.ts
```

## Seed Strategy (global-setup.ts)

1. **Prisma:** Upsert test User, create Site with known `siteId`/`projectName`
2. **MinIO (S3 client):** Upload each fixture file to `{siteId}/main/raw/{path}`
3. **Prisma:** Create Blob records with pre-computed metadata (parsed via `gray-matter`): title, description, extension, syncStatus=SUCCESS, appPath, path
4. **Output:** Write `e2e/test-env.json` with `{ siteId, siteName, userName, baseUrl }`

## URL Access

Tests hit `http://my.localhost:3000/@{testUser}/{testProject}/{slug}`.

The Next.js middleware rewrites `my.localhost:3000` requests to the `(public)/site/[user]/[project]/[[...slug]]` route.

## Spec Coverage

| Spec | What it tests |
|------|---------------|
| `basic-rendering` | h1-h6, paragraphs, bold/italic/strikethrough, ordered/unordered lists, blockquotes, horizontal rules |
| `links` | Internal links resolve correctly, external links have proper attributes, anchor links |
| `images` | Images render with correct src via Next.js Image, alt text present |
| `code-blocks` | Fenced blocks have syntax highlighting (Prism classes), inline code styled |
| `tables` | GFM tables render as HTML `<table>` with correct structure |
| `frontmatter` | Page title from frontmatter, `<meta>` description, blog layout fields (date, authors) |
| `layout` | Nav links from config.json, sidebar file tree, footer |
| `not-found` | Non-existent slug returns 404 page |

## Out of Scope (future milestones)

- Wiki-links (`[[page]]` syntax)
- Embeds (audio, video, PDF, CSV, image embeds)
- MDX-specific features (custom components, JSX blocks)
- Math (KaTeX)
- Mermaid diagrams
- Callouts
- Meta tags / OpenGraph
- Sitemap
- Search
- Premium site features / custom domains
- Dashboard tests
