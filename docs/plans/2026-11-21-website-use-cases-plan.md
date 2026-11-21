# Plan: website use-case pages (websites v2, product sites, changelogs)

Status: draft for Rufus's approval. Bead: flowershow-emo0. Brief: [2026-11-21-website-use-cases-brief.md](2026-11-21-website-use-cases-brief.md). This is a plan, not a build: nothing under `content/` changes until Rufus approves.

## 1. Recommendation in brief

Two pages now, a third when it has something to show:

1. **Websites v2** (`/uses/websites`, rewrite in place). Headline fix: "Markdown and HTML", not "written in Markdown". Replace the four-card features bento with a five-rung **ladder** (one file → make it yours → add sections → go bespoke → launch and run) and a compact **feature inventory**. Keep the publish block, showcase and final CTA. The product site (landing, pricing, docs, blog, changelog in one folder) is the worked example at the top of the ladder, with flowershow.app as the showcase.
2. **Changelogs** (`/uses/changelogs`, new). Small, distinct, works out of the box, strong search intent ("changelog page", "markdown changelog", "CHANGELOG.md to website"). Flowershow.app's own changelog is the showcase; Rufus's own sites with a `changelog.md` are candidates.
3. **Product sites** (`/uses/product-sites`, later). The case for a separate page is search intent and audience (developers and founders launching something, arriving via "landing page + docs + changelog", GitHub and AI-agent workflows), and that is the whole case: the page would be a *composition* page that mostly links to its siblings, and today flowershow.app is the only product site we can show. So: cover the product site on the Websites ladder now, write one tutorial ("Build a product site from one folder", `docs/guides/`) that the ladder links to, and build the page (outline in section 5) once there are one or two external product sites for its showcase.

**Use Cases nav** (`config.json`): Websites, Blog, Docs, Changelog pages, Wikis, Digital Gardens, Data Stories; add Product Sites after Websites when that page ships. "Changelog pages", not "Changelogs", because the top nav already has a "Changelog" link to flowershow.app's own changelog (the dropdown already lives with that ambiguity for Blog and Docs; don't add a third). See open question 5.

## 2. Feature inventory: everything that builds a website

One line each. Plan column: Free unless marked Premium. Links are flowershow.app paths. Grouped the way the pages will group them.

### Look and layout

| Feature | One line | Plan | Docs |
| --- | --- | --- | --- |
| Themes | Pick a theme (incl. Monospace) from the dashboard or `config.json`; preview each live. | Free | `/docs/reference/themes`, `/docs/reference/apply-a-theme` |
| Custom CSS | Override colours, fonts and spacing in one `custom.css`; stable `.theme-*` class hooks. | Free | `/docs/reference/custom-styles`, `/docs/guides/custom-styles`, `/docs/reference/theme-class-reference` |
| Custom fonts | Google Fonts or your own font files, site-wide. Preloading is Premium. | Free | `/docs/guides/custom-fonts` |
| Dark mode | Light/dark switch, per theme. | Free | `/docs/reference/dark-mode` |
| Hero sections | Title, description, image and up to two CTA buttons from frontmatter, per page or site-wide. | Free | `/docs/reference/hero-sections` |
| `layout: plain` | A blank full-width canvas between navbar and footer; write HTML with Tailwind classes inside the Markdown file. This is how flowershow.app's own landing pages are built. | Free | `/docs/reference/navbar#hide-the-navbar-on-a-page`, `/docs/guides/enhance-markdown-with-styled-jsx-blocks` |
| Hide navbar / footer on a page | `showNavbar: false`, `showFooter: false`; with `layout: plain` gives a fully bespoke page that draws its own header. | Free | `/docs/reference/navbar`, `/docs/reference/footer` |
| Whole `.html` pages | Served byte-for-byte with their own CSS, JS and data; scripts run; relative paths work. | Free | `/docs/agents/html`, `/docs/reference/supported-file-types` |
| Site layouts | Docs layout (sidebar beside the page) or `"layout": "reading"` (centred column, contents rail on the left) for essays and courses. | Free | `/docs/reference/site-layouts` |
| Custom navbar HTML | Replace the navbar with your own `_navbar.html`. | Premium | `/docs/reference/navbar#custom-navbar`, `/docs/guides/custom-navbar-and-footer` |
| Custom footer HTML | Replace the footer with your own `_footer.html`. | Premium | `/docs/reference/footer#custom-footer` |
| Custom head code | Scripts, meta tags, fonts and widget loaders in `<head>` of every page. | Premium | `/docs/reference/custom-head` |
| Page scripts | Load your own `.js` on a single Markdown page via `scripts` frontmatter. | Premium | `/docs/reference/page-scripts` |
| Custom favicon | Image file or emoji. | Premium | `/docs/reference/custom-favicon` |
| Remove "Built with Flowershow" | `showBuiltWithButton: false`. | Premium | `/docs/reference/footer`, `/pricing` |

