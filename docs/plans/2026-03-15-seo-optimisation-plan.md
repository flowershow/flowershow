# SEO Optimisation Plan for flowershow.app

> Status: Draft
> Date: 2026-03-15

## Problem

flowershow.app does not rank on Google for high-intent keywords like "publish markdown", "markdown to website", or "Obsidian Publish alternative" — even after several pages of results. The site is effectively invisible to people searching for exactly the kind of tool Flowershow is.

## Goal

Make flowershow.app rank on page 1 for its core keyword clusters within 3–6 months, starting with the highest-intent, lowest-competition terms and expanding outward.

## Part 1: Keyword Research — What People Search For

### Primary keyword clusters (high intent, directly relevant)

| Cluster | Example queries | Estimated intent |
|---------|----------------|-----------------|
| **Publish Obsidian** | "publish obsidian notes", "obsidian publish alternative", "obsidian to website", "share obsidian vault online", "obsidian publish free alternative" | Very high — people actively looking for alternatives to Obsidian Publish ($8/mo) |
| **Markdown website/blog** | "markdown to website", "publish markdown", "markdown blog", "markdown website builder", "create website from markdown" | High — core generic terms, competitive but high volume |
| **Static site / markdown hosting** | "markdown static site generator", "simple markdown site", "host markdown files as website", "free markdown hosting" | High — more technical audience |
| **Knowledge base / digital garden** | "digital garden tool", "publish knowledge base", "personal wiki online", "second brain website" | Medium-high — growing niche, strong Obsidian/PKM overlap |
| **Documentation site** | "markdown documentation site", "docs from markdown", "documentation website builder" | Medium — competes with GitBook, ReadTheDocs, Docusaurus |
| **No-code website from notes** | "no code markdown website", "publish website without coding", "easiest way to make a website from notes" | Medium — less technical audience, high conversion potential |

### Long-tail terms (lower volume, very high conversion intent)

- "obsidian publish free alternative"
- "publish obsidian vault for free"
- "turn markdown into a website"
- "markdown blog hosting"
- "publish github markdown as website"
- "wiki from markdown files"
- "obsidian notes to blog"
- "markdown to blog"
- "free obsidian publishing"

## Part 2: Current SEO Audit

### What's wrong now

1. **Site title is just "Flowershow"** — a brand name nobody searches for yet. Google needs target keywords in `<title>`.

2. **Homepage title tag ("Markdown to website in seconds")** — decent concept but missing the critical word "publish" and the key verticals (Obsidian, blog, docs) that people actually type.

3. **Meta description** is reasonable ("The fastest way to publish your markdown...") but doesn't cover enough keyword surface area.

4. **Homepage H2s are creative but keyword-empty:**
   - "Everything you need. Nothing you don't." — zero searchable terms
   - "Beautiful by default. Yours to customise." — zero searchable terms
   - "Works however you work" — zero searchable terms
   - "Built for how you actually work" — zero searchable terms
   - Google weights heading text heavily as topic signals. These headings tell Google nothing about what the site does.

5. **Use-case pages exist but are underutilised for SEO.** The pages at `/uses/obsidian`, `/uses/blogs`, `/uses/docs`, `/uses/wikis` should each be a dedicated SEO landing page targeting a specific keyword cluster. Their titles and descriptions likely aren't optimised.

6. **No dedicated "alternative to X" content.** (Covered separately in the competitor comparison content plan.)

### What's working

- The site has good content volume (blog posts, docs, use-case pages).
- The domain has age and some authority.
- 1,400+ users and 1,100+ sites gives social proof for E-E-A-T signals.
- Blog posts like "best blogging platforms for obsidian users" and "turn obsidian vault into a blog" are targeting the right long-tail queries.

## Part 3: Recommended Changes

### 3.1 Homepage metadata

**Title tag** (what appears in Google results and browser tab):

```
Publish Markdown as a Website — Blogs, Docs & Knowledge Bases | Flowershow
```

**Meta description:**

```
Turn markdown files into beautiful websites in seconds. Publish Obsidian vaults, blogs, docs, and knowledge bases — free, no coding required. The best Obsidian Publish alternative.
```

### 3.2 Site-wide title (config.json)

Change `"title": "Flowershow"` to:

```
"title": "Flowershow — Publish Markdown as a Website"
```

This appears as the suffix in browser tabs and is often used in `<title>` across all pages.

### 3.3 Homepage H1

Change from:
> Markdown to website in seconds

To:
> Publish your markdown as a beautiful website

The word "publish" is the critical keyword — it's the verb people type.

### 3.4 Homepage H2s — make them keyword-bearing

