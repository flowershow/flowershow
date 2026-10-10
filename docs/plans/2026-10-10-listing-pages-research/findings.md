# Listings moodboard — findings and 80/20 recommendation

Date: 2026-10-10. Screenshots in `img/` (1440×900 first screen; `-m` suffix = 390×844 mobile). All captured headless with Playwright; cookie/subscribe overlays dismissed or removed where possible. Companion page: `index.html`.

## TL;DR

- The web has converged on three listing primitives: a **list row** (text left, small thumbnail right), a **grid card** (image on top, eyebrow, title, excerpt, author/date), and a **compact row** (date + title). Everything else is a knob on top of these: a **featured** hero, **grouping** (year/day/section), and **image shape** (16:9, 3:2, square, circle).
- Substack's own settings model confirms the knob theory: it separates the "hero mode" (feature / magazine / newspaper) from the "feed mode" (list / grid). "Magazine" is not a layout, it is `grid` + `featured`.
- People pages are a fourth primitive only because the card content differs (portrait, name, role, bio) and the grid is denser (4-up, square image). Same engine, different slot order.
- Recommended menu: `list` (default), `grid`, `people`, `compact`, plus knobs `featured`, `group`, `image`. Cut `magazine` and `cards` as named layouts; they are `grid` with/without `featured`.
- Post page: centred column of 680–720px, header = eyebrow → title → dek → byline (avatar + name · date · read time) → hero image → body; footer = tags → author card → prev/next → 3-card "Read more" grid → optional subscribe CTA.

## 1. Blog listing pages — the strongest examples

Legend: fields in card order; image ratio measured from screenshots at 1440px.

