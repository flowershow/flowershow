---
title: Social preview cards — design (phase 2: images and variety)
status: APPROVED 2026-10-26 (decisions below)
builds-on: 2026-10-03-social-preview-cards-design.md (phase 1, shipped in #1432)
bead: flowershow-d8v.1 (2b: flowershow-d8v.2); related flowershow-e1x, flowershow-tpg
research: https://github.com/rufuspollock/ux-patterns/blob/main/seo-preview-images/per-page-variation.md (previews on the inner pages of 26 blogs, docs sites and wikis)
---

# Social preview cards: phase 2

## Problem

Phase 1 gave every page a generated text card. A survey of how 26 blogs, docs sites and wikis vary their previews page by page shows three gaps still left in the chain (`resolveSocialImage` in `lib/social-preview.ts`):

1. **Free sites never show a page's own image.** A post with a featured `image` still gets the text card. On the sites that preview best (Cloudflare, Every, Luma, the Flowershow blog itself) it's the page's picture that does the work.
2. **On premium sites, a site-wide `image` beats the per-page card.** Once a site sets `image` in config, every page without its own image shows that one picture. This is the weakest pattern in the survey (MDN, Anthropic news): the preview tells you nothing about the page.
3. **Page images are used raw and unresolved.** A 3:2 woodblock cover or a portrait photo gets cropped by each platform, and the title isn't on the card. Worse, `metadata.image` is the raw frontmatter string: a relative path or a wikilink can reach `og:image` as a broken URL today. No size is emitted either.

Two smaller gaps. Neither blocks the work; each is a separate item below:

4. **Wiki and docs cards all look alike.** The best docs cards (Next.js, Mintlify, Tailwind) add a **section line** ("Getting Started", "Formatting"). That one line is enough to tell pages apart.
5. **The card ignores the site's theme.** It always has an orange strip and Source Serif. The docs cards people recognise (Astro, Stripe, Obsidian) use the site's own colours and fonts.

## Principles (carried over from phase 1)

- Internal complexity is cheap; complexity users see is expensive. **No new frontmatter or config fields** in phase 2. Controls stay in phase 3.
- No hidden behaviour. A computed image is stored in metadata and flagged in `metadata.computed`, like a computed `description`.
- A preview should never be broken. Every step falls back to the next.

## Design

### 1. New resolution order (same for free and premium)

| # | Case | `og:image` |
|---|---|---|
| 1 | Password-protected site | Site-only card (unchanged) |
| 2 | Page has frontmatter `image` | **Image card** (section 2). Raw only if the image already looks like a social card (section 3) |
| 3 | No `image`, but the page has a usable first image | Same as row 2, using the computed image (section 4) |
| 4 | Otherwise, premium site with a site `image` | **Image card with the site `image` in the tile.** The brand picture stays, and the title varies per page |
| 5 | Otherwise | Generated text card (phase 1 layout plus section line, section 5) |
| — | Site `image` | Used **raw** only on the home page and the site-only card |

- Free and premium differ only in the Flowershow mark (free only), as in phase 1.
- The table replaces the `isPremium` branches in `resolveSocialImage` with one chain.

**Change in behaviour for premium sites that set a site `image`:** their inner pages switch from the bare site image to a card with that image in the tile and the page's own title (row 4). The brand picture is kept, but each page is now distinguishable. A site that really wants the bare image everywhere gets that back in phase 3 with `social.image`. Call it out in the changelog.

### 2. Image card layout

Phase 1 left two candidates to test: Substack's **band** (image on top, title below) and **Cover** (title over the image). The survey adds a third:

- **Split** (Luma, Cloudflare, Vercel): title, description and site identity on the left, as in the phase 1 card. The image sits in a framed tile on the right, cropped to fit the tile (`objectFit: cover`, centred).

**Recommendation: Split.**
- It's the phase 1 card with the image added, so the text card and the image card read as one system.
- The title is never on top of the image, so no contrast problems.
- A portrait photo, a 3:2 print and a screenshot all fit a tile better than a full-bleed band.

Known weakness: platforms that crop to a square (WhatsApp, iMessage) cut into the left or right edge, and every layout suffers there. Keep the title block at least 72px from the left edge.

**Experiment before building**, as phase 1 planned: render all three layouts with Satori on about 10 real Flowershow pages with images. Include the Flowershow blog's woodblock covers, a screenshot-heavy docs page and a portrait photo. Pick one.

### 3. When to use an image raw

Some page images already are social cards: an author-made 1200×630 with the title on it (Josh Comeau, Every, Hugging Face). Wrapping those in another card looks wrong. Rule, with no field:

- **Raw** if the aspect ratio is between 1.8 and 2.05 and the width is at least 1000px.
- **Raw** if the size is unknown and the image came from frontmatter on a premium site. That's today's behaviour, and these are usually external, designed social images.
- **Image card** otherwise.

The size comes from the image file's own Blob row (`width`/`height`), not from the page blob. Look it up through `getImageDimensionsMap`, as the hero does (section 4b). Phase 1 never emitted image sizes. This adds them.

### 4. Computed first image (phase 1's phase 2 item, split across ingestion and metadata time)

`parseMarkdown` sees only `(markdown, path)`, and the image file may not be ingested yet, so the work is split in two.

- **At ingestion** (`parseMarkdown` in `apps/cloudflare-worker/src/queue-consumer.js`, plus its copy in `apps/flowershow/e2e/helpers/processing-utils.ts`):
  - Record the first candidate image path in the body as `metadata.image`, and add `"image"` to the existing `metadata.computed`.
  - Skip obvious junk: SVG, GIF, badge hosts (shields.io and the like), external URLs, and images inside callouts, tables or HTML blocks.
- **At metadata time** (section 4b): use the computed image only if the file exists on the site and is at least 400px on its shorter side. Otherwise fall through to the text card.
- **Backfill:** run the ingestion step over existing blobs before launch, as for descriptions.

Why filter: on Gwern and LessWrong the first image is a good preview when it's a figure, and a bad one when it's a tiny icon or a screenshot of a tweet. The filters cut most of the bad cases. Text is a better preview than a bad image.

**Other readers of `metadata.image`.** A computed image would also show up wherever `metadata.image` is read, so decide each reader explicitly:

| Reader | Decision |
|---|---|
| Post hero (`lib/post/hero.ts`) | Ignore a computed image. It already dedupes against the body (`bodyShows`), but be explicit |
| Listing cards (`rawListingImage` / `resolveListingImage` in `lib/listing/items.ts`) | **Use it.** A listing thumbnail from the first figure is a feature, the same as on Substack |
| Obsidian Bases cards | Use it, same reasoning |
| Changelog | Ignore it |

### 4b. Resolving and fetching images

- **Resolve first.** Both `generateMetadata` and the `/_og` route turn `metadata.image` into an absolute URL plus the file's blob (path, `sha`, `width`, `height`). They use the same helper the hero and listings use (`resolveListingImage`, plus the known-size lookup from `getImageDimensionsMap`). A relative or wikilink `image` therefore never reaches `og:image` raw. That fixes today's bug too.
- **Site images:** read straight from R2 by blob path, not over HTTP. There's then no SSRF surface and no 2MB `loadImageDataUri` cap. Downscale with sharp (or the existing image optimiser) to the tile size and convert to PNG or JPEG, because Satori can't decode WebP or AVIF.
- **External frontmatter images:** reuse the existing SSRF guard (https only, private IPs blocked after DNS, manual redirects). Accept PNG and JPEG only, with the existing size cap. Anything else falls back to the text card.
- **No SVG** in the tile.

### 5. Section line on text and image cards

A small uppercase kicker above the title, taken from the page's top-level folder:

- **Ship first:** the folder name, de-slugged and title-cased (`docs/config/x` → "Docs"). Compute it from the slug inside `toCardInputs`, so `generateMetadata` and the route hash the same thing with no extra query.
- **Later, if wanted:** the folder index page's `title`. That needs a lookup in both places that must stay in sync, so leave it out of phase 2.
- Omit it for root-level pages and for the home page.
- Clamp to 32 characters.

Wiki and docs cards then differ beyond the title, as on Next.js, Mintlify and Tailwind.

### 6. Theme presets (can ship separately, as phase 2b)

The card can't read a site's CSS: Satori takes inline styles, and custom CSS is arbitrary. So:

- **Official themes:** a small table in code maps each theme to `{ background, foreground, accent, headingFont }`, with the fonts bundled. Sites on an official theme get cards in its colours and fonts.
- **Custom CSS and the default theme:** keep the phase 1 look.
- No new fields. Site `social.background` and the like stay in phase 3.

### 7. Cache and version

- Bump `CARD_VERSION` to 2.
- Add `section`, the image's resolved URL, its blob `sha` and its size, and the theme name to `CardInputs`, so changing any of them changes `v`. The `sha` matters: an image replaced at the same path would otherwise keep a card cached immutably for a year.
- Image fetch timeout: 2.5s. On failure, render the text card (row 4) rather than a broken image card.

## Error handling

Unchanged in principle: image card fails → text card → site-only card → 302 to `config.thumbnail`. A failed computed-image extraction leaves `image` unset and never blocks ingestion.

## Testing

- **Unit:**
  - `resolveSocialImage`: every row of the new table, for free, premium and protected sites. Includes the regression case: a premium site with a site `image` and an inner page without one must get the per-page card (row 4).
  - Image resolution: a relative-path `image` and a wikilink `image` both give an absolute `og:image` with a size.
  - Raw-vs-card rule: aspect and size boundaries.
  - First-image extractor: fixtures for SVG, badge, image in a callout, external URL and a valid figure.
  - Metadata-time check: missing file, and an image under 400px.
  - The `v` hash changes when the image blob's `sha` changes.
  - Section derivation: index-page title, folder name, root page.
- **Route:** an image card returns a 1200×630 PNG. An image fetch timeout gives the text card.
- **Visual:** Storybook stories for the image card. Use the three experiment images: woodblock print, screenshot, portrait.
- **Manual:** opengraph.xyz, LinkedIn Post Inspector, and Slack, X, WhatsApp and iMessage unfurls on staging. WhatsApp and iMessage check the square crop.

## Rollout

1. Layout experiment (section 2). Pick a layout and record it in this doc.
2. Ingestion: computed image plus backfill.
3. Ship behind the existing `SOCIAL_CARDS_ENABLED` flag path, then staging, then our own sites (lifeitself.org, flowershow.app blog), then everyone.
4. Docs: update `reference/seo-social-metadata.md` (new order, site `image` = home only) and `reference/page-headers.md` (computed image). Changelog entry with before/after screenshots, including the note for premium sites.
5. Theme presets (2b) as a follow-up PR.

## Decisions (Rufus, 2026-10-26)

1. **A premium site's `image` on inner pages:** option (c). It goes in the image card's tile, next to the page's own title (row 4).
2. **Image card layout:** Split, pending the layout experiment (rollout step 1). If the experiment favours band or Cover, record why here before building.
3. **Theme presets:** ship separately, as phase 2b.
