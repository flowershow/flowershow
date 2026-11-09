# Site layouts: design

Status: draft for Rufus's OK, 2026-11-09. Nothing gets built until it's approved. Bead: flowershow-otm.

**TL;DR:** add one setting, `layout`, that chooses a site's structure: `docs` (today), `reading` (no site contents beside the text, page rail on the left), or `journal` (the LessWrong pattern: site contents on the home page and listings, `reading` everywhere else). A page can override it in frontmatter. Themes keep doing the look.

## Why

Flowershow has one structure: site contents on the left, text, page contents on the right. Rufus wants essay-style pages where the page contents are on the left, and a left rail beside a site sidebar is "terrible ux". Rufus also prefers defaults to more options. Named layouts give a site one word to choose, instead of a set of switches that have to agree.

Prior thinking: `life-itself/design/projects/2640-research-site-style/flowershow-layouts.md`, and the survey in `docs/plans/2026-11-07-toc-layout-survey.md`.

## Words

- **Theme:** how the site looks (type, colour, spacing). Unchanged.
- **Layout:** how the site is put together (what sits beside the text). New at site level. Pages already use the word: `layout: plain`, `list`, `post`, `changelog`.
- **Site contents:** the sidebar tree of the site's pages.
- **Rail:** the page contents as a column of ticks, one per heading, which opens an outline on hover or focus. Shipped in #1531.
- **The course:** the Collective Action course site, the test case for these mockups.

## The three layouts

| | `docs` | `reading` | `journal` |
|---|---|---|---|
| For | Docs, knowledge bases | Essays, papers, courses | Sites of essays with a front page |
| Site contents | Permanent, left | Behind a menu button | Permanent on front pages; menu button elsewhere |
| Page contents | Right, panel or rail (`toc.style`) | Rail, far left | Front pages: right, as `docs`. Elsewhere: rail, far left |
| Text | Between the columns | Centred | As `docs` on front pages; centred elsewhere |

`docs` is the default and changes nothing.

```json
{ "layout": "reading" }
```

```yaml
---
layout: docs
---
```

### Which pages `journal` treats as a front page

The home page of the site, and listing and changelog pages that have a page of their own. These use the `docs` arrangement. Everything else is an article page and uses `reading`.

"Folder index pages" would be the obvious rule, and it's wrong: each course chapter is a folder `README.md`, so every chapter would keep the permanent sidebar. A folder page that wants the front-page treatment sets `layout: docs`, as the course's `/course` page would.

Limits that stay as they are today: a `layout: plain` home page has no site contents, a listing with no `README` page has no sidebar, and `sidebar.paths` still decides where site contents appear. The course limits its sidebar to `/course`, so its `/` page has none.

### Why `journal` and not `magazine`

`magazine` is already a listing `view` value. `blog` and `post` already mean a post page. `journal` is free and means a front page with articles.

## Behaviour

**The two rules.**

