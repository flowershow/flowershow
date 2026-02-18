# Homepage Content Draft

> Status: First draft — Feb 2026
> For design/layout spec see: 2026-02-18-site-ia.md
> Brand reference: brand-strategy.md, PRODUCT.md

This document is purely about **content and copy** — words, headings, flow. No design
decisions. Annotations in [brackets] give notes for the designer/developer.

---

## Section 1: Hero

[Full-width section. Large headline, subhead, primary CTA button, secondary link, demo
video below. This is the A+C layer — practical promise in the first 3 seconds.]

---

**Headline (pick one — both are strong, left open for testing):**

> Content to URL. Instantly.

*or*

> Markdown to website in seconds.

---

**Subheadline:**

> Stop wrestling with build pipelines, CMS configs, and deploy scripts.
> Drop your files, get a live website. Docs, blogs, landing pages, knowledge bases —
> published in seconds, not hours.

---

**Primary CTA:**

> Start publishing — free forever

**Secondary link:**

> See it in action →

[Secondary link scrolls to or opens the demo video]

---

**Below the CTA: demo video**

[Autoplay, muted, looped. The existing demo.mp4 works here.]

---

## Section 2: Ways to Publish

[Visual, scannable section. Four paths shown as icon + label + one-line description.
Not a marketing pitch — just honest "here's how you can use it." Links go to /github,
/publish, /docs/cli, /use-cases/obsidian respectively.]

---

**Section heading:** How it works

**Intro line:** Connect your content however works for you. We handle the rest.

---

**Four paths:**

**Drag & drop**
Upload a folder or single file in the browser. Your site is live in seconds.

**GitHub**
Connect a repo. Every push publishes automatically. Great for teams and version-controlled content.

**CLI**
`publish ./my-folder` from the terminal. No repo needed. Built for speed, scripts, and AI agents.
→ [Learn more about the CLI](/publish)

**Obsidian plugin**
Publish directly from your vault. Your wikilinks, graph, and all your markdown features work out of the box.
→ [Flowershow for Obsidian](/use-cases/obsidian)

---

## Section 3: Features

[Grid of 6 cards. Lead each card with the benefit, follow with the feature. Keep short.
This is the B layer — elegance and simplicity shown, not just claimed.]

---

**Section heading:** Everything you need. Nothing you don't.

---

**Instant deployment**
Zero config, zero waiting. Publish in seconds and share a live URL before you've closed your editor.

**Your content, your way**
Folder-based publishing turns any markdown directory into a structured, multi-page site — automatically.

**Markdown-native**
CommonMark, GitHub Flavored Markdown, Obsidian wiki links, Mermaid diagrams, LaTeX math. It all just works.

**Hosted for you**
A beautiful, fast site out of the box. No servers to manage, no build tools to configure, no maintenance.

**Own your content**
Your files stay in markdown. Git-integrable, portable, no lock-in. Flowershow is infrastructure, not a silo.

**Custom domains & themes**
Bring your own domain. Customize with CSS or Tailwind. Pick from official themes or build your own.

---

## Section 4: Why Now — The Narrative Section

[New section. This is the D layer — "publishing rebuilt for the AI age." 3–5 short
paragraphs or a tight editorial block. Not bullet points. This is the first place on
the homepage where Flowershow sounds like it has a perspective, not just a feature set.
Ends with a link to the About page for the full story.]

---

**Section heading:** Publishing rebuilt for the AI age.

---

Content is moving faster than ever. AI writes drafts in seconds. Research accumulates
in tools like Obsidian overnight. Teams produce more in a day than they used to in a
week.

Publishing infrastructure hasn't kept up. Setting up a website still means choosing a
framework, configuring a build pipeline, picking a CMS, wiring up a deploy script —
and that's before you've written a word. The tools we use to share ideas were designed
for a world that no longer exists.

Flowershow is what you'd build if you started from scratch today. Drop your content,
get a URL. That's the whole workflow. It's fast because it should be. It's simple
because complexity is our problem, not yours.

And increasingly, the person publishing isn't a person at all — it's an agent, a script,
a pipeline. Flowershow works for that too.

→ [Read the full story](/about)

---

## Section 5: Use Cases

[Cards grid linking to /use-cases/* pages. Each card: title + one sentence. Not trying
to sell here — just signposting. 7–8 cards in a responsive grid.]

---

**Section heading:** Built for how you actually work

**Intro line:** Whatever your content looks like, Flowershow publishes it.

---

**Obsidian**
Publish your vault directly. Wikilinks, graph view, and all your Obsidian flavour — live on the web.

**Blogs**
A beautiful blog in minutes. Author profiles, comments, RSS, full-text search — everything you'd expect, none of the setup.

**Knowledge Bases**
Turn a folder of notes into a searchable, navigable knowledge base. Great for teams and public documentation.

**Docs & Handbooks**
Structured documentation with sidebar navigation, table of contents, and versioning via Git.

**Landing Pages**
A single markdown file with a hero, features, and a CTA. Beautiful by default, live in seconds.

**Data Stories**
Prose + live data, together. Embed charts, tables, and visualizations directly in your markdown.

**Wikis**
Collaborative, interlinked, always up to date. Built for teams who think in connected notes.

**AI & Automated Publishing**
Publish from scripts, cron jobs, or AI agents. The CLI is a single command — easy to automate, easy to integrate.

---

## Section 6: Social Proof — Community Showcase

[Existing community showcase grid. Keep as-is — it's strong. 12 sites, screenshots,
names. No copy changes needed here beyond the section heading.]

---

**Section heading:** Built by people like you

**Intro line:** Thousands of sites, across every use case imaginable.

[Then: the 12-site grid as it exists today]

---

**Below the grid — a quiet reinforcing line:**

> This site is built with Flowershow. [View the source on GitHub →](https://github.com/flowershow/flowershow-app)

[Keep this. It's good. Move it from its current mid-page position to just below the
community grid where it lands harder as social proof.]

---

## Section 7: Newsletter

[Keep the existing Tally form embed. Heading update:]

---

**Heading:** Stay in the loop

**Subhead:** New features, tutorials, and the occasional idea worth sharing. No spam.

[Tally embed as now]

---

## Section 8: Final CTA

[Dark background banner. Keep the existing structure. Copy update:]

---

**Heading:** Your content deserves to be seen.

**Subhead:** Publish an elegant website in seconds — free forever.

**CTA button:** Start publishing free →

---

## Copy Notes & Decisions

### Tone
- Direct, confident, not corporate.
- "You" not "users." "Your files" not "your assets."
- Short sentences. No weasel words ("seamlessly," "robust," "powerful").
- The voice is: a knowledgeable friend who respects your time.

### What to avoid
- "Supercharge your workflow" — generic
- "Seamlessly integrates" — nobody talks like this
- "Powerful and flexible" — every product says this
- Emojis in body copy — fine in feature cards (carries through from existing site), nowhere else

### Headline decision (left open)
"Content to URL. Instantly." is punchier and broader (not markdown-specific).
"Markdown to website in seconds" is more specific — signals the audience immediately.
Recommend A/B testing both. Either works with this page structure.

### Things this draft does not decide
- Visual hierarchy (designer's job)
- Which features get screenshots vs icons vs nothing
- Exact copy for the Ways to Publish section (depends on whether /github page exists)
- Video content (existing demo.mp4 is fine to start)
- Image/screenshot selection for use case cards