### Structure and navigation

| Feature | One line | Plan | Docs |
| --- | --- | --- | --- |
| Navbar | Logo, title, links, dropdowns, CTA and social icons from the dashboard or `config.json`; logo can be hidden. | Free | `/docs/reference/navbar` |
| Footer | Navigation columns and social icons. | Free | `/docs/reference/footer`, `/docs/reference/social-links` |
| Home page | `README.md` or `index.md` (themed), or a root `index.html` (served raw, outside the site layout). | Free | `/docs/reference/home-page` |
| Sidebar | Generated from folders; on site-wide by default, can be limited to paths such as `/docs` or turned off. | Free | `/docs/reference/sidebar` |
| Table of contents | Tick rail that opens an outline on hover; Contents block on phones. | Free | `/docs/reference/table-of-contents` |
| Breadcrumbs, reading time, page headers | Trail above the title, "8 min read", authors and dates, cover image. | Free | `/docs/reference/page-headers` |
| Listing pages | ` ```blog ` block or `layout: list`: blog index, grid, compact archive, magazine front page, team page, featured post, latest posts on the home page. | Free | `/docs/reference/listings`, `/docs/guides/content-catalogs` |
| Tags | Frontmatter or inline `#tag`, with generated tag pages. | Free | `/docs/reference/tags` |
| Redirects | Page and whole-folder redirects, permanent or temporary. | Free | `/docs/reference/redirects` |
| Content filtering | Exclude or hide files and folders from publishing. | Free | `/docs/reference/content-filtering` |
| Wikilinks, backlinks, knowledge graph | Obsidian-style links, "pages that link here", interactive graph. | Free | `/docs/reference/backlinks`, `/docs/reference/knowledge-graph` |

### Content types and sections

| Feature | One line | Plan | Docs |
| --- | --- | --- | --- |
| Markdown and MDX | CommonMark, GFM, Obsidian syntax, callouts, math, Mermaid, embeds. | Free | `/docs/reference/syntax` |
| HTML inside Markdown | Any HTML (with Tailwind classes) inside a `.md`/`.mdx` page. | Free | `/docs/guides/enhance-markdown-with-styled-jsx-blocks` |
| Blog | A `blog/` folder lists itself; every post gets a post page with prev/next/related. | Free | `/uses/blogs`, `/docs/guides/publish-blog`, `/docs/reference/post-pages` |
| Docs / knowledge base | Folder of pages with sidebar, search (Premium) and breadcrumbs. | Free | `/uses/docs` |
| Changelog | A `changelog/` folder or a `CHANGELOG.md` renders as a timeline, no config. | Free | `/docs/reference/changelog` |
| Authors and team pages | Author profiles with avatars; `people` listing view for a team page. | Free | `/docs/reference/page-authors`, `/docs/guides/author-pages` |
| Forms | Embed Tally, Brevo, Mailchimp etc. for newsletter, contact and surveys. | Free | `/docs/reference/forms`, `/docs/guides/forms` |
| Word documents | `.docx` becomes a page; the original stays downloadable. | Free | `/docs/guides/publish-word-documents` |
| PDFs, data, media, downloads | PDFs open in the browser; CSV/JSON/images/audio/video/ebooks/archives served at their own URL. PDF and CSV *pages* are in progress (flowershow-eiz.14, eiz.11). | Free | `/docs/reference/supported-file-types` |
| Data stories | Live tables and charts from CSV. | Free | `/uses/data-stories` |
| Obsidian Canvas and Bases | Canvas files as diagram pages; Bases as tables, cards and lists. | Free | `/docs/reference/obsidian-canvas`, `/docs/reference/obsidian-bases` |
| Comments and annotations | Giscus comments; no-login annotations on drafts, with replies and resolve. | Free | `/docs/reference/comments`, `/docs/reference/annotations` |

