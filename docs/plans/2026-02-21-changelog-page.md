# Changelog Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Launch a public `/changelog` page on the Flowershow site using content files and Obsidian Bases, with newest-first ordering and navigation links.

**Architecture:** Treat changelog as first-class Flowershow content. Create an MDX index page (`/changelog`) backed by a `base` query over `content/flowershow-app/changelog/` files. Keep ordering driven by `YYYY-MM-DD-slug.md` filenames and surface entries as cards.

**Tech Stack:** Flowershow content layer, Markdown/MDX, Obsidian Bases (`remark-obsidian-bases`), site config (`content/flowershow-app/config.json`).

---

### Task 1: Finalize Design and Planning Docs

**Files:**
- Create: `docs/plans/2026-02-21-changelog-page-design.md`
- Modify: `docs/plans/2026-02-21-changelog-page.md`

**Step 1: Capture approved design**

Write the approved architecture, data flow, validation, and testing approach into:
- `docs/plans/2026-02-21-changelog-page-design.md`

**Step 2: Convert this file into implementation plan**

Replace the issue-outline content in:
- `docs/plans/2026-02-21-changelog-page.md`

with this executable plan format.

**Step 3: Move current issue details into appendix**

Copy the current issue description, references, and implementation notes into an appendix section in this file.

**Step 4: Verify docs render cleanly**

Run:

```bash
rg -n "Appendix: Original Issue Notes|Changelog Page Implementation Plan" docs/plans/2026-02-21-changelog-page*.md
```

Expected:
- both markers are present

### Task 2: Add Changelog Route Content (Bases-First)

**Files:**
- Create: `content/flowershow-app/changelog.mdx`

**Step 1: Create failing verification check**

Run:

```bash
test -f content/flowershow-app/changelog.mdx && echo "exists" || echo "missing"
```

Expected:
- `missing`

**Step 2: Implement `/changelog` index page with Bases**

Create `content/flowershow-app/changelog.mdx` with:
- frontmatter title/description/syntax mode compatible with MDX
- short intro copy
- one `base` block filtered to `file.inFolder("changelog")`
- sort by filename descending (`file.name DESC`)
- cards view showing `title`, filename-derived date formula, and `description`

**Step 3: Verify file now exists**

Run:

```bash
test -f content/flowershow-app/changelog.mdx && echo "exists" || echo "missing"
```

Expected:
- `exists`

### Task 3: Seed Initial Changelog Entries

**Files:**
- Create: `content/flowershow-app/changelog/2026-02-18-homepage-content-refresh.md`
- Create: `content/flowershow-app/changelog/2026-02-20-uses-obsidian-page-published.md`
- Create: `content/flowershow-app/changelog/2026-02-21-changelog-page-launched.md`

**Step 1: Create failing verification check**

Run:

```bash
ls content/flowershow-app/changelog/*.md 2>/dev/null | wc -l
```

Expected:
- `0` (or lower than target count)

**Step 2: Add entry files using naming convention**

Each file should include:
- `title`
- `description`
- `image` (screenshot/visual)
- concise body with what changed and why

**Step 3: Verify entry count**

Run:

```bash
ls content/flowershow-app/changelog/*.md | wc -l
```

Expected:
- `3`

### Task 4: Add Navigation Links

**Files:**
- Modify: `content/flowershow-app/config.json`

**Step 1: Create failing verification check**

Run:

```bash
rg -n '"href": "/changelog"' content/flowershow-app/config.json
```

Expected:
- no matches

**Step 2: Add links**

Update:
- top nav links: add `{ "href": "/changelog", "name": "Changelog" }`
- footer Product links: add the same entry

**Step 3: Verify link presence**

Run:

```bash
rg -n '"href": "/changelog"' content/flowershow-app/config.json
```

Expected:
- two matches (nav + footer)

### Task 5: Validate Route and Ordering

**Files:**
- Verify only

**Step 1: Run lightweight content checks**

Run:

```bash
rg -n "```base|file.inFolder\\(\"changelog\"\\)|direction: DESC" content/flowershow-app/changelog.mdx
```

Expected:
- all query markers present

**Step 2: Sanity-check changed files**

Run:

```bash
git diff -- docs/plans/2026-02-21-changelog-page-design.md docs/plans/2026-02-21-changelog-page.md content/flowershow-app/changelog.mdx content/flowershow-app/changelog/*.md content/flowershow-app/config.json
```

Expected:
- only intended changelog/docs/config edits

### Task 6: Final Verification

**Files:**
- Verify only

**Step 1: Confirm changed file set**

Run:

```bash
git status --short
```

Expected:
- changelog docs/content/config files listed

**Step 2: Optional local app smoke test**

Run:

```bash
pnpm --filter @flowershow/app dev
```

Verify manually:
- `/changelog` page renders
- newest entry appears first
- clicking a card opens entry page
- nav/footer link to `/changelog` works

## Appendix: Original Issue Notes

Title: Changelog page on Flowershow website  
Issue: #39  
State: OPEN  
Labels: docs, good first issue

Original brief:

> It would be nice to display the changelog file on the Flowershow website. It's good to show users that the product is under active development.
> A great example from Penpot: https://penpot.app/dev-diaries.html.
> Another great example from GitHub: https://github.blog/changelog/
> https://linear.app/changelog is really good (@rufuspollock 2026-01-15)

2026-01-28 implementation suggestion in issue:

1. Have a folder called `changelog`.
2. Each changelog item is a markdown file in that folder.
3. Show those on the changelog page using list/bases feature.