| # | Example | Pattern | Card anatomy (in order) | Grid / measure | What is great | What is weak |
|---|---|---|---|---|---|---|
| 1 | Substack publication home, list mode — Noahpinion `img/substack-list-noahpinion.jpg`, Astral Codex Ten `img/substack-list-astral.jpg` | Featured hero (image left ~458px, centred title/subtitle/meta right) + "Latest" list with tabs (Latest/Top/Discussions) + sidebar | Title (20px semibold) → subtitle (16px muted) → `DATE · AUTHOR` (12px uppercase) → thumb right ~155×108 (≈3:2) | Content column ~600px + 280px sidebar; rows separated by 1px rule, 24px padding | The canonical blog feed. Three text lines + a thumbnail is enough. Mobile keeps the right thumbnail at ~88px, so scannability survives (`img/substack-list-noahpinion-m.jpg`) | Sidebar is subscription-centric; hero title centred while list is left aligned |
| 2 | Substack "magazine" hero — Lenny's `img/substack-list-lenny-home.jpg`, Slow Boring `img/substack-magazine-slowboring.jpg` | Feature hero + "Most Popular" row of 4 compact cards (title + meta + 64px square thumb) + 3-col grid of latest | Grid card: image 16:9 → title → meta | 3 cols, ~24px gap, left column ~900px + sidebar | Shows that hero, compact row and grid are composable blocks over the same post data | Visually busy; "Most Popular" needs analytics a static site does not have |
| 3 | Substack "newspaper" — Persuasion `img/substack-magazine-persuasion.jpg`, The Free Press `img/substack-magazine-thefp.jpg` | 3-column newspaper: side columns of image cards, centred lead story | Image (3:2) → title (serif) → one-line summary → `DATE · AUTHOR` | 3 cols (≈280 / 600 / 280) | True editorial feel; The Free Press shows how far typography alone (condensed display + serif) takes a generic grid | Only works with ≥5 fresh posts and real art direction; not an 80/20 default |
| 4 | Ghost Casper (demo.ghost.io) `img/ghost-casper.jpg`, `img/ghost-casper-grid.jpg` | Hero band → one feature card (image 2/3, title 1/3) → 2-up large cards → 3-up cards | Image 16:9 → `Category · Featured` eyebrow → title (28px) → excerpt → `date · N min read` | 1200px container; 2-up then 3-up with 32px gutters | Best "feature then grid" rhythm; the 2-up row after the feature gives a second tier of hierarchy | No author on cards; relies on colourful imagery |
| 5 | Ghost Source (source.ghost.io) `img/ghost-source.jpg`, mobile `img/ghost-source-m.jpg` | Three-column magazine: big lead (image → category → 40px title → excerpt → byline), middle column of image cards, right "Featured" list with 72px thumbs | Lead: image 3:2 → category → title → excerpt → `By author — date`; list: title → byline → thumb right | ~640 / 300 / 300 columns, 40px gutters; collapses to single column with image-top cards on mobile | The best magazine composition in the set: three densities on one screen; mobile degrades to the list/card primitive cleanly | Needs 10+ posts and images on every post |
| 6 | Ghost Headline (headline.ghost.io) `img/ghost-headline.jpg` | "LATEST" label → split feature (image left 50%, title + excerpt + meta right) → 2-col rows with 128px thumb left | Feature: image 16:9 → title (32px) → excerpt (serif) → `AUTHOR · DATE`; rows: thumb → title → `AUTHOR · DATE` | 1200px; 2-col rows, 40px gutter | Cleanest split feature card; thumbnail-left rows are a great dense variant for news/notes | Section label typography is heavy |
| 7 | Ghost Edition (edition.ghost.io) `img/ghost-edition.jpg`, `img/ghost-edition-list.jpg` | Full-bleed hero with subscribe → "Featured articles" 3-up (image 2:1, title only) → "Latest" list with 160×100 thumb left, title, excerpt, `date • N min read` | As stated | Featured 3-up at 1200px; Latest narrowed to 720px | Shows the 720px "reading-width list" — a listing can share the post measure and still look rich | Hero is a newsletter landing page, not a listing |
| 8 | Linear "Now" (linear.app/now) `img/linear-now.jpg` | Title + category tabs (All / Changelog / Product launches / From the team / Community / Press) + search; 3-col grid | Image 384×215 (≈16:9, 1px border) → title (20px) → excerpt (15px muted, 3 lines) → `Author · Date` (13px) | 3 cols, 64px gutters inside 1280px; no card background, hairline column dividers | The best dark grid card: nothing but the five slots, perfectly aligned baselines; a multi-type feed (changelog + blog + press) filtered by chips is exactly Flowershow's "collection + tag" case | Needs an image for every item; excerpt 3-line clamp hides long summaries |
| 9 | Vercel blog `img/vercel-blog.jpg`, `img/vercel-blog-list.jpg`, mobile `img/vercel-blog-m.jpg` | Title + category chips + search/RSS; first row of 3 "featured" cards with background, then a text-only 3-col grid | `date  Category` eyebrow (13px) → title (24px) → excerpt (featured only) → author avatars (20px) + names + role | 3 cols, 1px grid lines, 1440px wide; 1 col on mobile with card backgrounds | Proof that a grid does not need images: eyebrow + title + author row is enough. Multi-author avatar stack is the right treatment for `authors[]` | Rows are tall and airy; without excerpts the grid can feel like a table of headlines |
| 10 | Stripe blog `img/stripe-blog.jpg`, `img/stripe-blog-list.jpg`, mobile `img/stripe-blog-list-m.jpg` | Feature card (category → title → author avatar + name + role → excerpt → "Read more"; image right) → category chips → editorial rows: text left 60%, date + author block right, image below | As stated | 1080px content on a 4-column background grid; generous 48px gutters | Best author treatment (avatar 48px + name + role on two lines); the feature card is the reference for `featured: 1` | Each row is ~700px tall; expensive on scroll; heavy brand gradients |
| 11 | Notion "Tools & Craft" `img/notion-blog-list.jpg` | Left rail of categories; 2-col grid | Image 463×242 (≈1.9:1, bordered) → `Category` eyebrow → title (26px) → excerpt → avatar + author name(s) | 2 cols at 1440 inside ~1000px, 60px gutters; category rail 200px | Two-column grid is calmer than three and gives excerpts room; author avatars are 32px illustrated | Rail eats horizontal space; no dates on cards |
| 12 | Anthropic Newsroom `img/anthropic-news.jpg`, `img/anthropic-news-list.jpg` | Featured strip (title left, category + date + excerpt right) → a plain **table**: DATE · CATEGORY · TITLE with search | Table row | ~950px table + search box | The archive-as-table pattern at scale: fast to scan, trivially responsive, zero images. Validates `compact` | Table alone is dull as a landing page; needs the featured strip above |
| 13 | The Atlantic "Latest" `img/atlantic.jpg` | List with 210×140 (3:2) image left, serif title, dek, `AUTHOR  TIME` | Image → title (28px serif) → dek → byline | 630px content column | Editorial version of the list row; shows image-left works when titles are long | Ads/consent make the homepage itself unusable as reference; `img/verge.jpg` similar |
| 14 | Overreacted (Dan Abramov) `img/overreacted.jpg`, `img/overreacted-m.jpg` | Text-only list: title (28px, coloured, fades with age) → date → one-sentence summary | As stated | 630px single column | The minimal personal blog list done perfectly: three fields, generous spacing, no images, works identically on mobile | No grouping or pagination cues; relies on short summaries |
| 15 | Bear Blog archive `img/bearblog.jpg`, `img/bearblog-m.jpg` | `date  title` two-column monospace list | Date (tabular) → title | 720px | The purest `compact`; wraps gracefully on mobile with hanging titles | No summaries; dates in a mono face look like code |
| 16 | Paul Graham essays `img/paulgraham.jpg` and Gwern `img/gwern.jpg` | Bulleted title-only lists (Gwern: Newest / Popular two-column) | Title | ~450px / 900px | Title-only archives are legitimate when titles carry the meaning; Gwern's "Newest / Popular" pairing is a nice small idea | No dates; zero hierarchy; not for new visitors |
| 17 | Hugo PaperMod `img/papermod.jpg` and AstroPaper `img/astropaper.jpg` | Stacked cards (PaperMod: title → summary → `date · N min · author` in a bordered card) / stacked text (AstroPaper: title link → calendar icon + date → description) | As stated | 720px | Both show the "list without images" as the default for SSG themes; PaperMod's meta line order (`date · read time · author`) is the common convention | PaperMod's card chrome adds nothing; AstroPaper's monospace and icons feel dated |
| 18 | Tailwind blog `img/tailwind-blog.jpg` | Two-column: date in left gutter (uppercase mono), title + excerpt + "Read more" right | Date → title → excerpt | 1440px with background grid; 380px date column | The "date gutter" list is a useful timeline variant for changelogs | Too wide; a lot of chrome for a simple list |
| 19 | Every.to `img/every-feed.jpg` | Classic 3-column newspaper on dark: lead in the middle (image → `DATE IN  COLUMN` → 44px serif title → dek → avatar + author), side columns of stacked image cards and a right list of 80px thumb + title + author | As stated | 3 cols ≈ 300 / 600 / 300 | Shows the `column`/series field as an eyebrow with the date; author avatars everywhere | Home page is now a product landing; the feed is below the fold (`img/every.jpg`) |
| 20 | Astro blog `img/astro-blog.jpg` | Hero → popular-posts rail → stacked large cards with date header bar, image, title + summary two-column | Date bar → image → title / summary | ~760px main + 290px rail | Date-as-card-header is a distinctive treatment for infrequent posts | One card per screen; heavy |