### Publishing and collaboration

| Feature | One line | Plan | Docs |
| --- | --- | --- | --- |
| Obsidian, GitHub, drag and drop, CLI | Four ways in; GitHub republishes on every push. | Free | `/docs/getting-started/*`, `/docs/reference/cli` |
| Publish with AI | Flowershow skill and connector: Claude, ChatGPT, Codex, Cursor publish, configure and style the site. | Free | `/docs/agents` |
| Publish without an account | `fl --anon`, then claim. | Free | `/docs/reference/cli` |
| Invite editors | Email invites to publish and manage the site with you. | Premium | `/docs/reference/collaborators` |
| Password protection | Whole site behind a password. | Premium | `/docs/reference/password-protection` |
| Edit this page | Link straight to the file in GitHub. | Free | `/docs/reference/edit-this-page` |

### Reach: domain, search, sharing, analytics

| Feature | One line | Plan | Docs |
| --- | --- | --- | --- |
| Custom domain | Your domain with HTTPS. | Premium | `/docs/reference/custom-domain` |
| Full-text search | ⌘K across titles, headings and content. | Premium | `/blog/announcing-full-text-search` (no reference page exists; or link `/pricing`) |
| SEO titles and descriptions | From frontmatter; description computed when missing. | Free | `/docs/reference/seo-social-metadata`, `/docs/reference/page-title` |
| Social preview cards | Generated card for every page. Your own image: Premium. | Free / Premium | `/docs/reference/seo-social-metadata` |
| Built-in analytics | Readers and pages read, in the dashboard; add GA4 or Umami if you want. | Free | `/docs/reference/analytics` |
| RSS feed | Dated pages (blog posts, changelog entries) in a feed. | Free | `/docs/reference/rss-feed` |
| `robots.txt`, sitemap, `llms.txt`, page actions | Crawl control, auto sitemap, AI-readable index, copy-as-Markdown / open in ChatGPT or Claude. | Free | `/docs/reference/robots-txt`, `/docs/reference/llms-txt`, `/docs/reference/page-actions` |

Backlog items worth a "coming soon" mention only if Rufus wants them: custom 404 page (flowershow-0ea), grouped sidebar with logo (flowershow-zno), last-updated date (flowershow-e46), newsletter integration (flowershow-26s), PDF and CSV pages (flowershow-eiz.14, eiz.11), breaking-change badge for changelog entries (flowershow-0yg). Default: don't mention; link to the changelog instead.

## 3. Page: Websites v2 (`/uses/websites`)

Rewrite in place; keep the frontmatter shape, `fs-root lp-web` root, publish block, showcase and final CTA from the live page. Reuse the landing kit in `custom.css`; the ladder needs one new component (below).

### Headline and lede

- **H1 (recommended):** "Your website, in Markdown and HTML. From one page to a whole site." (Two short sentences, the pattern Blogs and Docs use; the second names the range the ladder shows.)
- H1 option B: "One file is a web page. A folder is a website."
- **Lede (recommended):** "Start with one Markdown file and you have a page that already looks good. Then make it yours in HTML and CSS: your own hero, navbar and footer, a blog, docs and a changelog, whole pages you design yourself. Free to start; your own domain and search on Premium ($5/month)."
- Lede option B: "Write pages in Markdown, design them in HTML and CSS, and Flowershow serves a real website with navigation and social cards. Grow from one page to a whole site without changing tools. Free to start; your own domain and search on Premium."
- Keep the lede to two or three sentences: the ladder lists the features, the lede should not.
- Page `title` (SEO): "Build a Website in Markdown and HTML"; `description`: "Publish a full website from Markdown and HTML files: one page in seconds, then your own hero, navbar, blog, docs and changelog, up to a whole site. Your own domain on Premium. Free to start."

