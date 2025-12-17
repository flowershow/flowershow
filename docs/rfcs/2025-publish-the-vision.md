---
created: 2025-12-18
---

# Publish - the Vision

The document sets out a broader product vision (`publish`) that frames how FlowerShow could evolve toward a publish-first, low-friction experience for content and data. This doc started as start from zero reflection ignoring where FlowerShow is today.

A second concrete RFC [2025-publish-directly-mvp.md] proposes a narrowly scoped MVP implementing one small, testable step in that direction.

The vision document explains why this direction matters; the RFC defines what we would actually build now.

# Executive Summary

## Introduction

### Starting point: what I actually want to use

This inquiry began with a simple, personal question: *what do I most want to use when I want to publish something to the web?* The answer was not “a CMS,” “a Git repo,” or “a build pipeline,” but something much simpler: take a file or folder I already have, run a command or drop it somewhere, and immediately get a clean public URL that looks good and is easy to share. That experience still does not really exist for content, even though it exists for code.

### The core insight

Vercel (formerly Now) radically simplified application deployment by making “deploy” a fast, default action rather than a complex process. What is missing is the equivalent move for *content*.

The proposal is to apply **deploy-level speed, simplicity, and ergonomics to publishing files and folders**, not applications.

### The essence of the product idea

At its core, this is a Markdown-first (but not Markdown-only) publishing experience where:

* A single file or folder becomes a live website in seconds.  
* Publishing is faster than sharing via Google Drive or email.  
* The default result looks intentional and readable, not raw or hacked together.  
* Raw files are stored openly; rendering happens on top.  
* Complexity (config, presets, Git, versions) is optional and comes later.

Conceptually: *Vercel for content*.

### The minimal user experience

The primitive is extremely small:

* Point at a local file or folder (CLI or drag-and-drop).  
* Something uploads it to storage.  
* A rendering pipeline runs.  
* You get a public URL almost immediately.

No Git. No repo setup. No CMS decisions. No configuration required.

Everything else is downstream.

## Why this matters for FlowerShow specifically

At present, FlowerShow already works well for people who are willing to use GitHub and Git. The problem is that GitHub and Git are acting as **hard gates**:

* “Sign in with GitHub” filters out many otherwise ideal users.  
* Git is cognitively heavy and hostile to assets and casual publishing.  
* Markdown plus Git narrows the audience more than necessary.

As a result, many people never experience FlowerShow’s value at all.

### This is not a new product; it is an evolution

What is being proposed is not a replacement for FlowerShow, but its missing front door.

* FlowerShow remains the publishing and rendering engine.  
* GitHub becomes one ingestion path, not the default.  
* Direct upload to storage becomes the simplest path.  
* Markdown remains central internally, but is no longer an upfront requirement.

This lowers activation energy dramatically while preserving FlowerShow’s values: simplicity, openness, and speed.

### Strategic effect

This evolution:

* Opens FlowerShow to writers, researchers, educators, NGOs, and Obsidian users.  
* Makes assets (images, PDFs, datasets, folders) first-class citizens.  
* Aligns the experience with the brand promise of simplicity and speed.  
* Creates a natural progression: casual publish → structured site → config → Git.

Most importantly, it lets far more people experience the “aha” before asking them to commit.

## Bottom line

The proposal distills to this:

Publishing content to the public web should be as fast and effortless as deploying code became after Vercel.

This work is about making that experience real, and using it to unlock the next stage of FlowerShow’s growth.

---
---

# \``publish`\`:  full product vision

## Why this exists

Publishing content to the public web is still unnecessarily slow, heavy, and over-committed relative to how provisional most content actually is. Sharing a single document, note, or small collection of files often requires choosing a CMS, setting up hosting, learning Git, or accepting lock-in to opaque storage systems—making publishing slower than emailing a file or sharing a Drive link.

