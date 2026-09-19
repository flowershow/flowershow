# Changelog Rendering, Phase 2 (Single-File `CHANGELOG.md`) Implementation Plan

Status: **Design approved 2026-09-19.** Decisions are recorded in the [design doc](2026-09-19-changelog-single-file-design.md#decisions-answered-2026-09-19). Before Task 1, finish Task 0 Step 2: amend the tasks for Q1 (lowercase `/changelog` alias, an extra task) and Q9 (a "Compare" link in the meta column, in Task 3). Pushing `feat/changelog-single-file` and opening a **draft** PR is pre-approved for the scheduled run on 2026-09-19.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `CHANGELOG.md` / `changelog.md` (any case, anywhere), or any non-index page with `layout: changelog`, renders as one full-entry timeline page with the same DOM, classes and CSS knobs as the v1 folder changelog, and an anchor per version.

**Architecture:** A pure parser (`lib/changelog-file.ts`) recognises version headings in the mdast. A remark plugin (`lib/remark-changelog.ts`) rewrites the whole tree once into the v1 `.changelog-*` structure using `data.hName`/`data.hProperties`. It's registered in both the MD (`processMarkdown`) and MDX (`getMdxOptions`) pipelines behind a `changelog` option. `resolveChangelogContext` gains a `file` kind, and the page route renders file changelogs in a plain `div#mdxpage` without `BlogLayout`.

**Tech Stack:** Next.js 15 app router, unified/remark/rehype (mdast v4), MDX via next-mdx-remote-client, Vitest + Testing Library, Playwright (CI).

**Spec:** [docs/plans/2026-09-19-changelog-single-file-design.md](2026-09-19-changelog-single-file-design.md). This builds on [v1 design](2026-09-18-changelog-rendering-design.md) and [v1 plan](2026-09-18-changelog-rendering-implementation.md) (PR #1383).

**Tracking:** beads `flowershow-v8x.11` and its children (local stealth beads). Every child is blocked on the "Rufus approves single-file design" gate bead.

## Global Constraints

- Build on top of the v1 branch (`feat/changelog-rendering`, PR #1383), or on `staging` once #1383 is merged. Put phase 2 on its own branch, `feat/changelog-single-file`.
- DOM and classes must match v1's index-variant `ChangelogEntry` exactly: `.changelog`, `.changelog-header`, `.changelog-title`, `.changelog-intro.rendered-mdx`, `ol.changelog-entries`, `li.changelog-entry#<anchor>`, `.changelog-entry-meta` > `.changelog-entry-meta-inner` > `a.changelog-entry-date` > `time[datetime]`, `.changelog-entry-content`, `h2.changelog-entry-title > a`, `.changelog-entry-body.rendered-mdx`. The only new class is the state `.is-unreleased` on `li.changelog-entry`.
- `##` is always a version heading. `#` is one only if it parses as a version, date or Unreleased. `###` and deeper never are.
- One compile per file. Never split the source into per-version chunks, because that breaks reference-link definitions.
- No pagination, no per-version pages, no badges, no authors.
- If a file has no version headings, leave the tree untouched (normal page).
- Markdown docs: never hard-wrap lines. Security: no new routes, and no HTML injected from user text (build mdast nodes, never raw HTML strings).
- Commit per task. Pushing and opening a PR need Rufus's OK at the time (the phase-1 approval covered only `feat/changelog-rendering`).

## File Structure

| File | Responsibility |
|---|---|
| `apps/flowershow/lib/changelog.ts` (modify) | Add `isChangelogFileName()`, and move the date formatter here as `formatChangelogDate()` |
| `apps/flowershow/components/public/changelog/changelog-entry.tsx` (modify) | Use the shared `formatChangelogDate()` |
| `apps/flowershow/lib/changelog-file.ts` (create) | Pure parsing: `headingText`, `parseVersionHeading`, `isVersionHeading`, `splitChangelogTree`, `entryAnchor` |
| `apps/flowershow/lib/changelog-file.test.ts` (create) | Unit tests, including trimmed real-world fixtures |
| `apps/flowershow/lib/remark-changelog.ts` (create) | The remark plugin that builds the v1 DOM |
| `apps/flowershow/lib/remark-changelog.test.ts` (create) | Markdown → HTML tests, plus the parity test against the React component |
| `apps/flowershow/lib/changelog-context.ts` (+ test) (modify) | `kind: 'file'` |
| `apps/flowershow/lib/markdown.ts` (modify) | A `changelog` option in `processMarkdown` and `getMdxOptions` |
| `apps/flowershow/lib/render-page-content.tsx` (modify) | Pass the `changelog` option through |
| `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx` (modify) | Render the `file` kind |
| `apps/flowershow/styles/default-theme.css` (modify) | `.changelog-entry.is-unreleased` muted style |
| `scripts/theme-class-reference.mjs` + generated reference (modify) | `is-unreleased` state owner |
| `apps/flowershow/e2e/fixtures/test-site/CHANGELOG.md`, `e2e/fixtures/test-site/packages/cli/CHANGELOG.md`, `e2e/fixtures/test-site/notes/changelog.md` (create) | E2E fixtures |
| `apps/flowershow/e2e/specs/changelog-file.spec.ts` (create) | E2E spec |
| `content/flowershow-app/docs/reference/changelog.md` (modify) | Single-file docs section |

---

### Task 0: Design approval gate

**Bead:** the gate bead (`Rufus approves single-file design`)

- [ ] **Step 1:** Rufus answers the 9 open questions in the design doc. Record the answers in the design doc under "Decisions (answered <date>)", and change its Status to Approved.
- [ ] **Step 2:** If any answer differs from a recommendation, update the affected task below *before* starting. Likely candidates: Q1 (lowercase alias → an extra task in `getBlob`), Q3 (cap → an extra task), Q9 (compare link → Task 3 adds a meta link).
- [ ] **Step 3:** Close the gate bead: `bd close <gate-id>`.

### Task 1: Shared helpers in `lib/changelog.ts`

**Files:** Modify `apps/flowershow/lib/changelog.ts`, `apps/flowershow/lib/changelog.test.ts`, `apps/flowershow/components/public/changelog/changelog-entry.tsx`

**Interfaces:**
- Produces: `isChangelogFileName(path: string): boolean` and `formatChangelogDate(date: string): string` (the output stays `"Aug 21, 2026"`, as v1)

- [ ] **Step 1: Failing tests** (append to `lib/changelog.test.ts`):

```ts
import { formatChangelogDate, isChangelogFileName } from './changelog';

describe('isChangelogFileName', () => {
  it('matches changelog.md/mdx in any case, anywhere', () => {
    expect(isChangelogFileName('CHANGELOG.md')).toBe(true);
    expect(isChangelogFileName('packages/cli/changelog.md')).toBe(true);
    expect(isChangelogFileName('docs/Changelog.mdx')).toBe(true);
  });
  it('rejects other names and folder entries', () => {
    expect(isChangelogFileName('changelog/2026-01-01-a.md')).toBe(false);
    expect(isChangelogFileName('HISTORY.md')).toBe(false);
    expect(isChangelogFileName('changelogs.md')).toBe(false);
  });
});

describe('formatChangelogDate', () => {
  it('formats ISO dates in UTC, en-US short', () => {
    expect(formatChangelogDate('2026-08-21')).toBe('Aug 21, 2026');
  });
});
```

- [ ] **Step 2:** Run `cd apps/flowershow && pnpm vitest run --project=unit lib/changelog.test.ts`. Expected: FAIL (not exported).
- [ ] **Step 3: Implement** in `lib/changelog.ts`:

```ts
const CHANGELOG_FILE_RE = /(?:^|\/)changelog\.mdx?$/i;

export function isChangelogFileName(path: string): boolean {
  return CHANGELOG_FILE_RE.test(path);
}

const changelogDateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatChangelogDate(date: string): string {
  return changelogDateFormat.format(new Date(`${date}T00:00:00Z`));
}
```

Then in `changelog-entry.tsx`, delete the local `dateFormat`/`formatDate`, and `import { formatChangelogDate } from '@/lib/changelog'`. Replace `formatDate(entry.date)` with `formatChangelogDate(entry.date)`.

- [ ] **Step 4:** Run `pnpm vitest run --project=unit lib/changelog.test.ts components/public/changelog`. Expected: PASS, including the existing component tests (the date text is unchanged).
- [ ] **Step 5:** Commit: `feat(changelog): shared date formatter and changelog file-name detection`

### Task 1b: `/changelog` alias and folder-wins in `getBlob` (Q1, Q2)

Added 2026-09-19 after Rufus's decisions.

**Files:** Modify `apps/flowershow/lib/changelog.ts` (+ test), `apps/flowershow/server/api/routers/site.ts`, `apps/flowershow/server/api/routers/__tests__/site.test.ts`

**Rules:**
- **Q1 alias:** when a slug whose last segment is `changelog` (lowercase) finds no blob by permalink or `appPath`, serve the `changelog.md`/`.mdx` file in that directory in any case (e.g. `CHANGELOG.md`), **unless** that directory has a `changelog/` folder (any case) with markdown files. `/CHANGELOG` keeps working through its own `appPath`. No redirect: the page renders at `/changelog`.
- **Q2 folder wins:** when `changelog.md` and `changelog/README.md` share an `appPath`, the folder index wins (extend the candidate preference to index → README → file). When the folder has no README, a `changelog.md`/`CHANGELOG.md` that matched the slug is dropped, so `getBlob` 404s and the page route renders the README-less folder index (its existing fallback). A file with a `permalink` is still reachable at that permalink.

- [ ] **Step 1: Failing tests.** In `lib/changelog.test.ts`, test two pure helpers: `hasMarkdownInDir(dir, paths)` (markdown directly inside `dir`, exact case, since URLs are case-sensitive and this mirrors the page route's README-less folder check; paths with or without a leading slash) and `findChangelogFile(dir, paths)` (the `changelog.md`/`.mdx` path in `dir`, any case, or `null`). In `site.test.ts` under `site.getBlob`, add a `changelog alias` block: `/changelog` serves `CHANGELOG.md`; `/packages/cli/changelog` serves `packages/cli/CHANGELOG.md`; no alias when a `changelog/` folder with entries exists (NOT_FOUND); `changelog/README.md` beats `changelog.md` on the same appPath; a README-less `changelog/` folder makes `/changelog` NOT_FOUND even when `changelog.md` exists. Extend the mock `findFirst` to filter on a string `where.path`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers in `lib/changelog.ts` and use them in `getBlob` after the `appPath` lookup (fetch `select: { path: true }` for the site once and reuse it for the later `siteFilePaths`).
- [ ] **Step 4:** Run `pnpm vitest run --project=unit lib/changelog.test.ts server/api/routers/__tests__/site.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(changelog): serve CHANGELOG.md at /changelog; changelog folder wins`

### Task 2: Pure parser `lib/changelog-file.ts`

**Files:** Create `apps/flowershow/lib/changelog-file.ts` and `apps/flowershow/lib/changelog-file.test.ts`

**Interfaces:**
- Produces:

```ts
export type ParsedHeading = { version?: string; date?: string; title?: string; unreleased: boolean };
export type ChangelogSection = { heading: Heading; parsed: ParsedHeading; nodes: RootContent[] };
export function headingText(node: { children?: unknown[] }): string;
export function parseVersionHeading(text: string): ParsedHeading;
export function isVersionHeading(depth: number, parsed: ParsedHeading): boolean;
export function splitChangelogTree(tree: Root): { titleNode?: Heading; preamble: RootContent[]; sections: ChangelogSection[] };
export function entryAnchor(parsed: ParsedHeading, used: Set<string>): string;
```

- [ ] **Step 1: Failing tests.** Create `lib/changelog-file.test.ts`:

```ts
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import {
  entryAnchor,
  headingText,
  isVersionHeading,
  parseVersionHeading,
  splitChangelogTree,
} from './changelog-file';

const parse = (md: string) => unified().use(remarkParse).use(remarkGfm).parse(md);

describe('parseVersionHeading', () => {
  it.each([
    ['Unreleased', { unreleased: true }],
    ['[Unreleased]', { unreleased: true }],
    ['2.0.0 - 2026-06-07', { version: '2.0.0', date: '2026-06-07', unreleased: false }],
    ['[1.1.2] - 2024-09-27', { version: '1.1.2', date: '2024-09-27', unreleased: false }],
    ['1.0.0 – 2020-01-02', { version: '1.0.0', date: '2020-01-02', unreleased: false }],
    ['17.11.2 (2026-08-24)', { version: '17.11.2', date: '2026-08-24', unreleased: false }],
    ['2026-09-18', { date: '2026-09-18', unreleased: false }],
    ['2026-09-18 - Big launch', { date: '2026-09-18', title: 'Big launch', unreleased: false }],
    ['2026-09-18: Big launch', { date: '2026-09-18', title: 'Big launch', unreleased: false }],
    ['2.3.0', { version: '2.3.0', unreleased: false }],
    ['v1.0.0-beta.1', { version: 'v1.0.0-beta.1', unreleased: false }],
    ['@changesets/cli@3.0.3', { version: '@changesets/cli@3.0.3', unreleased: false }],
    ['Spring cleanup', { title: 'Spring cleanup', unreleased: false }],
  ])('%s', (text, expected) => {
    expect(parseVersionHeading(text)).toEqual(expected);
  });
});

describe('headingText', () => {
  it('flattens links and strips inline html', () => {
    const tree = parse('## [17.11.2](https://x/compare) (2026-08-24)\n\n# <small>3.0.0 (2018-11-01)</small>\n');
    expect(headingText(tree.children[0] as any)).toBe('17.11.2 (2026-08-24)');
    expect(headingText(tree.children[1] as any)).toBe('3.0.0 (2018-11-01)');
  });
});

describe('isVersionHeading', () => {
  it('treats every ## as a version', () => {
    expect(isVersionHeading(2, parseVersionHeading('Spring cleanup'))).toBe(true);
  });
  it('treats # as a version only when it parses as one', () => {
    expect(isVersionHeading(1, parseVersionHeading('3.1.0 (2019-04-10)'))).toBe(true);
    expect(isVersionHeading(1, parseVersionHeading('Changelog'))).toBe(false);
    expect(isVersionHeading(1, parseVersionHeading('@changesets/cli'))).toBe(false);
  });
  it('never treats ### as a version', () => {
    expect(isVersionHeading(3, parseVersionHeading('1.0.0'))).toBe(false);
  });
});

describe('splitChangelogTree', () => {
  it('Keep a Changelog: title, preamble, Unreleased, versions, bottom refs stay in last section', () => {
    const tree = parse(
      '# Changelog\n\nAll notable changes.\n\n## [Unreleased]\n\n### Fixed\n\n- a\n\n## [1.0.0] - 2026-01-02\n\n### Added\n\n- b\n\n[1.0.0]: https://x/compare\n',
    );
    const { titleNode, preamble, sections } = splitChangelogTree(tree);
    expect(headingText(titleNode!)).toBe('Changelog');
    expect(preamble).toHaveLength(1);
    expect(sections.map((s) => s.parsed)).toEqual([
      { unreleased: true },
      { version: '1.0.0', date: '2026-01-02', unreleased: false },
    ]);
    expect(sections[1]!.nodes.some((n) => n.type === 'definition')).toBe(true);
  });
  it('Changesets: package title and version-only headings', () => {
    const { titleNode, sections } = splitChangelogTree(
      parse('# @changesets/cli\n\n## 3.0.3\n\n### Patch Changes\n\n- x\n\n## 3.0.2\n\n- y\n'),
    );
    expect(headingText(titleNode!)).toBe('@changesets/cli');
    expect(sections.map((s) => s.parsed.version)).toEqual(['3.0.3', '3.0.2']);
  });
  it('old conventional: # versions mixed with ## versions', () => {
    const { titleNode, sections } = splitChangelogTree(
      parse('# Changelog\n\n## [3.1.1](u) (2019-05-01)\n\n- a\n\n# [3.1.0](u) (2019-04-10)\n\n- b\n'),
    );
    expect(headingText(titleNode!)).toBe('Changelog');
    expect(sections.map((s) => s.parsed.version)).toEqual(['3.1.1', '3.1.0']);
  });
  it('no version headings → no sections', () => {
    expect(splitChangelogTree(parse('# Notes\n\nJust prose.\n')).sections).toEqual([]);
  });
});

describe('entryAnchor', () => {
  it('uses version, unreleased, date, or title slug and dedupes', () => {
    const used = new Set<string>();
    expect(entryAnchor({ version: '2.0.0', unreleased: false }, used)).toBe('2.0.0');
    expect(entryAnchor({ version: '2.0.0', unreleased: false }, used)).toBe('2.0.0-1');
    expect(entryAnchor({ unreleased: true }, used)).toBe('unreleased');
    expect(entryAnchor({ date: '2026-09-18', unreleased: false }, used)).toBe('2026-09-18');
    expect(entryAnchor({ title: 'Spring Clean-up!', unreleased: false }, used)).toBe('spring-clean-up');
    expect(entryAnchor({ version: '@scope/pkg@1.2.0', unreleased: false }, used)).toBe('scope-pkg-1.2.0');
  });
});
```

- [ ] **Step 2:** Run `pnpm vitest run --project=unit lib/changelog-file.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `lib/changelog-file.ts`:

```ts
import type { Heading, Root, RootContent } from 'mdast';

export type ParsedHeading = {
  version?: string;
  date?: string;
  title?: string;
  unreleased: boolean;
};

export type ChangelogSection = {
  heading: Heading;
  parsed: ParsedHeading;
  nodes: RootContent[];
};

const DATE = '(\\d{4}-\\d{2}-\\d{2})';
const DASH = '[-–—]';
const KEEP_A_CHANGELOG_RE = new RegExp(`^(.+?) ${DASH} ${DATE}$`);
const CONVENTIONAL_RE = new RegExp(`^(.+?) \\(${DATE}\\)$`);
const DATE_ONLY_RE = new RegExp(`^${DATE}(?:\\s*(?:${DASH}|:)\\s*(.+))?$`);
const VERSION_RE =
  /^(?:@?[\w.-]+(?:\/[\w.-]+)?@)?v?\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.+-]+)?$/;

/** Plain text of a heading: link text kept, inline HTML (e.g. <small>) dropped. */
export function headingText(node: { children?: unknown[] }): string {
  const walk = (n: any): string => {
    if (n.type === 'html') return '';
    if (typeof n.value === 'string') return n.value;
    return Array.isArray(n.children) ? n.children.map(walk).join('') : '';
  };
  return walk(node).replace(/\s+/g, ' ').trim();
}

export function parseVersionHeading(raw: string): ParsedHeading {
  // `[1.0.0]` without a matching definition stays literal text: drop the brackets
  const text = raw.replace(/^\[([^\]]+)\]/, '$1').trim();
  if (/^unreleased$/i.test(text)) return { unreleased: true };
  let m = text.match(KEEP_A_CHANGELOG_RE) ?? text.match(CONVENTIONAL_RE);
  if (m) return { version: m[1]!.trim(), date: m[2], unreleased: false };
  m = text.match(DATE_ONLY_RE);
  if (m) return { date: m[1], ...(m[2] ? { title: m[2].trim() } : {}), unreleased: false };
  if (VERSION_RE.test(text)) return { version: text, unreleased: false };
  return { title: text, unreleased: false };
}

export function isVersionHeading(depth: number, parsed: ParsedHeading): boolean {
  if (depth === 2) return true;
  if (depth === 1) {
    return (
      parsed.unreleased ||
      !!parsed.date ||
      (!!parsed.version && VERSION_RE.test(parsed.version))
    );
  }
  return false;
}

export function splitChangelogTree(tree: Root): {
  titleNode?: Heading;
  preamble: RootContent[];
  sections: ChangelogSection[];
} {
  let titleNode: Heading | undefined;
  const preamble: RootContent[] = [];
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | undefined;

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth <= 2) {
      const parsed = parseVersionHeading(headingText(node));
      if (isVersionHeading(node.depth, parsed)) {
        current = { heading: node, parsed, nodes: [] };
        sections.push(current);
        continue;
      }
      if (node.depth === 1 && !titleNode && !current) {
        titleNode = node;
        continue;
      }
    }
    (current ? current.nodes : preamble).push(node);
  }
  return { titleNode, preamble, sections };
}