1. A left rail never sits beside a site sidebar (Rufus's rule). If anything puts the sidebar back on a `reading` page, the page contents go to the right, as in `docs`.
2. A layout only moves things. It never turns on something the site or page has switched off.

**Working out a page.** First work out the page as `docs` would, from today's keys. That says whether the page has site contents and page contents at all. Then apply the layout, chosen in this order: the page's `layout` if it's `docs` or `reading`, else the site's `layout`, else `docs`. Under `reading`:

- Site contents move into the drawer. A site with `showSidebar: false` gets no drawer and no button.
- Page contents become the left rail. Site-level `toc.style: panel` is ignored, so adding `"layout": "reading"` is enough on its own.
- The knowledge graph goes, unless the page sets `showKnowledgeGraph: true`.

**A key set on the page wins over the layout.** `showSidebar: true`, `toc: { style: panel }` or `showKnowledgeGraph: true` on a `reading` page brings back that element, and rule 1 moves the page contents right.

**Page `layout` values stop meaning two things.** Today, any `layout` value opts a page out of being a post (`lib/post/route.ts`), stops the folder walk for its children, turns off zero-config listings (`lib/listing/route.ts`) and turns off changelog detection (`lib/changelog.ts`). `docs` and `reading` must be exempt from all four checks, so that `layout: reading` on a dated post keeps its post header and on `blog/README.md` keeps its listing. This also means a post can use any layout.

**Pages with their own template:**

| Page | Under `reading` or a `journal` article page |
|---|---|
| `layout: plain`, canvas | Unchanged. They return before the columns exist. |
| Listings and changelog pages with a page | `reading`: no permanent sidebar. Under `journal` they're front pages. |
| Listings with no page | Unchanged. |
| Posts | Keep the post header and footer; the rail goes left and the sidebar goes. |
| Hero | Unchanged. It sits above the columns. |

**Left rail.** The same `TocRail` component, with its outline opening to the right. Three or more headings, as today, and shown from 1024px. On the course's 576px column the 272px outline fits in the empty margin from 1228px wide. Narrower than that, it covers the start of the text while open, as the right rail's outline already does.

**Text width.** `reading` applies the post column to every page, 44rem unless the site sets its own, as the course does. No new setting. The reference sites run 632 to 704px.

**Menu button for site contents.** It belongs to the page, at the top of the left edge above the rail, because the navbar is outside the page and some sites replace it with `_navbar.html` or have none. It opens the existing `SidebarMobileNav` drawer, which needs its button split out and its top offset changed. Phones keep today's control.

**Site tree.** Fetched when the page has a sidebar or a drawer, scoped by `sidebar.paths` in the same way. Breadcrumbs therefore stay as they are under `docs`.

**Phones.** All layouts look the same: the closed Contents block under the title, and the site contents drawer.

**Comments panel.** With comments open, the left rail stays and the text gets the remaining width. Needs a rule beside those in `annotations.css`.

**Dashboard toggles.** "Show sidebar" off still removes site contents everywhere. On means "permanent under `docs`, in the drawer under `reading`". The dashboard needs a layout picker, or at least a note.

**Moving to the next page.** `reading` takes away the sidebar, which is how a reader reaches the next chapter. Posts already have previous and next links. Other pages don't. See the first open question.

## Risk to existing sites

A site that sets no `layout` is unchanged, apart from pages that already say `layout: reading`, which would lose their sidebar. Imported values do occur: `collection` and `simple` appear in this repo's content. `docs` is harmless. The build starts by counting `layout: reading` and `layout: docs` in production; if `reading` shows up on more than a handful of sites, we choose another word.

## Build outline

Not a plan yet; the plan follows approval.

- Count production `layout` values.
- `lib/layout.ts`: a pure `resolveLayout()` returning `{ sidebar: 'column' | 'drawer' | 'none', toc: 'none' | 'panel' | 'rail-right' | 'rail-left', showGraph }`, table-tested on the rules above.
- Exempt `docs` and `reading` in the post, listing and changelog checks.
- Site schema gets `layout` through `enumOrString`, so an unknown value means `docs`.
- `page.tsx` uses `resolveLayout()` in place of the current sidebar and contents logic.
- CSS: a `layout-reading` grid (`3rem minmax(0, 1fr) 3rem`) with a sticky rail, so nothing is positioned by script. Theme class reference regenerated.
- Docs page, changelog, e2e fixtures for each layout and the rule cases.

## Not in this

- A `wiki` layout, footnote cards, wide figures and page apparatus (from the 2640 note). A layout can bundle these later.
- Readers switching layouts.
- Index presets (flowershow-9xp). Its proposed `layout: blog` clashes with the legacy post value, so it needs another name.
- Moving the site contents to the right. No surveyed site does this.
- Ticks spaced by section length, as LessWrong does. Worth trying on the rail separately.

## Open questions for Rufus

1. **Add previous and next links to `reading` pages in the first version?** Recommended: yes, using the site tree's order, shown when the sidebar is hidden. Without them a course reader has to open the menu for every chapter.
2. **Keep site contents behind a menu button under `reading`, or remove them altogether?** Recommended: keep the button. LessWrong does exactly this, it takes almost no space, and without it a reader has no way to browse the site.
3. **Which layout should the course use?** Recommended: stay on `docs` with the right rail (bead flowershow-6e1.9) now, and try `journal` once previous and next links exist.

## Evidence

Screenshots at 1440px taken 2026-11-09, in `docs/plans/assets/2026-11-09-site-layouts/`. Mockups are the live course pages with the DOM rearranged and the site's own rail script blocked. Text positions are measured from the page.

| Site | Page contents | Site contents | Text x, width (px) |
|---|---|---|---|
| LessWrong post | Rail, far left | Menu button opens the home page's nav | 349, 682 |
| LessWrong home | None | Permanent, left | 323, 729 |
| Substack post (Astral Codex Ten) | Rail, left | None | 432, 652 |
| Anthropic research | Bar at the top | None | 404, 632 |
| Transformer Circuits | Full list, left | None | 368, 704 |
| Wikipedia | Full list, left | Behind a menu | 264, 912 |
| gwern.net | Box beside the opening | Header links | 299, 843 |
| Starlight doc page | Right | Permanent, left | 336, 720 |

How other tools set this (read from their docs, 2026-11-09):

- **Starlight:** per-page `template: doc | splash`. Splash is "a wider layout without any sidebars".
- **Mintlify:** per-page `mode` (`wide`, `custom`, `frame`, `center`), plus site-wide named themes that are partly layouts.
- **Nextra:** per-page or per-folder `theme` switches, inherited by children.
- **GitBook:** per-page, "three layout presets" plus custom toggles.
- **Hugo, Ghost:** a named template per page, chosen by key or in the admin.

The common shape is a named page structure with a per-page override, which is what this proposes. Site-wide choice is rarer; Mintlify is the nearest.