Not captured or weak: Medium publication pages render almost nothing without JavaScript/login (`img/post-medium.jpg` shows only the post template); Quartz has no listing page by default (it is a notes/docs layout, `img/quartz.jpg`); Read.cv / Posts.cv shut down in 2025 and could not be captured; The Ankler and Bear's discover page are behind Cloudflare challenges; The Verge and The Atlantic homepages are dominated by consent dialogs and ads.

## 2. Other listing use cases

### People / team pages

| Example | Pattern | Card anatomy | Grid | Verdict |
|---|---|---|---|---|
| Linear about `img/people-linear-team.jpg`, mobile `img/people-linear-m.jpg` | Leadership as 4-col grid of B&W square portraits, then everyone else as a plain 4-col name list | Photo 1:1 (269px) → name (16px) → role (14px muted) | 4 cols ≥1024, 2 on mobile, 24px gutters | **Strongest.** Two tiers (cards for leads, names for the long tail) is the honest way to show 60+ people |
| Obsidian about `img/people-obsidian.jpg`, mobile `img/people-obsidian-m.jpg` | 3-col bordered cards with circular avatars | Avatar circle 120px → name (20px) → `@handle · role` → 1–2 line bio | 3 cols; mobile becomes avatar-left rows | **Strong for small teams** (≤12): the bio line is what makes it human. The mobile fallback (avatar left, text right) is the right one |
| Y Combinator people `img/people-yc.jpg`, mobile `img/people-yc-m.jpg` | Directory grouped by section heading; rows with 80px square photo left, name, role (bold), long bio | Photo → name → role → bio | Single column 900px | Best **grouped directory**; good when bios matter more than faces |
| Santa Fe Institute `img/people-santafe.jpg` | Filterable 2-col rows: photo 160px left, name (serif), roles, link | Photo → name → role(s) → "Personal Website" | 2 cols | Research-lab reference: multiple roles per person and an outbound link slot |
| a16z `img/people-a16z.jpg`, Sequoia `img/people-sequoia.jpg` | Large colour portraits, 5-up / 3-up, name beneath; filters by focus area or stage | Photo 3:4 → name | 5 or 3 cols | Shows portrait (3:4) as an alternative ratio; filters as chips/tabs; name-only works when the photo is the point |
| PostHog `img/people-posthog.jpg` | Trading-card style, 4-up | Illustration → name → role → country → team | 4 cols | Fun, but bespoke art; not a pattern to generalise |