| Current H2 | Suggested H2 |
|------------|-------------|
| "Everything you need. Nothing you don't." | "Publish markdown blogs, docs, and knowledge bases" |
| "Beautiful by default. Yours to customise." | "Beautiful markdown website themes" |
| "Works however you work" | "Publish from Obsidian, GitHub, or the command line" |
| "Built for how you actually work" | "The easiest way to publish Obsidian, blogs, and docs" |
| "Publishing rebuilt for the AI age." | "Why markdown publishing needs to be simpler" |
| "Built by people like you" | "Markdown websites built with Flowershow" |
| "Common questions" | "Frequently asked questions about markdown publishing" |

### 3.5 Use-case page optimisation

Each `/uses/*` page should have a tightly targeted title and description:

| Page | Optimised title | Optimised description |
|------|----------------|----------------------|
| `/uses/obsidian` | "Publish Your Obsidian Vault as a Website — Free Obsidian Publish Alternative" | "Turn your Obsidian vault into a live website with wiki links, graph view, and search. The best free alternative to Obsidian Publish." |
| `/uses/blogs` | "Create a Markdown Blog — No Coding Required" | "Publish a beautiful blog from markdown files. Author profiles, comments, search, custom domains. Free to start." |
| `/uses/docs` | "Markdown Documentation Site Builder" | "Turn a folder of markdown files into a searchable documentation website. Sidebar navigation, full-text search, custom domains." |
| `/uses/wikis` | "Build a Wiki from Markdown Files" | "Publish a wiki or knowledge base from plain markdown. Wiki links, search, and navigation — all automatic." |
| `/uses/data-stories` | "Publish Data Stories from Markdown" | "Turn data narratives and analyses into shareable web pages. Charts, tables, and prose — published from markdown." |

### 3.6 Key phrases to weave into body copy

These should appear naturally in homepage body text and subpage content:

- "publish markdown"
- "markdown to website"
- "Obsidian Publish alternative"
- "markdown blog"
- "markdown documentation site"
- "publish Obsidian vault"
- "digital garden"
- "knowledge base from markdown"
- "free markdown hosting"
- "markdown website builder"

---

## Critique & Refinements

The following issues were identified on review. These are incorporated into the implementation plan below.

### C1. Keyword research is speculative, not data-driven

The keyword clusters above are based on domain knowledge, not actual search volume data. Before committing to specific terms, we should:
- Check **Google Search Console** for queries the site already appears for (impressions, CTR, position)
- Use a keyword tool (Ahrefs, Semrush, Ubersuggest, or even Google Keyword Planner) to get volume and difficulty estimates
- Prioritise by **volume x attainability**, not gut feel

This doesn't block the immediate changes (the terms are directionally correct) but should inform the priority order and which pages get the most investment.

### C2. No competitive SERP analysis

Who currently owns page 1 for these terms? If "publish markdown" is dominated by GitHub Pages documentation, the strategy is different than if it's a mix of blog posts and small tools. **Do SERP analysis for the top 10 target terms** to understand what Google rewards for each query (product pages? tutorials? listicles?).

### C3. Over-indexing on homepage, under-indexing on content pages

The homepage will compete for broad terms against massive players and almost certainly lose in the short term. **The real ranking opportunity is in dedicated content pages targeting long-tail terms.** A page targeting "obsidian publish free alternative" can rank within weeks. The homepage competing for "markdown website" could take years.

Priority order should be:
1. Use-case pages (already exist, need optimising)
2. Comparison/alternative pages (high intent, low competition)
3. Blog content targeting long-tail queries
4. Homepage (broad terms, hardest to rank for)

### C4. Some suggested H2s feel keyword-stuffed

"Publish markdown blogs, docs, and knowledge bases" reads like an SEO checklist, not something a human wrote. Google's helpful content system penalises content that feels written for crawlers. **H2s should sound natural with one or two keywords woven in**, not every target term crammed into every heading.

Revised H2 suggestions:

| Current H2 | Revised suggestion |
|------------|-------------------|
| "Everything you need. Nothing you don't." | "Everything you need to publish markdown" |
| "Beautiful by default. Yours to customise." | "Beautiful themes, ready to customise" |
| "Works however you work" | "Publish from Obsidian, GitHub, or the terminal" |
| "Built for how you actually work" | "Blogs, docs, wikis, and Obsidian vaults" |
| "Publishing rebuilt for the AI age." | Keep as-is (this is narrative, not a landing section) |
| "Built by people like you" | "Sites built with Flowershow" |
| "Common questions" | Keep as-is (standard, Google understands it) |

### C5. Missing technical SEO

The plan only covers on-page content. Should also audit:
- **Core Web Vitals / site speed** — does the site pass PageSpeed Insights?
- **Structured data** — FAQPage schema for the FAQ section, SoftwareApplication schema for the product
- **Internal linking** — do blog posts link back to use-case pages and homepage? Do use-case pages cross-link?
- **Sitemap** — is the sitemap submitted and is everything being crawled?
- **Open Graph metadata** — affects social sharing CTR, which indirectly supports SEO

