# Adversarial review: listing-design.md v4 (layout + author experience)

Reviewed against: `listing-design.md` v4, `moodboard/findings.md` + screenshots, `origin/main` of flowershow (default-theme.css, `components/public/mdx/list.tsx`, `lib/changelog.ts`, `content/flowershow-app/{blog,people}`), and the six official themes in `/Users/rgrp/src/flowershow/themes/*/theme.css`. Evidence is cited by file and line where it matters.

One line of credit: the four-view/three-knob menu is the right shape and the moodboard backs it. Everything below is what will go wrong.

## 0. Twelve author blocks, as they would actually be typed

Each block is what a real author (or an assistant with no docs) writes first, followed by what v4 does with it.

1. Obsidian blogger, folder note pattern (`blog.md` beside `blog/`, Folder Notes plugin), no frontmatter at all. v4: `blog.md` is "a real page at the same URL" and wins over the zero-config index (4.10 case 1), so `/blog` shows the prose of `blog.md` and no posts. The headline promise fails for the most common Obsidian layout. (B-3)
2. Obsidian blogger, posts have `author: Jane Smith`, `created: 2026-09-01`, `cover: "[[photo.jpg]]"`. v4: `author` (singular) is not read, `created` is not read, `cover` is read only as the third image fallback. Result: undated (sorted by title), no byline, image works by accident. (M-4, m-12)
3. Team page, `people/` folder, one file per person with `title`, `avatar`, `role`, body prose. v4 `people` view works, bio comes from the computed description (the opening sentence of the body: on flowershow.app that is "Hello! 👋 I'm Abeelha, a Flowershow developer, and i love Bees! 🐝"). Two of five flowershow.app people have no body and no `role`: cards with portrait + name only, fine. The real failure is the team that keeps people in a single `team.md` (a table or a list) or in config; v4 cannot list it, and the design never says "one file per person" anywhere an author would read. (M-7)
4. Project portfolio: `projects/alpha/index.md` with `image`, `status`, `client`, and `projects/README.md` with `layout: list` + `list: {view: grid, image: cover 4/3, fields: {date: none, meta: [status]}}`. v4: works, but half the projects have no `image` (a text-only project), so the grid has 16/9 image boxes on some cards and nothing on others; the rows no longer align (M-2). `image: cover 4/3` also reads as "use the `cover` field" to this author because `cover` is literally the third fallback image field name in 4.4 (M-5).
5. Podcast: `podcast/` with `episode: 12`, `duration: "1h 02m"`, `guests: ["[[Ada]]"]`, `fields: {meta: [episode, duration]}`. v4: meta line reads "Sep 14, 2026 · 12 · 1h 02m". "12" with no label means nothing; Acquired shows "F26 E2". There is no label mechanism, only `data-field` for a CSS `::before`, which the design does not document for authors. (m-14)
6. Events: `events/` with `date`, `time`, `location`, block `list` + `group: day` + `fields: {meta: [time, location]}` + `sort: date asc`. v4: a list of every event ever held, past first, because `where` has no comparisons and there is no "upcoming" filter. The moodboard's "events = list + group: day" claim is an archive, not an events page. (m-15)
7. Docs index: `docs/README.md` with `view: grid`, `image: none`, `group: section`. v4: every doc needs a `section:` frontmatter key or it lands in "Other". Docs are organised by subfolder, not by a frontmatter key; `group: folder` does not exist. (m-16)
8. Home page "latest 3": ```` ```blog ```` + `limit: 3` + `view: compact`. v4: `compact` defaults to `group: year`, so the three-item teaser gets a "2026" `h2` above it (and a "2025" one if the third post is older). The design's own example 3.7 shows no year headings, contradicting 4.2's default. (M-1)
9. Ghost/Substack migrant with `featured: true` on two posts, writes `featured: 1`. v4: `featured` means "first item on page 1", so the hero is whatever is newest; the posts the author marked as featured are ignored. (M-6)
10. Legacy `<List slots={{eyebrow: 'date', footnote: 'authors', media: 'image'}}>` migrated with the 5.3 translation table to `fields: {eyebrow: date, authors: authors, image: image}`. v4: the date renders twice, once in the eyebrow and once in the meta line (4.4 always puts `date` in the meta line). (M-8)
11. AI assistant, no docs, guessing from the words "list block": ```` ```list ```` + `folder: blog` + `layout: cards` + `limit: 5` + `fields: [title, date, description]`. v4: `folder` ok, `layout: cards` → error ("Use view: grid"), `fields` as an array → error with the suggestion "`show` and `slots` suggest `fields`" which does not apply because the key *is* `fields`. Two error turns for the most natural guess; the array form of `fields` is literally the legacy `<List fields={[...]}>` prop. (M-9)
12. AI assistant, second try, `from: posts` on a site whose folder is `blog/`, or `from: ./posts` in a nested README. v4: "Nothing here yet." with no error, because a nonexistent folder and an empty folder are indistinguishable. The assistant cannot tell a typo from an empty collection. (M-10)
13. Non-English blog (Polish, German, Spanish; a large share of Obsidian users). v4: every date renders "Sep 18, 2026" via `formatChangelogDate`, which is hard-coded `Intl.DateTimeFormat('en-US', …)` (`lib/changelog.ts:84`); site config has no `lang`/locale key, and `dateFormat` is deferred (8, item 10). (M-11)
14. Site on the Leaf or Letterpress theme adds ```` ```list ```` + `view: compact` or `view: people`. v4: Leaf makes `.list-component` a 3-column grid of bordered cards (`themes/leaf/theme.css:49-70`); Letterpress a 2-column grid with `row-reverse` items (`themes/letterpress/theme.css`). Those rules are unlayered and apply to the new root unconditionally, so `compact` renders as a grid of bordered one-line cards and `people` as 2-up reversed rows. (B-1)

## BLOCKER

### B-1. Five of six official themes restyle `.list-component` unconditionally; every view other than `list` breaks on them, and `list` itself flips

Scenario: any site on Leaf, Lessflowery, Letterpress, Superstack or Monospace (all but Material) uses a non-default view, or even the default. Evidence from `/Users/rgrp/src/flowershow/themes`:

- Leaf: `.list-component { display: grid; grid-template-columns: 1fr 1fr 1fr }`, `.list-component-item { border: 1px solid …; border-radius: 16px; flex-direction: column; align-items: center }`. A `compact` listing becomes a 3-column grid of bordered, centred one-line cards; group headings (`h2`, direct children of the root) occupy a grid cell each; the pagination `nav` is spanned (`grid-column: 1 / -1`) only because Leaf already knew about it.
- Letterpress: `.list-component { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem }` and, with no sidebar, `margin-left: -12rem; margin-right: -12rem` on the root. `people` (4-up) becomes 2-up; `compact` becomes a two-column grid of rows; the hero (`-item--featured`) is one cell.
- Lessflowery, Letterpress, Superstack: `.list-component-item { flex-direction: row-reverse }` and `.list-component-item-media { width: 30% / 20%; aspect-ratio: 3/2 | 1/1 }`. The new DOM puts media first (section 6) and the stylesheet puts it on the right; `row-reverse` puts it back on the left, and the `people` square portrait becomes a 20-30%-wide 3/2 box.
- Lessflowery, Letterpress, Superstack: `.list-component-item-eyebrow { order: 2 | 4 }`. These themes moved the eyebrow because it held the date. With `fields: {eyebrow: category}` the category now renders under the summary.
- Lessflowery `@media (max-width: 499px) { .list-component-item-media { display: none } }` (theme.css:2389) contradicts "never dropped on mobile" (4.9).
- Lessflowery/Letterpress/Superstack set `max-width: var(--width-list-component)` on the root (48rem / 64rem / 39rem); the new `--list-max-width` is a second name for the same thing and the theme's wins.

The design's mitigation (section 9: "the modifier rules in `default-theme.css` only set grid/aspect properties") does not help: `default-theme.css` is inside `@layer` and themes are unlayered (`docs/theming.md`), so a theme's single-class rule beats any layered rule regardless of specificity. The "theme audit in the same release" is listed as a checklist of small items (`.is-disabled`, SVG icons); the real job is re-scoping every root and item layout rule in five themes, and the audit list in section 6 does not say so.

Fix (pick one, state it in section 6 and 9):
1. Scope the legacy look to the legacy DOM: emit `data-view` on every new root and patch the five themes so their root/item layout rules read `.list-component:not([data-view])` (legacy `<List />`) and, separately, `.list-component[data-view="list"]` for the look they want on the new list view. Ship the theme patches in the same release (themes are loaded by the platform, so this is possible). Document the pattern for `custom.css` authors in the changelog.
2. Or emit the new engine's root as `.list-component.listing` and put the view-defining rules in `default-theme.css` *outside* `@layer` with `[data-view]` attribute specificity so they win over single-class theme rules on order+specificity. Less clean, but it protects user `custom.css` that the team cannot patch.
Either way, the section 6 audit list must name: root `display`/`grid-template-columns`/`max-width`/negative margins, item `flex-direction`/`border`/`align-items`, media `width`/`aspect-ratio`/`display: none`, eyebrow `order`.

## MAJOR

### M-1. `compact` defaults to `group: year`, which breaks the design's own teaser example and every `limit` use

4.2: "`group` … `year` for `compact`". 3.7: ```` ```blog ```` + `limit: 5` + `view: compact`, drawn with no headings. Both cannot be true. A 3-item home-page teaser with a "2026" `h2` above it (and "2025" after item two) is wrong, and it also breaks the page's heading outline (the teaser sits under the author's own `## Latest posts`). Fix: `group` defaults to `none` everywhere; `compact` on a `layout: list` page (or with `pageSize` set) defaults to `year`. Say so in 4.2 and 4.9.