### Project / portfolio grids

| Example | Pattern | Card anatomy | Grid |
|---|---|---|---|
| Linear customers `img/projects-linear-customers.jpg` | Category tabs; 3-col grid of logo-over-photo tiles | Image 16:9 → title (20px, 2 lines) → "Read story →" link | 3 cols, 64px gutters |
| Vercel templates `img/projects-vercel-templates.jpg` | Filter rail (checkbox facets) + 3-col cards with screenshot at the **bottom** | Title → 2-line description → screenshot (cropped) | 3 cols |
| Astro themes `img/projects-astro-themes.jpg` | 3-col cards | Screenshot 16:10 → title → 3-line description → divider → author avatar + name · "Paid" badge | 3 cols, 40px gutters |
| Pentagram work `img/projects-pentagram.jpg`, mobile `img/projects-pentagram-m.jpg` | Edge-to-edge 2-col with mixed tile sizes (1/3 + 2/3) | Image (1:1 or 2:1) → title (16px) → 2-line description | 2 cols, 12px gutters |
| Instrument work `img/projects-instrument.jpg` | 2-col asymmetric (large video 2/3, small 1/3) with Stack/Grid toggle and filter chips | Image → client → one-line headline → `#tag` | 2 cols asymmetric |
| Stripe customers `img/projects-stripe-customers.jpg` | Masonry of tall image tiles with logo and CTA | Image 3:4 → logo → "Read story" | masonry |

Takeaway: a project card is a grid card where the eyebrow is a client/tag and the date is absent. The only genuinely different ask is **image ratio** (1:1, 16:10, 3:4) and a **link label**. Both are knobs, not a layout.

### Podcast / episode lists

| Example | Pattern |
|---|---|
| Acquired `img/podcast-acquired.jpg`, mobile `img/podcast-acquired-m.jpg` | Left rail of facets; list rows with **square** 190px artwork left, serif title (26px), `F26 E2 · SEP 14, 2026` meta, 2-line excerpt, play button bottom-right. Mobile keeps a 75px square and stacks the excerpt below. **Best** episode list |
| Conversations with Tyler `img/podcast-tyler.jpg` | Feature (image 16:9 left, title + dek right) → 3-col grid of episode cards (image → title → excerpt) |
| 99% Invisible `img/podcast-99pi.jpg` | 2-col grid with play overlay, episode badge, date + category row, Grid/List toggle |
| Lex Fridman `img/podcast-lex.jpg` | 4-col thumbnail cards: image 16:9 → title → guest (coloured) → guest role → Video · Episode · Transcript links |

Takeaway: `list` with `image: square` + two custom meta fields (episode number, duration) covers podcasts. A play affordance is a per-theme embellishment, not a layout.

### Event lists

| Example | Pattern |
|---|---|
| Luma `img/events-luma.jpg`, mobile `img/events-luma-m.jpg` | **Timeline grouped by day** ("Today · Saturday" headers on a dotted spine); row = `LIVE 11:00 AM` → title → `By host` (with avatars) → location → attendee avatars; square cover right (120px, 90px on mobile). **Best** event list |
| dev.events `img/events-devevents.jpg` | Facet counts left; rows with date column (`Oct 10 ²⁶`), icon, uppercase title, `Topic conference in City, Country` meta |
| TED conferences `img/events-ted.jpg` | Simple 2-col cards: image → title → date → city → link |

Takeaway: events = `list` + `group: day` + custom meta `time`, `location`. Nothing new structurally.

### Docs / resource indexes

