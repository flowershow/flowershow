---
title: Auto-generated social preview cards — design (phase 1)
status: APPROVED 2026-10-04 (phase 1)
bead: flowershow-1o5
related: GH #943, #1020, #1144, #773, #709; flowershow-i11 (logo)
research: https://claude.ai/artifact/3tmaTdUqfPa4UR6aPcVa7d (Substack study, mockups rounds 1–2, phased plan)
---

# Auto-generated social preview cards: phase 1

## Problem

Sharing a Flowershow page gives a poor preview.

- **Free sites:** every page shares one generic image (`config.thumbnail`, a screenshot of the Flowershow landing page).
- **Premium sites without an image:** `og:image` is emitted with `url: null`, so the preview has no image.
- **Descriptions:** ingestion fills in a missing `title` but never a missing `description`, so most previews have no page-specific text.
- **Smaller bugs:** image sizes are hardcoded to 1200×630. `twitter:creator` is hardcoded to `@flowershowapp` on every user site.

## Principles

- **Internal complexity is cheap, complexity users see is expensive.** Phase 1 adds **no new frontmatter or config fields**.
- **No hidden behaviour.** Computed values are stored in page metadata and flagged as computed.
- Each phase ships something visibly better and teaches us something before the next one.

## Phases

| Phase | Users get | New fields |
|---|---|---|
| **1 (this spec)** | A generated card for every page (title, description, site identity). Descriptions are computed when missing. Metadata bugs fixed. | None |
| 2 | Images in cards. A missing `image` is computed from the first image on the page (Substack-style). The card layout uses the image: either Substack's in-app style (image band with the title below) or Cover (title over the image), chosen after testing on real pages. | None |
| 3 | Control: `social: {title, description, image}` frontmatter overrides (#1020), site `social.background` and `social.image` (premium), and possibly portrait "share as image" cards and SVG templates. | Yes, only if people ask |

Phases 2 and 3 are not specified here. The research and mockups behind them are archived in the research artifact.

## Phase 1 design

### 1. What goes in `og:image`

A pure function `resolveSocialPreview({ plan, page, site, isProtected })`:

| Case | `og:image` |
|---|---|
| Password-protected site | Site-only card: site name, tagline (site `description`) and logo. No page title or description. |
| Premium and page `image` set | Page `image` as-is (unchanged from today) |
| Premium and site `image` set | Site `image` as-is (unchanged from today) |
| Otherwise | Generated card. The Flowershow mark appears on free sites only. |

The title and description come from the page's `title` and `description`. In phase 1, both may be computed at ingestion (section 4). Free sites' frontmatter `image` keeps being ignored for previews until phase 2. That's no worse than today, and the generated card is already a big improvement.

### 2. Card route

- **URL:** `https://<site-host>/_og/<slug>?v=<hash>`.
  - Middleware rewrites it to `/api/og/[user]/[project]/[[...slug]]` before `ensureSiteAccess`, next to the raw-image bypass (`middleware.ts:217`). Crawlers have no cookies, so protected sites are handled inside the handler and always get the site-only card.
  - Node runtime, `ImageResponse` from `next/og`.
- **Cache:** when `v` matches the expected hash, `Cache-Control: public, max-age=31536000, immutable`. Otherwise `max-age=300`, so random `v` values can't fill the cache with long-lived entries.
- **Hash:** `sha1(blob.sha + siteName + site description + logo + plan + CARD_VERSION)`, first 10 characters. Bump `CARD_VERSION` whenever the design changes.
- **Missing pages:** if the blob is missing or `publish: false`, serve the site-only card (200), so the route doesn't confirm whether a page exists.

### 3. `SocialCard` component

- **File:** `components/og/social-card.tsx`. A pure function of `{ siteName, logoSrc, title, description, displayUrl, showMark }`.
- **Layout:** Editorial (mockup round 1, design A):
  - light warm-white background with a thin accent strip on the left;
  - site logo and name at the top;
  - Source Serif 4 600 title, stepping down from 76 to 64 to 54px for long titles;
  - Inter description, clamped to two lines;
  - URL bottom left;
  - mark bottom right (free only).
- **Accent:** one fixed colour, with no setting.
- **Mark:** the Flowershow logo plus "Flowershow". It switches to the new logo once `flowershow-i11` is done.
- **Fonts:** bundled `.woff` files (Source Serif 4 600, Inter 400/600), read once per server instance.
- **Logo:** fetched with a timeout of about 1.5s. Only PNG, JPEG and SVG are used. Anything else, a failure or no logo gives a monogram: the first letter of the site name, or the site's emoji favicon.
- **Site-only card:** the same layout, with the site name as the title and the site `description` as the description.

### 4. Ingestion: computed `description`

- `parseMarkdown` (`apps/cloudflare-worker/src/queue-consumer.js:326`) fills in `metadata.description` when frontmatter has none, the same way it already fills in `title`.
  - It is built from the first prose paragraph after frontmatter and any leading H1, skipping callouts, embeds, code, tables, lists and HTML.
  - The paragraph is converted to plain text (wikilinks and links become their text) and cut at a word boundary to 160 characters or fewer, with "…" added.
- It records which fields were computed: `metadata.computed: ["title", "description"]`.
- The page header doesn't show a computed description, because it would repeat the paragraph directly below. Everything else (card, meta description, listings, RSS, search) uses it like any other description.
- **Backfill:** a one-off job runs the same function over existing blobs before launch.

### 5. Page metadata (`generateMetadata`)

- Build `og:*` and `twitter:*` from `resolveSocialPreview`. Never emit an empty image URL.
- Width and height:
  - Generated cards: 1200×630.
  - Author images: the blob's `width` and `height` when known, otherwise leave them out.
  - `alt` is the page title.
- Remove the hardcoded `twitter:creator`.
- The layout-level fallback metadata (`layout.tsx:31-65`) uses the site-only card instead of the Flowershow thumbnail.

## Error handling

- If a card fails to render, the handler falls back to the site-only card. If that also fails, it redirects (302) to `config.thumbnail`. A preview should never be broken.
- Logo fetch failures are silent and fall back to the monogram.
- If description extraction fails, the field is left unset, as today. It must never block ingestion.

## Testing

- **Unit:**
  - `resolveSocialPreview`: every row of the table.
  - The hash: stable for the same inputs, changes with each input.
  - The description extractor: fixtures for callouts, wikilinks, H1-only, code-first, list-first and frontmatter-only pages.
  - The page header hides a computed description.
- **Route:**
  - Returns `image/png` at 1200×630.
  - A protected site never passes the page title to the card (sentinel test).
  - A wrong `v` gives the short cache header.
  - A logo that fails to load gives the monogram.
- **Visual:** a Storybook story for `SocialCard` with fixtures (logo, no logo, long title, no description, protected, free and premium).
- **E2E:** a free page's `og:image` points to `/_og/...?v=` and fetching it returns a PNG. A page with no description has an auto-filled meta description.
- **Manual:** opengraph.xyz, LinkedIn Post Inspector, and Slack, X and iMessage unfurls on staging.

## Rollout

1. Deploy the ingestion change and run the backfill.
2. Ship the cards behind the env flag `SOCIAL_CARDS_ENABLED`, then staging, then our own sites, then everyone. Platforms keep their cached previews until they re-scrape.
3. Docs:
   - Update `reference/seo-social-metadata.md` (it currently says free sites always get the Flowershow thumbnail) and `reference/page-headers.md` (descriptions are computed when missing).
   - A changelog entry with a screenshot.
4. Comment on #943 with what shipped and what phase 2 will add.

## Open questions

None blocking. Phase 2 starts with an experiment: render both image layouts (Substack-style band and Cover) on a sample of real Flowershow pages with images, and pick one.