This product exists to close that gap: to make publishing content as fast and lightweight as sharing it, while preserving the ability to grow into something more serious. It applies the core insight of tools like Vercel—instant deploys, stable URLs, progressive sophistication—not to code, but to content, with Markdown and open formats at the center.

---

## Product vision

A Markdown-first (but not only) publishing tool that makes publishing content to the web as fast and effortless as Vercel made deploying code.

The core promise is *publish in seconds*: take a local file or folder and immediately get a live, shareable URL, without thinking about hosting, builds, infrastructure, or tooling. Where Vercel/Now optimised the deploy experience for applications, this product optimises the publish experience for content.

Key characteristics:

* Frictionless publishing (CLI or drag-and-drop).  
* Markdown as the conceptual centre of gravity.  
* Stable URLs and simple mental models.  
* Raw-first storage with progressive rendering.  
* Open formats and strong data-ownership guarantees.

Comparable products and inspiration:

* Vercel (formerly Now): instant deploys, canonical URLs, preview URLs, developer delight.  
* GitHub Pages / Netlify: static publishing, but heavier mental and config load.  
* Ghost / WordPress: mature publishing platforms, but slow, database-driven, and over-committing.  
* Obsidian Publish: Markdown-first and local-first, but opinionated and slower to publish publicly.

This product aims to be *the fastest way to publish content to the public web*.

---

## V0 job stories (minimum viable product)

### JS1 — Instant publishing

When I have a Markdown file, folder, image, or PDF on my machine, I want to publish it to a public URL in seconds, so that sharing it is faster than using Google Drive or similar tools.

Acceptance:

* Time-to-live measured in seconds.  
* Single command (CLI) or single drag-and-drop (desktop/UI).  
* Authentication required, but frictionless (GitHub / Google).

---

### JS2 — Zero-context default

When I publish a single Markdown file with no prior context, I want it to become a new one-page site by default, so I do not have to think about projects, structure, or configuration.

Acceptance:

* Single Markdown file → new site.  
* File name maps directly to the URL path.  
* Sensible default preset applied automatically.

---

### JS3 — Folder-to-site publishing

When I publish a folder of Markdown files, I want it to become a small website with navigation, so documentation or knowledge bases work out of the box.

Acceptance:

* Entire directory can be published in one action.  
* Navigation is generated by default.  
* Navigation style depends on the selected preset.  
* No required configuration.

---

### JS4 — Stable URLs with overwrite semantics

When I re-publish content to the same site, I want URLs to remain stable, so I can iterate without breaking links.

Acceptance:

* Canonical site URL always points to the latest successful publish.  
* File paths within a site remain stable by default.  
* Re-publishing overwrites “latest”.  
* No exposed version history in v0.

---

### JS5 — Preset-driven site behavior

When I want my content to behave like documentation, a blog, or a landing page, I want to switch presets instantly, so structure and navigation change without touching content.

Acceptance:

* Presets combine information architecture and visual defaults.  
* Presets are mutually exclusive.  
* Switching presets does not require re-uploading content.

---

### JS6 — Configuration without friction

When I need to change site behavior, I want configuration to be adjustable quickly and safely, so I can iterate without wrestling with config files.

Acceptance:

* “No config” is a supported happy path.  
* A project-level config file is supported.  
* UI-level settings can override config file values.  
* The system does not rewrite the user’s config file.

---

### JS7 — Raw and rendered access

When I publish content or assets, I want access to both rendered views and raw files, so the system feels transparent and trustworthy.

Acceptance:

* Rendered pages have public URLs.  
* Raw assets and source files are accessible via URLs.  
* Raw storage is not blocked by rendering.

---

### JS8 — Immediate availability with progressive processing

When I publish content that requires processing, I want a usable site to be available almost immediately, so I get fast feedback even if deeper processing is still underway.

Acceptance:

* Index / entry page loads within seconds.  
* Site is public before all processing completes.  
* Partial functionality degrades gracefully.

---

## Explicit non-goals for V0