| Example | Pattern |
|---|---|
| Linear docs `img/docs-linear.jpg` | 4-col bordered cards: icon top-left → title → 2-line description, under section headings ("Popular", "Linear basics") |
| Notion help `img/docs-notion-help.jpg` | 3-col tinted cards: title → description → spot illustration; sidebar tree |
| Vercel KB `img/docs-vercel-guides.jpg` | 3-col cards with illustration top, title, description; then "Featured Guides" tag chips |
| Stripe docs `img/docs-stripe.jpg` | Columns of grouped links (3-col link lists) |
| Astro docs `img/docs-astro.jpg` | Sidebar tree + hero + 2-up cards |

Takeaway: a docs index is a `grid` with `image: none` (or icon) grouped by section, or a `compact` grouped list. No bespoke layout needed.

## 3. Blog post (entry) page layouts

| Example | Measure | Header anatomy (top to bottom) | Footer |
|---|---|---|---|
| Substack post `img/post-substack.jpg`, mobile `img/post-substack-m.jpg`, footer `img/postfoot-substack.jpg` | 728px | Title (32px bold, left) → subtitle (18px muted) → avatar 40px + `AUTHOR` (12px caps) / `DATE` → like · comment · restack pills + Share → hero image inside the measure → body (serif 18px/1.6) | Subscribe box → Share button → comments → "Latest" post list |
| Ghost Casper `img/post-ghost-casper.jpg`, mobile `img/post-ghost-casper-m.jpg`, footer `img/postfoot-ghost-casper.jpg` | 720px text, hero 1200px | `Category` eyebrow (grey) → title (56px) → excerpt (22px) → avatar 56px + name / `date • N min read` + Share → **wide** hero → body | "Sign up for more like this" email box → 3-card "read more" grid (image, title, excerpt, date · read time) |
| Ghost Source `img/post-ghost-source.jpg`, footer `img/postfoot-ghost-source.jpg` | 720px text, hero 1120px | `CATEGORY` (accent caps) → title (48px) → excerpt → avatar + name / `date — N min read` + Share → hero → body | "READ MORE" 4-card grid → site description + subscribe |
| Stripe blog `img/post-stripe.jpg`, mobile `img/post-stripe-m.jpg`, footer `img/postfoot-stripe.jpg` | 720px text in a 1080px frame with 270px left rail | Breadcrumb `Blog / Product` → title (52px) → date → (left rail) avatar 48px + name + role → body; no hero in-flow | 3-column band: Subscribe form · "Join our team" · "Feedback" |
| Linear Now `img/post-linear.jpg`, mobile `img/post-linear-m.jpg`, footer `img/postfoot-linear.jpg` | 620px | Breadcrumb `Now / Product launches` (centred) → title (48px, centred) → hero illustration → `Author · Date` (centred, muted) → body (lede in italic) | Hairline → `Author · Date` + "Copy link" (that is all) |
| Vercel `img/post-vercel.jpg`, footer `img/postfoot-vercel.jpg` | 680px + right rail | `Blog` eyebrow → title (40px) → author avatar stack + names → summary paragraph → right rail: date / read time / Copy | Hairline → "About this report" notes (no related, no author card) |
| Every `img/post-every.jpg` | 720px | Title (serif 44px) → dek (serif 22px) → avatar + `AUTHOR` → `date · N min read` | Paywall; not captured |
| Anthropic `img/post-anthropic.jpg`, footer `img/postfoot-anthropic.jpg` | 760px | `Category` (centred) → title (56px centred) → date → hero in rounded frame | Share icons → "Related content" 3-up (title → summary → Read more) |
| Overreacted `img/post-overreacted.jpg`, footer `img/postfoot-overreacted.jpg` | 632px | Site name + avatar → title (36px) → date → body | "Pay what you like" → "Fork on Tangled" → site name |
| Bear Blog `img/post-bearblog.jpg`, footer `img/postfoot-bearblog.jpg` | 720px | Site name + nav → title (36px) → date (mono) → body | Upvote → "Subscribe via rss, email" → Powered by |
| Tailwind `img/postfoot-tailwind.jpg` | 760px | — | Newsletter signup band |
| Paul Graham `img/post-paulgraham.jpg` | 435px(!) | Title (small caps) → month year → body | None |
| Medium `img/post-medium.jpg` | 680px | Tag chips → title (42px) → subtitle → avatar + author + Follow · `N min read · date` → clap/comment/share bar | (not captured) |

