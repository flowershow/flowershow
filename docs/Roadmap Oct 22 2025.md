Originally in: https://github.com/flowershow/flowershow/issues/918

We want to go through all the issues in this repo and look at what prioritise in terms of features, marketing and positioning and make a list of the top 3-5 things to work on.

## Flowershow Product Roadmap (Q4 2025 – Q1 2026)(s)

Flowershow = _“Publish your Markdown instantly. From notes to sites.”_

Priority should flow from user value → adoption → sustainability → infrastructure polish.

Thus the hierarchy is:

1. Reliability & Markdown compatibility
2. Delightful publishing experience (themes, config, Obsidian workflows)
3. Marketing clarity and demos
4. Growth & sustainability hooks (Cloud, private sites, premium toggles)
5. Ecosystem (docs, advocacy, integrations)

### Milestones overview

| Milestone                    | Dates             | Theme                  | Strategic goal                                                     |
| ---------------------------- | ----------------- | ---------------------- | ------------------------------------------------------------------ |
| **M1 – Markdown Fidelity**   | Oct–Nov 2025      | Core Reliability       | Make Flowershow the most Markdown-compatible publisher on the web. |
| **M2 – Obsidian Mode**       | Nov–Dec 2025      | User Growth            | Capture Obsidian community through full compatibility.             |
| **M3 – Theme & Demo Launch** | Dec 2025–Jan 2026 | Delight & Marketing    | Showcase Flowershow’s visual polish and ease of publishing.        |
| **M4 – Cloud v1.1**          | Jan–Feb 2026      | Monetization           | Enable private, configurable sites and premium toggles.            |
| **M5 – Markdown Manifesto**  | Feb–Mar 2026      | Advocacy & Positioning | Tell the story: open-source Markdown publishing for everyone.      |

---

## Epic 1: Markdown compatibility + build stability ✅

**Goal:** Everything in Markdown should “just work.”
**Why it matters:** The core value is “Markdown just works.” Any rendering or build break undermines trust.
**Action / Next step:** Consolidate into “Markdown Fidelity Epic” with CI tests using a sample corpus; create a Markdown compliance badge; marketing tagline “100% Markdown compatible.”

**Acceptance**

- Normal Markdown + HTML parsing without JSX
- Better test site
- Nicer error messages and debugging instructions
- Blog post: “100% Markdown compatible—guaranteed.”

**Issues**

- [x] flowershow/flowershow#917 "Support *normal* markdown with normal html in it (no JSX) - either as option or by default"
  - [x] flowershow/flowershow#911 "Allow the use of <color> tags into notes"
- [x] flowershow/flowershow#343 "<= or >= in a markdown file breaks build (?)"
- [x] flowershow/flowershow#770 "PDFs embeds don't work"
- [x] flowershow/flowershow#912 "Do PDFs get copied across to storage?"
- [x] test.flowershow.app site where we can add a bunch of this stuff (and we can then do automated tests against that if we want!) **See https://test.flowershow.app/ from https://github.com/flowershow/flowershow-test-repo**
- [x] flowershow/flowershow#774 "Avoid showing 500 errors - instead show info on the error or other error page"
- [x] flowershow/flowershow#894 "Support for markdown highlights"
- [x] flowershow/flowershow#909 "MDX errors have link to our dedicated error page (where instructions on how to fix)"
- [x] flowershow/flowershow#933 "Incorrect wiki-links resolution"
- [x] flowershow/flowershow#934 "Email addresses incorrectly auto-linked"
- [x] flowershow/flowershow#935 "Less/greater than signs shouldn't be converted to HTML entities when used in code"

❓

- [x] flowershow/flowershow#914 "Multiple $ signs on a single line cause math formatting to turn on ..." (not_planned - no easy fix available)

**Timeline:** Oct 2025

---

### Epic 2: Obsidian integration and workflow parity

**Goal:** “From Obsidian to Web in One Click.”
**Why it matters:** Obsidian is the biggest potential user base. Matching features like selective publishing, Dataview, and Bases syntax is critical.
**Action / Next step:** Create “Obsidian Mode” milestone; focus on parity features, smoother publishing plugin, and blog post “From Obsidian to Web in One Click.”

Track this now in the milestone: https://github.com/orgs/flowershow/projects/1/views/23

**Issues**

- [x] flowershow/flowershow#922 "Flowershow Obsidian Plugin v3 with batch publish/unpublish"
  - [x] flowershow/flowershow#717 "Obsidian plugin allows selective publishing and is clearer about what is published"
