---
title: Search Audit
description: Findings from testing the built-in site search across Flowershow features and documentation pages.
date: 2026-04-07
---

## How search works

Flowershow uses full-text search backed by a static index (`/search.json`). Results depend on whether query terms appear verbatim in indexed page content. There is no semantic or fuzzy matching.

## Results by feature area

### Well-covered (natural queries work reliably)

| Feature | Dedicated page | Sample queries that work |
|---|---|---|
| Mermaid diagrams | /docs/mermaid | "mermaid", "diagram", "sequence diagram" |
| Custom CSS | /docs/custom-styles | "css", "custom styles", "color variable" |
| Syntax mode / MDX | /docs/syntax-mode | "mdx", "syntax mode", "markdown mode" |
| Themes | /docs/themes | "theme", "letterpress", "superstack" |
| Comments / Giscus | /docs/comments | "comments", "giscus", "github comments" |
| Password protection | /docs/password-protection | "password", "password protection" |
| Custom domain | /docs/custom-domain | "custom domain", "domain" |
| Analytics / Umami | /docs/umami, /docs/analytics | "analytics", "umami", "google analytics" |
| Blog setup | /docs/blog-setup | "blog", "blog setup" |
| Sidebar navigation | /docs/sidebar | "sidebar", "navigation" |

### Findable but fragile

These features have dedicated pages but fail for some natural query phrasings:

| Feature | Fails for | Why |
|---|---|---|
| Mermaid diagrams | "flowchart", "graph" | Those terms don't appear in the page body |
| Dark mode | "night mode", "dark theme" | Page uses "dark mode" exclusively |
| Password protection | "private site", "private page", "lock" | No synonym coverage |

### Significant discoverability gaps

**Copy button on code blocks**
- No dedicated page. Only mentioned in the FAQ entry added recently.
- Queries like "copy code", "clipboard", "copy button" return nothing or only the FAQ.
- Recommendation: add synonym terms to the FAQ entry body, or promote to a standalone page.

**Wikilinks / Obsidian links**
- Buried 400+ lines into `syntax.md` with no dedicated page.
- Queries like "wikilink", "obsidian link", "internal link" may not surface it reliably.
- Recommendation: create a `/docs/wikilinks` page or ensure the syntax page is indexed with those terms.

**Frontmatter**
- No hub page. Information is scattered across `config-file.md`, `page-titles.md`, `page-authors.md`, `seo-social-metadata.md`, and `frontmatter-in-mdx.md`.
- Queries like "YAML header", "page metadata", "frontmatter fields" may not find a single useful result.
- Recommendation: create a `/docs/frontmatter` reference hub linking to the relevant pages.

## Summary

| Category | Count |
|---|---|
| Features with reliable search coverage | 10 |
| Features findable but fragile | 3 |
| Features with significant discoverability gaps | 3 |

## Recommendations

1. Add synonym terms to existing pages where natural language queries fail — e.g. add "flowchart", "graph" to `mermaid.md`; add "night mode" to `dark-mode.md`; add "private" to `password-protection.md`.
2. Create a `/docs/frontmatter` hub page consolidating all frontmatter field references.
3. Create a `/docs/wikilinks` page or extract the wikilink section from `syntax.md` into its own page.
4. Add more descriptive body text to the copy button FAQ entry so it is indexed under more query terms.