export function entryAnchor(parsed: ParsedHeading, used: Set<string>): string {
  const raw = parsed.unreleased
    ? 'unreleased'
    : (parsed.version ?? parsed.date ?? parsed.title ?? 'entry');
  const base =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || 'entry';
  let anchor = base;
  for (let i = 1; used.has(anchor); i++) anchor = `${base}-${i}`;
  used.add(anchor);
  return anchor;
}
```

- [ ] **Step 4:** Run `pnpm vitest run --project=unit lib/changelog-file.test.ts`. Expected: PASS. If `@changesets/cli` wrongly matches `VERSION_RE` (it must not, because there's no digit after `@`), fix the regex and not the test.
- [ ] **Step 5:** Commit: `feat(changelog): parse single-file changelog version headings`

### Task 3: The `remarkChangelog` plugin

**Files:** Create `apps/flowershow/lib/remark-changelog.ts` and `apps/flowershow/lib/remark-changelog.test.ts`

**Interfaces:**
- Consumes: Task 2 helpers, and `formatChangelogDate` (Task 1).
- Produces: `export default function remarkChangelog(options?: { title?: string }): (tree: Root) => void`

- [ ] **Step 1: Failing tests.** Create `lib/remark-changelog.test.ts`:

```ts
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import remarkChangelog from './remark-changelog';

