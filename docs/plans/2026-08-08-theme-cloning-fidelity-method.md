# Theme Cloning: Fidelity Method and Learnings

Status: **in progress**, started 2026-08-08.
Working repo: `flowershow/themes`, branch `draft/new-themes`.

This is the restart-from-cold document for the theme-authoring work. If you're
picking this up in a new session, read this first.

## What we're doing, in order

1. **Build 2–3 new themes** by cloning real sites. Currently targeting
   mkdocs-material and code.storage.
2. **Derive the docs/tutorial/AI-skill for theme authoring from that
   experience** — written from what actually broke, not written first.
3. **Structural analysis of Flowershow core**: as (1) hits walls that CSS
   can't fix, decide whether Flowershow needs real layout options.

Separately tracked, not this doc: blog/list quality
(flowershow/flowershow#923, #1120, #1222).

## The two-stage method (adopted 2026-08-08, after stage-1 failure)

**Stage 1 — reproduce the target as standalone Tailwind + HTML.** Iterate
until fidelity is genuinely good. Cheap and fast to iterate; no Flowershow
deploy in the loop.

**Stage 2 — extract the achieved look into an actual Flowershow theme.**
Only once stage 1 looks right.

Rationale: the first attempt skipped stage 1 and went straight to writing
theme CSS. Result was two themes that looked nothing like their targets.

## The failure that caused this method change

First attempt (themes `material-draft/`, `codestorage-draft/`) produced
CSS that passed every structural check and resembled nothing.

Root cause: **values were read from the target's source, but the rendered
result was never compared against the rendered target.** Verification
answered "does this CSS load, are the tokens defined" and never "does this
look like the thing".

Concrete errors this let through:

- Built the material theme on mkdocs-material's **library default** indigo
  palette. The actual reference site's CTA is crimson `#dd2e57`. Never
  looked at the site to notice.
- Cloned only the *typographic* layer and ignored that the landing page is
  the thing that carries the brand — full-bleed parallax hero, alternating
  dark `#1e2129` / white sections, 1220px grid.
- Judged codestorage's font as "not applying" from a screenshot; computed
  styles showed it was applying fine. **Screenshots at high compression are
  not reliable evidence for type; use `getComputedStyle`.**

**Rule going forward: no theme is "done" until its render has been compared
side-by-side against the target's render.** Structural checks are necessary
and not remotely sufficient. This is exactly the judgement-vs-structure split
written into `themes/CLAUDE.md` — which was written and then not followed.

## Reference data captured so far

### mkdocs-material (https://squidfunk.github.io/mkdocs-material/)

Measured from the live site, not from source:

| Property | Value |
| --- | --- |
| Header | 48px tall, transparent over hero, `#4051b5` when scrolled |
| Nav tabs | separate 32px row under header |
| Grid max-width | 1220px (`.md-grid`) |
| Font | Roboto |
| Hero h1 | 32px / 700 / lh 41.6px / ls -0.32px / white |
| Hero body | 16px / lh 25.6px |
| Primary CTA | bg `#dd2e57`, radius 2px, padding 10px 32px, 16px |
| Section h1 | 32px / 700 |
| Section h2 | 25px / 700 |
| Dark section bg | `#1e2129`, fg `rgba(226,228,233,0.82)` |
| Light section bg | `#ffffff`, fg `rgba(0,0,0,0.87)` |
| `--md-primary-fg-color` | `#4051b5` |
| `--md-accent-fg-color` | `#526cfe` |

Landing page = 7 alternating parallax groups:
hero → dark "Everything you would expect" (6-item feature grid, flex, gap
32px, each item flex row gap 12px) → white "More than just a static site"
(4 alternating image/text spotlights) → dark "Trusted in the industry" →
white "What our users say" → dark "Become a sponsor" → footer.

**Parallax technique** (this is the reusable part):
- `.mdx-parallax` has `perspective: 50px`
- each layer: `translateZ(-N)` with compensating `scale((50+N)/50)`
- measured layers: -400/scale 9, -250/scale 6, -100/scale 3, -50/scale 2
- layer images are square (100vw × 100vw), `object-fit: cover`, with
  per-layer `object-position` (70%/25%/40%/50% × 50%)
- top layer `.mdx-parallax__blend` = `linear-gradient(transparent, #1e2129)`
  at z-index 10 — creates the dark band the hero copy sits on and blends
  into the next section

### code.storage (https://code.storage/)

| Property | Value |
| --- | --- |
| Font | BerkeleyMono (commercial) — everything, including body |
| Body | 12px / lh 24px |
| h1/h2 | same 12px as body, differentiated by weight 700 only |
| Colors | near-monochrome, `#f5f5f4`-ish bg, `#17171a` fg |
| Links | no underline by default, no color pop |
| Radius | 0 everywhere |
| Layout | narrow left text column, illustrations right |

Note: headings on the reference are prefixed with literal `#` / `##` markers
as visible page content.

## Licensing constraints found

- **mkdocs-material's hero artwork is bespoke and must not ship** in a
  Flowershow demo or theme. Referenced in the local repro only as a stand-in
  for fidelity comparison. Any shipped version needs original art.
- **BerkeleyMono is commercial** and cannot be `@import`ed in an open theme
  repo. Substituted IBM Plex Mono. Users with a license can override
  `--font-body` themselves.

## Gotchas that cost real time (read before writing a theme)

All found by rendering, none discoverable from the theming docs.

1. **Callouts are styled by DATA ATTRIBUTES, not classes.**
   `[data-callout]`, `[data-callout-type="note"]`, `[data-callout-title]`,
   `[data-callout-body]`. Class selectors like `.callout` / `.callout-note`
   match *nothing*. An earlier draft used them and silently did nothing.

2. **Bare attribute selectors tie the base rules and lose.**
   Base rules are `[data-callout]` (specificity 0,1,0). A theme rule with the
   same selector ties and does not reliably win. Scope to
   `.rendered-mdx [data-callout]` (0,2,0).

3. **`--navbar-height` is a lie.** `.site-navbar-inner` hardcodes
   `height: 4rem` and never reads the token, despite `default-theme.css`
   commenting the token as "override these to change sticky positioning
   throughout". To change navbar height you must override the class.

4. **Inline code gets literal backtick pseudo-elements** from
   `@tailwindcss/typography`. They are not in the DOM. Worse, the generated
   rule carries `!important`, so `content: none` loses at any specificity —
   you need `content: none !important`. This contradicts `docs/theming.md`,
   which says the cascade-layer setup means themes never need `!important`.

5. **The navbar does not render at all unless configured.** Flowershow shows
   it only if nav title, nav links, CTA, social links, or search is set. A
   demo site without those has no navbar, so navbar styling is invisible and
   the theme looks broken. `nav` is an **object** (`{title, links, social,
   cta}`), not an array — see `layout.tsx`. `_demo-content/config.base.json`
   now covers this.

6. **Two independent caching layers will lie to you.**
   - *jsDelivr branch URLs*: `@branch/...` updates unevenly across edges.
     One edge served new CSS while the browser's edge served a stale copy,
     surviving both `cache: 'reload'` and a cache-busting query. **Fix: pin
     to the commit SHA.** `scripts/demo-site.sh` now does this automatically.
   - *Flowershow page render*: after `fl` publish, the served HTML keeps the
     previous config (and so the previous theme URL) for a while. Poll until
     the page HTML contains the current SHA before judging anything:
     ```sh
     SHA=$(git rev-parse HEAD)
     until curl -s "$SITE/docs/kitchen-sink?x=$RANDOM" | grep -q "$SHA"; do sleep 5; done
     ```
   Between them, a correct theme can look completely unapplied. Verify the
   page is actually serving the SHA you just published before debugging CSS.

## Structural findings for Flowershow core (thread 3)

Logged as found; not yet filed as issues.

- **`leaf/theme.css` is silently broken today.** It sets `--color-primary`
  and `--color-primary-subtle`, which exist only in `dashboard.css` (internal
  app UI), not in the public-site token API in `default-theme.css`. Those
  rules are no-ops on live sites. No CI would have caught this.
- **No tabbed-content-block component** — mkdocs-style content tabs can't be
  cloned at all.
- **No prev/next page footer pagination.**
- The real L1 token surface is small: ~10 core tokens, with the 10-step
  foreground ramp and accent shades derived via OKLCH. That's why a theme can
  be 106 lines or 2700 — most of the 2700 is optional L2 class overrides.

Background analysis: [What's Actually Changeable in Flowershow Theming, and
by Whom](https://flowershow.app/blog/2026-08-08-whats-actually-changeable-in-theming)
(L1 tokens / L2 classes / L3 config / L4 component tree).

Related issues: flowershow/flowershow#1337 (themes gallery page),
#1338 (publish the semantic class list), #854 (themes epic).

## Infrastructure built

In `flowershow/themes` on `draft/new-themes`:

- `_demo-content/` — one fixed kitchen-sink page + 3-post blog, so themes are
  compared on identical content
- `scripts/init.sh` — checks `fl` CLI installed + authenticated
- `scripts/verify.sh` — structural checks + live HTTP smoke check against
  deployed demo sites
- `docs/features.yaml` — ledger; `passes` (structural) kept strictly separate
  from `fidelity` (judgement)
- `CLAUDE.md` (+ `AGENTS.md` symlink) — house rules and guard rails

**Demo site mechanism**: `fl <dir> --name <id> --yes`, with `config.json`
pointing `theme` at a jsDelivr URL scoped to the branch
(`https://cdn.jsdelivr.net/gh/flowershow/themes@draft/new-themes/<dir>/theme.css`).
`getThemeUrl()` accepts a full URL, so drafts can be demoed without any
official release. Purge CDN cache via
`curl -X POST https://purge.jsdelivr.net/ -d '{"path":[...]}'`.

Current demo sites (stage-1 quality, do not treat as good):
- https://material-theme-demo-rufuspollock.flowershow.me
- https://codestorage-theme-demo-rufuspollock.flowershow.me

## Open questions

1. Where do the authoring tutorial and AI cloning skill live — this repo,
   main flowershow docs, or `flowershow/skills`? Deferred until there's real
   experience to write from.
2. Does the landing-page repro get published as a Flowershow demo site using
   raw HTML (Flowershow supports HTML pages), with the theme handling only
   the non-landing pages? That's the current working assumption from the
   two-stage plan.
3. What original artwork replaces the parallax illustration?
4. Is model/tool fidelity the bottleneck for visual cloning, or was the
   bottleneck simply not looking? Evidence so far points to the latter — the
   method error, not capability.