### M-2. No-image and mixed-image behaviour is unspecified for `grid` and `people`, and the realistic case is mixed

On flowershow.app's own blog, 11 of 35 posts have no `image`. Any projects folder has a text-only project. The design only says the list view "collapses the media column" (Changes after review, nits). For `grid` the two options are: collapse (cards of different heights, titles no longer on a baseline, which is exactly what Linear/Vercel/Casper avoid) or placeholder (a grey 16/9 box, which looks like a broken image). For `people` a missing `avatar` gives a grey square next to real portraits. Fix: specify per view. `grid`: when any item on the page lacks an image, render a neutral placeholder box (`--list-media-placeholder`, default a subtle tint of the background) so rows align; when no item has one, collapse the slot for the whole listing (Vercel's text grid). `people`: initials avatar (first letters of the name on a tinted circle/square). `list`: collapse per row (Substack does this). Also fix the 3.1 ASCII mock, which indents image-less rows to the image column (the opposite of "collapse") and draws the thumbnail on the left while 4.9 says right.

### M-3. Zero-config blog does not cover the Obsidian folder-note pattern

4.10 case 1: "A real page at the same URL always wins (a `blog.md` with a permalink, a folder note)". `blog.md` beside `blog/` is what Obsidian's Folder Notes plugin and the "folder note" convention produce, and it is how a vault author writes the "intro to my blog" page. Those users get prose and no posts, and the fix (`layout: list`) is exactly the configuration the headline says is not needed. Fix: extend case 2 to a sibling folder note: `blog.md`/`posts.md` with no `layout` and no listing fence gets the listing appended (the sibling-folder rule in 4.1 already exists for `layout: list`). Keep "a page with an explicit `permalink` wins".

