---
title: Link previews with the picture on the left (phase 2, revised)
status: APPROVED 2026-11-21 (Rufus OK'd layouts A and C)
bead: flowershow-wsbh (builds flowershow-d8v.1's core; d8v.1 stays for the computed first image and section titles)
builds-on: 2026-10-26-social-preview-cards-phase-2-design.md
---

# Link previews with the picture on the left

## Why

Rufus (2026-11-21): today's preview is "too plain"; he likes seedsofrenaissance.org's cards, with the picture on the left and text on the right. Audit of live previews:

- Free sites never show a page's picture; premium sites send it raw (often `.webp`, no size, cropped by each app). A Life Itself post sends a 1024×1024 square that wide unfurls cut to a strip.
- On premium sites with a site `image`, every page without its own picture shows that one image (flowershow.app's docs all show the home screenshot).
- The text card is a plain left-aligned layout with an orange edge and a run-on description.

Slack, X and iMessage draw the unfurl themselves (image on top, title below), so the layout change has to live inside the share image.

## Design

Two cards, 1200×630, warm paper (`#FAF8F3`), Source Serif title, Inter label and wordmark, orange label:

- **A, picture card:** the picture cropped to fill a 520px column on the left (about 43%; a third makes a strip, half pushes titles to four lines), a hairline seam, then on paper: the section label, the title (72 → 60 → 50px, three lines max), and at the foot a ruled line over the wordmark (logo + site name) and the domain. No description: apps print `og:description` under the image.
- **C, text card:** the label, a centred title and the wordmark inside a thin ruled frame, the domain at the foot. Centred, so WhatsApp's and iMessage's square crop keeps it.
- Free sites add the small Flowershow mark beside the domain, as today.

Mock-ups: link-previews session; the rendering script is the reference for sizes.

## Which preview a page gets (free and premium alike)

| # | Case | `og:image` |
|---|---|---|
| 1 | Password-protected site | Card C with the site name (no page data, no picture) |
| 2 | Page `image` that already looks like a share card (ratio 1.8–2.05, at least 1000px wide, size known) | The image as it is, with width and height |
| 3 | Page `image` | Card A with it |
| 4 | Home page with a site `image` shaped like a share card, or of unknown size (a dashboard upload or an external URL) | The site image as it is |
| 5 | Site `image` | Card A with the site image and the page's title |
| 6 | Otherwise | Card C |

- A picture is a site file (resolved like the post hero: relative paths, `/`-paths and `[[wikilinks]]`, with a known size, at least 400px on its shorter side) or an external `https` image. Site files are read from storage; external ones go through the existing SSRF guard. Anything that fails to load gives card C.
- The home page's card title is the site name, not "Home".
- The section label is the page's top-level folder, de-slugged and title-cased (`blog/x.md` → "Blog"); none for root pages or a folder's own index page.

## Answers to Rufus's questions (2026-11-21)

- **A default picture so every card is A:** yes, the site `image` already does this (row 5); nothing new to configure. A Flowershow-supplied picture for sites with none is flowershow-tpg (a public-domain pool picked per page); not in this change.
- **A separate "SEO image" field:** no. A hand-made share card set as the page `image` is used as it is (row 2); a site-wide raw image on every page is the failure we're removing.

## Build notes

- `CARD_VERSION` 2. `CardInputs` gains `section` and `image` (src plus size), so `v` changes with them. Known gap: an image replaced at the same path with the same size keeps its cached card until the page changes.
- Cards render as JPEG (photos as PNG run near 1MB).
- `sharp` becomes a direct dependency of the app (already installed via Next).
- Docs: `reference/seo-social-metadata.md`. Changelog entry with a screenshot.
