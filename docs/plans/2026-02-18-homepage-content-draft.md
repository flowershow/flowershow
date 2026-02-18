# Homepage Content Draft

> Status: Second draft — Feb 2026 (revised for conversion)
> For design/layout spec see: 2026-02-18-site-ia.md
> Brand reference: brand-strategy.md, PRODUCT.md

This document is purely about **content and copy** — words, headings, flow. No design
decisions. Annotations in [brackets] give notes for the designer/developer.

---

## Section 1: Hero

[Full-width section. Large headline, subhead, pricing nudge, primary CTA, secondary
link, demo video. A+C layer — practical promise in the first 3 seconds.]

---

**Headline (A/B test these two):**

> Content to URL. Instantly.

*or*

> Markdown to website in seconds.

*Note: "Content to URL. Instantly." is punchier and broader. "Markdown to website in
seconds" signals the audience more specifically. Both are strong — test to decide.*

---

**Subheadline (two lines — aspiration first, pain second):**

> The fastest way to turn your markdown into a live, beautiful website.
> No repos, no build pipelines, no waiting.

---

**Trust nudge (small text, below subhead):**

> Free plan available — no credit card required.

---

**Primary CTA:**

> Start publishing free →

**Secondary link:**

> Watch the demo ↓

[Secondary link anchors to the demo video below]

---

**Stats bar (between CTA and demo video):**

[Three numbers in a quiet horizontal row. Small text, muted — trust anchor, not hero.]

> **1,200+** users  ·  **950+** sites published  ·  **Free** forever

*Optionally, if recognisable organisations use Flowershow, add a quiet logo/name strip
below the stats: "Trusted by people at [Org A] · [Org B] · [Org C]" — only if the
names add genuine credibility. Defer until confirmed names are available.*

---

**Demo video**

[Autoplay, muted, looped. Existing demo.mp4.]

---

## Section 2: Features

[Grid of 6 cards. Lead with benefit, follow with feature. Short.
Moved "Ways to Publish" to after this section — let the page build desire first,
then explain the mechanism.]

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

## Section 3: Themes Showcase

[NEW SECTION. A visual strip showing 2–3 named themes side by side with screenshots.
This is the B layer in action — elegance *shown*, not claimed. Short section, high
visual impact. Links to /themes for the full gallery.]

---

**Section heading:** Beautiful by default. Yours to customise.

**Intro line:** Four official themes, or roll your own with CSS and Tailwind.

---

[Four theme cards — screenshot + name + one-line description + demo link.
Use the preview images already in the themes repo. Show all four or pick the three
most visually distinct for the homepage strip.]

