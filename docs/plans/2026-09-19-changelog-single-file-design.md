# Changelog Rendering, Phase 2: Single-File `CHANGELOG.md`

Date: 2026-09-19
Status: **Draft, needs Rufus review**
Bead: `flowershow-v8x.11` (epic `flowershow-v8x`)
Builds on: [v1 design (folder case)](2026-09-18-changelog-rendering-design.md) · [research](2026-09-18-changelog-rendering-research.md) · v1 PR #1383

## Goal

A single `CHANGELOG.md` / `changelog.md` anywhere in a site renders out of the box as one rich timeline page. It looks exactly like the v1 folder changelog (the same `.changelog-*` DOM and classes, so themes and `--changelog-*` knobs apply unchanged), and each version gets an anchor permalink. There are no per-version pages.

Decisions already made (from v1 brainstorming): auto-detect with a frontmatter override (`layout: changelog` opts in, another `layout` opts out); one page with anchors; no category badges.

## What real changelogs look like

Samples pulled on 2026-09-19. The version counts show how long these files get.

| Format | Real example | Version heading | Date | Subsections | Versions in file |
|---|---|---|---|---|---|
| Keep a Changelog | olivierlacan/keep-a-changelog | `## [2.0.0] - 2026-06-07` (the `[2.0.0]` is a reference link whose definition is at the **bottom** of the file) | ISO after ` - ` | `### Added/Changed/Deprecated/Removed/Fixed/Security` | 17 |
| Keep a Changelog, Unreleased | same | `## [Unreleased]` | none | same | – |
| Changesets | changesets/changesets, withastro/starlight | `## 3.0.3` under `# @changesets/cli` | none | `### Major/Minor/Patch Changes` | 122 / 193 |
| Changesets (this repo) | `apps/cli/CHANGELOG.md` | `## 2.3.0` under `# CHANGELOG` | none | none, bullets directly | 13 |
| release-please / Conventional | googleapis/release-please | `## [17.11.2](compare-url) (2026-08-24)` | ISO in parentheses | `### Features / Bug Fixes` | 259 |
| Conventional (older angular preset) | conventional-changelog | **`# [3.1.0](url) (2019-04-10)`** for minor/major releases, `##` for patches | ISO in parentheses | same | – |
| Date-only (product logs) | common in personal and product changelogs | `## 2026-09-18` or `## 2026-09-18 - Big launch` | ISO | free-form | – |

How starlight-changelogs parses these (read from `providers/*.ts`):
- It has **no auto-detection**: the site author picks a provider per file.
- It flattens the heading to plain text first (`mdast-util-to-string`), so `[2.0.0]` link syntax disappears.
- Keep a Changelog: every `##` is a version, matched with `/^(.+) - (\d{4}-\d{2}-\d{2})$/`, and `Unreleased` is ignored.
- Changesets: every `##` is a version, with no date.
- Conventional: any heading level 1–3 whose text matches a semver regex, with an optional `(YYYY-MM-DD)`. It strips a `<small>…</small>` wrapper.
- It splits the file into per-version markdown chunks and renders each separately. That loses the reference-link definitions at the bottom of Keep a Changelog files, which we must avoid.

## Design

### 1. Detection (extends v1 `resolveChangelogContext`)

A **file** (not a folder README/index) is a single-file changelog when it's markdown and either:
- its basename is `changelog.md` or `changelog.mdx`, case-insensitive (`CHANGELOG.md`, `Changelog.md`, …), and it has no explicit `layout` other than `changelog`, **or**
- its frontmatter has `layout: changelog`.

A new context kind is returned: `{ kind: 'file' }`. Folder detection (v1) is unchanged. `layout: changelog` on a `README`/`index` still means folder mode.

### 2. Parsing: one remark plugin over the whole file

