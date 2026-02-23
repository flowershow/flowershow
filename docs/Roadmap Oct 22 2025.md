
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

### Epic 1: Markdown compatibility + build stability ✅

**Goal:** Everything in Markdown should “just work.”
**Why it matters:** The core value is “Markdown just works.” Any rendering or build break undermines trust.
**Action / Next step:** Consolidate into “Markdown Fidelity Epic” with CI tests using a sample corpus; create a Markdown compliance badge; marketing tagline “100% Markdown compatible.”

**Acceptance**

- Normal Markdown + HTML parsing without JSX
- Better test site
- Nicer error messages and debugging instructions
- Blog post: “100% Markdown compatible—guaranteed.”

**Issues**

- flowershow/flowershow#917 Normal Markdown w/ HTML 🔥🔥
  - flowershow/flowershow#911 - will be solved by this
- flowershow/flowershow#343 <=/>= breaks build
- flowershow/flowershow#770 PDF embedding
- flowershow/flowershow#912 PDF embedding pt 2
- ✅ test.flowershow.app site where we can add a bunch of this stuff (and we can then do automated tests against that if we want!) **See https://test.flowershow.app/ from https://github.com/flowershow/flowershow-test-repo**
- flowershow/flowershow#774 Dedicated/better error pages on 500 pages (and render errors)
- flowershow/flowershow#894 ==Highlights== support **🚩 ADDED HERE BY OLA**
- flowershow/flowershow#909 MDX debugging support **🚩 MOVED HERE BY OLA**
- flowershow/flowershow#933 Incorrect wiki-links resolution **🚩 ADDED HERE BY OLA**
- flowershow/flowershow#934 Incorrect email address auto-linking **🚩 ADDED HERE BY OLA**
- flowershow/flowershow#935 Can't escape <, <= etc in code **🚩 ADDED HERE BY OLA**

❓

- flowershow/flowershow#914 math formatting ❓ is this even a bug we can fix (more in latex) **Not a bug. See comments in the issue**

**Timeline:** Oct 2025

---

### Epic 2: Obsidian integration and workflow parity

**Goal:** “From Obsidian to Web in One Click.”
**Why it matters:** Obsidian is the biggest potential user base. Matching features like selective publishing, Dataview, and Bases syntax is critical.
**Action / Next step:** Create “Obsidian Mode” milestone; focus on parity features, smoother publishing plugin, and blog post “From Obsidian to Web in One Click.”

Track this now in the milestone: https://github.com/orgs/flowershow/projects/1/views/23

**Issues**

- flowershow/flowershow#922 Obsidian plugin v3
  - flowershow/flowershow#717 Selective publishing
- flowershow/obsidian-flowershow#33 Minor Obsidian plugin improvements to v2
- flowershow/flowershow#861 Bases syntax **🚧2025-11-24 this is nearly done 🎉**
- #904 Obsidian image resizing 🚩 ADDED HERE BY OLA
  - DUPLICATE flowershow/flowershow#592 Image sizing
- flowershow/flowershow#712 Case-insensitive links
- #910 Obsidian style `%` comments 🚩 ADDED HERE BY OLA
- #753 Wiki links in frontmatter (partially done, but only for `image` field) 🚩 ADDED HERE BY OLA

**Deliverables**

- Plugin update for selective publishing ✅ done
- Support for Bases syntax (and maybe Canvas) ✅
- Case-insensitive Wiki links ✅ done
- Blog & video tutorial for Obsidian users ✅ done

**Timeline:** Nov → Dec 2025

Extras (not sure we'll do them)

- flowershow/flowershow#170 Dataview **💬2025-11-24 IMO i wouldn't do DataView if we have done Bases**
- flowershow/flowershow#578 Canvas

### Epic 2.b: general major publishing enhancements

- flowershow/flowershow#738 mp4 embeds 🚩 MOVED HERE BY OLA as it's neither CommonMark nor GFM, it's extra syntax
- flowershow/flowershow#678 image optimization

### Epic 3: Docs, advocacy, and positioning

**Goal:** Promote Markdown in general and showcase Flowershow as the open, Markdown-native publishing stack.
**Why it matters:** The story is underexposed; people need to see Flowershow as the open, Markdown-native web stack.
**Action / Next step:** Create “Markdown Manifesto” campaign—refresh website copy, publish guide “Why Markdown Wins,” and circulate on Product Hunt / Hacker News.

**Issues**

- flowershow/flowershow#906 markdown is awesome
- flowershow/flowershow#759 Advocacy guide
- flowershow/flowershow#720 Docs for charts/tables
- flowershow/flowershow#677 Docs for components
- flowershow/product#10 Present open-source aspect
- flowershow/product#19 - marketing plan

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

- flowershow/flowershow#706 Themes customization
- flowershow/flowershow#854 Themes demo epic
- flowershow/flowershow#864 Style adjustments
- flowershow/flowershow#731 Showcase demo site
- flowershow/flowershow#772 Sidebar per folder

**Deliverables**

- 3–5 official themes with configurable sidebars
- Live demo gallery + playground
- Homepage refresh highlighting themes
- Social launch campaign

**Timeline:** Feb 2026 → Mar 2026

---

### Epic 5: Cloud & access control (freemium foundation)

**Goal:** Foundation for a sustainable freemium model.
**Why it matters:** Private sites and feature gating are core to monetization and positioning against Notion/Obsidian Publish.
**Action / Next step:** Package as “Flowershow Cloud v1.1” milestone; market as “secure, configurable publishing.”

**Issues**

- flowershow/flowershow#815 Private sites
- flowershow/flowershow#722 Toggle “Built with Flowershow” ribbon
- flowershow/flowershow#711 Configurable home page

**Deliverables**

- Private-site hosting with password protection ✅ largely done
- Dashboard toggle for “Built with Flowershow.”

**Timeline:** Mar 2026

---

### Cross-cutting enhancements

- **Performance polish:** flowershow/flowershow#678 image optimization (Q1 2026). **🚚2025-11-24 moved up to obsdiian section**
- **Knowledge features:** flowershow/flowershow#37 + flowershow/flowershow#29 graph & backlinks (Q2 2026 target).
- **Academic use case:** flowershow/flowershow#340 citations (deferred – “Someday”).

---

### 📥 INBOX / Unassigned

- flowershow/flowershow#924 YAML code blocks for components **🚩 ADDED HERE BY OLA**

>>>>>>> 2263254040e7aa0453392467fe2ef94f571d570b