---
title: "Flowershow vs Obsidian Publish"
description: An honest comparison of Flowershow and Obsidian Publish for publishing your Obsidian vault as a website. Covers pricing, features, customization, and who each tool is best for.
competitor: Obsidian Publish
category: obsidian-publishing
last_reviewed: 2026-03-24
sources:
  - https://obsidian.md/publish
  - https://obsidian.md/pricing
  - https://flowershow.app/pricing
---

Both Flowershow and Obsidian Publish let you turn your Obsidian vault into a website without writing any code. They share a lot of DNA — wikilinks, backlinks, graph views — but they diverge quickly once you look at pricing, flexibility, and who controls your content.

This page is an honest side-by-side. We'll tell you where Flowershow wins, where Obsidian Publish wins, and which one to pick for your situation.

## Who each tool is for

**Obsidian Publish** is built specifically for Obsidian users who want to share their notes with minimal setup. It's a first-party add-on: you publish directly from the Obsidian desktop or mobile app, and Obsidian hosts the result. The experience is tightly integrated but closed — you're locked into Obsidian's infrastructure and publishing workflow.

**Flowershow** is for anyone who writes in Markdown — Obsidian users, GitHub users, terminal users, or teams with automated workflows. It supports all the Obsidian-flavoured syntax (wikilinks, callouts, Mermaid diagrams, LaTeX math) and adds MDX components, multiple publishing paths, and a free tier.

## Quick decision summary

**Choose Flowershow if you:**
- Want a free tier before committing to a paid plan
- Publish from multiple tools or automate publishing via CLI or GitHub Actions
- Need JSX/MDX components for richer page layouts
- Want to avoid vendor lock-in to the Obsidian app
- Need blog-style content with pagination, date sorting, or content catalogs
- Want Tailwind-based custom styling

**Choose Obsidian Publish if you:**
- Already live inside Obsidian and want zero workflow change
- Value the graph view and stacked pages browsing experience
- Need the backlinks panel visible to readers
- Are comfortable paying per site with no free tier

## Side-by-side comparison

| Feature | Flowershow | Obsidian Publish |
|---|---|---|
| **Free tier** | Yes — 1 site, 100 MB, 50k visits/month | No |
| **Paid price** | $5/month or $50/year per site | $8/month (annual) or $10/month per site |
| **Storage** | 100 MB free / 5 GB paid | 4 GB |
| **Custom domain** | Paid plan | Yes |
| **Obsidian wikilinks** | Yes | Yes |
| **Backlinks** | No (wikilinks resolve, not shown to readers) | Yes — visible to readers |
| **Graph view** | No | Yes |
| **Full-text search** | Paid plan | Yes |
| **MDX / JSX components** | Yes | No |
| **Themes** | 4 built-in + custom CSS/Tailwind | Custom CSS/JS |
| **Publish from Obsidian** | Via plugin | Yes (first-party) |
| **Publish via CLI** | Yes | No |
| **GitHub auto-sync** | Yes | No |
| **Drag-and-drop upload** | Yes | No |
| **Password protection** | No | Yes |
| **Analytics** | Via JS injection | Via JS injection |
| **Hosting** | Flowershow cloud | Obsidian cloud |
| **Self-hosting** | No | No |
| **Mermaid diagrams** | Yes | Yes |
| **LaTeX / Math** | Yes | Yes |
| **Callout blocks** | Yes | Yes |
| **Content catalogs / blog lists** | Yes (List component) | No |