- [x] flowershow/obsidian-flowershow#33 "[inbox] Flowershow Obsidian v3"
- [x] flowershow/flowershow#861 "Support obsidian new Bases syntax and render the views in the frontend"
- [x] flowershow/flowershow#904 "Support image dimensions in embeds e.g. ![[Engelbart.jpg|100x145]]"
  - [x] flowershow/flowershow#592 "Support for Obsidian image embed size adjustment"
- [x] flowershow/flowershow#712 "Make wiki links case-insensitive (as in Obsidan)"
- [x] flowershow/flowershow#910 "Add support for obsdian style comments with %%"
- [x] flowershow/flowershow#753 "Support wiki links in frontmatter e.g. [["/abc/xyz"]]"

**Deliverables**

- Plugin update for selective publishing ✅ done
- Support for Bases syntax (and maybe Canvas) ✅
- Case-insensitive Wiki links ✅ done
- Blog & video tutorial for Obsidian users ✅ done

**Timeline:** Nov → Dec 2025

Extras (not sure we'll do them)

- [x] flowershow/flowershow#170 "Support obsidian dataview (or equivalent)" (not_planned - replaced by Bases support)
- [ ] flowershow/flowershow#578 "Support for Obsidian canvas files"

### Epic 2.b: general major publishing enhancements

- [x] flowershow/flowershow#738 "mp4 embeds not working"
- [x] flowershow/flowershow#678 "Optimize images using e.g. nextjs image support plus cloudflare"

### Epic 3: Docs, advocacy, and positioning

**Goal:** Promote Markdown in general and showcase Flowershow as the open, Markdown-native publishing stack.
**Why it matters:** The story is underexposed; people need to see Flowershow as the open, Markdown-native web stack.
**Action / Next step:** Create “Markdown Manifesto” campaign—refresh website copy, publish guide “Why Markdown Wins,” and circulate on Product Hunt / Hacker News.

**Issues**

- [ ] flowershow/flowershow#906 "Markdown is Awesome boot-up"
- [x] flowershow/flowershow#759 "Where do we put our general guide/advocacy for using markdown and building markdown-based websites"
- [x] flowershow/flowershow#720 "Docs for data features like charting and table display"
- [ ] flowershow/product#10 "Present opensource aspect of Flowershow more clearly"
- [x] flowershow/product#19 "Marketing plan July 2025"

**Deliverables**

- Unified docs portal for charts, tables, and components
- Manifesto article + launch blog series
- SEO-optimized marketing site with comparison tables
- Product Hunt / HN launch

**Timeline:** Dec → Jan 2026

---

### Epic 4: Themes, customization, and demos

**Goal:** Drive adoption through beauty and ease of use.
**Why it matters:** Aesthetic polish and demos drive adoption and show Flowershow’s potential.
**Action / Next step:** Bundle as “Theme & Demo Launch” release; create public gallery of 3–5 demo sites; relaunch homepage with “Pick your theme → Publish.”

**Issues**

- [ ] flowershow/flowershow#706 "Themes and site customization"
- [ ] flowershow/flowershow#854 "[epic] Flowershow themes to make"
- [ ] flowershow/flowershow#864 "Style adjustments for easier theme customizations"
- [x] flowershow/flowershow#731 "Showcase the demo site more"
- [ ] flowershow/flowershow#772 "Allow enabling/disabling sidebar per folders"

**Deliverables**

- 3–5 official themes with configurable sidebars
- Live demo gallery + playground
- Homepage refresh highlighting themes
- Social launch campaign

**Timeline:** Feb 2026 → Mar 2026

---

---

### Epic 5: Cloud & access control (freemium foundation)

**Goal:** Foundation for a sustainable freemium model.
**Why it matters:** Private sites and feature gating are core to monetization and positioning against Notion/Obsidian Publish.
**Action / Next step:** Package as “Flowershow Cloud v1.1” milestone; market as “secure, configurable publishing.”

**Issues**

- [x] flowershow/flowershow#815 “Private sites with e.g. password protection”
- [ ] flowershow/flowershow#722 “Built with Flowershow ribbon should be toggable on/off as an option in dashboard (and greyed out if not on premium)”
- [x] flowershow/flowershow#711 “Choose homepage markdown file”

**Deliverables**

- Private-site hosting with password protection ✅ largely done
- Dashboard toggle for “Built with Flowershow.”

**Timeline:** Mar 2026