### Outline

1. **Hero.** Badge "Flowershow for: Websites", H1, lede, CTAs (Get started, Sign up with Google), microcopy. Media: short autoplay video (like the Blogs and Docs heroes), one Markdown file dropped → live page with navbar → `custom.css` change recolours it (15 s). Until the video exists, keep the Conscious Communities screenshot.
2. **Ladder** (new section, `id="ladder"`, eyebrow "From one page to a whole site", H2 "Start small. Grow in any direction."). Five rungs, below.
3. **Ways to publish.** Existing `publish-card` block unchanged, copy "your pages are always plain files".
4. **Markdown and HTML, side by side** (eyebrow "Not just Markdown"). Reuse the home page's `ftree` folder visual with a website folder: `index.md`, `about.md`, `pricing.md` (`layout: plain`), `team/` (people listing), `blog/`, `changelog/`, `report.docx`, `landing.html` + `landing.css`, `_navbar.html`, `_footer.html`, `custom.css`. Three `feature-mini` cards: Markdown pages (theme, nav, search), HTML in Markdown and `.html` pages (your design, your scripts), Documents and files (Word becomes a page; PDFs, data, images at their URL).
5. **Everything a site needs** (eyebrow "Features"). Compact inventory, not a bento: five columns matching section 2's groups, each a short list of linked feature names with a small "Premium" tag where it applies. This is the "sheer range" Rufus asked for, scannable in one screen.
6. **Showcase.** Keep Conscious Communities, Life Itself, Sutras. Add flowershow.app itself with badge "Product site" (landing, pricing, docs, blog, changelog) linking to the product-site tutorial, and to `/uses/product-sites` once that page exists.
7. **Final CTA.** Shared block.

### The ladder

Each rung: number, title, one line, 3 to 5 feature chips (linked, Premium-tagged where needed), one visual slot (screenshot now, 10 to 20 s clip later), one "Learn more" link.

| Rung | Title | One line | Chips | Visual |
| --- | --- | --- | --- | --- |
| 1 | One file, one page | Publish a single Markdown file and it is a clean, themed page with a URL and a social preview card. Add a hero with one frontmatter line. | Themes · Hero section · Social preview card | Screenshot: a one-file site in the default theme, hero on. Clip: drop file → live URL. (The navbar appears once a title or links are set, so do not promise it for a bare file.) |
| 2 | Make it yours | Pick a theme, set your colours and fonts in `custom.css`, add your logo, menu and footer links. | Themes · Custom CSS · Custom fonts · Navbar · Footer · Dark mode | Before/after of the same page, default theme vs branded (Sutras is the real example). |
| 3 | Add sections | A `blog/` folder is a blog. A `docs/` folder is a knowledge base with a sidebar. A `changelog/` folder is a timeline. A `team/` folder is a team page. Paste a form for contact or newsletter signup. | Blog · Docs · Changelog · Listing pages · Authors · Tags · Forms | Four small screenshots in a 2×2 (blog index, docs sidebar, changelog timeline, team page), from flowershow.app and Life Itself. |
| 4 | Go bespoke | Build your own hero or landing page in HTML inside Markdown with `layout: plain`, publish whole `.html` pages with their own CSS and JS, replace the navbar and footer with your own HTML, add head code. Or ask your AI agent to do it with the Flowershow skill. | `layout: plain` · HTML in Markdown · `.html` pages · Custom navbar and footer (Premium) · Custom head code (Premium) · Page scripts (Premium) · Publish with AI | flowershow.app home page beside its `README.md` source; Conscious Communities' custom hero. |
| 5 | Launch and run | A whole product or organisation site: landing page, pricing, docs, blog and changelog in one folder, on your own domain with search, analytics, redirects and editors you invite. | Custom domain (Premium) · Search (Premium) · Analytics · Redirects · RSS · Invite editors (Premium) | flowershow.app's five sections fanned out, plus the dashboard's domain and analytics panels. "Learn more" → the product-site tutorial. |

