# Brief: plan the "websites" use-case pages (websites v2, product sites, changelogs)

You are a planning sub-session started from Rufus's Flowershow work. Rufus is the founder. Your job is a **plan, not a build**: page outlines and copy direction that Rufus can approve, then another session builds them. Write the plan to `docs/plans/2026-11-21-website-use-cases-plan.md`.

## Rufus's ask (21 Nov, voice note, lightly edited)

A first `/uses/websites` page went live today (`content/flowershow-app/uses/websites.md`, commit d34dddc3). Rufus: "decent, but":

- **It's not just Markdown.** "Your website, written in Markdown" undersells it. You build in Markdown *and* HTML: HTML inside Markdown, whole bespoke `.html` pages, your own CSS, custom `<head>` code, custom navbar and footer, custom heroes. You can even upload Word documents and PDFs and they become pages. Say "Markdown and HTML".
- **Show the sheer range of website features.** Mine the docs, changelog and Beads backlog for everything that helps build a website, and make the page show it.
- **A ladder, maybe as a step diagram.** Step 1: a beautiful page from one Markdown file in seconds (a landing page or home page that already looks good). Then customise in several directions: build your own hero, change the navbar, add a blog, add a docs or knowledge-base section, and so on, up to a whole site. Rufus also sees explainer videos here eventually; plan where they'd go, don't make them.
- **Possibly a second use case: product or multi-purpose websites.** "I'm launching a product: I want a landing page, a pricing page, docs, a blog, a changelog." Flowershow does all of these. Decide whether this is its own use-case page, a section of the websites page, or a blog post / tutorial. Recommend one.
- **A changelog use case.** Changelogs work well out of the box (`docs/reference/changelog.md`), and deserve their own use-case landing page.

Rufus's message was cut off at the end ("I think there's also…"); flag anything you think is missing and the coordinator will check with him.

## What to read

- The live page and its siblings: `content/flowershow-app/uses/*.md` (blogs, wikis, docs, digital-gardens, data-stories) and the shared landing kit in `content/flowershow-app/custom.css`. New pages should reuse the kit.
- Feature docs: `content/flowershow-app/docs/reference/` (hero-sections, navbar, footer, custom-styles, custom-head, page-scripts, site-layouts, listings, home-page, supported-file-types, changelog, themes, seo-social-metadata, custom-domain, redirects, forms, …) and `content/flowershow-app/docs/guides/`.
- Recent changelog: `content/flowershow-app/changelog/`. Backlog: `bd list` / `bd search`.
- Premium vs free: `content/flowershow-app/pricing.md`. Label Premium features honestly (custom domain, custom navbar/footer HTML, custom social images, search are Premium).
- House rules: `AGENTS.md` (changelog and docs rules), memory: few named choices over options and switches.
- Showcase sites Rufus approved: developmentalspaces.org, lifeitself.org, sutras.lifeitself.org (websites); erikhaines.org/integral-facticity (blogs). flowershow.app itself is a good dogfood example of a product site (landing, pricing, docs, blog, changelog).

## Deliverable

`docs/plans/2026-11-21-website-use-cases-plan.md` with:

1. A **feature inventory** for building websites: feature, one line, free or Premium, docs link. Grouped (look and layout, structure and navigation, content types, publishing, reach).
2. **Recommendation on page split**: which use-case pages (websites v2, product sites, changelogs) and why; what goes in Use Cases nav.
3. For each page: an **outline** section by section, the headline and lede (2 options each, one recommended), the ladder / step diagram for websites, showcase sites, and what screenshots, mockups or video slots each needs.
4. **Open questions for Rufus**, each with a recommendation.

Done when: the plan file is committed to `main` and a short summary is returned to the coordinator. Do not edit the live pages.