Observations:
- Measure clusters at **680–728px** (Medium 680, Vercel 680, Ghost 720, Bear 720, Substack 728). Only Linear (620) and Overreacted (632) go narrower, and they use larger body type. Recommend 44rem (~704px) at 18px.
- Title sizes: 36px (personal blogs) to 56px (Ghost, Anthropic). Everybody keeps the title **left-aligned inside the measure** except Linear and Anthropic (centred). Centred headers only look good with short titles.
- The byline row is the most consistent component: **avatar (40–56px) + name on line one, date · reading time on line two** (Ghost, Substack, Medium). Stripe adds role. Vercel stacks multiple avatars for co-authors.
- Hero image placement splits: inside the measure (Substack, Anthropic, Linear) vs wider than the measure (Ghost 1120–1200px). Both work; wide heroes need the image to be good.
- Reading time appears in Ghost, Medium, Vercel, PaperMod, Quartz and not in Substack, Linear, Stripe. Treat it as optional.
- Footers: the two things that recur are **"Read more" cards** (Ghost, Anthropic) and a **subscribe box** (Ghost, Substack, Stripe, Tailwind). Prev/next links are rare on these commercial sites but standard on SSG themes (PaperMod, AstroPaper). Author cards are rarer than expected: Ghost puts the author in the header only.

## 4. Synthesis — what the evidence says about the hypothesis

Hypothesis under test: fields are user-configurable (frontmatter → fixed card slots: title, summary, date, image, authors + 1–2 custom meta) and layouts are a small fixed menu: `list`, `magazine`, `cards`, `people`, `compact`.