**LessFlowery**
Clean and editorial. Inspired by LessWrong — great for long-form writing, essays, and research.
→ [See demo](https://lessflowery.flowershow.app/)

**Letterpress**
Modern typography with generous whitespace. Balanced and readable for any content type.
→ [See demo](https://letterpress.flowershow.app/)

**Superstack**
Familiar newsletter-style layout inspired by Substack. Perfect for blogs and subscriber content.
→ [See demo](https://superstack.flowershow.app/)

**Leaf**
Nature-inspired with subtle greens. Warm and distinctive for personal sites and digital gardens.
→ [See demo](https://leaf.flowershow.app/)

→ [Browse all themes and usage instructions](/themes)

*[Screenshots: use the preview images from github.com/flowershow/themes — each theme
has a preview .jpg or .png. The existing /assets/official-themes.png is a combined
view that could work as a teaser image above the individual cards.]*

---

## Section 4: Testimonials — Social Proof

[NEW SECTION. 2–3 short quotes from real users. Real names, real sites. Pull from
community members, GitHub discussions, Discord, or direct outreach. Format: pull quote
+ name + site URL or role. Positioned here — after features, before the "how it works"
section — to validate the promise before explaining the mechanism.]

---

**Section heading:** What people are saying

---

> "I had my site live in under a minute. I didn't believe it until I tried it."
> — [Name], [site or role]

> "Finally a publishing tool that gets out of my way. My Obsidian vault is now a proper
> website and I didn't have to touch a config file."
> — [Name], [site or role]

> "We use Flowershow to publish our team's research notes. It's become the fastest part
> of our workflow."
> — [Name], [organisation]

*[PLACEHOLDER — these need to be real quotes. Reach out to active community members,
check GitHub discussions and Discord for existing praise that can be used with permission.
Even one strong real quote beats three placeholder ones.]*

---

## Section 5: Ways to Publish

[Moved from Section 2. Visitor now understands the value — this explains the mechanism.
Four paths as icon + label + one-line description + optional link.]

---

**Section heading:** Works however you work

**Intro line:** Connect your content your way. We handle the rest.

---

**Drag & drop**
Upload a folder or file in the browser. Your site is live in seconds. No account setup beyond signing in.

**GitHub**
Connect a repo. Every push publishes automatically. Perfect for teams and version-controlled content.
→ [Learn more](/github)

**CLI**
`publish ./my-folder` from the terminal. No repo needed. Built for speed, scripts, and AI agents.
→ [Flowershow CLI](/publish)

**Obsidian plugin**
Publish directly from your vault. Wikilinks, graph, and all your Obsidian features work out of the box.
→ [Flowershow for Obsidian](/use-cases/obsidian)

---

## Section 6: Why Now — The Narrative Section

[The D layer. Editorial prose, not bullet points. Flowershow's perspective on the world.
Ends with a link to the About page for the full story.]

---

**Section heading:** Publishing rebuilt for the AI age.

---

Content is moving faster than ever. AI writes drafts in seconds. Research accumulates
in tools like Obsidian overnight. Teams produce more in a day than they used to in a week.

Publishing infrastructure hasn't kept up. Setting up a website still means choosing a
framework, configuring a build pipeline, picking a CMS, wiring up a deploy script —
and that's before you've written a word. The tools we use to share ideas were designed
for a world that no longer exists.

Flowershow is what you'd build if you started from scratch today. Drop your content,
get a URL. That's the whole workflow. Fast because it should be. Simple because
complexity is our problem, not yours.

And increasingly, the person publishing isn't a person at all — it's an agent, a script,
a pipeline. Flowershow works for that too.

→ [Read the full story](/about)

---

## Section 7: Use Cases

[Radically trimmed to 4 priority cards on the homepage. Link to the full use cases
index for the rest. 4 cards in a 2×2 or horizontal row — clean, scannable, no
hierarchy problem.]

---

**Section heading:** Built for how you actually work

**Intro line:** Whatever your content looks like, Flowershow publishes it.

---

**Obsidian**
Publish your vault directly. Wikilinks, graph view, and all your Obsidian flavour — live on the web.
→ [See how](/use-cases/obsidian)

**Blogs**
A beautiful blog in minutes. Author profiles, comments, full-text search — everything you'd expect, none of the setup.
→ [See how](/use-cases/blogs)

**Knowledge Bases & Docs**
Turn a folder of notes into a searchable, navigable knowledge base for your team or the world.
→ [See how](/use-cases/knowledge-bases)

**AI & Automated Publishing**
Publish from scripts, cron jobs, or AI agents. One command. No UI required.
→ [See how](/use-cases/ai-publishing)

---

**Below the 4 cards:**

> Also great for: [landing pages](/use-cases/landing-pages) · [data stories](/use-cases/data-stories) · [wikis](/use-cases/wikis) · [team handbooks](#)
> → [See all use cases](/use-cases/)

---

## Section 8: Social Proof — Community Showcase

[Existing 12-site grid. Keep as-is.]

---

**Section heading:** Built by people like you

**Intro line:** Thousands of sites, across every use case imaginable.

[12-site grid as now]

---

**Below the grid:**

> This site is built with Flowershow. [View the source on GitHub →](https://github.com/flowershow/flowershow-app)

---

## Section 9: FAQ — Objection Handler

[NEW SECTION. 3–4 short Q&A pairs. Collapsible (accordion) or inline. Positioned here
— after the showcase, before the final CTA — to clear the last doubts before the
conversion moment. Keep answers to 1–3 sentences max.]

---

**Section heading:** Common questions

---

**Is it really free?**
Yes. The free plan lets you publish one site with no time limit and no credit card required.
Premium plans start at $5/month and unlock custom domains, full-text search, and more.
[See pricing →](/pricing)

**What markdown does it support?**
CommonMark, GitHub Flavored Markdown, Obsidian wiki links, Mermaid diagrams, LaTeX math,
and more. If you're already writing in Obsidian, Typora, or any markdown editor, your
content works as-is.

**What if I want to move away from Flowershow?**
Your content stays in plain markdown files — you own them completely. There's no
proprietary format, no lock-in. Take your files anywhere, any time.

**Can I use my own domain?**
Yes, on the Premium plan. Custom domains, custom favicons, and custom social images
are all available. [See pricing →](/pricing)

---

## Section 10: Newsletter

[Moved above the final CTA. Presented as a lower-commitment option for visitors who
aren't ready to sign up yet — "not ready? stay in touch." Reduces pressure without
killing conversion momentum.]

---

**Heading:** Not ready yet? Stay in the loop.

**Subhead:** New features, tutorials, and the occasional idea worth sharing. No spam, unsubscribe any time.

[Tally embed]

---

## Section 11: Final CTA

[Dark background banner. Mirrors the hero headline to bookend the page — a proven
conversion pattern. Creates a satisfying loop and reinforces the core message at the
moment of decision.]

---

**Heading:** Content to URL. Instantly. Free.

**Subhead:** Join thousands of writers, researchers, and teams already publishing with Flowershow.

**CTA button:** Start publishing free →

**Quiet secondary line (below button):**
> No credit card required. Free plan, forever.

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
- Emojis in body copy — fine in feature cards, nowhere else

### Changes from first draft and why

| Change | Reason |
|---|---|
| Added pricing nudge near hero | Free is a major conversion driver — make it visible immediately |
| Added stats bar near hero | Concrete numbers beat vague trust claims; 1,000+ users is confirmed |
| Added themes showcase (Section 3) | 2–3 polished named themes deserve visual proof, not a bullet point |
| Added testimonials section (Section 4) | Specific social proof beats generic; positioned before "how it works" |
| Moved Ways to Publish to Section 5 | Build desire first (features + themes), then explain mechanism |
| Restructured hero subhead | Aspiration first, pain negation second — broader appeal |
| Trimmed use cases to 4 + overflow link | 8 equal cards creates no hierarchy; 4 is scannable |
| Added FAQ section | Removes last objections before conversion moment |
| Repositioned newsletter | Above final CTA as lower-commitment alternative, not interruption |
| Rewrote final CTA heading | Mirrors hero headline — bookend pattern, stronger conversion |

### Things still not decided / need real content
- **Theme names and descriptions** — pull from github.com/flowershow/themes
- **Testimonial quotes** — source from GitHub Discussions, Discord, or direct outreach
- **Sites-published count** — confirm from backend for the stats bar
- **Logo/org bar** — only include if recognisable names are available
- **Visual treatment of use cases** — cards with images vs icon+text
- **Whether /github page exists yet** — Ways to Publish link is conditional on this