**Layout.** A vertical ladder (five stacked rungs, alternating media left/right, a thin connector line and a 40 px numbered square per rung) rather than the existing `.steps` three-across grid, because five rungs with media do not fit three across and the vertical form reads as "climbing". Add `.ladder`, `.rung`, `.rung-num`, `.rung-chips`, `.rung-media` to the kit in `custom.css`; `.rung-num` reuses `.step-num` styling. On phones the rungs stack with media below copy. Each `.rung-media` is sized for a 16:10 screenshot or a `<video>` with poster, so clips can replace stills later without a layout change.

**Where explainer videos go.** Hero: one 15 s clip. Rungs: one clip each, poster first. A longer "build a site in five minutes" walk-through belongs on the product-site tutorial (`docs/guides/build-a-product-site.md`, written with the `write-tutorial` skill) linked from rung 5, not on the landing page.

### Honesty notes for the copy

- Say "Word documents become pages". Do not say PDFs do until flowershow-eiz.14 ships; today PDFs open in the browser at their own URL. If the build lands after PDF pages ship, add them.
- Custom navbar/footer HTML, head code, page scripts, custom domain, search, custom favicon and social images, invite editors, password protection are Premium. HTML in Markdown, `.html` pages, `custom.css`, `layout: plain`, hero sections, hiding navbar/footer per page are Free. The "Markdown and HTML" story is therefore mostly Free; say so.
- `.html` pages get no navbar or `custom.css`; `layout: plain` is the route that keeps them. The copy should not blur these two.

## 4. Page: Changelogs (`/uses/changelogs`)

New page, `fs-root lp-changelog`. Same skeleton as Blogs.

### Headline and lede

- **H1 (recommended):** "Turn your CHANGELOG.md into a changelog page." (Leads with the file developers already have; the folder method goes in the lede.)
- H1 option B: "Your changelog, as a timeline page. No config."
- **Lede (recommended):** "Keep the `CHANGELOG.md` you already have and Flowershow renders it as a timeline, one anchor per version. Or write one Markdown file per update in a `changelog/` folder and each entry gets its date, authors, image and its own page. Lives next to your docs and blog. Free to start; your own domain on Premium."
- Lede option B: "A changelog page with dates, versions and authors, rendered from Markdown in your repo and published on every push. Free to start; your own domain on Premium."
- Page `title`: "Publish a Changelog from Markdown"; `description`: "Turn a CHANGELOG.md or a changelog folder into a timeline page with versions, authors, entry pages, RSS and social cards. A free alternative to hosted changelog tools. No config."
- Do not name Headway, Beamer or Canny in the hero: they are in-app widgets and feedback tools, not the same thing. "Alternative to hosted changelog tools" in the SEO description is enough.
- Entry pages, authors, images and RSS apply to the folder method; `CHANGELOG.md` gives one page with anchors and a Compare link per version. Keep the two distinct in copy.

### Outline