async function html(md: string, title?: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkChangelog, { title })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md);
  const doc = new DOMParser().parseFromString(String(file), 'text/html');
  return doc.body;
}

const KAC = `# Changelog

All notable changes to this project.

## [Unreleased]

## [1.1.0] - 2026-02-03

### Added

- New thing, see [1.1.0].

## [1.0.0] - 2026-01-02

- First.

[1.1.0]: https://example.com/compare/v1.0.0...v1.1.0
`;

describe('remarkChangelog', () => {
  it('builds the v1 changelog DOM', async () => {
    const body = await html(KAC);
    expect(body.querySelector('.changelog > header.changelog-header h1.changelog-title')!.textContent).toBe('Changelog');
    expect(body.querySelector('.changelog-intro.rendered-mdx')!.textContent).toContain('All notable changes');
    const entries = body.querySelectorAll('ol.changelog-entries > li.changelog-entry');
    expect(entries).toHaveLength(2); // empty Unreleased skipped
    expect(entries[0]!.id).toBe('1.1.0');
    expect(entries[0]!.querySelector('.changelog-entry-meta > .changelog-entry-meta-inner > a.changelog-entry-date')!.getAttribute('href')).toBe('#1.1.0');
    expect(entries[0]!.querySelector('time')!.getAttribute('datetime')).toBe('2026-02-03');
    expect(entries[0]!.querySelector('time')!.textContent).toBe('Feb 3, 2026');
    expect(entries[0]!.querySelector('.changelog-entry-content > h2.changelog-entry-title > a')!.getAttribute('href')).toBe('#1.1.0');
    expect(entries[0]!.querySelector('h2')!.textContent).toBe('1.1.0');
    expect(entries[0]!.querySelector('.changelog-entry-body.rendered-mdx h3')!.textContent).toBe('Added');
  });

  it('keeps reference links working inside entries', async () => {
    const body = await html(KAC);
    const link = body.querySelector('.changelog-entry-body a[href^="https://example.com/compare"]');
    expect(link).not.toBeNull();
  });

  it('renders a non-empty Unreleased with the state class', async () => {
    const body = await html('## Unreleased\n\n- soon\n\n## 1.0.0\n\n- x\n');
    const first = body.querySelector('li.changelog-entry')!;
    expect(first.classList.contains('is-unreleased')).toBe(true);
    expect(first.id).toBe('unreleased');
    expect(first.querySelector('.changelog-entry-date')).toBeNull();
    expect(first.querySelector('h2')!.textContent).toBe('Unreleased');
  });

  it('uses the option title when there is no # heading, then "Changelog"', async () => {
    expect((await html('## 1.0.0\n\n- x\n', 'CLI releases')).querySelector('.changelog-title')!.textContent).toBe('CLI releases');
    expect((await html('## 1.0.0\n\n- x\n')).querySelector('.changelog-title')!.textContent).toBe('Changelog');
  });

  it('date-only headings: title from text or formatted date', async () => {
    const body = await html('## 2026-09-18 - Big launch\n\nx\n\n## 2026-09-01\n\ny\n');
    const titles = [...body.querySelectorAll('h2.changelog-entry-title')].map((h) => h.textContent);
    expect(titles).toEqual(['Big launch', 'Sep 1, 2026']);
  });

  it('leaves files without version headings untouched', async () => {
    const body = await html('# Notes\n\nJust prose.\n');
    expect(body.querySelector('.changelog')).toBeNull();
    expect(body.querySelector('h1')!.textContent).toBe('Notes');
  });
});
```

- [ ] **Step 2:** Run `pnpm vitest run --project=unit lib/remark-changelog.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `lib/remark-changelog.ts`:

```ts
import type { PhrasingContent, Root, RootContent } from 'mdast';
import { formatChangelogDate } from '@/lib/changelog';
import {
  type ChangelogSection,
  entryAnchor,
  splitChangelogTree,
} from '@/lib/changelog-file';

type Props = Record<string, unknown>;

/** A generic mdast node that remark-rehype turns into <tagName ...props>. */
function el(
  tagName: string,
  className: string[],
  children: unknown[],
  props: Props = {},
): RootContent {
  return {
    type: 'changelogElement',
    data: {
      hName: tagName,
      hProperties: { ...(className.length ? { className } : {}), ...props },
    },
    children,
  } as unknown as RootContent;
}

const text = (value: string): PhrasingContent => ({ type: 'text', value });

function entryTitle(section: ChangelogSection): string {
  const p = section.parsed;
  if (p.unreleased) return 'Unreleased';
  return p.version ?? p.title ?? (p.date ? formatChangelogDate(p.date) : '');
}

function isEmpty(nodes: RootContent[]): boolean {
  return nodes.every((n) => n.type === 'definition');
}

/**
 * Turn a single-file changelog (Keep a Changelog, Changesets, release-please,
 * date-only) into the same `.changelog-*` DOM as the folder changelog.
 * Rewrites the whole tree once so reference definitions keep resolving.
 */
export default function remarkChangelog(options: { title?: string } = {}) {
  return (tree: Root) => {
    const { titleNode, preamble, sections } = splitChangelogTree(tree);
    if (sections.length === 0) return;

    const used = new Set<string>();
    const entries: RootContent[] = [];
    // Definitions inside skipped (empty Unreleased) sections must stay in the tree.
    const orphanDefinitions: RootContent[] = [];

    for (const section of sections) {
      if (section.parsed.unreleased && isEmpty(section.nodes)) {
        orphanDefinitions.push(...section.nodes);
        continue;
      }
      const anchor = entryAnchor(section.parsed, used);
      const date = section.parsed.date;
      entries.push(
        el(
          'li',
          ['changelog-entry', ...(section.parsed.unreleased ? ['is-unreleased'] : [])],
          [
            el('div', ['changelog-entry-meta'], [
              el(
                'div',
                ['changelog-entry-meta-inner'],
                date
                  ? [
                      el('a', ['changelog-entry-date'], [
                        el('time', [], [text(formatChangelogDate(date))], { dateTime: date }),
                      ], { href: `#${anchor}` }),
                    ]
                  : [],
              ),
            ]),
            el('div', ['changelog-entry-content'], [
              el('h2', ['changelog-entry-title'], [
                { type: 'link', url: `#${anchor}`, children: [text(entryTitle(section))] },
              ]),
              el('div', ['changelog-entry-body', 'rendered-mdx'], section.nodes),
            ]),
          ],
          { id: anchor },
        ),
      );
    }

    const titleChildren = titleNode
      ? titleNode.children
      : [text(options.title || 'Changelog')];

    tree.children = [
      el('div', ['changelog'], [
        el('header', ['changelog-header'], [
          el('div', [], [
            el('h1', ['changelog-title'], titleChildren),
            ...(preamble.length
              ? [el('div', ['changelog-intro', 'rendered-mdx'], preamble)]
              : []),
          ]),
        ]),
        el('ol', ['changelog-entries'], entries),
      ]),
      ...orphanDefinitions,
    ];
  };
}
```

- [ ] **Step 4:** Run `pnpm vitest run --project=unit lib/remark-changelog.test.ts`. Expected: PASS. If `DOMParser` isn't available, check that the file runs in the `unit` project's jsdom environment (`vitest.config.ts`). If `id`/`dateTime` props render in different case, match what `hast-util-to-html` emits (`datetime`) in the assertions, not in the implementation.
- [ ] **Step 5: Parity test.** Append to the same file. It renders the v1 React `ChangelogEntry` (index variant) for an equivalent entry, then compares the class skeleton:

```ts
import { render } from '@testing-library/react';
import { ChangelogEntry } from '@/components/public/changelog/changelog-entry';

