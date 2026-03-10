# Flowershow Documentation Improvement Plan

Date: 2026-03-10

## Overall Assessment: 6.5/10

The docs are **reference-heavy but onboarding-light**. Individual feature docs are generally well-written, but there's no clear path for new users, some critical pages are stubs, and tutorial content is fragmented between `/blog` and `/docs`.

---

## Tier 1: Critical Gaps

Pages that are missing or essentially broken:

| Issue | Current State | Impact |
|-------|--------------|--------|
| **GitHub publishing** (`publish-github.md`) | Stub — says "Full documentation coming soon" | High — it's in the main nav |
| **FAQ** (`docs/faq.md`) | 6 lines, one question | High — users expect a real FAQ |
| **Getting Started guide** | Doesn't exist | High — no onboarding path for new users |
| **Drag & Drop publishing** | Linked in nav, unclear if page exists | Medium — nav promises content that may not be there |

## Tier 2: Structural Problems

### 1. Tutorial content fragmented between `/blog` and `/docs`

Many docs README "How-To" links point to blog posts, not docs pages. Examples:
- "Publish an Obsidian Vault" → blog post
- "Configure Page Headers" → blog post
- "Show Authors" → links to non-existent page

Some topics have *both* a blog post and a doc page (e.g., page headers, edit-this-page button). No clear source of truth.

**Decision: Docs are canonical, blog posts are announcements.**

The principle: blog posts are *time-stamped announcements* ("we just shipped X"). Docs are *evergreen reference* ("here's how X works"). Over time, the docs page is the single source of truth.

**Consolidation strategy:**

1. **Docs are canonical** — every feature gets a docs page as the single source of truth
2. **Blog posts link INTO docs** — announcements say "we shipped X! See [the docs](/docs/x) for how to use it" rather than duplicating the tutorial inline
3. **Docs README stops linking to blog posts** — the "How-To" section should link to docs pages only. If a docs page doesn't exist for a topic, that's a gap to fill.
4. **Don't delete old blog posts** — they have SEO value and historical context. Add a note at the top: `> For the latest guide, see [[docs/page-headers|the docs]]`

**Consolidation steps:**

- [ ] Audit which blog "how-to" posts have a corresponding docs page already
- [ ] For those that do: add a redirect note at the top of the blog post pointing to docs
- [ ] For those that don't: create the docs page (pulling content from the blog post)
- [ ] Update `docs/README.md` to only link to docs pages, not blog posts
- [ ] Going forward: new features get a docs page first, blog post is optional announcement

### 2. No onboarding flow

A new user landing on `/docs` sees a flat list. There's no:
- "Start here" guide
- Recommended reading order
- "Your first 5 minutes" walkthrough
- Progression from simple → advanced

**Recommendation:** Create a short Getting Started page with 3 paths:
1. Publish from Obsidian
2. Publish from GitHub
3. Publish from CLI

Each path: 5-step guide ending with a live site.

### 3. Sidebar is a flat alphabetical list

**Blocked on:** [#1189 — feat: support grouped/sectioned sidebar navigation](https://github.com/flowershow/flowershow/issues/1189)

Could be organized into logical groups:

```
Getting Started
  → Quick Start
  → Publishing Methods

Site Configuration
  → Config File, Navbar, Footer, Sidebar, Themes, Custom Styles, Dark Mode

Content & Pages
  → Markdown Syntax, Page Headers, Hero Sections, Table of Contents, SEO

Features
  → Comments, Analytics, Canvas, Obsidian Bases, Math, Mermaid

Reference
  → CLI, Config File Reference, FAQ, Troubleshooting
```

## Tier 3: Thin Docs That Need Expansion

| Doc | Issue | Action |
|-----|-------|--------|
| `analytics.md` + `umami.md` | Two separate pages for analytics providers, `analytics.md` only covers GA4 | **Merge into one `analytics.md` page with sections for Google Analytics and Umami. Delete `umami.md` and add a redirect.** |
| `redirects.md` | 15 lines, only shows basic example, no mention of limitations | **Add a multi-redirect example, note that only exact path matching is supported (no regex/globs), and add a "when to use" note (e.g. after renaming pages).** |
| `table-of-contents.md` | 10 lines, just shows how to toggle on/off | **Add: what heading levels are included, how the TOC is generated, and a screenshot or description of what it looks like. Also fix the JSON syntax (currently shows `showToc: false` without quotes).** |
| `math.md` | Two examples, no reference, typo in description ("equestions") | **Fix the typo, add 3-4 more common examples (fractions, summation, Greek letters), and link to KaTeX supported functions table (already linked but could be more prominent).** |
| `mermaid.md` | Only 2 diagram types, links to external blog post for syntax mode | **Add 1-2 more diagram types (flowchart, pie chart), replace blog link with a docs link to `syntax-mode.md`, and fix the double period at the end.** |

## Tier 4: Quality-of-Life Improvements

- **Docs README links to non-existent pages** — e.g., `how-to-create-author-pages` → **Audit all links in `docs/README.md`, remove or fix broken ones. This overlaps with the blog/docs consolidation in Tier 2.1.**
- **No "last updated" dates** on docs → **Low priority — would require Flowershow platform support for auto-generated dates. Skip for now.**
- **No difficulty level indicators** → **Skip for now — adds maintenance overhead for marginal benefit. Revisit once sidebar grouping (#1189) is implemented, which provides natural progression.**
- **Missing comparison page** for publishing methods (CLI vs GitHub vs Drag & Drop) → **Create a short `docs/publishing-methods.md` with a comparison table (what each method is best for, prerequisites, steps). Link from Getting Started guide.**
- **`contentExclude` references `/docs/self-hosted`** but file doesn't exist → **Remove the stale entry from `config.json` `contentExclude` array. It's harmless but confusing.**

## Tier 5: What's Actually Good

Credit where due — these docs are strong:

- **`syntax.md`** — Comprehensive markdown reference, excellent examples
- **`debug-mdx-errors.md`** — Exceptional troubleshooting guide
- **`navbar.md`** and **`footer.md`** — Complete with config examples
- **`obsidian-bases.md`** — Thorough feature reference
- **`config.md`** — Good overview linking to detailed docs
- **`custom-styles.md`** — Clear CSS variables reference
- **Cross-linking** with wikilinks is consistently done

---

## Recommended Priority Order

### Sprint 1 — Fix the broken things
1. Complete `publish-github.md` (it's in the main nav!)
2. Write a real FAQ (20-30 common questions)
3. Fix broken links in docs README

### Sprint 2 — Onboarding
4. Create a "Getting Started" guide with 3 publishing paths
5. Organize sidebar into logical groups (blocked on [#1189](https://github.com/flowershow/flowershow/issues/1189))
6. Create a publishing methods comparison page

### Sprint 3 — Fill gaps & consolidate blog/docs
7. Expand thin docs (analytics, redirects, TOC, math, mermaid)
8. Blog/docs consolidation (see Tier 2.1 above for full strategy):
   a. Audit blog how-to posts vs existing docs pages
   b. Create missing docs pages from blog tutorial content
   c. Add redirect notes to old blog posts pointing to docs
   d. Update docs README to link only to docs pages
9. Verify drag & drop publishing page exists and is complete

### Sprint 4 — Polish
10. Add difficulty/complexity indicators
11. Add "Related docs" sections at bottom of each page
12. Review all blog-to-docs cross-links