*Pricing and features last reviewed: 2026-03-24. Sources: [obsidian.md/publish](https://obsidian.md/publish), [obsidian.md/pricing](https://obsidian.md/pricing), [flowershow.app/pricing](https://flowershow.app/pricing).*

## Detailed breakdown

### Pricing

Flowershow has a permanent free tier — one site with 100 MB storage and 50,000 monthly visits. No credit card required, no time limit. The paid plan is $5/month (or $50/year), which unlocks custom domains, full-text search, 5 GB storage, and 500k monthly visits.

Obsidian Publish has no free tier. It costs $8/month on annual billing or $10/month on monthly billing, per site. You also need an Obsidian account. If you want to evaluate before paying, you can't.

### Publishing workflow

Obsidian Publish is built into the Obsidian app. You select notes to publish and click sync — that's it. It works from Obsidian desktop and mobile. The trade-off is that publishing is always manual and always requires the Obsidian app.

Flowershow supports four publishing paths: the in-app Obsidian plugin, GitHub auto-sync, drag-and-drop file upload, and a CLI tool. The CLI and GitHub sync are particularly useful for teams, automated pipelines, or users who prefer not to keep Obsidian open.

### Obsidian-specific features

Obsidian Publish renders backlinks, graph view, hover previews, and stacked-page browsing for your readers — features that make your note network visible and navigable. If the interconnected, non-linear nature of your vault is central to the experience you want to publish, these are hard to replicate elsewhere.

Flowershow resolves wikilinks and renders Obsidian-flavoured callouts, Mermaid diagrams, and LaTeX, but it does not expose backlinks, graph views, or hover previews to readers. The reading experience is more like a standard website.

### Customization and components

Obsidian Publish allows custom CSS and JavaScript injection. This gives you significant control over appearance, but you're working around a fixed template — there's no component model.

Flowershow supports MDX, meaning you can embed custom JSX components directly in your markdown pages. It ships four themes (LessFlowery, Letterpress, Superstack, Leaf) and full Tailwind support for custom layouts. If you want to build content catalogs, card grids, or interactive layouts in your pages, Flowershow's component system makes this possible without a separate codebase.

### Content organization

Obsidian Publish focuses on note-graph publishing. There is no built-in way to create a blog-style list of posts sorted by date or paginated content catalogs.

Flowershow has a `List` component that auto-generates catalogs from any directory — useful for blogs, changelogs, portfolio pages, or documentation indexes. Combined with MDX, this makes Flowershow more capable as a content platform rather than purely a note-publishing tool.

## Where Flowershow is stronger

- **Free to start** — no commitment required before you see your site live
- **More publishing paths** — CLI, GitHub sync, and drag-and-drop alongside the Obsidian plugin
- **MDX and components** — richer page layouts beyond prose and tables
- **Blog and content catalog support** — sortable, paginated content lists
- **Lower paid price** — $5/month vs $8/month for equivalent functionality
- **Editor-agnostic** — works with any Markdown source, not just Obsidian

## Where Obsidian Publish is stronger

- **Graph view and backlinks exposed to readers** — the note-network experience is native and polished
- **Tighter Obsidian integration** — publish from within the app with no separate tooling
- **Password protection** — per-site password access control built in
- **Hover previews** — readers can hover over links to preview note contents
- **Stacked pages** — a unique browsing mode not available in Flowershow

## Migrating from Obsidian Publish to Flowershow

Your content stays in Markdown — there's nothing to convert. Because Flowershow supports Obsidian-flavoured syntax, your wikilinks, callouts, and Mermaid diagrams will render correctly without changes.

**Steps:**

1. **Sign up** for a free Flowershow account at [flowershow.app](https://flowershow.app)
2. **Connect your vault** — use the Obsidian plugin, drag-and-drop your vault folder, or push your vault to GitHub and connect the repo
3. **Review your site** — wikilinks and Obsidian syntax render automatically; check any custom CSS you had in Obsidian Publish and port it to Flowershow's custom CSS or Tailwind system
4. **Set your custom domain** (paid plan) — update your DNS records to point to Flowershow's servers
5. **Redirect old URLs** if needed — use Flowershow's redirect configuration to preserve any external links to your published notes

No data migration tooling is needed. Your Markdown files are the source of truth throughout.

## FAQ

**Does Flowershow support Obsidian wikilinks?**
Yes. Flowershow resolves `[[Note Title]]` and `[[Note Title|display text]]` links, including links with anchors and embeds for images. The syntax you already use in Obsidian works as-is.

**Will my callouts, Mermaid diagrams, and math render in Flowershow?**
Yes to all three. Flowershow supports Obsidian-style callouts (`> [!note]`, `> [!warning]`, etc.), Mermaid diagram code blocks, and LaTeX math via `$inline$` and `$$block$$` syntax.

**Does Flowershow show a graph view of my notes?**
Not currently. If the graph view is central to your publishing intent, Obsidian Publish is the better choice.

**Can I publish only selected notes, like Obsidian Publish lets me?**
Flowershow publishes a directory (or your full vault). You can exclude specific files or folders using the `contentExclude` setting in your site config. See [[config|configuration docs]].

**Is there a free trial for Obsidian Publish?**
Obsidian Publish does not have a free tier, but it offers a 7-day refund policy. Flowershow has a permanent free tier with no time limit.

**What happens if I want to switch back to Obsidian Publish?**
Your Markdown files are unchanged — Flowershow never modifies your source content. You can re-publish from Obsidian Publish at any time.

## Try Flowershow

You can publish your first site for free in minutes — no credit card, no setup beyond uploading your files.

[Get started free →](https://flowershow.app)

---

*Last reviewed: 2026-03-24 · [Suggest a correction](https://github.com/flowershow/flowershow/issues)*