### M-4. `author` (singular) and display-name authors are the common case and are not read

The `authors` slot reads `authors` only (4.4). Hugo, Jekyll, Astro, Ghost exports, Substack exports and most Obsidian templates write `author: Jane Smith`. Result on day one for an imported blog: no byline at all, while the moodboard says the byline is the most consistent card element. Fix: `authors` slot default is `authors → author`; unresolved values already render as plain text, so `author: Jane Smith` becomes a plain-text byline with no avatar, which is correct. Also state in 4.7 that handles may be wiki links (`authors: ["[[olayway]]"]` is used on flowershow.app's own blog, `blog/announcing-obsidian-bases-alpha-support.md`) and are unwrapped with `extractWikiLinkTarget` as `getAuthors` does today.

### M-5. `image: "cover 3/2"` collides with the `image`/`cover` frontmatter fields and with `fields.image`

Three things are called `image`: the frontmatter field, the `fields.image` slot and the block-level shape knob; and `cover` is both a shape and the third fallback image field in 4.4. An author whose posts carry `cover:` writes `image: cover` and gets the right picture for the wrong reason; one whose posts carry `hero:` writes `image: hero` and gets "unknown shape". The deferred `image: <field>` override (8, item 10) would then be a third meaning of the same key. Fix: rename the knob so it cannot be read as a field: `images: thumb | cover | none` is still a collision; `thumbnail: left|right|none` is too narrow. Recommend `media: thumb | cover | none` and `ratio: 16/9` as two keys (eleven keys, but each unambiguous, and `ratio` is the value people search for), or keep `image` and make the error for an unknown shape say "To show the `hero` field, use `fields: {image: hero}`". The first is better; `sort`'s "word plus option" form does not transfer well to a key whose option is a fraction.

### M-6. `featured: 1` ignores `featured: true` on items

Every migrant from Ghost, Substack, WordPress and most Astro templates has `featured: true` in frontmatter and expects it to drive the hero. v4's `featured: 1` is "first item on page 1", and the lenient parser even maps `featured: true` on the block to `1`, so the author's mental model is silently wrong. The moodboard's own spec (findings §5) says "first n items, or items with `featured: true`". Fix: `featured: 1` promotes the first item that has `featured: true` (in sort order), else the first item; it renders on page 1 only and is removed from the rest of the list so it is not shown twice. Specify `featured` + `group` (hero above the first group heading) and a featured item without an image (full-width text hero, not a 58% empty box).

### M-7. `people` is only reachable for one-file-per-person folders, and the design never says so

3.5 and 4.9 assume `people/jane.md`. Small teams on Flowershow often have `about.md` with a list or table, or `team.md` with headings per person; config-based authors do not exist but a single `authors.md` does. None of these is listable, and the first thing a user tries will be ```` ```list ```` + `from: team.md`, which the error card will reject as "folder". Fix: say in 3.5 and the docs "one page per person in a folder", make the error for a file path say "`from` must be a folder; `people` lists one page per person", and in the post-page spec (section 10) say the author card uses the same pages. Secondary: default sort `title` sorts by first name; directories expect source order or surname. Offer `sort: order` in the example and make the docs show `order:` frontmatter.

### M-8. The legacy `eyebrow: date` translation renders the date twice

4.4 always puts `date` in the meta line; 5.3 translates `<List slots={{eyebrow: 'date'}}>` to `fields: {eyebrow: date}`. Every migrated index (the theme repo's own `_demo-content/blog/index.mdx` uses `eyebrow: "date"`) shows "Sep 18, 2026" above the title and again below the summary. Fix: when a key is mapped to `eyebrow`, it is removed from the meta line (`fields.date: none` implied when `eyebrow: date`); same rule for `meta` keys. Also allow `eyebrow` to take a list of up to two keys like `meta` (`eyebrow: [date, category]`), which is the Vercel card and the only way to reach it.

### M-9. `fields` as an array is the most natural guess and is rejected

The legacy prop is `fields={["title", "description", "date", "image"]}` (flowershow.app's own `blog/README.mdx`), the `<List />` docs show it, and "which fields to show" is what an assistant will write. v4 accepts only the slot map and its error suggests `fields` for `show`/`slots`, which is useless when the key already is `fields`. Fix: accept the array form as "these slots on, everything else `none`" using the slot names and the legacy field names (`title`, `description`, `date`, `image`, `authors`). Also accept `layout` as a silent alias of `view` inside a block and inside the `list:` map (there is no ambiguity there; the page-level `layout` is a different key at a different level), and lower-case key matching (`pagesize`) silently. Errors should be reserved for things the engine cannot interpret.

### M-10. A nonexistent folder renders "Nothing here yet." instead of an error

3.8/4.2: only key and value errors produce the card; an empty result is the empty state. A typo in `from` (or a `from: ./posts` written relative to the page, which v4 resolves from the root) is the single most likely mistake for both humans and assistants, and it produces a success-looking page. Fix: distinguish "no folder with any page under it" (error card: "No folder `posts` at the site root; folders with pages: blog, notes, …", listing the nearest matches) from "folder exists, nothing matched" (empty state, and when `where` is set, "No items matched `where: {tag: featured}`; keys seen in this folder: date, authors, tags"). Resolve `./` and `../` relative to the page. This is the cheapest AI-loop win in the whole design.

### M-11. Dates are hard-coded US English

`formatChangelogDate` is `new Intl.DateTimeFormat('en-US', …)` (`lib/changelog.ts:84`), site config has no `lang`, and `dateFormat`/locale is deferred. A German blog index reads "Sep 18, 2026" on every row and "September 2026" group headings. Fix: pick the locale from `<html lang>`/site config if that exists or add a one-key `dateLocale` in site config now; render `<time>` with the ISO value so themes can hide the text and reformat with CSS if they must. At minimum move it from deferred item 10 into v1 for `layout: list` pages.

### M-12. `group: <field>` only groups runs in sort order, so groups repeat

4.9: headings are inserted "before each run of items sharing the value", and "groups follow the sort order". `people` + `group: team` + the default `sort: title` yields Engineering, Design, Engineering, Design… one heading per person. Fix: a field group sorts by the group key first (first-seen order or ascending), then by `sort` within the group; date groups are already monotonic under a date sort but not under `sort: title`, so apply the same rule.

### M-13. Knob-conflict notes are rendered to visitors

4.2 and section 6: `limit` + `pageSize`, `featured` on `compact`, `image: cover` on `compact` render "the list with an inline note naming the ignored key" as `p.list-component-note`, visible on the live site. Authors who publish from Obsidian do not preview; a note like "pageSize is ignored because limit is set" stays on the home page until someone notices. Fix: ignored-key notes go to the publish log/CLI (the follow-up the design already plans for errors) and an HTML comment, not to the page. If a visible signal is wanted during authoring, make it a hard error card (consistent: either it is wrong and you see the card, or it is fine and you see nothing).

### M-14. `readingTime` is not a frontmatter field, and the design uses it as the canonical `meta` example

4.4 lists `readingTime` first among meta keys; the moodboard's default is `meta: [readingTime]`. Reading time is computed at render time from the body (`lib/reading-time.ts`) and gated by `showReadingTime`; it is not in `metadata`. `fields: {meta: [readingTime]}` silently renders nothing, and because any key is allowed there, there is no error. Fix: either store `wordCount` in metadata at ingestion and expose `readingTime` as a virtual meta key (also useful for the post page byline in section 10), or remove it from every example and reject it with "readingTime is computed; it is not available in listings yet".

### M-15. The `list`/`compact` measure (44rem, centred) sits inside a page whose header and intro run the full content column

`.rendered-mdx` has `max-width: none` (default-theme.css:3227) and `.layout-inner` is 80rem; the page header and intro paragraphs are therefore up to ~74rem wide on a page without a sidebar, and the listing below them is 44rem. Centred (as Lessflowery/Letterpress/Superstack already do with `margin: auto`) the list is visibly narrower and offset from the left-aligned intro; left-aligned it leaves a 30rem hole on the right. Neither looks like Substack or Ghost Edition, where the whole page shares the measure. Fix: say which it is; recommend that `layout: list` pages and zero-config pages constrain the page header, intro and listing together to `--list-max-width` (as section 10 proposes for post pages with `--post-max-width`), and that inline blocks inherit the surrounding column (no own max-width) so a block under a full-width intro is not narrower than its context.

### M-16. B/B2 split: ship `grid` in B, move `compact` to B2

Section 8 puts `list`, `compact`, `group`, `image`, `fields`, zero-config in PR B and `grid`, `people`, `featured` in B2. `grid` shares the card DOM one-to-one with `list` (it is the same six slots with a different root layout), so it is a few dozen lines of CSS once `list` exists; `compact` has a different row anatomy (date column, hanging indent, no summary) and drags `group` with it. Projects/portfolio and the "magazine" look are what the changelog screenshot sells, and B alone cannot show either. Recommendation: B = engine, `list`, `grid`, `image`, `fields`, zero-config; B2 = `compact`, `group`, `people`, `featured`. If the stacked-release plan holds, this changes nothing for users and makes the B screenshot worth posting; if B2 slips, B is still a complete product (blog index + projects grid) instead of a blog index + an archive table.

## MINOR

### m-1. Error card lists ten keys but the `blog` fence has eleven inputs (plus three aliases) and the slot names add ten more

Author-facing surface: `from view sort limit pageSize where fields featured group image` + `dir folder cards` aliases + slots `eyebrow title summary date image authors meta` + aliases `headline media footnote` + `none`. That is about 24 words to learn for a feature whose pitch is "one line". The legacy aliases (`headline`, `media`, `footnote`) only pay for the 5.3 translation table, which the docs can state as a table anyway. Drop them from the parser (accept with a suggestion instead) and keep the public vocabulary at the seven slot names.

### m-2. Titles are line-clamped in `list` (2 lines) and `grid` (3 lines)

Substack, Overreacted, Bear and Ghost do not clamp titles; a clamped title hides the point of the post ("Sidebar Navigation: Now On by Default, Better on Mobile, and Route-Aw…" at 88px-thumb mobile width is three lines). Clamp summaries, never titles.

### m-3. The meta line will wrap badly with two authors + date + two meta values

"Sep 18, 2026 · [avatars] Ola Rubaj · Rufus Pollock · 4 min read · Themes" at 0.875rem inside a column beside a 160px thumb is ~60 characters and wraps mid-separator. Specify `flex-wrap: wrap` with row gap and that the "·" separator is suppressed at a line start (`> * + *::before` cannot do that; use `gap` and a visual separator on the following element with `white-space: nowrap` per segment).

### m-4. Whole-card click in `grid` kills author links

4.9 says the grid card is "whole card clickable" (the `::after` overlay from the existing docs). Author links in the meta line are then under the overlay unless lifted; the existing docs already explain this footgun to theme authors. Specify that the renderer lifts `.list-component-item-author` (`position: relative; z-index: 1`) in the default stylesheet.

### m-5. Thumbnail side is not a knob and three themes already fight over it

Atlantic, Ghost Edition, Acquired and the current default put the thumbnail left; Substack and v4 put it right. Three official themes use `row-reverse` to flip the legacy left to right; against the new right-side default they flip it back to left (B-1). Add `image: thumb-left` or document the one-line CSS (`[data-view="list"] .list-component-item { flex-direction: row-reverse }`) so themes do not guess.

### m-6. `compact` second column has no fixed width

"date (6.5em column) → optional first meta value → title": with a variable-width category column, titles start at different x positions per row (Anthropic's table aligns them). Give the meta column a width variable (`--list-compact-meta-width`, default `9em`) or render it as a CSS grid with `auto` columns across the whole listing.

### m-7. One-page listings and the pagination strip

Section 6 says pagination is the last child; nothing says it is omitted when there is one page. The legacy component omits it (`pageSize < data.items.length`). State it.

### m-8. Heading outline: `h1` → `h3` on zero-config pages

Items are `h3` (kept from legacy); on a page with no intro headings the outline jumps from `h1` to `h3`. Harmless for the ToC (excluded) but a11y checkers flag it. Consider `h2` for items when there is no `group`, or accept and note.

### m-9. `date` fallback chain is `date` only

Obsidian templates and Astro's default blog use `created`, `published`, `pubDate`, `publishDate`. One undated post sorts to the bottom under "Undated". Accept `date → published → pubDate → created` and say so. Same for images: `image → cover → heroImage → thumbnail → avatar`.

### m-10. `draft: true` is half a convention

"Unlisted but reachable" also means in search, in the sitemap, in backlinks and in `og:` previews, which is not what "draft" means to the Hugo/Astro users the design cites. flowershow.app's own archive uses `isDraft: true` + `status: in_progress`, which v4 does not read. Either make `draft: true` imply `noindex` + search exclusion in v1 or do not introduce `draft` in v1 and keep `publish: false` as the one hidden-page switch; introducing a new partial convention is worse than none.

### m-11. `sort` grammar: accept `-date`, `sortBy`/`sortDirection`

The removed tutorial (`custom-collection-cards.md`, still on the site) uses `sortBy: date` + `sortDirection: desc`; Dataview/Hugo users write `-date`. Accept both silently; they are unambiguous.

### m-12. `where` with a list value and the `author` singular again

`where: {tags: [a, b]}` is undefined (AND or OR?). `where: {author: olayway}` on posts with `authors:` returns nothing (M-10 covers the empty-state hint). Define list values as "any of" and document the `authors` key.

### m-13. `limit` on a `layout: list` page silently disables pagination

A blogger adds `list: {limit: 10}` meaning "10 per page" (the word `limit` is what Ghost and WordPress call page size). They get the ten newest and no way to the rest, with a visitor-visible note (M-13). The error card should say "`limit` shows only the first N items; for pages use `pageSize`".

### m-14. Meta values have no labels

`meta: [episode, duration]` renders "12 · 1h 02m". Document the `data-field` hook and the one-line CSS (`[data-field="episode"]::before { content: "Episode " }`) in the reference, or accept `meta: [{episode: "Ep. "}]` later. At minimum, show the podcast example in 3.6 with the resulting text so authors see the problem before they hit it.

### m-15. Events need "upcoming"

Without date comparisons (deferred expression `where`) an events listing is an archive. Offer `where: {date: upcoming}` / `past` as two magic values on the date slot in v1, which is a six-line special case and the whole difference between "events page" and "list of old events".

### m-16. `group: folder`

Docs indexes and multi-folder blogs (`blog/2025/`, `blog/tutorials/`) are grouped by subfolder, not by a frontmatter key. `group: folder` (first path segment under `from`, titled via `entryTitleFromPath`) is cheap and covers the docs-index and "blog organised by subfolder" cases the `publish-blog.md` guide itself recommends.

### m-17. Mobile `grid` card height

A one-column grid card at 390px with a 16/9 image, 3-line title and 3-line summary is ~420px; five posts is two full screens before any text is scannable. Vercel-m works because it has no image. Consider `image: thumb` (avatar-left row) as the automatic sub-640px treatment for `grid`, which is what Ghost Source does (findings §1 row 5), instead of "treated as cover (with a note)".

### m-18. `--list-rule-color: var(--color-foreground-100)` is dark-mode safe but `--list-card-bg: transparent` + `--list-card-border: none` means themes that want Vercel's boxed cards must also add hover and radius rules themselves

Add `--list-card-hover-bg` (default `transparent`) so a boxed-card theme is three variables, not a rule block.

### m-19. `aria-label="Blog"` on the section is unsourced

Say it is the page title for `layout: list`/zero-config and omitted for inline blocks (a block under "## Latest posts" should not also be labelled "Blog").

### m-20. Zero-config `posts/` is case-insensitive at any depth

`social/posts/`, `forum/posts/` and `docs/posts/` (a docs folder about posting) all get generated index pages. Acceptable, but say in the changelog that `posts` matches at any depth; most readers will assume root only.

## Summary of the recommendation

Fix B-1 before writing CSS: the class-contract reuse is right, but it only works if the five themes' root/item layout rules are re-scoped in the same release and the audit list says so. Then resolve the five spec contradictions that will otherwise be found in review of the implementation PR (M-1 group default, M-2 no-image behaviour and the 3.1 mock, M-8 double date, M-12 group ordering, M-15 measure vs page width). The AI-writability items (M-9, M-10, M-13) are each a few lines and determine whether an assistant can converge in two turns. Flip the B/B2 split so `grid` ships first (M-16).