* No version history or rollback UI.  
* No Git-based publishing.  
* No custom domains.  
* No asset-browsing UI.  
* No in-browser content editor.

---

## V0.1 job stories (near-term extensions)

### JS9 — Versioned publishing

When I publish meaningful updates, I want each publish to have its own shareable URL, so I can reference or preview specific states of a site.

Acceptance:

* Each publish can generate a unique, human-friendly URL.  
* Canonical URL points to latest successful publish.

---

### JS10 — Canonical pinning and rollback

When I make a mistake, I want to pin the canonical URL to an earlier version or roll back, so recovery is simple and safe.

Acceptance:

* Canonical URL can be repointed.  
* Older versions remain accessible.

---

### JS11 — Custom domains

When I want a site to be more permanent or public-facing, I want to attach my own domain easily, so it feels production-ready.

Acceptance:

* One-click or near one-click domain setup.  
* Automatic HTTPS.

---

## V0.2+ job stories (strategic growth)

### JS12 — Git-based publishing

When my workflow matures, I want to publish directly from a Git repository, so I can integrate with developer workflows.

Acceptance:

* Connect GitHub repository.  
* Auto-deploy on push.

---

### JS13 — Pluggable processing pipelines

When new content types or capabilities are added, I want the system to be extensible via processors, so the platform can grow without redesign.

Acceptance:

* Clear pipeline hooks.  
* New processors do not change core publishing flow.

---

### JS14 — Dataset publishing

When I publish structured data (e.g. CSV \+ README), I want it rendered as a usable dataset page, so data publishing is as easy as document publishing.

Acceptance:

* CSV rendered as tables.  
* Dataset-specific presets available.

---

## Appendix A — Value proposition (pains and gains)

### Core pains

* Publishing is slow relative to sharing; most tools require minutes or hours to go live.  
* Users must commit early to a CMS, repo, or workflow before knowing if content matters.  
* Git is a powerful but unnecessary barrier for many content and asset workflows.  
* Many publishing tools obscure or lock in user data.  
* Feedback loops are too slow for exploratory or provisional content.

### Core gains

* Publish to a public URL in seconds.  
* Zero-commitment publishing: sketch first, formalise later.  
* A clear evolution path from casual use to serious projects.  
* A simple mental model centred on a single action: publish.  
* Trust through raw-first storage and open formats.

---

## Appendix B — What already exists (and why this is different)

* Vercel / Netlify / Cloudflare Pages: excellent deploy ergonomics, but optimised for code, not content.  
* GitHub Pages: Markdown-based but slow, Git-heavy, and poor for non-developers.  
* Ghost / WordPress: powerful CMSs with high setup and long-term commitment costs.  
* Obsidian Publish: strong ownership model, but limited flexibility and speed.  
* Drive / Dropbox links: fast sharing, but no rendering, structure, or evolution path.

The differentiation is not static sites or Markdown per se, but *deploy-level speed and ergonomics applied to content*.

---

## Appendix C — Critiques and risks

### Risk: perceived as a toy

Mitigation: emphasise the designed-in evolution path (config, presets, Git, datasets) while keeping v0 deliberately simple.

### Risk: competing with free tools

Mitigation: compete on time-to-first-URL and delight, not feature depth.

### Risk: blurred audience

Mitigation: anchor v0 firmly on Markdown publishing; treat other formats as extensions.

### Risk: hidden operational complexity

Mitigation: accept crude implementations in v0; prioritise speed over completeness.

### Risk: overlap with existing tools

Mitigation: this is a publishing surface and event, not a CMS or site generator.

---
---

# Appendix: Value Props and Critiques

*This is a critical review from three angles: (1) what already exists and where this differs, (2) core value proposition framed as pains → gains, and (3) substantive critiques / risks, with ways to strengthen the vision. I’ll stay at the product–strategy level, not implementation.*

## 1\. What already exists, and where this is genuinely different