function skeleton(el: Element): string {
  const cls = [...el.classList].filter((c) => c.startsWith('changelog') || c === 'rendered-mdx').sort().join('.');
  const kids = [...el.children].map(skeleton).filter(Boolean).join(',');
  return cls || kids ? `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${kids ? `[${kids}]` : ''}` : '';
}

it('matches the React ChangelogEntry DOM skeleton', async () => {
  const fromPlugin = (await html('## 1.0.0 - 2026-01-02\n\nBody\n')).querySelector('li.changelog-entry')!;
  const { container } = render(
    <ol>
      <ChangelogEntry
        variant="index"
        authors={[]}
        entry={{ id: 'x', path: 'x.md', url: '#1.0.0', anchor: '1.0.0', title: '1.0.0', date: '2026-01-02', authors: [] }}
      >
        <p>Body</p>
      </ChangelogEntry>
    </ol>,
  );
  const fromReact = container.querySelector('li.changelog-entry')!;
  expect(skeleton(fromPlugin)).toBe(skeleton(fromReact));
});
```

Rename the test file to `.test.tsx` if JSX needs it. Run it: expected PASS. If it fails, change the **plugin** to match the React DOM (v1 is the contract).

- [ ] **Step 6:** Commit: `feat(changelog): remark plugin rendering single-file changelogs in the v1 DOM`

**Amendment (Q9, 2026-09-19): compare link.** When the version heading carries a link (release-please `[17.11.2](…/compare/…)` → mdast `link`; Keep a Changelog `[1.1.0]` with a bottom definition → mdast `linkReference`), put a small link in `.changelog-entry-meta-inner` after the date: an mdast `link`/`linkReference` node (never a raw `<a>` built from user text) with `data.hProperties.className = ['changelog-entry-compare']`. Its text is "Compare" when the resolved URL contains `/compare/`, otherwise "Release". The title stays a plain link to the entry's anchor. Add tests for both link forms, and for a heading without a link (no `.changelog-entry-compare`). Add `.changelog-entry-compare` to default-theme.css (muted, small) and to the class reference DOM tree in Task 5.

**Amendment (Q6):** a date-only heading with no text uses the formatted date as its title. Never derive a title from the body.

### Task 4: Detection of the `file` kind

**Files:** Modify `apps/flowershow/lib/changelog-context.ts` and `apps/flowershow/lib/changelog-context.test.ts`

- [ ] **Step 1: Failing tests** (append):

```ts
describe('single-file changelogs', () => {
  const none = vi.fn();
  it('CHANGELOG.md anywhere → file', async () => {
    expect(await resolveChangelogContext({ slug: '/CHANGELOG', blob: { path: 'CHANGELOG.md', metadata: {} }, siteFilePaths: [], getFolderIndexMetadata: none })).toEqual({ kind: 'file', dir: '' });
    expect(await resolveChangelogContext({ slug: '/packages/cli/changelog', blob: { path: 'packages/cli/changelog.md', metadata: null }, siteFilePaths: [], getFolderIndexMetadata: none })).toEqual({ kind: 'file', dir: 'packages/cli' });
  });
  it('layout: changelog on any non-index page → file', async () => {
    expect(await resolveChangelogContext({ slug: '/history', blob: { path: 'history.md', metadata: { layout: 'changelog' } }, siteFilePaths: [], getFolderIndexMetadata: none })).toEqual({ kind: 'file', dir: '' });
  });
  it('another explicit layout opts CHANGELOG.md out', async () => {
    expect(await resolveChangelogContext({ slug: '/CHANGELOG', blob: { path: 'CHANGELOG.md', metadata: { layout: 'default' } }, siteFilePaths: [], getFolderIndexMetadata: none })).toBeNull();
  });
  it('folder README with layout: changelog is still folder mode', async () => {
    expect(await resolveChangelogContext({ slug: '/releases', blob: { path: 'releases/README.md', metadata: { layout: 'changelog' } }, siteFilePaths: [], getFolderIndexMetadata: none })).toEqual({ kind: 'index', dir: 'releases' });
  });
});
```

- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3: Implement.** In `changelog-context.ts`, widen the type to `{ kind: 'index' | 'entry' | 'file'; dir: string } | null`, import `isChangelogFileName`, and insert this right after `const dir = dirOf(blob.path);` (i.e. before the folder-index check):

```ts
  if (!isFolderIndexPath(blob.path)) {
    const layout = blob.metadata?.layout;
    if (layout === 'changelog') return { kind: 'file', dir };
    if (!layout && isChangelogFileName(blob.path)) return { kind: 'file', dir };
  }
