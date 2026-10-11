# Post page layout (PR F): implementation plan

Status: v2, 2026-10-11 (v2 folds in the adversarial review; see "Changes after review" at the end, which supersedes the sections above where they disagree). Implements section 10 of `docs/plans/2026-10-10-listing-pages-design.md` ("Post page layout, follow-up PR F") on top of the listing engine merged in #1458/#1459. File paths are relative to `apps/flowershow/` unless stated otherwise. Moodboard: `docs/plans/2026-10-10-listing-pages-research/findings.md` §3 and §6.

## 1. Goal

An individual blog post on Flowershow should look like a post on Ghost, Substack or Medium out of the box: a centred reading column, a proper header (eyebrow, big title, dek, byline with avatars, hero image), and a footer that keeps the reader on the site (tags, previous/next, three "read more" cards drawn from the same collection). Zero config: a post in a `blog/` folder gets it with nothing to write. It must work for `.md` and `.mdx`, be server-rendered, stay inside the theme contract (semantic classes, `:where()` defaults, CSS custom properties) and not change pages that are not posts.

## 2. Which pages get the post layout

Today `BlogLayout` (`components/public/layouts/blog.tsx`) is not a blog layout at all: it is the default page header for **every** Markdown page (route `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`, the final `else` branch). `layout: blog` has no meaning (`components/public/layouts/index.ts` maps it but nothing reads the map). So "pages that already get BlogLayout" is every page, and the post layout needs its own, narrower trigger.

A page is a **post** when all of these hold:

1. It is a `.md`/`.mdx` page rendered by the default branch of the route: not a canvas, not `layout: plain`, not a changelog index/file/entry (the changelog entry page already has its own layout and prev/next), not a page-level listing (`layout: list`, a zero-config README or folder note), not a virtual page.
2. Either it has `layout: post`, **or** it has no `layout` at all and it is an item of a **collection** (below).
3. It is not the collection's own index page.

A **collection** is the nearest ancestor folder `A` of the page (excluding the site root) for which one of these holds, checked nearest-first:

- **Listed by `layout: list`**: the folder's index (`A/README.md(x)`, `A/index.md(x)`) or folder note (`A.md(x)` beside `A/`) has `layout: list`, and its listing's resolved `from` is `A` (a `layout: list` page that lists some other folder does not make `A` a collection).
- **Zero-config blog folder**: `A`'s last segment is `blog` or `posts` (`isAutoListingDirName`, any depth, any case), and its index/folder note, if any, has neither `list: false` nor a `layout` other than `list`. A README that lists posts its own way (`<List />`, a ```` ```blog ```` block, a Base) still makes `A` a collection: its posts are posts. This is the flowershow.app case (`blog/README.mdx`, `layout: list`) and the e2e test-site case (`blog/index.mdx` with `<List />`).

The collection's **listing spec** is the one its index page uses (`list:` options parsed by `parseListingSpec` with `source: 'layout'`, `defaultFrom: A`), or the zero-config default spec. Prev/next and read-more follow exactly that spec's `sort` and `where`, so a post's neighbours are the items next to it on its own index page.

Not posts, on purpose:

- **Dated pages elsewhere.** The design doc's "or any page with `date`" is dropped: docs pages carry `date` (e.g. `content/flowershow-app/docs/guides/publish-blog.md`), and turning every dated doc into a blog post would be a large silent change. `layout: post` covers dated pages outside a collection.
- **Root collections.** A root `README.md` with `layout: list` and no `from` lists the whole site; treating every page of the site as a post would be wrong. The root is never a collection.
- **Pages with any other `layout`** (`layout: page`, `layout: default`, imported Jekyll/Hugo values). Any `layout` value other than `post` opts a page out; the docs suggest `layout: page`. Today an unknown `layout` renders the default page, so this keeps every page with a `layout` exactly as it is.

Pure function, table-tested: `resolvePostRoute({ pagePath, metadata, siteFilePaths, hostMetadata })` in `lib/post/route.ts` returns `{ kind: 'none' }` or `{ kind: 'post', collection: { dir, options, source } | null }` (`collection: null` for a `layout: post` page outside any collection: header and tags only, no prev/next or read-more). `postHostPaths(pagePath, siteFilePaths)` lists the index/folder-note files that exist among the page's ancestors, so the route reads their frontmatter in **one** cached query (section 6) and only when there is at least one candidate. A cheap pre-check skips everything for pages with a non-`post` `layout`.