There *are* adjacent solutions, but none quite hit the precise combination you’re aiming for.

### Closest analogues

* Vercel / Netlify / Cloudflare Pages  
    
  * Strength: instant deploys, previews, canonical URLs, excellent DX.  
  * Gap: optimised for *code*, not content. Requires repos, build steps, config, and a developer mental model.


* GitHub Pages  
    
  * Strength: free, simple in theory, Markdown-based.  
  * Gap: slow feedback loops, Git friction, weak UX for non-developers, no “publish in seconds” feeling.


* Ghost / WordPress  
    
  * Strength: mature publishing platforms, content-first.  
  * Gap: heavy setup, database-driven, slow initial publish, poor fit for “one file → one site”.


* Obsidian Publish  
    
  * Strength: Markdown-first, local-first, strong trust model.  
  * Gap: expensive, opinionated, slower publishing flow, not asset-centric, limited extensibility.


* Gists / Pastebin / Drive / Dropbox links  
    
  * Strength: very fast sharing.  
  * Gap: no rendering pipeline, no site abstraction, no presets, no evolution path.

### Genuine differentiation

The *novelty* is not Markdown, static sites, or hosting per se. It is:

**“Deploy-level speed and ergonomics, applied to content rather than code.”**

That is a surprisingly under-served niche.

The real differentiation is:

* One-step publish without Git.  
* Immediate public URL.  
* Progressive rendering.  
* Presets as *information architecture*, not themes.  
* Clear evolution path: casual → serious → developer.

That last point is particularly strong and rare.

---

## 2\. Value proposition: pains → gains

Let’s articulate this very explicitly.

### Target users (implicit but important)

You are serving at least three overlapping personas:

1. Knowledge workers / writers / researchers.  
2. Data publishers (later).  
3. Developers who don’t want Git for *everything*.

The product is strongest when it does *not* assume developer identity.

---

### Core pains today

1. Publishing is too slow relative to sharing  
     
   * “I just want to show someone this thing.”  
   * Setting up hosting, repos, builds, CMSs takes minutes or hours, not seconds.

   

2. Tools force premature commitment  
     
   * You must choose WordPress vs Ghost vs Git vs CMS *before* you know if the content matters.  
   * Most content is exploratory, provisional, or lightweight.

   

3. Git is an unnecessary barrier for many content workflows  
     
   * Powerful, but cognitively expensive.  
   * Especially ill-suited to assets, datasets, and casual publishing.

   

4. Content tools lock you in or hide your data  
     
   * Databases, proprietary formats, opaque storage.  
   * Hard to leave cleanly.

   

5. Feedback loops are too slow  
     
   * You don’t see the thing live until *everything* is built.  
   * This kills experimentation.

---

### Gains your product offers

1. Speed as the primary value  
     
   * “From file to URL faster than email or Drive.”  
   * This is the headline gain.

   

2. Zero-commitment publishing  
     
   * Publish *before* deciding what this thing is.  
   * A sketch can later become documentation, a blog, or a dataset.

   

3. Progressive seriousness  
     
   * Start with drag-and-drop.  
   * Graduate to config.  
   * Graduate to Git.  
   * This gradient is unusually well thought through.

   

4. Cognitive simplicity  
     
   * One mental object: a site.  
   * One action: publish.  
   * Everything else is optional.

   

5. Trust and ownership  
     
   * Raw-first storage.  
   * Open formats.  
   * Clear exit story, even if rarely exercised.

---

### The crisp value proposition (draft)

A possible tight articulation:

*The fastest way to publish content to the public web — from a single file to a full site — without Git, builds, or setup.*

Or slightly more evocative:

*Vercel for content: instant publishing for Markdown, documents, and data.*

---

## 3\. Critiques, risks, and ways to strengthen the vision

Here are the most serious critiques I would raise, and how you might respond to them.

### Critique 1: “Is this just a toy?”

Risk:

