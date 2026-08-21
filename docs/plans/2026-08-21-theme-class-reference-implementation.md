# Semantic Theme Class Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish every class exposed by `default-theme.css` in a grouped reference and fail CI when the reference drifts.

**Architecture:** A dependency-free Node module extracts class selectors, assigns them to documented UI areas, and generates the public Markdown reference from stable group metadata plus the current CSS. Node's built-in test runner covers extraction, classification, generation, and check-mode behavior; the root lint command runs generator check mode before Turbo.

**Tech Stack:** Node.js ESM, `node:test`, Markdown, pnpm/Turbo

## Global Constraints

- Document the current class surface without changing `default-theme.css`.
- Include state and variant classes and distinguish them from component roots.
- Provide DOM/ownership sketches by area and clearly state the stability contract.
- Generate the exhaustive appendix; do not maintain a hand-copied class list.
- Keep L4 layout configuration out of scope.
- Preserve `content/flowershow-app/docs/reference/themes.md` unchanged.

---

### Task 1: Build the tested class extractor and classifier

**Files:**
- Create: `scripts/theme-class-reference.mjs`
- Create: `scripts/theme-class-reference.test.mjs`

**Interfaces:**
- Produces: `extractClassNames(css: string): string[]`
- Produces: `classifyClassName(name: string): string`
- Produces: `generateReference(css: string): string`

- [ ] Write tests showing that extraction strips comments/strings, ignores decimal and URL fragments, deduplicates, and sorts class names.
- [ ] Run `node --test scripts/theme-class-reference.test.mjs` and observe failure because the module is missing.
- [ ] Implement the minimal extractor and classifier with explicit group metadata.
- [ ] Add generation tests asserting frontmatter, stability language, structural sketches, all fixture classes exactly once, and state/variant labeling.
- [ ] Run the test file until all cases pass.
- [ ] Commit with `git commit -m "feat(docs): generate semantic theme class reference"`.

### Task 2: Generate the public reference and check mode

**Files:**
- Modify: `scripts/theme-class-reference.mjs`
- Modify: `scripts/theme-class-reference.test.mjs`
- Create: `content/flowershow-app/docs/reference/theme-class-reference.md`

**Interfaces:**
- CLI: `node scripts/theme-class-reference.mjs --write`
- CLI: `node scripts/theme-class-reference.mjs --check`

- [ ] Add a failing test proving `--check` exits non-zero when output differs and succeeds after `--write`.
- [ ] Implement CLI path resolution from repository root, deterministic output, write mode, and diff-style check failure text.
- [ ] Run `node scripts/theme-class-reference.mjs --write` against the real stylesheet.
- [ ] Run `node scripts/theme-class-reference.mjs --check` and the unit tests.
- [ ] Confirm every extracted class occurs in the generated reference and the generated class count matches extraction.
- [ ] Commit with `git commit -m "docs: publish semantic theme class reference"`.

### Task 3: Enforce drift checking and make the page discoverable

**Files:**
- Modify: `package.json`
- Modify: `content/flowershow-app/docs/reference/custom-styles.md`
- Do not modify: `content/flowershow-app/docs/reference/themes.md`

**Interfaces:**
- Produces: `pnpm docs:theme-classes`
- Produces: `pnpm docs:theme-classes:check`
- Extends: root `pnpm lint`

- [ ] Add scripts for write/check and prepend the check to root lint.
- [ ] Add a prominent link from custom-styles documentation explaining when authors need the semantic class reference rather than tokens.
- [ ] Prove the themes reference has no diff with `git diff --exit-code main -- content/flowershow-app/docs/reference/themes.md`.
- [ ] Run `pnpm docs:theme-classes:check`, `pnpm lint`, and `pnpm test`.
- [ ] Commit with `git commit -m "ci: check theme class reference drift"`.

### Task 4: Review, publish, and close #1338

**Files:**
- No new implementation files

**Interfaces:**
- Produces: merged `flowershow/flowershow` PR and closed #1338

- [ ] Run independent review over `main..HEAD` and resolve all Critical/Important findings.
- [ ] Run fresh unit, generator-check, lint, test, and diff verification.
- [ ] Push `docs/theme-class-reference` and open a non-draft PR linking #1338 and #1364.
- [ ] Await required checks, merge normally, update local `main`, and rerun generator check.
- [ ] Close #1338 with the merged PR and public documentation path.
- [ ] Update #1364 to mark the semantic-class acceptance item complete.