## 3. Page anatomy and markup

The post layout is a new server component, `components/public/layouts/post.tsx` (`PostLayout`), used by the route instead of `BlogLayout` for posts. It keeps the existing `.page-header-*` classes on every element that already has one, so every official theme and every `custom.css` that styles page headers keeps applying, and adds new classes for new elements only. All new default CSS goes through `:where()` (section 5).

```html
<div class="layout-inner …">
  <div class="layout-inner-center post-layout">           <!-- .post-layout: the column constraint -->
    <main class="page-main">
      <article class="post-page" data-layout="post">
        <header class="page-header post-header">
          <nav class="page-header-breadcrumbs post-eyebrow" aria-label="Breadcrumb">…Blog…</nav>   <!-- ancestors only; the current page is the h1 -->
          <h1 class="page-header-title">…</h1>
          <p class="page-header-description post-dek">…</p>                                       <!-- description (displayDescription: never the computed first sentence) -->
          <div class="page-header-metadata-container post-byline">
            <span class="page-header-authors-avatars-container post-byline-avatars"><img class="page-header-author-avatar post-byline-avatar" …></span>   <!-- 40px, up to 3 -->
            <div class="post-byline-text">
              <span class="page-header-authors-names-container post-byline-names"><a class="page-header-author-name">Ola Rubaj</a> and <span class="page-header-author-name">Guest</span></span>
              <span class="post-byline-meta"><time class="page-header-date" datetime="2026-09-18">September 18, 2026</time><span class="page-header-reading-time">4 min read</span></span>
            </div>
          </div>
          <figure class="post-hero">                                                                <!-- optional -->
            <img class="post-hero-img" …>                                                           <!-- next/image, eager, fetchPriority high -->
            <figcaption class="post-hero-caption">…</figcaption>                                    <!-- optional: imageCaption -->
          </figure>
        </header>
        <div class="page-body"><div class="rendered-mdx" id="mdxpage">…</div></div>
        <footer class="post-footer">
          <div class="page-header-tags post-tags"><a class="tag-pill" href="/tags/x">#x</a>…</div> <!-- optional -->
        </footer>
      </article>
      <nav class="post-nav" aria-label="More posts">                                               <!-- optional -->
        <a class="post-nav-link post-nav-link--prev" href="…" rel="prev"><span class="post-nav-label">← Previous</span><span class="post-nav-title">…</span></a>
        <a class="post-nav-link post-nav-link--next" href="…" rel="next"><span class="post-nav-label">Next →</span><span class="post-nav-title">…</span></a>
      </nav>
    </main>
    … edit link, backlinks, comments (unchanged) …
    <section class="post-read-more" aria-labelledby="post-read-more-title">                       <!-- optional, last -->
      <h2 class="post-read-more-title" id="post-read-more-title">Read more</h2>
      <section class="list-component list-component--grid not-prose" data-view="grid" …>…3 article.list-component-item…</section>
    </section>
  </div>
</div>
```

Details:

- **Eyebrow**: the existing breadcrumb trail without its last crumb (the current page is the h1 right below it), so a post in `blog/` reads `BLOG` and links back to the index, and a post in `blog/guides/` reads `BLOG › GUIDES`. Same `pageHeaderBreadcrumbs` data and `showBreadcrumbs` switch; `section:` still replaces the trail. Absent when there are no ancestors.
- **Title**: `h1.page-header-title`, `clamp(2.25rem, 1.6rem + 2.4vw, 3.25rem)`, leading 1.1, left-aligned.
- **Dek**: `displayDescription(metadata)` (the authored `description`; the computed opening sentence is never shown, as today), 1.25rem muted.
- **Byline**: authors resolved by the existing `getAuthors` call (same data as today), avatars 40px stacked (at most three), names joined "A, B and C" as today; line two is the date (`<time datetime>`, long form in the page/site `locale` via `Intl`, e.g. "September 18, 2026"; an unparseable date renders as written, as today) and the reading time when `showReadingTime` is on (unchanged default: off). No authors: the meta line alone. Nothing at all: no byline element.
- **Hero**: the `image` frontmatter (only `image`; the listing fallbacks `cover`/`heroImage`/`thumbnail` are listing-card conventions and are not promoted to a hero), resolved like listing images (`resolveListingImage`: wiki links, relative paths, http(s) only, image extensions only). Rendered with `next/image`, `sizes="(min-width: 768px) 44rem, 100vw"`, eager with `fetchPriority="high"` (it is the LCP element). Box ratio: the image's intrinsic ratio from the site's image-dimensions map, clamped to between 4/5 and 21/9, `object-fit: cover`; 16/9 when dimensions are unknown; `--post-hero-ratio` overrides. `alt` from `imageAlt`, else empty (the title is right above it); caption from `imageCaption`. **Skipped** when the body already shows the same image (the file name of the resolved image appears in the page body), when `showHero: true` (the full-width `Hero` component already shows it and, as today, replaces the page header), or with `showImage: false`.
- **Tags**: the frontmatter tag pills move from the header to the article footer (`showTags` still switches them off). The tag pill markup is unchanged.
- **Prev/next**: the two neighbours of the post in its collection's ordered index (the same cached index the collection's listing page uses). For `sort: date desc` (the default) "← Previous" is the older post and "Next →" the newer one, the changelog entry nav's convention; for any other sort they follow the list order. A missing side renders an empty placeholder so the other keeps its column. Absent when the post is not in the index (a draft, or filtered out by `where`).
- **Read more**: three items of the same collection rendered by `lib/listing/render.ts` as a `grid` listing (so the cards are exactly the listing grid cards, with the same classes, monogram rules and theme support). Selection: items sharing at least one tag with the post (most recent first in the collection's order), then the most recent others; never the post itself; prev/next are used only if nothing else is left. Fewer than three is fine; none renders nothing. Out of the ToC and anchors automatically: the section sits outside `#mdxpage`, and the card headings keep the listing renderer's placeholder-id / `data-toc-ignore` handling.
- **Author card**: deferred (design 10 lists it as v1 "only when the site has an authors collection"; the moodboard found it rarer than expected and the byline already links the author pages). Follow-up.

## 4. Width and the page grid

- `.post-layout` on `.layout-inner-center` constrains every direct child (main, edit link, backlinks, comments) to `--post-max-width` (default `var(--list-max-width, 44rem)`, so a list index page and its posts share one column), centred. `.post-read-more` gets `--post-wide-max-width` (default 64rem) so three cards fit; inside a narrower centre column (sidebar and/or ToC on) it takes the column width.
- Read-more grid columns: 3 when the section is at least 40rem wide (container query), 1 below (no 2+1 orphan). Implemented by setting `grid-template-columns` on `:where(.post-read-more) .list-component--grid` (theme rules on `.list-component[data-view="grid"]` still win).
- The ToC column is hidden on posts whose body has no ToC headings (`hasTocHeadings`, as page-level listings do), so a short post is centred rather than pushed left by an empty rail. Posts with headings keep the ToC exactly as configured. Sidebar unchanged.
- Body type: the design asks for 1.125rem/1.65. The prose size is theme territory (`.rendered-mdx` font sizes are set by the default theme and every official theme); v1 sets `font-size: 1.125rem; line-height: 1.7` on `:where(.post-page) .page-body`, which every theme rule on `.rendered-mdx`/`.page-body` overrides. To be judged on screenshots; dropped if it fights themes.

## 5. CSS (theme contract)

All in `styles/default-theme.css`, a new "Post pages" section after "Page layout". Every rule `:where(.post-page) …`/`:where(.post-…)`, so the specificity is at most one class and later than the `.page-header-*` defaults (which they override at equal specificity), while every theme rule wins. Custom properties, each with a fallback:

| Property | Default | Controls |
| --- | --- | --- |
| `--post-max-width` | `var(--list-max-width, 44rem)` | Reading column (header, body, footer, nav) |
| `--post-wide-max-width` | `64rem` | Read-more section width |
| `--post-hero-ratio` | intrinsic (clamped) or `16 / 9` | Hero image box ratio |
| `--post-hero-radius` | `var(--list-card-radius, 0.5rem)` | Hero corner radius |
| `--post-avatar-size` | `40px` | Byline avatar size |
| `--post-meta-color` | `var(--list-meta-color, var(--color-foreground-500))` | Byline meta line, prev/next labels |
| `--post-eyebrow-color` | `var(--color-accent)` | Eyebrow (breadcrumb) colour |
| `--post-rule-color` | `var(--list-rule-color, var(--color-foreground-100))` | Hairlines above the footer, prev/next and read-more |

`scripts/theme-class-reference.mjs` gains a "Post pages" group (the DOM tree above) and the generated `content/flowershow-app/docs/reference/theme-class-reference.md` is regenerated (`pnpm docs:theme-classes`); `pnpm lint` checks it.

Official themes (`/Users/rgrp/src/flowershow/themes`): checked on screenshots, not changed in this PR. Themes style `.page-header-*` unconditionally (lessflowery, letterpress, superstack restyle the header block, avatars and metadata; monospace prefixes the title with `# `); those rules keep winning, so a themed post looks like that theme's page header plus the new hero, footer and read-more. Anything that looks broken under a theme becomes a themes follow-up, listed in the PR.

## 6. Data and performance

Per post request, on top of today's page:

1. **Host frontmatter** (`lib/post/hosts.ts`): one `blob.findMany({ where: { siteId, path: { in: hostPaths } }, select: { path, metadata } })`, at most 4 paths per ancestor level, wrapped in `unstable_cache` (key: site + sorted paths, `revalidate: 60`, tag `siteId`, the same invalidation as the listing caches). Skipped when `postHostPaths` is empty and no ancestor is named `blog`/`posts`, and for every page with a non-`post` `layout`. Only `path` and `metadata` are selected (never bodies).
2. **Collection index**: `queryListingIndex` with the collection's spec, the existing cached ordered index (ids and paths only). Same cache key as the collection's own listing page, so a warm `/blog` warms its posts.
3. **Same-tag index** (only when the post has tags): `queryListingIndex` with `where: { tags: <post tags> }` added, cached the same way; bounded by the folder size, ids and paths only. Tags are capped at 10 for the key.
4. **Rows**: one `fetchRowsByIds` for at most 5 ids (3 cards + prev + next), metadata only.
5. **Authors of the cards**: `cachedResolveAuthors` (cached per site and handle set).

Everything is server-rendered; no client JavaScript is added. Failures in 2–5 are caught and drop the footer section (logged), never the post. The read-more grid's images are lazy, below the fold, and go through `ListingImage` (`next/image`), with the grid `sizes`.

## 7. Files

New:

- `lib/post/route.ts` + `route.test.ts`: `postHostPaths`, `resolvePostRoute` (table test: zero-config folder with and without README, `list: false`, `layout: list` with own and foreign `from`, folder note, nested folders, subfolder items, page bundles `blog/x/index.md`, collection index itself, `layout: post` inside/outside, `layout: page`/other layouts, root `layout: list`, changelog folders, case-insensitive `Blog/`, `.mdx`).
- `lib/post/neighbours.ts` + test: `postNeighbours(paths, self, sort)` and `pickReadMore({ paths, sameTag, self, avoid, n })`.
- `lib/post/footer.ts` + test (mocked db/cache, like `lib/listing/query.test.ts`): loads index, tag index and rows, returns `{ prev, next, readMore: ListingItem[] , authors }`; bounded row fetch asserted.
- `lib/post/hero.ts` + test: `resolvePostHero({ image, imageAlt, imageCaption, showImage, showHero, body, pagePath, files, siteHostname, dimensions })` → `{ src, alt, caption, ratio } | null` (duplicate-in-body, http-only, clamp).
- `lib/post/hosts.ts`: the cached host-frontmatter query.
- `lib/post/render.tsx` + test: `renderReadMore(items, authors, locale)` → React, via `renderListing` (grid spec, no pagination) and a minimal mdast → hast → React chain that maps `listingimage` to `ListingImage` and strips the placeholder heading ids (`rehypeListingHeadings`). Snapshot-style assertions on classes.
- `components/public/layouts/post.tsx` (+ `post-nav.tsx`) and a test with `renderToStaticMarkup` (header slots present/absent, tag footer, byline variants, hero skipping, nav labels).

Changed:

- `app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`: resolve the post route after the listing route, load hosts, pick `PostLayout`, add `.post-layout`, ToC rule, render nav and read-more.
- `styles/default-theme.css`: the post section.
- `scripts/theme-class-reference.mjs`, `content/flowershow-app/docs/reference/theme-class-reference.md`.
- `server/api/types.ts`: `PageMetadata` gains `showImage`, `imageAlt`, `imageCaption` (optional).
- Preview harness: `scripts/listing-preview/` gains post scenarios (a post with everything; no image; image duplicated in the body; multiple authors; no authors/no description; long title; `.mdx` post; a post inside a `layout: list` grid collection; a `layout: post` page outside a collection; mobile, dark and two official themes), a post renderer in `build.preview.tsx` using the real `resolvePostRoute` + `PostLayout` + footer loader over the fake db, and `capture.mjs` checks (column 704px at 1440, no horizontal scroll at 390, read-more 3 columns at 1440 and 1 at 390, hero inside the measure, avatars 40px).
- e2e: `e2e/fixtures/listings-demo` gains tags/images on a few blog posts and an `.mdx` post; new `e2e/specs/post-page.spec.ts` (header slots, prev/next hrefs and labels, read-more 3 cards with the same tag first, `.md`/`.mdx` parity, a non-post page unchanged, `layout: page` opt-out, `layout: post` outside a collection, no `h2[id]`/heading-link inside read-more cards).
- Docs: `content/flowershow-app/docs/reference/listings.md` (or a new `reference/post-pages.md`, linked from listings, page-headers and the blog guide): which pages get it, the anatomy, frontmatter keys (`image`, `imageAlt`, `imageCaption`, `showImage`, `layout: post`/`layout: page`), CSS variables; `page-headers.md` notes the post variant; `docs/guides/publish-blog.md` gets a short "Your posts" step; `llms.txt` if it lists frontmatter keys.
- Changelog: extend `content/flowershow-app/changelog/2026-10-11-listing-pages.md` (same release theme: blog collections) with a "post pages" bullet and a "Check your site" bullet, plus a second screenshot `assets/changelog-post-pages.webp` (~1440px) shown in the body.
- `apps/flowershow/README.md` if it documents layouts (check).

## 8. Tasks (TDD order)

1. `lib/post/route.ts` tests then code.
2. `lib/post/neighbours.ts` tests then code.
3. `lib/post/hero.ts` tests then code.
4. `lib/post/hosts.ts` + `lib/post/footer.ts` tests (mock db) then code.
5. `lib/post/render.tsx` + `PostLayout` tests then code.
6. Route wiring; typecheck.
7. CSS; preview scenarios; capture; look at every shot; iterate on the design until it is genuinely good (desktop 1440, mobile 390, dark, leaf and lessflowery/superstack).
8. e2e fixture + spec.
9. Theme class reference, docs, changelog, screenshot webp.
10. Lint, format, typecheck, unit tests; security checklist; commit; PR; CI.

## 9. Behaviour changes for existing sites

Pages that become posts (in a `blog`/`posts` folder or a `layout: list` folder, no `layout` of their own) change visibly on deploy:

- Narrower, centred column (44rem) including edit link, backlinks and comments; a larger title.
- The breadcrumb trail loses its last crumb (the current title) on posts.
- Byline restyled (40px avatars, two lines); date in long form in the site locale (was always en-US long form; same for en-US sites).
- **The frontmatter `image` appears as a hero under the header** unless the body already shows it (`showImage: false` to hide). This is the biggest visible change: many posts set `image` only for social cards.
- Tags move from the header to the end of the post.
- New footer: previous/next links and up to three read-more cards.
- The ToC column is hidden on posts without headings.

Unchanged: every page with a `layout`, every page outside such folders, collection index pages, changelog pages, home pages, canvas and plain pages, and the HTML of the post body itself.

Opt-outs: `layout: page` (or any `layout`) on a post; `list: false` on a zero-config folder's README turns the folder (listing and posts) off; `showImage: false` for the hero.

## 10. Out of scope

Author card, share buttons, subscribe/CTA block, comments placement changes, reading progress, floating ToC, hero bleed (`--post-hero-bleed`), per-site reading-time default, `og:type=article` / `article:published_time` / JSON-LD `BlogPosting`, a site-level or folder-level switch to turn the post layout off, theme changes in the themes repo.

## 11. Risks

- **Surprise hero images** on existing posts (section 9). Mitigated by duplicate detection, `showImage: false`, the changelog "check your site" bullet. Open question for the maintainer: hero on by default or only with an explicit key.
- **Themes**: themes' `.page-header-*` rules may clash with the two-line byline (e.g. `text-transform: uppercase` on the metadata container, `> * + * { margin-left }` spacing). Checked on screenshots for every official theme; the defaults neutralise only what is inside `:where()`.
- **Cost per post view**: up to five queries, four of them cached for 60s and invalidated on publish; the uncached one is a by-id fetch of at most five rows.
- **md/mdx parity**: the layout is outside the body, so parity holds by construction; the only body-dependent decisions (ToC headings, duplicate hero) read the raw source, the same for both. The e2e spec renders an `.md` and an `.mdx` post.
- **Breadcrumb semantics**: dropping the current-page crumb keeps the `nav[aria-label=Breadcrumb]` but no longer marks `aria-current`; acceptable because the h1 is the current page.
- **Heading order**: h1 → body headings → h2 "Read more" → h3 card titles; fine.

## Changes after review

Independent adversarial review of v1 (UX and technical risk). All BLOCKER and MAJOR items adopted, most minors too.

- **BLOCKER 1, catalogues became posts.** A `layout: list` host makes its folder a collection only when it lists its own folder, is not `view: people` and sorts by `date` (the default). People pages, projects sorted by title and recipe catalogues keep the page layout. New folder-level switch: `postLayout: false` on the folder's index or folder note (independent of `list: false`). Table tests for people and title-sorted hosts.
- **MAJOR 2, legacy `layout: blog`.** Treated as an alias of `layout: post`.
- **MAJOR 3, frontmatter seen as body.** The duplicate-hero check strips frontmatter (`gray-matter`) first; test with a full file.
- **MAJOR 4, body size.** The rule targets `:where(.post-page) .rendered-mdx:not(.is-plain)` (0,2,0, the specificity of the prose rule and of the themes' rules), placed after the prose block, and also drops the 55vh `min-height` for posts. Font size through `--post-body-size`.
- **MAJOR 5, a folder scan per tag set.** No tag-filtered index. One cached per-collection map of page tags (`post-folder-tags`, keyed by site and folder) and "same tag first" in memory. Footer cost: the shared cached index and the cached tag map in parallel, one by-id fetch of at most five rows, one cached author lookup.
- **MAJOR 6, class contract.** The byline keeps `.page-header-authors-container` (avatars and names), `.page-header-author-name-wrapper`, `.page-header-date` as a wrapper around `<time>`, and the date/reading-time icons (hidden by default). Tags keep `.page-header-tags` but move to `footer.post-footer`; documented. Letterpress, lessflowery, leaf and monospace checked on screenshots.
- **MAJOR 7, hero by default.** On by default (the spec). flowershow.app audit: 15 of 24 posts gain a cover; `announcing-flowerstall-alpha.md` (a square logo) gets `showImage: false`; the screenshotit and GitHub attachment URLs are dropped by the new image-extension rule. The changelog's "Check your site" bullet names the change and the opt-outs.
- **Minors adopted:** hero suppression uses the route's resolved `heroConfig.showHero` (8); read-more renders inside `<main>` right after previous/next, before the edit link, backlinks and comments (9); the footer is an async server component behind `<Suspense>` and the host query starts in parallel with the body fetch (10); host lookup order is index then README, like the changelog (12); hero ratio clamped to 4:3–21:9 (13); external hero URLs must end in an image extension (14); the "neighbours follow the index" limitation for READMEs with their own block is documented (15); byline avatars `alt=""`, arrows `aria-hidden`, placeholders are `aria-hidden` `div`s (16); nav label "Previous and next posts" (17); one lowercase file map per call (20); subfolder indexes inside a blog are posts, tested (22); `sizes` vs `--post-max-width` noted in the docs (23); docs recommend `layout: default` as the one-page opt-out, like the changelog (24); caption is `imageCaption` only (25, deviation from the spec stated); a failed host query means "not a post" (26).
- **Minors skipped:** 11 (feed the changelog's folder-index lookup from the cached host query: a refactor of the changelog path, out of scope; the host query is cached so the extra cost is one cache read); 18 (the knowledge-graph rail still offsets a post without headings; stated here, follow-up); 27 (`og:type=article`/JSON-LD stay out of scope; `resolvePostRoute` is pure and cheap so `generateMetadata` can use it later).