1. **Fixed slots: confirmed, and five is the right number.** Across 40+ listings, cards never show more than: eyebrow (category / date / series), title, summary, meta line (date · authors · read time / role / location), image. Vercel proves image is optional; Overreacted proves authors is optional; Bear proves summary is optional. Custom meta fields appear only in the eyebrow or meta line (episode number, location, role, price). So: `eyebrow`, `title`, `summary`, `meta[]`, `image`, plus `authors[]` rendered as avatar stack + names.
2. **`magazine` is not a layout.** Every magazine example is "one featured card + the normal grid" (Casper, Source, Headline, Lenny, Slow Boring, Tyler, Anthropic). Substack models it the same way: hero mode × feed mode. Replace with a `featured` knob (`0 | 1 | n`) that works on both `list` (Substack list mode, Noahpinion) and `grid`.
3. **`cards` and the blog grid are the same component.** Linear customers vs Linear Now, Vercel templates vs Vercel blog, Astro themes vs Astro blog: same card, different image ratio and the date slot empty. Rename `cards` to `grid`; let `image.ratio` and the slot mapping do the rest.
4. **`people` stays.** The card content order is different (image → name → role → bio → links), the grid is denser (4-up), the image is square or circular, and grouping by section is common (YC, Linear's two tiers). It earns its own layout.
5. **`compact` stays and grouping by year is the default.** Bear, Gwern, PG, Anthropic's table, Luma's day groups and Tailwind's date gutter all point to "date + title" rows with an optional second column, grouped by a time unit.
6. **New knob: `group`.** Used by people (section), events (day), archives (year), docs (section). Values: `none | year | month | day | <field>`.
7. **Mobile is settled.** List rows keep a small right thumbnail (Substack 88px, Luma 90px, Acquired 75px square); grid cards stack to one column; people go 2-up (Linear) or avatar-left rows (Obsidian). Nothing needs a separate mobile layout.
8. **Filters/tabs are universal on commercial sites** (Linear, Vercel, Stripe, Acquired, Instrument) but out of scope for v1; the layout must simply leave room for a chip row under the page title.

Verdict: keep the small-menu idea, but change the menu from `list / magazine / cards / people / compact` to `list / grid / people / compact` with three knobs `featured`, `group`, `image`.

## 5. Recommended view menu and specs

Common config (frontmatter of the listing page or a `listing:` block):

```yaml
listing:
  source: blog/            # folder or glob
  layout: list             # list | grid | people | compact
  featured: 0              # 0 | 1 | 3 (first n items, or items with `featured: true`)
  group: none              # none | year | month | day | <frontmatter field>
  image: thumb             # none | thumb | cover ; ratio: 16/9 | 3/2 | 1/1 | 3/4
  sort: date desc
  fields:                  # slot mapping; defaults shown
    eyebrow: category      # any frontmatter key (or "date")
    title: title
    summary: description   # falls back to first paragraph
    date: date
    image: image
    authors: authors
    meta: [readingTime]    # 0–2 extra keys shown in the meta line
```

Slot rendering rules: `eyebrow` (13px uppercase/semibold, muted) · `title` (link) · `summary` (muted, line-clamped) · meta line = `date · authors · meta[]` joined with `·` (13–14px muted) · `authors[]` = avatar stack (20px, overlapping) + names, "and N others" after two · `image` positioned by layout.

### `list` (default) — blog feed, notes, podcasts, events

- Row: text block left, thumbnail right (`image: thumb`, 3:2, 160px wide; 88px on mobile). With `image: cover` the image sits above the text at 16:9 (Ghost Source mobile style). With `image: none`, rows become Overreacted/PaperMod style.
- Order inside the text block: eyebrow (optional) → title (1.25rem, semibold, 2-line clamp) → summary (1rem, muted, 2-line clamp) → meta line.
- Rows separated by 1px rule; 24px vertical padding; max width = post measure (44rem) so list and post pages share a column (Ghost Edition, Substack).
- `featured: 1` renders the first item as a split hero above the list: image 16:9 left (58%), eyebrow + title (2rem) + summary + meta right, vertically centred (Ghost Headline, Substack feature). On mobile the hero stacks image-top.
- `group: day|month|year|<field>` inserts a heading row (h2, 1rem semibold, muted) and, for `day`, Luma-style sticky date labels are a later nicety.
- Breakpoints: single column everywhere; only the thumbnail size changes (<640px → 88px).

### `grid` — blog cards, projects, customers, docs index ("magazine" with `featured: 1`)

- Card: image (16:9 default; `ratio` configurable; 1px hairline border and 6–8px radius via theme vars) → eyebrow → title (1.25rem, 3-line clamp) → summary (0.9375rem muted, 3-line clamp) → meta line with avatar stack.
- No card background by default (Linear, Casper); themes can set `--fs-card-bg` and `--fs-card-border` to get Vercel/Astro-style boxed cards.
- Columns: `repeat(auto-fill, minmax(var(--fs-card-min, 280px), 1fr))` → 3 at ≥1024, 2 at ≥640, 1 below; gap `--fs-card-gap` (32px desktop, 24px mobile). Container = site content width (not the post measure).
- `featured: 1` renders the first item as the split hero (same component as list) spanning all columns; `featured: 3` renders the first three as a 3-up row with card backgrounds and excerpts, then the rest as plain cards (Vercel). Pick one for v1: `featured: 1`.
- `image: none` collapses the image slot and keeps the rest (Vercel text grid, Linear docs with icons).
- Projects: set `fields.eyebrow: client`, `fields.date: none`, `image.ratio: 1/1` or `3/4`; the card is unchanged.

### `people` — team, contributors, speakers, directories

- Card: image (1:1 by default, object-fit cover; `--fs-avatar-shape: 50%` for circles) → name (1.0625rem semibold) → role (0.875rem muted) → bio (0.875rem, 2-line clamp, optional) → links row (small icons or text links, optional).
- Slot mapping defaults: `title: name` (falls back to page title), `eyebrow: none`, `summary: bio`, `meta: [role]`, `image: avatar | image`, `links: links`.
- Columns: 4 at ≥1024, 3 at ≥768, 2 below (Linear mobile). Gap 24px. Optional `density: compact` renders avatar-left rows (Obsidian mobile, YC) for bio-heavy directories.
- `group: team|section` renders section headings (YC). Later: a "more people" name-only list for the long tail (Linear).

### `compact` — archive, changelog, references, talks

- Row: date (tabular numerals, fixed 6–7em column, muted) → optional meta column (category) → title. Single line; title wraps with a hanging indent (Bear).
- `group: year` by default: a year heading (1.5rem bold) + hairline per group (Bear/Gwern feel, Anthropic rigour). `group: none` gives the PG/Anthropic flat table.
- Max width = post measure. No images, no summaries (a `summary` could show as a tooltip or second line later).

### What to cut or defer

- Cut: `magazine` and `cards` as layout names; newspaper (3-column) layouts; masonry; mixed-size tiles (Pentagram/Instrument); "Most Popular" rows (needs analytics).
- Defer: category/tag chip filters and search (v2, pure client-side); grid/list toggle (99pi, Instrument); sticky day labels; per-item play/download affordances; `featured: n > 1`.

### CSS custom properties themes should get (keep it to these)

- `--fs-listing-max-width` (default `var(--fs-content-width)` for `grid`/`people`, `var(--fs-prose-width, 44rem)` for `list`/`compact`)
- `--fs-card-gap` (32px) and `--fs-card-min` (280px; drives column count)
- `--fs-card-radius` (8px), `--fs-card-border` (1px solid color-mix of fg at 12%), `--fs-card-bg` (transparent)
- `--fs-card-image-ratio` (16/9) and `--fs-thumb-width` (160px; 88px on mobile)
- `--fs-avatar-shape` (border-radius for people/author avatars; `50%` or `var(--fs-card-radius)`)
- `--fs-meta-color` (muted foreground) and `--fs-eyebrow-color` (accent or muted)
- Everything else (font families, sizes, link colour, hairline colour) should come from the theme's existing tokens; semantic classes (`.fs-listing`, `.fs-listing--grid`, `.fs-card`, `.fs-card__image|eyebrow|title|summary|meta|authors`, `.fs-group-heading`, `.fs-card--featured`) let themes restyle without new variables.

## 6. Blog post page spec

Header (top to bottom, left-aligned inside the measure, centred column):
1. Eyebrow: category or breadcrumb (`Blog / Category`), 13px semibold, muted or accent. Optional.
2. Title: `h1`, 2.5–3rem (clamp with viewport), tight leading, left-aligned. Centred only if the theme opts in (Linear/Anthropic look).
3. Dek / subtitle: `description` frontmatter, 1.25rem, muted (Substack, Ghost, Every).
4. Byline row: avatar 40px (stack for multiple authors) + author name(s) on line one; `date · N min read` on line two, 14px muted (Ghost/Substack/Medium). Role shown if present (Stripe). Share button right-aligned is a later nicety.
5. Hero image: `image` frontmatter, 16:9, inside the measure by default; theme var `--fs-hero-bleed` lets Ghost-style themes widen it to ~1120px. Caption from `imageCaption`/alt. Optional.
6. Body at 1.125rem/1.65 (serif or sans by theme), measure 44rem (~700px), matching the cluster at 680–728px.

Footer (after the body):
1. Tags row (chips) — v1.
2. Author card(s): avatar 56px, name, bio, links (from an authors collection or `authors:` frontmatter resolved to people pages) — v1 if the authors collection exists, else skip silently.
3. Prev / next: two half-width links with "← Previous" / "Next →" labels and titles — v1 (standard in SSG themes, cheap, aids navigation).
4. "Read more": 3 cards from the same collection (same tag first, else most recent), rendered with the `grid` card component — v1 (Ghost, Anthropic; biggest engagement win).
5. Subscribe / CTA block: optional, configurable HTML or form embed — v2.
6. Comments (Giscus/etc.), share buttons, reading progress, floating TOC — v2/later.

v1 vs later summary: v1 = header items 1–6, footer items 1–4. Later = share, subscribe, comments, TOC, hero bleed per post, reading-time toggle per site (default on, since it costs nothing).

## 7. Surprises and notes

- Linear retired `/blog` into `/now`, a single feed mixing changelog, launches, team posts and press with category tabs: a direct precedent for a multi-collection listing with chips.
- Vercel's blog grid has no images at all and remains one of the best-looking; images are a knob, not a requirement.
- Substack's settings literally separate "hero" from "feed"; this is the cleanest external validation of replacing `magazine` with a `featured` knob.
- Anthropic uses a bare HTML table as its news archive; `compact` is not a compromise, it is what large sites choose.
- Medium publication pages are effectively empty without JavaScript and login; Medium was dropped as a listing reference.
- Author cards in post footers are rarer than assumed; the byline in the header does that job on most sites. "Read more" cards and subscribe boxes are the common footer elements.
- Mobile thumbnails survive on every good list (Substack 88px, Luma 90px, Acquired 75px); do not drop images on mobile.
- Many "best" sites are unusable as references on first load because of consent dialogs (Verge, Atlantic, TED, Eventbrite); their card anatomy is fine, their first screen is not.

Sources consulted beyond screenshots: Substack layout announcement (https://on.substack.com/p/new-tools-layout-options), Substack customisation guide (https://on.substack.com/p/guide-website-customization-organization), Ghost Source changelog thread (https://forum.ghost.org/t/source-our-new-default-theme-ghost-changelog/41670), Casper README (https://github.com/TryGhost/Casper).