* Extreme simplicity can signal lack of seriousness.  
* People may assume it won’t scale to “real” projects.

Mitigation:

* Be explicit about the evolution path.  
* Show that Git, versioning, datasets, and search are *designed in*, not bolted on.  
* Your pipeline architecture narrative helps here — but keep it mostly invisible at first.

Strengthening move:

* Explicitly position v0 as “sketch-level publishing,” not “full CMS replacement.”

### 

### Critique 2: Competing with free tools

Risk:

* Google Drive links, GitHub Pages, and free tiers are “good enough” for many.

Mitigation:

* Compete on *time-to-first-URL*, not features or price.  
* Make the emotional difference obvious: delight, speed, lightness.

Strengthening move:

* Measure and market “seconds to publish.”  
* Make this a core metric internally and externally.

---

### Critique 3: Blurred audience

Risk:

* Trying to serve writers, researchers, data people, and developers can dilute focus.

Mitigation:

* Treat Markdown publishing as the *sole* v0 narrative.  
* Everything else (datasets, Git, search) is framed as “same engine, later.”

Strengthening move:

* Your canvas already does this well; just be ruthless in messaging.

---

### Critique 4: Operational complexity hidden behind simplicity

Risk:

* Progressive rendering, pipelines, partial builds, and raw/derived separation add real complexity.  
* This could slow development or introduce edge cases early.

Mitigation:

* Be aggressive about what v0 does *not* guarantee.  
* Accept crude implementations initially (full reprocess, no incremental).

Strengthening move:

* Internally distinguish “conceptual architecture” from “v0 implementation.”  
* You are already doing this, which is good.

---

### Critique 5: Why not just improve FlowerShow?

Risk: This could be seen as a repackaging of Flower Show rather than a new product.

Mitigation: This is a *publishing surface*, not a site generator. This *is* FlowerShow (or a part of it)

Strengthening move: Be clear that the product is about *publishing events*, not site builds.

## 4\. Strategic clarity: what really makes this compelling

What stands out most strongly, and is worth sharpening further, is this:

**The primary unit is not a site, a repo, or a CMS — it is a publish action.**

Everything else (sites, presets, versions, pipelines) is downstream of that.

If we hold onto that, the product remains coherent even as features grow.

---
---

# Appendix: evolution of existing Flowershow

### Core claim

FlowerShow’s main bottleneck today is **access, not capability**: users must already be comfortable with GitHub and Git to experience its value.

## Current FlowerShow pains

### GitHub as the front door

* “Sign up with GitHub” filters out many otherwise ideal users.  
* Value is never demonstrated before commitment is required.

### Git as the publishing substrate

* Git is excellent for code, but hostile to assets, notes, and casual publishing.  
* Publishing feels heavier than the simplicity FlowerShow promises.

### Markdown as a hard gate

* Markdown works internally, but excludes users with Docs, Word files, or folders.  
* Users must convert themselves before they can publish.

### Asset workflows are constrained

* Images, PDFs, datasets, and folders are second-class citizens in Git-based flows.

---

## What the MVP changes

### Direct ingestion

* Users upload files or folders directly to FlowerShow storage.  
* Git becomes optional, not required.

### Lower activation energy

* Sign in with Google.  
* Drop content.  
* Get a URL in seconds.

### Same engine, wider funnel

* FlowerShow’s rendering and site logic remain intact.  
* This adds a new ingestion path, not a competing product.

---

## Strategic effect

### Expands the user base

* Opens FlowerShow to writers, researchers, educators, NGOs, and Obsidian users.  
* Removes Git and Markdown as upfront barriers.

### Strengthens the brand

* Aligns experience with FlowerShow’s values: **simplicity and speed**.  
* Publishing becomes faster than sharing via Drive or email.

### Clarifies the architecture

* FlowerShow becomes a **publishing engine**.  
* GitHub is one ingestion adapter among many (direct upload, Docs, datasets).
