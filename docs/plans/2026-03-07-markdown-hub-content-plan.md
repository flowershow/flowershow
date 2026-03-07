# Markdown Hub Content Plan

Status: Draft
Date: 2026-03-07
Location: `flowershow.app/markdown` (content in `content/flowershow-app/markdown/`)

## Vision

A Markdown knowledge hub on flowershow.app with three pillars:

1. **Landing page** — "Why Markdown is awesome" manifesto/explainer
2. **Learn** — Tutorials that take people from zero to building markdown-based sites, docs, knowledge bases
3. **Knowledge base** — Quick-add reference articles, tool reviews, clippings, news, and tips ("Markdown in Google Docs", "Markdown for Apple Notes", etc.)

## Proposed Structure

```
/markdown/
  index.md                  # Landing page: Why Markdown is Awesome
  /learn/
    index.md                # Tutorial series overview (current introduction.md)
    background.md           # What is Markdown, why use it, the MOGF stack
    tutorial-1.md           # Create a website from scratch
    tutorial-2.md           # Edit your site locally with Obsidian
    tutorial-3.md           # Collaborate with others (WIP)
    tutorial-4.md           # Customize and preview locally (WIP)
    /howtos/                # Short how-to guides
      ...existing howtos...
    /tutorials/             # Full expanded tutorial content
      ...existing...
    /assets/
  /kb/                      # Knowledge base — flat structure, easy to add to
    index.md                # KB overview / browsable index
    google-docs.md          # Merged: How to use + export notes
    apple-notes.md          # Markdown for Apple Notes (ProNotes)
    ipad-notes.md           # iPad Notes markdown import/export
    into-md.md              # into.md web converter
    turndown.md             # HTML-to-Markdown JS library
    markdoc.md              # Markdoc (needs expanding)
    ai-editing.md           # Using AI (Claude Code, Codex) with Obsidian
    cursor-obsidian.md      # Using Cursor with Obsidian
    identifiers.md          # Pandoc heading identifiers
    ...future articles...
```

## Important: Titles when slugifying filenames

When renaming files to URL-friendly slugs (e.g. `How to use Markdown in Google Docs.md` -> `google-docs.md`), check the file has either a `title` in frontmatter or an `# H1` heading. If neither exists, add `title` frontmatter with the original human-readable name.

## What to do with existing content

### Keep as-is (good quality)
- `learn/background.md` — solid explainer
- `learn/tutorial-1.md` — complete tutorial
- `learn/tutorial-2.md` — complete tutorial
- `learn/howtos/*` — all useful

### Keep and relocate
| Current file | Move to | Notes |
|---|---|---|
| `How to use Markdown in Google Docs.md` | `kb/google-docs.md` | Primary article; merge in relevant bits from `google-docs-and-markdown.md` |
| `google-docs-and-markdown.md` | (merge into above) | The anchor links / image export notes are interesting addenda |
| `Markdown for Apple Notes.md` | `kb/apple-notes.md` | Good as-is |
| `2025-06-09 iPad Notes...md` | `kb/ipad-notes.md` | Short but worth keeping; could expand |
| `Using AI to edit markdown notes...md` | `kb/ai-editing.md` | Needs writing up into a proper short article |
| `using-cursor-with-obsidian.md` | `kb/cursor-obsidian.md` | Needs expanding beyond a bare link |
| `Markdoc.md` | `kb/markdoc.md` | Needs expanding |
| `syntax/Identifiers.md` | `kb/identifiers.md` | Good as-is |
| `clippings/Convert any page into markdown.md` | `kb/into-md.md` | Clean up, summarize |
| `clippings/turndown...md` | `kb/turndown.md` | Trim to summary + link (currently full README) |

### Rewrite
| File | Action |
|---|---|
| `index.md` | Complete rewrite as "Why Markdown is Awesome" landing page (pillar 1). Current tutorial overview moves to `learn/index.md` |
| `why-markdown.md` | Delete — its intent gets absorbed into the new `index.md` landing page |
| `learn/introduction.md` | Becomes `learn/index.md` (the tutorial series overview) |

### Delete
- `why-markdown.md` — stub, replaced by new landing page
- `into.md-20251019.png` — move to assets or keep alongside the article

## Landing Page Outline (index.md rewrite)

The landing page should cover:

1. **Hero**: Markdown is the universal language of the web. You already use it (GitHub, Reddit, Slack, Discord, ChatGPT...).
2. **Why Markdown**: Simple, portable, future-proof, AI-friendly, everywhere. (Draw from `background.md` but punchier, less academic)
3. **The Markdown ecosystem is growing**: Google Docs added markdown. Apple Notes added markdown. AI tools output markdown. The world is converging on markdown.
4. **What you can do with it**: Build websites, knowledge bases, documentation, blogs — all from plain text files you own.
5. **CTA sections**:
   - "New to Markdown?" -> `/markdown/learn/`
   - "Already use Markdown?" -> `/markdown/kb/` (tips, tools, workflows)
   - "Want to publish?" -> FlowerShow (natural product funnel)

## Knowledge Base Design Principles

The `/kb/` section should be optimized for:
- **Low friction adding**: Drop in a clipping, a link, a quick note. Not everything needs to be a polished article.
- **Browsable**: use tags or frontmatter to categorize (apps, tools, workflows, syntax) rather than subdirectories
- **SEO-friendly**: Each article targets a specific search query ("markdown in google docs", "markdown apple notes", etc.)
- **Living content**: Articles can start small and grow over time

## Priorities

### Phase 1: Structure & Landing Page
1. Reorganize files into the new structure
2. Rewrite `index.md` as the landing page
3. Create `learn/index.md` from current `introduction.md`
4. Create `kb/index.md` as a simple browsable directory

### Phase 2: Clean Up Existing Content
5. Merge Google Docs articles
6. Trim turndown clipping to a summary
7. Expand thin articles (Markdoc, Cursor+Obsidian, AI editing) into short but useful pieces

### Phase 3: New Content
8. Finish tutorials 3 & 4
9. Add more KB articles (target high-search-volume markdown queries)
10. Add a syntax reference section