1. **Hero.** Badge "Flowershow for: Changelogs". Media: flowershow.app/changelog screenshot (`assets/changelog-timeline.png` exists; retake at 1440 px as `.webp`). Clip later: add a dated file, timeline updates. Secondary CTA "See it live" → `/changelog`.
2. **Two ways to write it** (eyebrow "No config"). Two cards side by side: a `changelog/` folder of dated files (shows the file list) and a single `CHANGELOG.md` (Keep a Changelog, Changesets, release-please and conventional-changelog headings recognised). One line under both: "Any folder or file can be a changelog with `layout: changelog`."
3. **Ways to publish.** Shared block, with the GitHub card first: "Connect the repo and your `CHANGELOG.md` publishes on every release."
4. **Features** (bento, four cards): Entry pages with previous/next and their own social card; Authors with avatars and version labels; Styling with CSS variables (show the Linear-style and dense-log variants from the docs); Readers follow along: RSS feed, `llms.txt`, copy as Markdown. Tag "Coming soon": breaking-change badge (flowershow-0yg) only if Rufus wants it.
5. **Part of a product site** (short band). "Your changelog sits beside your docs, blog and pricing in one folder." Link to `/uses/websites#ladder` (rung 5) and the product-site tutorial; to `/uses/product-sites` once it exists.
6. **Showcase.** flowershow.app/changelog (folder method, dogfood). For the `CHANGELOG.md` method, the flowershow-v8x.18 audit found `changelog.md` files on wilber.wiki, reasoncommons.com, rufuspollock.com and climate.lifeitz.org; the builder checks which of these render as a timeline today and picks the best one or two (wilber.wiki first: it is already a showcase). developmentalspaces.org has a one-entry `changelog/` folder that is not published. See open question 3.
7. **Final CTA.**

### Screenshots and mockups

- Timeline (1440 px, light theme) and one entry page.
- A `CHANGELOG.md` raw file beside its rendered timeline (before/after pair).
- Two styling variants rendered from the docs' CSS examples (roomy Linear-style, dense log).
- Clip slot in hero.

## 5. Page: Product sites (`/uses/product-sites`), when there is a showcase

New page, `fs-root lp-product`. Composition page: short, visual, links out. Build it only once one or two external product sites exist for the showcase; until then rung 5 of Websites plus the tutorial carry this story.

### Headline and lede

- **H1 (recommended):** "Landing page, pricing, docs, blog, changelog. One folder."
- H1 option B: "Launch your product on a folder of files."
- **Lede (recommended):** "Everything a product site needs, from Markdown and HTML in one folder: a landing page you design, a pricing page, documentation, a blog and a changelog. Publish from GitHub, the terminal or your AI agent. This site is built that way. Free to start; your own domain and search on Premium."
- Lede option B: "Skip the CMS and the static-site build. Write your product's pages as files, push, and Flowershow serves the landing page, docs, blog and changelog. Free to start; your own domain and search on Premium."
- Page `title`: "Build a Product Website from Markdown and HTML"; `description`: "Landing page, pricing, docs, blog and changelog from one folder of Markdown and HTML. Search, your domain and social cards built in. Publish from GitHub or your AI agent."

### Outline

1. **Hero.** Badge "Flowershow for: Product sites". Media: a fanned stack of five flowershow.app screenshots (home, pricing, docs, blog, changelog). Clip later: scroll through the five sections of flowershow.app.
2. **One folder, five sections** (eyebrow "How it fits together"). Left: `ftree` of a product site (`index.md` with `layout: plain`, `pricing.md`, `docs/`, `blog/`, `changelog/`, `custom.css`, `_navbar.html`, `_footer.html`, `assets/`). Right: five rows, each "folder or file → what readers get → Learn more" linking to `/uses/websites` (landing), `/pricing` as the example (pricing page in `layout: plain`), `/uses/docs`, `/uses/blogs`, `/uses/changelogs`.
3. **Ways to publish.** Shared block; lead with GitHub ("docs and changelog live in the repo; every push republishes") and the AI agents line ("ask Claude or Codex to draft the landing page and publish it").
4. **Built for launch** (bento, four cards): Your domain, search and no badge (Premium, $5/month, $50/year); Social cards and SEO on every page; Analytics in the dashboard, no cookies; Invite your team (Premium).
5. **This site is the demo** (eyebrow "Dogfood"). Two or three sentences: flowershow.app is a Flowershow site; link the repo folder `content/flowershow-app/` on GitHub so people can read the source of the home page, pricing page and changelog.
6. **Showcase.** flowershow.app plus the one or two external product sites that gate this page; see open question 3.
7. **Final CTA.**

### Screenshots and mockups