### C6. No measurement plan

Need to define:
- **Baseline**: Record current position for top 20 target terms (most will be "not found")
- **Target**: Top 20 results for 10+ terms within 3 months; page 1 for 5+ terms within 6 months
- **Tracking**: Weekly Google Search Console review; monthly rank check for target terms

### C7. "Obsidian Publish alternative" deserves its own page

This is probably the single highest-ROI keyword cluster. People searching this have purchase intent — they've already decided to pay, they're comparison shopping. Flowershow has a genuine advantage (free tier, no lock-in, custom domains). This deserves a dedicated landing page at `/obsidian-publish-alternative` with a proper feature comparison table, not just a mention in the `/uses/obsidian` title.

### C8. Blog content strategy is absent

The existing blog has exactly the right kind of posts ("best blogging platforms for obsidian users", "turn obsidian vault into a blog"). But the plan doesn't call for more. A systematic content calendar targeting long-tail keywords through blog/tutorial posts is often more effective than homepage tweaks. Each post is a new entry point from Google.

---

## Implementation Plan

### Immediate changes (can do now, no external tools needed)

- [ ] **Homepage title tag**: Change frontmatter `title` to "Publish Markdown as a Website — Blogs, Docs & Knowledge Bases | Flowershow"
- [ ] **Homepage meta description**: Change frontmatter `description` to "Turn markdown files into beautiful websites in seconds. Publish Obsidian vaults, blogs, docs, and knowledge bases — free, no coding required."
- [ ] **Homepage H1**: Change "Markdown to website in seconds" to "Publish your markdown as a beautiful website" (in both frontmatter title display and the `<h1>` in the body)
- [ ] **Homepage H2s**: Update to keyword-bearing but natural-sounding versions (see revised C4 table above)
- [ ] **Site title in config.json**: Change `"title": "Flowershow"` to `"title": "Flowershow — Publish Markdown as a Website"`
- [ ] **Use-case page titles & descriptions**: Update frontmatter for `/uses/obsidian`, `/uses/blogs`, `/uses/docs`, `/uses/wikis`, `/uses/data-stories` per the table in section 3.5
- [ ] **Homepage body copy**: Naturally incorporate key phrases ("publish markdown", "Obsidian Publish alternative", "markdown blog", "knowledge base") into existing descriptive text without rewriting the whole page

### Near-term (next 2–4 weeks)

- [ ] **Google Search Console audit**: Check what queries the site already gets impressions for; identify quick wins where the site is ranking 10–30 (striking distance)
- [ ] **Keyword volume research**: Use Ahrefs/Semrush/Ubersuggest to get actual volume and difficulty for the target terms; reprioritise based on data
- [ ] **SERP analysis**: For top 10 target terms, analyse who ranks on page 1 and what type of content (product page, blog post, listicle, docs) Google favours
- [ ] **Create `/obsidian-publish-alternative` page**: Dedicated comparison page — Flowershow vs Obsidian Publish, feature table, pricing comparison, migration guide
- [ ] **Technical SEO audit**: Run PageSpeed Insights, check Core Web Vitals, verify sitemap is submitted, check for crawl errors
- [ ] **Structured data**: Add FAQPage schema to the homepage FAQ section; consider SoftwareApplication schema
- [ ] **Internal linking audit**: Ensure blog posts link to relevant use-case pages; ensure use-case pages cross-link to each other and to the homepage
- [ ] **Baseline measurement**: Record current Google position for top 20 target terms

### Medium-term (1–3 months)

- [ ] **Comparison content pages**: Execute the competitor comparison content plan (see `2026-02-21-competitor-comparison-content-plan.md`) — Flowershow vs GitBook, vs Notion, vs GitHub Pages, etc.
- [ ] **Blog content calendar**: Plan 2–4 SEO-targeted blog posts per month targeting long-tail keywords:
  - "How to publish your Obsidian vault for free"
  - "Best free alternatives to Obsidian Publish in 2026"
  - "How to create a markdown blog without coding"
  - "Markdown documentation site: the complete guide"
  - "Digital garden tools compared"
  - "How to publish a GitHub repo as a website"
- [ ] **Open Graph / social metadata**: Ensure all key pages have proper OG tags (title, description, image) for social sharing
- [ ] **Expand use-case pages**: Add substantial content to each `/uses/*` page — not just a pitch, but genuinely useful information that answers the searcher's question (tutorials, examples, comparisons)

### Ongoing

- [ ] **Weekly**: Review Google Search Console — track impressions, clicks, average position for target terms
- [ ] **Monthly**: Check rankings for top 20 target terms; adjust strategy based on what's moving
- [ ] **Quarterly**: Reassess keyword targets, review competitor landscape, update comparison content
- [ ] **Continuous**: When writing any new page or blog post, always include target keywords in title, description, H1, and body copy naturally