```

- [ ] **Step 4:** Run `pnpm vitest run --project=unit lib/changelog-context.test.ts`. Expected: PASS (old and new tests).
- [ ] **Step 5:** Commit: `feat(changelog): detect single-file changelogs`

### Task 5: Pipeline and page-route wiring, plus CSS

**Files:** Modify `lib/markdown.ts`, `lib/render-page-content.tsx`, `page.tsx`, `styles/default-theme.css`, `scripts/theme-class-reference.mjs`, and the generated `content/flowershow-app/docs/reference/theme-class-reference.md`

- [ ] **Step 1:** In `lib/markdown.ts`, add `changelog?: { title?: string }` to `MarkdownOptions`. In `processMarkdown`, register it only when set, as the **last remark plugin before `remarkRehype`**:

```ts
    .use(remarkMark)
    .use(options.changelog ? remarkChangelog : () => undefined, options.changelog)
    .use(remarkRehype, { allowDangerousHtml: true })
```

In `getMdxOptions`, append `...(options.changelog ? [[remarkChangelog, options.changelog]] : [])` as the last entry of `remarkPlugins`. Import `remarkChangelog from './remark-changelog'`.

- [ ] **Step 2:** In `render-page-content.tsx`, add `changelog?: { title?: string }` to `RenderPageContentOptions` and pass it into both the `processMarkdown(...)` and the `getMdxOptions(...)` option objects.
- [ ] **Step 3:** In `page.tsx`:
  - pass `changelog: changelog?.kind === 'file' ? { title: metadata?.title } : undefined` into the main `renderPageContent` call;
  - set `showToc` false and `showHero` false for `kind === 'file'` (extend the existing `changelog?.kind !== 'index'` checks);
  - in the `<main>` conditional, add a branch before `BlogLayout`:

```tsx
            ) : changelog?.kind === 'file' ? (
              <>
                <div id="mdxpage">{compiledContent}</div>
                <CanvasEnhancer />
              </>
```

- [ ] **Step 4: CSS.** Add to the changelog section of `default-theme.css`:

```css
  .changelog-entry.is-unreleased {
    .changelog-entry-title {
      color: var(--color-foreground-500);
    }
  }
```

In `scripts/theme-class-reference.mjs` `STATE_OWNERS`, add `'is-unreleased': '.changelog-entry',`. Run `pnpm docs:theme-classes` and then `pnpm docs:theme-classes:check`.

- [ ] **Step 5: Verify.** Run `cd apps/flowershow && npx tsc --noEmit -p . && pnpm test`, then `npx eslint lib components/public "app/(public)/site"` at repo root, and `node --test scripts/theme-class-reference.test.mjs`. Everything must pass.
- [ ] **Step 6: Visual check** (no app needed). Render `samples` of Keep a Changelog, Changesets and release-please through a throwaway vitest that runs `processMarkdown(..., { changelog: {} })` and writes the HTML. Wrap it with the compiled default CSS (see the v1 plan Task 7 notes) and screenshot it with headless Chrome (`--virtual-time-budget=15000`). Compare with the v1 folder look.
- [ ] **Step 7:** Commit: `feat(changelog): render single-file changelogs in the site route`

### Task 6: E2E fixtures and spec (runs in CI)

**Files:** Create fixtures and `apps/flowershow/e2e/specs/changelog-file.spec.ts`

- [ ] **Step 1: Fixtures.**
  - `e2e/fixtures/test-site/CHANGELOG.md`: use the `KAC` string from Task 3, plus a third version `## [0.9.0] - 2025-12-01` with a `### Fixed` list.
  - `e2e/fixtures/test-site/packages/cli/CHANGELOG.md`: `# @demo/cli`, then `## 2.0.0` with `### Major Changes` and a bullet, then `## 1.0.0` with `### Patch Changes` and a bullet.
  - `e2e/fixtures/test-site/notes/changelog.md`: frontmatter `layout: default` and a `## 1.0.0` heading (the opt-out check).
- [ ] **Step 2: Spec.**

```ts
import { expect, test } from '../helpers/fixtures';

test('CHANGELOG.md renders as a changelog timeline', async ({ page, basePath }) => {
  await page.goto(`${basePath}/CHANGELOG`);
  await expect(page.locator('.changelog-title')).toHaveText('Changelog');
  await expect(page.locator('.changelog-intro')).toContainText('All notable changes');
  await expect(page.locator('li.changelog-entry')).toHaveCount(3);
  await expect(page.locator('li.changelog-entry').first()).toHaveAttribute('id', '1.1.0');
  await expect(page.locator('li.changelog-entry').first().locator('time')).toHaveText('Feb 3, 2026');
  await expect(page.locator('.changelog-entry-body a[href*="example.com/compare"]')).toHaveCount(1);
});

test('Changesets CHANGELOG.md in a subfolder', async ({ page, basePath }) => {
  await page.goto(`${basePath}/packages/cli/CHANGELOG`);
  await expect(page.locator('.changelog-title')).toHaveText('@demo/cli');
  await expect(page.locator('h2.changelog-entry-title')).toHaveText(['2.0.0', '1.0.0']);
});

test('layout: default opts a changelog.md out', async ({ page, basePath }) => {
  await page.goto(`${basePath}/notes/changelog`);
  await expect(page.locator('.changelog')).toHaveCount(0);
});
```

- [ ] **Step 3:** Check that the existing `changelog.spec.ts` (folder) is unaffected: its fixture folder has no file named `changelog.md`. Commit: `test(changelog): e2e for single-file changelogs`. CI runs these on the PR, so no local stack is needed.

### Task 7: Docs, dogfood and PR

- [ ] **Step 1:** In `content/flowershow-app/docs/reference/changelog.md`, replace the "Coming soon" section with a "Single `CHANGELOG.md` file" section. Cover the supported heading formats (with examples), the page title and intro rules, Unreleased, anchors (`/CHANGELOG#1.2.0`), opting in with `layout: changelog`, and opting out. Don't hard-wrap lines.
- [ ] **Step 2:** Run the full verification again (tsc, unit tests, eslint, class-reference check).
- [ ] **Step 3:** Add a changelog entry `content/flowershow-app/changelog/YYYY-MM-DD-changelog-md-files.md` (AGENTS.md). Push `feat/changelog-single-file` and open a **draft** PR (pre-approved 2026-09-19), based on `feat/changelog-rendering` until #1383 merges. Then and watch `gh pr checks` until Lint, test and e2e are green. Then close the child beads and `flowershow-v8x.11`.
- [ ] **Step 4:** Dogfood after deploy: a private `fl` publish of a folder containing a copy of `apps/cli/CHANGELOG.md`, checked in the browser.