- Five flowershow.app section screenshots at 1440 px (home, pricing, docs page, blog index, changelog).
- The folder tree (HTML, reuses `.ftree`).
- Clip slot in hero.

## 6. Shared build notes

- All three pages reuse the kit (`fs-root`, `hero`, `publish-card`, `bento`, `show-grid`, `final`, `ftree`, `feature-mini`). New kit pieces: `.ladder` family (Websites) and a `.two-ways` pair card (Changelogs) if `bento` does not fit; add them to `custom.css` once, scoped under `.fs-root`.
- Cross-links: Websites rung 3 → Blogs, Docs, Changelogs pages; Websites showcase → Product sites; Changelogs and Product sites → each other; Product sites rows → each sibling page.
- Assets go in `content/flowershow-app/assets/uses/{websites,changelogs,product-sites}/`, `.webp`, about 1440 px wide, taken from live sites.
- Redirects: none needed for new pages. If `/uses/websites`'s H1 changes, no URL change.
- Tutorial: `docs/guides/build-a-product-site.md` ("Build a product site from one folder": landing page with `layout: plain`, pricing page, `docs/`, `blog/`, `changelog/`, navbar, domain), written with the `write-tutorial` skill, using flowershow.app's own source as the example. Linked from Websites rung 5 and the Changelogs page.
- Changelog entry: one entry "A page for changelogs, and a websites page that shows the range" when Changelogs ships; the Websites rewrite and the tutorial are bullets in it, not entries. Product sites, if built later, is a bullet in whichever entry is nearest.
- Order of build: Websites v2 and the tutorial (one session), then Changelogs, then Product sites when it has a showcase. Each page gets an independent critique before it goes live, per AGENTS.md.

## 7. Open questions for Rufus

1. **Two pages now, Product sites later?** Recommendation: yes. Websites v2 (with the product site as rung 5 and a tutorial) and Changelogs now; Product sites as its own page once there are one or two external product sites to show, because without them it is a page of links to its siblings with one showcase. Backup: build all three now and ship Product sites with flowershow.app alone. If no answer, build the first two.
2. **Websites H1.** Recommendation: "Your website, in Markdown and HTML. From one page to a whole site." Fixes the "just Markdown" complaint and names the range. Backup: the first sentence alone.
3. **Showcase sites.** Changelogs: flowershow.app plus one of wilber.wiki / reasoncommons.com / rufuspollock.com (`changelog.md` files found in the flowershow-v8x.18 audit; builder verifies they render as timelines). Product sites: Rufus to name any external product site on Flowershow he knows of; none found in the repo or beads. Recommendation: ship Changelogs with flowershow.app plus wilber.wiki if it renders; add others later (as for Wikis, flowershow-hch9).
4. **PDFs as pages.** Rufus's note says Word documents and PDFs become pages. Word is live; PDF pages are in progress (flowershow-eiz.14). Recommendation: say "Word documents become pages" now and add PDFs when they ship; do not wait the Websites rewrite on it.
5. **Nav.** Recommendation: add "Changelog pages" to Use Cases (after Docs) and keep the rest as is; add "Product Sites" after Websites when that page ships. "Changelog pages" avoids a second "Changelog" item one menu away from flowershow.app's own changelog. Backup: "Changelogs" if Rufus prefers the one-word pattern of the other items.
6. **Videos.** Recommendation: build with screenshots in every video slot, then record the hero clips (Websites, Changelogs, Product sites) in one later session with the same 15 s format as the Blogs and Docs heroes; rung clips after that if the page earns traffic.
7. **What the cut-off message might have been.** Candidates, most likely first: (a) "ask your AI agent to build the site": the Flowershow skill can draft a landing page and publish it, which fits rung 4 and the Product sites publish block; (b) forms for contact and newsletter signup, a standard website need not on the live page; (c) built-in analytics; (d) themes gallery as rung 2's visual; (e) password-protected sites for clients and internal sites. All five are already placed in the outlines above; the coordinator should check with Rufus whether something else was meant (for example multilingual sites, which Flowershow does not support and the pages should not imply).