**`remarkChangelog`** runs inside the existing markdown/MDX pipeline (added to both `processMarkdown` and `getMdxOptions`, switched on by an option) only when the context is `file`. It transforms the mdast in place, so:
- the whole file is **compiled once**, instead of once per version (important for files with 100+ versions);
- reference-link definitions (Keep a Changelog's `[2.0.0]: …compare…` at the bottom) keep working;
- wiki links, math, callouts and MDX in entries behave exactly as on any page.

The logic lives in pure, separately tested helpers in `lib/changelog-file.ts`:
- `parseVersionHeading(text: string): { version?: string; date?: string; title?: string; unreleased: boolean } | null`
- `isVersionHeading(depth: number, text: string): boolean`
- `splitChangelogTree(tree: Root): { titleNode?: Heading; preamble: RootContent[]; sections: { heading: Heading; parsed: ParsedHeading; nodes: RootContent[] }[] }`

**Which headings start a version:**
- **Every `##`** starts a version section. This covers Keep a Changelog, Changesets, release-please and date-only, and is the Starlight default.
- **A `#`** starts a version section only if its text parses as a version, date or `Unreleased` (for the older conventional-changelog files). Otherwise the first `#` is the page title.
- `###` and deeper are never version headings. They stay inside the entry body (Added/Fixed/Patch Changes…).

**Heading text patterns.** The heading is flattened to text first, and `<small>` and other inline HTML is stripped. Patterns are tried in order:
1. `Unreleased` (any case, brackets allowed) → `{ unreleased: true }`
2. `<version> - <YYYY-MM-DD>` (also `–`, `—`) → Keep a Changelog
3. `<version> (<YYYY-MM-DD>)` → conventional / release-please
4. `<YYYY-MM-DD>` optionally followed by ` - `, `: ` or ` — ` and a title → date-only entry, with that title if present
5. `v?<semver-ish>` alone (e.g. `2.3.0`, `v1.0.0-beta.1`, `@scope/pkg@1.2.0`) → version only (Changesets)
6. anything else → `{ title: text }`, an entry with a free-form title and no date

### 3. Output: same DOM as v1

The plugin rewrites the tree so the rendered HTML matches what v1's `ChangelogIndex` / `ChangelogEntry` (index variant) produce. It does this by wrapping nodes with `data.hName` / `data.hProperties`, which needs no new React.

```
div.changelog
├─ header.changelog-header > div
│  ├─ h1.changelog-title          ← first non-version `#`, else frontmatter title, else "Changelog"
│  └─ div.changelog-intro         ← preamble: everything before the first version heading
└─ ol.changelog-entries
   └─ li.changelog-entry#<anchor>[.is-unreleased]
      ├─ div.changelog-entry-meta > div.changelog-entry-meta-inner
      │  └─ a.changelog-entry-date[href=#anchor] > time[datetime]   (only if there's a date)
      └─ div.changelog-entry-content
         ├─ h2.changelog-entry-title > a[href=#anchor]   ← the version, or the title, or the formatted date
         └─ div.changelog-entry-body.rendered-mdx           ← the section's nodes (### Added etc. kept as plain headings)
```

The page route renders this inside a plain `div#mdxpage`, **not** inside a page-level `.rendered-mdx`. Prose styles would otherwise number and indent `ol.changelog-entries`. As in v1, only the intro and each entry body get `.rendered-mdx`. Dates are formatted by one shared `formatChangelogDate()` used by both the React component and the plugin.

- **Parity** is enforced by a DOM-contract test that renders the same entry through the React component and through the plugin, then compares class structure. The two can't be literally shared, because the MDX path renders on the client and the body is one compile.
- **Title rules:** a version with a date gives title `2.0.0` and the date in the meta column. A version without a date gives title `2.3.0` and no date. A date-only heading gives title = its text after the date if present, otherwise the formatted date (e.g. "18 Sep 2026"), with the date still in the meta column.
- **No version pill:** the version is the title. `.changelog-entry-version` stays folder-only.
- **No authors:** single files don't carry per-entry authors. Changesets' "Thanks @x!" stays in the body text.
- **No pagination:** the whole file is one page (decision 2), and there's no `?page`.

### 4. Anchors

- The `li` id is the version (`2.0.0`), or `unreleased`, or the date (`2026-09-18`), or a slug of the free-form title. Duplicates get `-1`, `-2`.
- The `h2` title is rewritten to a link to its own anchor, so rehype-slug derives its id from the displayed title. GitHub-style anchors (e.g. `200---2026-06-07`) are **not** preserved in phase 2 (see open question 8).
- A linked version heading (release-please `[17.11.2](compare-url)`) loses its compare link in the title. The title becomes a plain link to the entry's anchor. See open question 9.
- The date link and the title link point to `#<li id>`.

### 5. Unreleased

It renders as the first entry, titled "Unreleased", with no date and an extra state class `.is-unreleased` (the class generator already classifies `is-*` as states) so themes can mute it. It's **skipped entirely if its body is empty**, which is common just after a release.

### 6. Everything else

- **Preamble:** paragraphs between the title and the first version go in `.changelog-intro` (e.g. "All notable changes… based on Keep a Changelog…").
- **Reference definitions** stay in the tree. They don't render, so their position doesn't matter.
- **Content before the first `##` but after an extra `#`:** it becomes part of the preamble.
- **A file with no version headings at all:** render the page normally (no changelog wrapper), so a stray `CHANGELOG.md` with prose is never broken.
- **MDX files** (`CHANGELOG.mdx`) go through the same plugin in the MDX path.
- **TOC** is off for single-file changelogs (as for the folder index). The hero is off too.
- **RSS:** out of scope (bead `flowershow-v8x.8`).

## Approaches considered

| Approach | Verdict |
|---|---|
| **A. A remark plugin that rewrites the whole tree once (chosen)** | One compile, reference links work, both md and MDX paths, and v1 CSS applies. Cost: DOM duplication with the React component, guarded by a parity test. |
| B. Split the source into per-version markdown chunks and compile each through `renderPageContent` (the Starlight / v1-folder style) | Reuses the React component directly, but it's up to 259 compiles per request and breaks reference-link definitions unless they're re-appended to every chunk. |
| C. Parse at publish time in the worker and store entries in metadata | Enables per-version pages and RSS later, but needs worker, sync and schema changes and a resync. Overkill now. |

## Open questions for Rufus

1. **URL for `CHANGELOG.md`.** Flowershow keeps case, so `CHANGELOG.md` is served at `/CHANGELOG`. Should we also answer `/changelog` for it (a lowercase alias), or leave it as `/CHANGELOG`? *Recommendation:* add the lowercase alias only when no `changelog/` folder or `changelog.md` exists.
2. **A `changelog.md` and a `changelog/` folder in the same directory** both map to `/changelog`. Today `getBlob` prefers `index.*` and otherwise picks either. *Recommendation:* the folder wins, and the file is only reachable if it sets a `permalink`. Document it.
3. **Very long files** (release-please: 259 versions, about 3,300 lines) on one page: OK, or should we cap it (e.g. render the newest 50 with "Show older versions" expanding the rest)? *Recommendation:* render everything in phase 2 (GitHub does), and measure page weight on a real 3,000-line file before adding a cap.
4. **Unreleased:** show it (muted, skipped if empty), or hide it like Starlight? *Recommendation:* show it.
5. **Changesets noise** (`[#2297](…) [`3f163da`](…) Thanks [@x](…)! - …`): leave it verbatim (recommended), or tidy PR/commit prefixes into small muted links (someday/maybe)?
6. **Date-only titles:** for `## 2026-09-18` with no text, is the formatted date as the title (and repeated in the meta column) OK, or should the title be empty and only the date show?
7. **Scope of auto-detection:** match only `changelog.md` (any case), or also `HISTORY.md`, `RELEASES.md` and `NEWS.md`? *Recommendation:* only `changelog.md` auto-detects; the others use `layout: changelog`.
8. **GitHub-style anchors:** is it important that `#200---2026-06-07` (the GitHub rendering of the Keep a Changelog heading) keeps working, or are the new clean anchors (`#2.0.0`) enough? *Recommendation:* clean anchors only. Preserving both would need an extra hidden anchor per entry.
9. **Compare links on version headings** (release-please `[17.11.2](…/compare/v17.11.1...v17.11.2)`, Keep a Changelog reference links): drop them from the title (phase 2 default), or show a small "Compare" link in the meta column? *Recommendation:* add the "Compare" link in the meta column. It's cheap and useful.

## Testing

- **Unit:** `parseVersionHeading` against every sample heading above; `splitChangelogTree` on trimmed real fixtures (Keep a Changelog with Unreleased and bottom refs, Changesets with a `# @pkg` title, release-please, old conventional with `#` versions, date-only, and a no-versions file).
- **Plugin:** markdown in, HTML out, checking the `.changelog-*` structure, anchors, the preamble in the intro, `.is-unreleased`, reference links resolved inside entries, and both md and MDX paths.
- **Parity test** against the React `ChangelogEntry` (index variant).
- **E2E:** fixture `e2e/fixtures/test-site/CHANGELOG.md` (Keep a Changelog) plus `releases/changelog.md` (Changesets) checking the title, intro, entry count, an anchor jump, a working reference link, and `layout: default` opt-out.
- **Dogfood:** a private `fl` publish of a folder containing `apps/cli/CHANGELOG.md`.
