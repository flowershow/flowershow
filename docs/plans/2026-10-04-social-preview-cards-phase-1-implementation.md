# Social Preview Cards, Phase 1 Implementation Plan

Status: **Draft for review, 2026-10-04.** Nothing implemented yet. Paths, functions and line numbers were checked against `main` at `aa285081` (2026-10-04) unless marked **[verify]**.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every published Flowershow page gets its own generated 1200×630 social card (site identity, page title, description, URL; a small Flowershow mark on free sites). A missing `description` is computed at ingestion from the first paragraph. The broken metadata (`url: null`, hardcoded sizes and creator) is fixed.

**Architecture:**
- **Description:** the description extractor lives in `@flowershow/core`. The Cloudflare worker uses it at ingestion and records `metadata.computed`, and a backfill script uses it for existing pages.
- **Card rendering:** a pure input builder (`toCardInputs`) feeds both `generateMetadata` and a new Node route `/api/og/...`. That route draws the Editorial card with `next/og` `ImageResponse`.
- **Card URL and caching:** middleware serves the route at `/_og/<slug>?v=<hash>` on each site's own domain, before the password gate. The hash makes the card cacheable forever while any edit busts it.

**Tech Stack:** Next.js 15.5 app router (`next/og`), Prisma, tRPC server caller (`@/trpc/server`), Vitest (unit project, Testing Library), Playwright, Cloudflare worker (JS, Vitest), `@flowershow/core` (tsup).

**Spec:** [`docs/plans/2026-10-03-social-preview-cards-design.md`](2026-10-03-social-preview-cards-design.md) (approved 2026-10-04). Research and mockups: https://claude.ai/artifact/3tmaTdUqfPa4UR6aPcVa7d

**Tracking:** bead `flowershow-1o5`. Follow-ups: `flowershow-jfk` (phase 2), `flowershow-17k` (phase 3), `flowershow-i11` (logo).

**Effort:** about 3–4 agent-days, which is roughly one week human-equivalent including manual unfurl testing.

**PRs (ship in order, each from fresh `origin/main`):**

| PR | Branch | Tasks | Why separate |
|---|---|---|---|
| 1 Computed descriptions | `feat/computed-description` | 1–4 | Deploy and backfill before cards launch, so cards have descriptions from day one |
| 2 Social cards | `feat/social-cards` | 5–9 | Behind `SOCIAL_CARDS_ENABLED`, off by default |

## Global Constraints

- **No new user-facing fields.** No new frontmatter keys and no new `config.json` keys. The only new metadata key is the internal `computed` array written by ingestion.
- **Phase 3 naming note:** `SiteConfig.social` already exists (social links, `components/types.ts:52`). Never reuse `social` for card settings.
- **Card:** exactly 1200×630 PNG, Editorial layout (spec §3).
  - Warm-white background `#FAFAF7`.
  - Left accent strip 14px in the single fixed accent `#EA580C`.
  - Title in Source Serif 4 600 at 76/64/54px (more than 40 characters → 64, more than 70 → 54).
  - Body text in Inter 400/600.
  - No settings.
- **Mark:** the Flowershow logo plus the word "Flowershow", bottom right, on free sites only (`!isFeatureEnabled(Feature.NoBranding, site)`).
- **Password-protected sites** (`privacyMode === 'PASSWORD'`): the card, `og:*` and `twitter:*` never contain a page title or description. They get the site-only card.
- **Cache:** when the requested `v` equals the expected hash, `Cache-Control: public, max-age=31536000, immutable`. In every other case (a wrong or missing `v`, or a fallback after an error), `public, max-age=300`.
- **Card URL:** `${siteUrl}/_og${slug === '/' ? '' : slug}?v=${v}`, where `v` is the first 10 hex characters of a SHA-1.
- **Computed description:**
  - First prose paragraph only, as plain text.
  - At most 160 characters. When truncated, it is cut at a word boundary and ends with `…`.
  - Never shown in the page header, the hero or the changelog entry body, because it would repeat the first paragraph. Shown everywhere else.
- **Feature flag:**
  - `SOCIAL_CARDS_ENABLED=true` turns cards on.
  - When it is unset, metadata behaves exactly as before for free and premium sites, except that the `url: null` image and the hardcoded `twitter:creator` are fixed regardless.
- **Writing and commits:**
  - Markdown docs and plans: never hard-wrap prose.
  - Conventional Commits referencing `flowershow-1o5`, one commit per task, ending with the session's attribution trailer.
  - Pushing and opening PRs need Rufus's OK at the time.

## Review Focus

1. **Non-string titles.** Frontmatter titles like `title: 1984` (a number) or `title: true` reach the card as non-strings. Expected: the card shows "1984" and does not crash. Pinned in Task 5 (`toCardInputs`).
2. **Pathological text.** Very long titles with no spaces (a pasted URL), CJK text, and emoji. Expected: clamped with `…` inside the card, never overflowing or erroring. Pinned in Task 6 (`clampText`) and the Task 6 render test.
3. **Bad logos.** A logo that is an emoji, a relative path that didn't resolve, a WebP, a 404, a slow host, or a 20MB file. Expected: a monogram, never an error and never a long wait. Pinned in Task 6 (`loadImageDataUri`).
4. **Non-prose page openings.** A page that starts with a callout, image embed, code block, list, table, MDX `import`, HTML or only a heading, or has no body at all. Expected: the description is the first real paragraph, or none. Never markup like `![[x.png]]` or `> [!note]`. Pinned in Task 1.
5. **Stale, forged or missing `v`, and unpublished pages.** A stale, forged or missing `v`, and a page that was unpublished or deleted after sharing. Expected: a correct current image with a short cache, and the site card (200) for missing pages, so the route doesn't confirm whether a page exists. Pinned in Task 7 (`socialCardResponse`) and Task 5 (`toCardInputs`).

---

### Task 1: `extractDescription` in `@flowershow/core`

**Files:**
- Create: `packages/core/src/description.ts`
- Create: `packages/core/src/description.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: `extractDescription(body: string, maxLength?: number): string | null`. `body` is the markdown *after* frontmatter. `maxLength` defaults to 160.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/core/src/description.test.ts
import { describe, expect, test } from 'vitest';
import { extractDescription } from './description';

describe('extractDescription', () => {
  test('returns the first paragraph as plain text', () => {
    expect(
      extractDescription('This is a paragraph with **bold text**, _italic text_, and ~~strikethrough text~~.\n\nSecond.'),
    ).toBe('This is a paragraph with bold text, italic text, and strikethrough text.');
  });

  test('skips a leading H1 and other headings', () => {
    expect(extractDescription('# Title\n\n## Sub\n\nFirst para.')).toBe('First para.');
  });

  test('joins a paragraph that spans several lines', () => {
    expect(extractDescription('Line one\nline two.')).toBe('Line one line two.');
  });

  test.each([
    ['callout', '> [!note] Heads up\n> inside\n\nReal text.'],
    ['blockquote', '> quoted\n\nReal text.'],
    ['image embed', '![[cover.png]]\n\nReal text.'],
    ['markdown image', '![alt](/a.png)\n\nReal text.'],
    ['fenced code', '```js\nconst a = 1;\n```\n\nReal text.'],
    ['tilde fence', '~~~\ncode\n~~~\n\nReal text.'],
    ['list', '- one\n- two\n\nReal text.'],
    ['ordered list', '1. one\n2. two\n\nReal text.'],
    ['table', '| a | b |\n|---|---|\n| 1 | 2 |\n\nReal text.'],
    ['html', '<div class="x">hi</div>\n\nReal text.'],
    ['mdx import', "import X from './x'\n\nReal text."],
    ['math block', '$$\nx^2\n$$\n\nReal text.'],
    ['obsidian comment', '%% private %%\n\nReal text.'],
    ['html comment', '<!-- hidden -->\n\nReal text.'],
    ['horizontal rule', '---\n\nReal text.'],
  ])('skips a leading %s', (_name, body) => {
    expect(extractDescription(body)).toBe('Real text.');
  });

  test('turns links and wikilinks into their text', () => {
    expect(
      extractDescription('See [the docs](https://x.y) and [[Some Page|this page]] and [[Other Page#Section]].'),
    ).toBe('See the docs and this page and Other Page.');
  });

  test('drops inline code ticks, footnote refs, highlights and html tags', () => {
    expect(extractDescription('Run `fl publish`[^1] ==now== <b>today</b>.')).toBe(
      'Run fl publish now today.',
    );
  });

  test('keeps snake_case words intact', () => {
    expect(extractDescription('Set max_retries to 3.')).toBe('Set max_retries to 3.');
  });

  test('truncates at a word boundary with an ellipsis', () => {
    const body = `${'word '.repeat(60)}end.`;
    const out = extractDescription(body)!;
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  test('hard-cuts a single unbroken token', () => {
    const out = extractDescription('x'.repeat(400))!;
    expect(out).toHaveLength(160);
    expect(out.endsWith('…')).toBe(true);
  });

  test.each([[''], ['# Only a heading'], ['![[only.png]]'], ['   \n\n  ']])(
    'returns null when there is no prose: %j',
    (body) => {
      expect(extractDescription(body)).toBeNull();
    },
  );

  test('handles CRLF line endings', () => {
    expect(extractDescription('# T\r\n\r\nHello there.\r\n')).toBe('Hello there.');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @flowershow/core test -- description`
Expected: FAIL, with "Failed to resolve import './description'".

- [ ] **Step 3: Implement**

```ts
// packages/core/src/description.ts
/**
 * Computes a page description from its markdown body (frontmatter already
 * removed): the first prose paragraph, as plain text, at most `maxLength`
 * characters. Used at ingestion when frontmatter has no `description`.
 */
export function extractDescription(
  body: string,
  maxLength = 160,
): string | null {
  const cleaned = body
    .replace(/\r\n?/g, '\n')
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/^\$\$[\s\S]*?^\$\$\s*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/%%[\s\S]*?%%/g, '');

  for (const block of cleaned.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed || isNonProse(trimmed)) continue;
    const text = toPlainText(trimmed);
    if (text) return truncate(text, maxLength);
  }
  return null;
}

function isNonProse(block: string): boolean {
  return (
    /^#{1,6}\s/.test(block) || // heading
    /^>/.test(block) || // blockquote / callout
    /^([-*+]|\d+[.)])\s/.test(block) || // list
    /^\|/.test(block) || // table
    /^</.test(block) || // html / jsx
    /^!\[/.test(block) || // image / embed
    /^(import|export)\s/.test(block) || // mdx
    /^([-*_])(\s*\1){2,}\s*$/.test(block) // horizontal rule
  );
}

function toPlainText(block: string): string {
  return block
    .replace(/!\[\[[^\]]*\]\]/g, '') // embeds
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[target|alias]]
    .replace(/\[\[([^\]#]+)(#[^\]]*)?\]\]/g, '$1') // [[target#heading]]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url)
    .replace(/\[\^[^\]]+\]/g, '') // footnote refs
    .replace(/<[^>]+>/g, '') // inline html
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/(\*\*|~~|==)(.+?)\1/g, '$2') // bold, strike, highlight
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, '$1$2') // *em*
    .replace(/(^|[^\w])_([^_\n]+)_(?=[^\w]|$)/g, '$1$2') // _em_ (not snake_case)
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`;
}
```

Add to `packages/core/src/index.ts`:

```ts
export { extractDescription } from './description';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @flowershow/core test -- description`
Expected: PASS. If the `hard-cuts` case gives 159 characters, the trailing-punctuation strip removed an `x`, which can't happen because `x` isn't in the class. Re-check the test input rather than loosening the assertion.

- [ ] **Step 5: Build core and commit**

```bash
pnpm --filter @flowershow/core build
git add packages/core/src/description.ts packages/core/src/description.test.ts packages/core/src/index.ts
git commit -m "feat(core): extractDescription for computed page descriptions (flowershow-1o5)"
```

---

### Task 2: Worker fills `description` and records `computed`

**Files:**
- Modify: `apps/cloudflare-worker/src/queue-consumer.js:9` (import) and `:326-366` (`parseMarkdown`)
- Test: `apps/cloudflare-worker/test/unit/queue-consumer.test.js`

**Interfaces:**
- Consumes: `extractDescription` from `@flowershow/core` (Task 1).
- Produces: blob `metadata.description` (string, when computable) and `metadata.computed: Array<'title' | 'description'>` (present only when non-empty).

- [ ] **Step 1: Write the failing tests** (append to `queue-consumer.test.js`)

```js
test('parseMarkdown - computes description from the first paragraph and flags it', async () => {
  const { metadata } = await parseMarkdown({
    markdown: '---\ntitle: T\n---\n# T\n\nFirst para here.\n\nSecond.',
    path: 'a.md',
  });
  expect(metadata.description).toBe('First para here.');
  expect(metadata.computed).toEqual(['description']);
});

test('parseMarkdown - keeps an author description and does not flag it', async () => {
  const { metadata } = await parseMarkdown({
    markdown: '---\ntitle: T\ndescription: Mine\n---\nBody para.',
    path: 'a.md',
  });
  expect(metadata.description).toBe('Mine');
  expect(metadata.computed).toBeUndefined();
});

test('parseMarkdown - flags a computed title', async () => {
  const { metadata } = await parseMarkdown({
    markdown: '# From Heading\n\nBody.',
    path: 'a.md',
  });
  expect(metadata.title).toBe('From Heading');
  expect(metadata.computed).toEqual(['title', 'description']);
});

test('parseMarkdown - no description when the body has no prose', async () => {
  const { metadata } = await parseMarkdown({
    markdown: '---\ntitle: T\n---\n![[only.png]]',
    path: 'a.md',
  });
  expect(metadata.description).toBeUndefined();
  expect(metadata.computed).toBeUndefined();
});

test('parseMarkdown - treats an empty frontmatter description as missing', async () => {
  const { metadata } = await parseMarkdown({
    markdown: '---\ntitle: T\ndescription: ""\n---\nBody para.',
    path: 'a.md',
  });
  expect(metadata.description).toBe('Body para.');
  expect(metadata.computed).toEqual(['description']);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter cloudflare-worker test -- queue-consumer` **[verify the package name in `apps/cloudflare-worker/package.json`]**
Expected: FAIL. `metadata.description` is undefined.

- [ ] **Step 3: Implement.** Add `extractDescription` to the existing `@flowershow/core` import at line 9, then replace the `try` body of `parseMarkdown`:

```js
    const { data: frontmatter, content: body } = matter(markdown, {});

    /** @type {Array<'title' | 'description'>} */
    const computed = [];

    let title = frontmatter.title;
    if (!title) {
      title =
        (await extractTitle(body)) ||
        path
          .split('/')
          .pop()
          ?.replace(/\.(mdx|md)$/, '') ||
        '';
      computed.push('title');
    }

    let description = frontmatter.description;
    if (description == null || description === '') {
      const extracted = extractDescription(body);
      description = extracted ?? undefined;
      if (extracted) computed.push('description');
    }

    parsed = {
      metadata: {
        ...frontmatter,
        title,
        ...(description !== undefined ? { description } : {}),
        ...(computed.length ? { computed } : {}),
      },
      body,
    };
```

When `frontmatter.description` is `""` and nothing is extracted, the spread above leaves the original `""` in place via `...frontmatter`. That's the same as today.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter cloudflare-worker test -- queue-consumer`
Expected: PASS, including all existing `parseMarkdown` and `extractTitle` tests.

- [ ] **Step 5: Commit**

```bash
git add apps/cloudflare-worker/src/queue-consumer.js apps/cloudflare-worker/test/unit/queue-consumer.test.js
git commit -m "feat(worker): compute missing page description at ingestion (flowershow-1o5)"
```

---

### Task 3: Hide computed descriptions where they would repeat the body

**Files:**
- Modify: `apps/flowershow/server/api/types.ts:123-148` (`PageMetadata`)
- Create: `apps/flowershow/lib/page-description.ts`
- Create: `apps/flowershow/lib/page-description.test.ts`
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx:475` and `:574`
- Modify: `apps/flowershow/lib/changelog.ts:189`

**Interfaces:**
- Produces:
  - `PageMetadata.computed?: Array<'title' | 'description'>`
  - `displayDescription(metadata: Pick<PageMetadata, 'description' | 'computed'> | null | undefined): string | undefined`

- [ ] **Step 1: Write the failing test**

```ts
// apps/flowershow/lib/page-description.test.ts
import { describe, expect, it } from 'vitest';
import { displayDescription } from './page-description';

describe('displayDescription', () => {
  it('returns an author-written description', () => {
    expect(displayDescription({ description: 'Mine' })).toBe('Mine');
  });
  it('hides a computed description', () => {
    expect(
      displayDescription({ description: 'Auto', computed: ['description'] }),
    ).toBeUndefined();
  });
  it('still shows the description when only the title was computed', () => {
    expect(
      displayDescription({ description: 'Mine', computed: ['title'] }),
    ).toBe('Mine');
  });
  it('handles missing metadata and non-string values', () => {
    expect(displayDescription(null)).toBeUndefined();
    expect(
      displayDescription({ description: 42 as unknown as string }),
    ).toBe('42');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/flowershow && pnpm test:unit -- lib/page-description`
Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Implement**

In `server/api/types.ts`, inside `PageMetadata`, after `description?: string;`:

```ts
  /** Fields filled in at ingestion rather than written by the author. */
  computed?: Array<'title' | 'description'>;
```

```ts
// apps/flowershow/lib/page-description.ts
import type { PageMetadata } from '@/server/api/types';

/**
 * The description to show *on the page itself* (page header, hero, changelog
 * entry). A computed description is the page's own first paragraph, so showing
 * it above the body would repeat it — those places get nothing instead.
 * Everywhere else (cards, meta tags, listings, RSS, search) uses
 * `metadata.description` directly.
 */
export function displayDescription(
  metadata: Pick<PageMetadata, 'description' | 'computed'> | null | undefined,
): string | undefined {
  if (!metadata || metadata.computed?.includes('description')) return undefined;
  const d = metadata.description;
  return d == null || d === '' ? undefined : String(d);
}
```

In `page.tsx`, import `displayDescription` from `@/lib/page-description`, then:
- At line 475, change `resolveHeroConfig(metadata, siteConfig)` to:
  ```ts
  resolveHeroConfig(metadata && { ...metadata, description: displayDescription(metadata) }, siteConfig)
  ```
- At line 574, change `description={metadata?.description ?? ''}` to `description={displayDescription(metadata) ?? ''}`.

In `lib/changelog.ts:189`, change:

```ts
        ...(m.description ? { description: m.description } : {}),
```

to:

```ts
        ...(displayDescription(m) ? { description: displayDescription(m) } : {}),
```

and add `import { displayDescription } from '@/lib/page-description';` (match the file's existing import style).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/flowershow && pnpm test:unit -- lib/page-description lib/changelog components/public/changelog`
Expected: PASS. The existing changelog tests use author descriptions, so they're unaffected.

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/server/api/types.ts apps/flowershow/lib/page-description.ts apps/flowershow/lib/page-description.test.ts "apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx" apps/flowershow/lib/changelog.ts
git commit -m "feat: don't repeat computed descriptions above the page body (flowershow-1o5)"
```

---

### Task 4: Backfill computed descriptions for existing pages

**Files:**
- Create: `apps/flowershow/scripts/backfill-descriptions.ts`

**Interfaces:**
- Consumes: `extractDescription` (Task 1), `fetchFile({ projectId, path })` from `@/lib/content-store` (`lib/content-store.ts:138`) **[verify that it works outside Next: `backfill-image-dimensions.ts` is the precedent for reading R2 in a script]**.

- [ ] **Step 1: Write the script.** Its pattern follows `scripts/backfill-tags.ts`: paginated, idempotent and `DRY_RUN`-aware.

```ts
/**
 * Backfill computed descriptions for pages published before the worker started
 * computing them (flowershow-1o5). For each markdown Blob whose metadata has no
 * description, fetch the file from storage, run extractDescription on the body,
 * and store { description, computed: [...existing, 'description'] }.
 *
 * Idempotent: blobs that already have a description are skipped.
 *
 * USAGE (from apps/flowershow, DATABASE_URL + storage env set):
 *   DRY_RUN=true npx tsx scripts/backfill-descriptions.ts
 *   npx tsx scripts/backfill-descriptions.ts
 *   SITE_ID=<id> npx tsx scripts/backfill-descriptions.ts   # one site
 */
import { extractDescription } from '@flowershow/core';
import { PrismaClient } from '@prisma/client';
import matter from 'gray-matter';
import { fetchFile } from '../lib/content-store';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === 'true';
const SITE_ID = process.env.SITE_ID;
const PAGE_SIZE = 200;

async function main() {
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;
  let failed = 0;

  for (;;) {
    const blobs = await prisma.blob.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      where: {
        ...(SITE_ID ? { siteId: SITE_ID } : {}),
        OR: [{ path: { endsWith: '.md' } }, { path: { endsWith: '.mdx' } }],
      },
      select: { id: true, siteId: true, path: true, metadata: true },
    });
    if (blobs.length === 0) break;

    for (const blob of blobs) {
      cursor = blob.id;
      scanned++;
      const metadata = (blob.metadata ?? null) as Record<string, unknown> | null;
      if (!metadata) continue;
      const existing = metadata.description;
      if (existing != null && existing !== '') continue;

      try {
        const markdown = await fetchFile({ projectId: blob.siteId, path: blob.path });
        if (!markdown) continue;
        const description = extractDescription(matter(markdown).content);
        if (!description) continue;

        const computed = Array.isArray(metadata.computed) ? metadata.computed : [];
        const next = {
          ...metadata,
          description,
          computed: [...new Set([...computed, 'description'])],
        };
        if (DRY_RUN) {
          console.log(`WOULD SET ${blob.siteId} ${blob.path}: ${description}`);
        } else {
          await prisma.blob.update({ where: { id: blob.id }, data: { metadata: next } });
        }
        updated++;
      } catch (err) {
        failed++;
        console.error(`FAILED ${blob.siteId} ${blob.path}:`, err);
      }
    }
  }

  console.log(`Scanned ${scanned}, ${DRY_RUN ? 'would update' : 'updated'} ${updated}, failed ${failed}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Dry-run it against a local database with the e2e fixture site seeded** (see `e2e/README.md`)

Run: `cd apps/flowershow && DRY_RUN=true npx tsx scripts/backfill-descriptions.ts`
Expected: lines such as `WOULD SET … basic-syntax.md: This is a paragraph with bold text, italic text, and strikethrough text.`, then a summary with `failed 0`.

- [ ] **Step 3: Run it for real on local, then check that the page header doesn't show the backfilled text**

Run: `npx tsx scripts/backfill-descriptions.ts`, then open `/basic-syntax` on the local site.
Expected: no `.page-header-description` element, and `<meta name="description">` contains the computed text. Cache tags are revalidated after 60s, or by restarting the dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/flowershow/scripts/backfill-descriptions.ts
git commit -m "chore: backfill computed page descriptions (flowershow-1o5)"
```

**PR 1 ends here.** After merge and deploy: run `DRY_RUN=true` on production, spot-check 20 lines, then run it for real. Note the counts on the bead.

---

### Task 5: `social-preview.ts`, the pure decisions

**Files:**
- Create: `apps/flowershow/lib/social-preview.ts`
- Create: `apps/flowershow/lib/social-preview.test.ts`
- Modify: `apps/flowershow/lib/feature-flags.ts` (add `isSocialCardsEnabled`)
- Modify: `apps/flowershow/env.mjs` (server schema plus `runtimeEnv`)

**Interfaces:**
- Consumes: `resolveSiteName` (`lib/site-config.ts:121`), `SiteConfig` (`components/types.ts:64`), `Plan` from `@prisma/client`.
- Produces (used by Tasks 6–8):
  - `CARD_VERSION = 1`
  - `interface CardInputs { siteName: string; siteDescription: string | null; logo: string | null; showMark: boolean; page: { title: string; description: string | null; sha: string } | null }`
  - `toCardInputs(a: { site: { plan: Plan | null; privacyMode: string; projectName: string }; siteConfig: SiteConfig | null; blob: { sha: string; metadata: unknown } | null }): CardInputs`
  - `socialCardVersion(c: CardInputs): string` (10 hex characters)
  - `socialCardUrl(siteUrl: string, slug: string, v: string): string`
  - `displayUrl(siteUrl: string, slug: string): string`
  - `type SocialImage = { url: string; width?: number; height?: number }`
  - `resolveSocialImage(a: { cardsEnabled: boolean; isPremium: boolean; isProtected: boolean; pageImage: string | null; siteImage: string | null; cardUrl: string; siteCardUrl: string; legacyThumbnail: string }): SocialImage | null`
  - `buildSocialMetadata(a: { title: string; description?: string; url: string; image: SocialImage | null }): { openGraph: …; twitter: … }`
  - `isSocialCardsEnabled(): boolean` in `feature-flags.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/flowershow/lib/social-preview.test.ts
import { Plan } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  buildSocialMetadata,
  displayUrl,
  resolveSocialImage,
  socialCardUrl,
  socialCardVersion,
  toCardInputs,
} from './social-preview';

const site = { plan: Plan.FREE, privacyMode: 'PUBLIC', projectName: 'notes' };
const blob = (metadata: Record<string, unknown>, sha = 'abc') => ({ sha, metadata });

describe('toCardInputs', () => {
  it('builds page inputs from metadata and site config', () => {
    const c = toCardInputs({
      site,
      siteConfig: { siteName: 'Ana’s Garden', description: 'Notes', logo: 'https://x/l.png' },
      blob: blob({ title: 'Hello', description: 'World' }),
    });
    expect(c).toEqual({
      siteName: 'Ana’s Garden',
      siteDescription: 'Notes',
      logo: 'https://x/l.png',
      showMark: true,
      page: { title: 'Hello', description: 'World', sha: 'abc' },
    });
  });

  it('falls back to the project name and nav.logo', () => {
    const c = toCardInputs({ site, siteConfig: { nav: { logo: '/n.png' } } as never, blob: null });
    expect(c.siteName).toBe('notes');
    expect(c.logo).toBe('/n.png');
  });

  it('coerces non-string titles (Review Focus 1)', () => {
    expect(toCardInputs({ site, siteConfig: null, blob: blob({ title: 1984 }) }).page?.title).toBe('1984');
    expect(toCardInputs({ site, siteConfig: null, blob: blob({ title: true }) }).page?.title).toBe('true');
  });

  it('uses the site name when the page has no title', () => {
    expect(toCardInputs({ site, siteConfig: null, blob: blob({}) }).page?.title).toBe('notes');
  });

  it('gives no page for protected sites, missing pages and publish:false (Review Focus 5)', () => {
    expect(toCardInputs({ site: { ...site, privacyMode: 'PASSWORD' }, siteConfig: null, blob: blob({ title: 'Secret' }) }).page).toBeNull();
    expect(toCardInputs({ site, siteConfig: null, blob: null }).page).toBeNull();
    expect(toCardInputs({ site, siteConfig: null, blob: blob({ title: 'Draft', publish: false }) }).page).toBeNull();
  });

  it('hides the mark on premium', () => {
    expect(toCardInputs({ site: { ...site, plan: Plan.PREMIUM }, siteConfig: null, blob: null }).showMark).toBe(false);
  });
});

describe('socialCardVersion', () => {
  const base = toCardInputs({ site, siteConfig: { siteName: 'S' }, blob: blob({ title: 'T' }) });
  it('is stable and 10 hex chars', () => {
    expect(socialCardVersion(base)).toMatch(/^[0-9a-f]{10}$/);
    expect(socialCardVersion(base)).toBe(socialCardVersion({ ...base }));
  });
  it.each([
    ['siteName', { ...base, siteName: 'S2' }],
    ['siteDescription', { ...base, siteDescription: 'd' }],
    ['logo', { ...base, logo: 'x' }],
    ['showMark', { ...base, showMark: false }],
    ['page sha', { ...base, page: { ...base.page!, sha: 'zzz' } }],
    ['no page', { ...base, page: null }],
  ])('changes when %s changes', (_n, changed) => {
    expect(socialCardVersion(changed)).not.toBe(socialCardVersion(base));
  });
});

describe('urls', () => {
  it('builds card urls for home and pages', () => {
    expect(socialCardUrl('https://a.flowershow.me', '/', 'v1')).toBe('https://a.flowershow.me/_og?v=v1');
    expect(socialCardUrl('https://a.flowershow.me', '/blog/post', 'v1')).toBe('https://a.flowershow.me/_og/blog/post?v=v1');
  });
  it('builds a short display url', () => {
    expect(displayUrl('https://a.flowershow.me', '/')).toBe('a.flowershow.me');
    expect(displayUrl('https://a.flowershow.me', '/blog/post')).toBe('a.flowershow.me/blog/post');
    expect(displayUrl('https://a.b', `/${'x'.repeat(100)}`).length).toBeLessThanOrEqual(60);
  });
});

describe('resolveSocialImage', () => {
  const a = {
    cardsEnabled: true,
    isPremium: false,
    isProtected: false,
    pageImage: null as string | null,
    siteImage: null as string | null,
    cardUrl: 'CARD',
    siteCardUrl: 'SITECARD',
    legacyThumbnail: 'THUMB',
  };
  const card = (url: string) => ({ url, width: 1200, height: 630 });

  it.each([
    ['protected → site card', { isProtected: true, isPremium: true, pageImage: 'P' }, card('SITECARD')],
    ['premium + page image → page image', { isPremium: true, pageImage: 'P', siteImage: 'S' }, { url: 'P' }],
    ['premium + site image → site image', { isPremium: true, siteImage: 'S' }, { url: 'S' }],
    ['premium, no images → card', { isPremium: true }, card('CARD')],
    ['free ignores page image → card', { pageImage: 'P', siteImage: 'S' }, card('CARD')],
    ['flag off, free → legacy thumbnail', { cardsEnabled: false }, card('THUMB')],
    ['flag off, premium + page image', { cardsEnabled: false, isPremium: true, pageImage: 'P' }, { url: 'P' }],
    ['flag off, premium, nothing → null', { cardsEnabled: false, isPremium: true }, null],
  ])('%s', (_name, over, expected) => {
    expect(resolveSocialImage({ ...a, ...over })).toEqual(expected);
  });
});

describe('buildSocialMetadata', () => {
  it('includes the image with alt = title', () => {
    const m = buildSocialMetadata({ title: 'T', description: 'D', url: 'U', image: { url: 'I', width: 1200, height: 630 } });
    expect(m.openGraph.images).toEqual([{ url: 'I', width: 1200, height: 630, alt: 'T' }]);
    expect(m.twitter.card).toBe('summary_large_image');
    expect(m.twitter).not.toHaveProperty('creator');
  });
  it('omits images entirely when there is none (never url: null)', () => {
    const m = buildSocialMetadata({ title: 'T', url: 'U', image: null });
    expect(m.openGraph).not.toHaveProperty('images');
    expect(m.twitter).not.toHaveProperty('images');
    expect(m.twitter.card).toBe('summary');
  });
  it('omits width/height for author images', () => {
    const m = buildSocialMetadata({ title: 'T', url: 'U', image: { url: 'I' } });
    expect(m.openGraph.images).toEqual([{ url: 'I', alt: 'T' }]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/flowershow && pnpm test:unit -- lib/social-preview`
Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Implement**

```ts
// apps/flowershow/lib/social-preview.ts
import { createHash } from 'node:crypto';
import { Plan } from '@prisma/client';
import type { SiteConfig } from '@/components/types';
import { resolveSiteName } from '@/lib/site-config';

/** Bump when the card design changes, so every cached card URL changes. */
export const CARD_VERSION = 1;

export interface CardInputs {
  siteName: string;
  siteDescription: string | null;
  logo: string | null;
  showMark: boolean;
  /** null → the site-only card (home without a blob, protected site, missing page). */
  page: { title: string; description: string | null; sha: string } | null;
}

const asText = (v: unknown): string | null =>
  v == null || v === '' ? null : String(v);

export function toCardInputs(a: {
  site: { plan: Plan | null; privacyMode: string; projectName: string };
  siteConfig: SiteConfig | null;
  blob: { sha: string; metadata: unknown } | null;
}): CardInputs {
  const siteName = resolveSiteName(a.siteConfig, a.site.projectName);
  const metadata = (a.blob?.metadata ?? null) as Record<string, unknown> | null;
  const hidePage =
    a.site.privacyMode === 'PASSWORD' ||
    !a.blob ||
    !metadata ||
    metadata.publish === false;

  return {
    siteName,
    siteDescription: asText(a.siteConfig?.description),
    logo: asText(a.siteConfig?.logo ?? a.siteConfig?.nav?.logo),
    showMark: a.site.plan !== Plan.PREMIUM,
    page: hidePage
      ? null
      : {
          title: asText(metadata.title) ?? siteName,
          description: asText(metadata.description),
          sha: a.blob!.sha,
        },
  };
}

export function socialCardVersion(c: CardInputs): string {
  return createHash('sha1')
    .update(JSON.stringify([CARD_VERSION, c]))
    .digest('hex')
    .slice(0, 10);
}

export function socialCardUrl(siteUrl: string, slug: string, v: string): string {
  return `${siteUrl}/_og${slug === '/' ? '' : slug}?v=${v}`;
}

export function displayUrl(siteUrl: string, slug: string): string {
  const host = siteUrl.replace(/^https?:\/\//, '');
  const full = slug === '/' ? host : `${host}${slug}`;
  return full.length > 60 ? `${full.slice(0, 59)}…` : full;
}

export type SocialImage = { url: string; width?: number; height?: number };

const card = (url: string): SocialImage => ({ url, width: 1200, height: 630 });

export function resolveSocialImage(a: {
  cardsEnabled: boolean;
  isPremium: boolean;
  isProtected: boolean;
  pageImage: string | null;
  siteImage: string | null;
  cardUrl: string;
  siteCardUrl: string;
  legacyThumbnail: string;
}): SocialImage | null {
  if (!a.cardsEnabled) {
    // Pre-cards behaviour, minus the `url: null` bug.
    if (!a.isPremium) return card(a.legacyThumbnail);
    const url = a.pageImage ?? a.siteImage;
    return url ? { url } : null;
  }
  if (a.isProtected) return card(a.siteCardUrl);
  if (a.isPremium && a.pageImage) return { url: a.pageImage };
  if (a.isPremium && a.siteImage) return { url: a.siteImage };
  return card(a.cardUrl);
}

export function buildSocialMetadata(a: {
  title: string;
  description?: string;
  url: string;
  image: SocialImage | null;
}) {
  const images = a.image ? [{ ...a.image, alt: a.title }] : undefined;
  return {
    openGraph: {
      title: a.title,
      description: a.description,
      type: 'website' as const,
      url: a.url,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? ('summary_large_image' as const) : ('summary' as const),
      title: a.title,
      description: a.description,
      ...(images ? { images } : {}),
    },
  };
}
```

In `env.mjs`, add to `server`: `SOCIAL_CARDS_ENABLED: z.enum(['true', 'false']).optional(),`, and to `runtimeEnv`: `SOCIAL_CARDS_ENABLED: process.env.SOCIAL_CARDS_ENABLED,`.

In `lib/feature-flags.ts`, `env` is already imported. Add:

```ts
/** Generated social cards (flowershow-1o5). Off unless SOCIAL_CARDS_ENABLED=true. */
export function isSocialCardsEnabled(): boolean {
  return env.SOCIAL_CARDS_ENABLED === 'true';
}
```

If `Plan.FREE` doesn't exist in the Prisma enum (`prisma/schema.prisma:124`), use whichever non-premium member does exist in the test's `site` fixture.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/flowershow && pnpm test:unit -- lib/social-preview`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/lib/social-preview.ts apps/flowershow/lib/social-preview.test.ts apps/flowershow/lib/feature-flags.ts apps/flowershow/env.mjs
git commit -m "feat: social preview decisions — card inputs, version hash, image precedence (flowershow-1o5)"
```

---

### Task 6: `SocialCard` component and PNG renderer

**Files:**
- Create: `apps/flowershow/components/og/social-card.tsx`
- Create: `apps/flowershow/components/og/social-card.stories.tsx`
- Create: `apps/flowershow/components/og/fonts/` with `SourceSerif4-SemiBold.woff`, `Inter-Regular.woff`, `Inter-SemiBold.woff` and `OFL.txt`
- Create: `apps/flowershow/components/og/flowershow-mark.png`
- Create: `apps/flowershow/lib/social-card-render.tsx`
- Create: `apps/flowershow/lib/social-card-render.test.tsx`
- Modify: `apps/flowershow/next.config.mjs` (`outputFileTracingIncludes`)

**Interfaces:**
- Consumes: `CardInputs` (Task 5).
- Produces:
  - `SocialCard(props: SocialCardProps)`, a JSX element tree valid for Satori (every multi-child `div` has `display: 'flex'`)
  - `clampText(s: string, max: number): string`
  - `titleFontSize(title: string): 76 | 64 | 54`
  - `loadImageDataUri(url: string | null, opts?: { timeoutMs?: number; maxBytes?: number; fetchImpl?: typeof fetch }): Promise<string | null>`
  - `renderSocialCardPng(inputs: CardInputs, displayUrl: string): Promise<ArrayBuffer>`

- [ ] **Step 1: Add the assets**

```bash
cd apps/flowershow/components/og && mkdir -p fonts
curl -fL -o fonts/Inter-Regular.woff https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-400-normal.woff
curl -fL -o fonts/Inter-SemiBold.woff https://cdn.jsdelivr.net/npm/@fontsource/inter@5/files/inter-latin-600-normal.woff
curl -fL -o fonts/SourceSerif4-SemiBold.woff https://cdn.jsdelivr.net/npm/@fontsource/source-serif-4@5/files/source-serif-4-latin-600-normal.woff
curl -fL -o fonts/OFL.txt https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt
curl -fL -o flowershow-mark.png https://r2-assets.flowershow.app/logo.png
```

Expected: each `.woff` is 20–35KB, and `file flowershow-mark.png` reports a 160×160 PNG. Both fonts are licensed under SIL OFL. Add a line to `fonts/OFL.txt` noting that Source Serif 4 is also OFL (Adobe).

- [ ] **Step 2: Write the failing tests**

```tsx
// apps/flowershow/lib/social-card-render.test.tsx
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { clampText, titleFontSize } from '@/components/og/social-card';
import { loadImageDataUri, renderSocialCardPng } from './social-card-render';

const PNG_1x1 = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zx9QAAAAASUVORK5CYII='),
  (c) => c.charCodeAt(0),
);
const fakeFetch = (body: BodyInit, type: string, status = 200) =>
  vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } })) as unknown as typeof fetch;

describe('clampText / titleFontSize (Review Focus 2)', () => {
  it('leaves short text alone and clamps long text with an ellipsis', () => {
    expect(clampText('short', 10)).toBe('short');
    expect(clampText('a'.repeat(300), 110)).toHaveLength(110);
    expect(clampText('a'.repeat(300), 110).endsWith('…')).toBe(true);
  });
  it('does not split a surrogate pair (emoji)', () => {
    const out = clampText('🌸'.repeat(200), 50);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/[\uD800-\uDBFF]…$/);
  });
  it('steps the title size down', () => {
    expect(titleFontSize('a'.repeat(30))).toBe(76);
    expect(titleFontSize('a'.repeat(50))).toBe(64);
    expect(titleFontSize('a'.repeat(80))).toBe(54);
  });
});

describe('loadImageDataUri (Review Focus 3)', () => {
  it('returns a data uri for png', async () => {
    const uri = await loadImageDataUri('https://x/l.png', { fetchImpl: fakeFetch(PNG_1x1, 'image/png') });
    expect(uri).toMatch(/^data:image\/png;base64,/);
  });
  it.each([
    ['null url', null, fakeFetch(PNG_1x1, 'image/png')],
    ['emoji', '🌸', fakeFetch(PNG_1x1, 'image/png')],
    ['relative path', '/assets/logo.png', fakeFetch(PNG_1x1, 'image/png')],
    ['webp', 'https://x/l.webp', fakeFetch(PNG_1x1, 'image/webp')],
    ['404', 'https://x/l.png', fakeFetch('nope', 'text/html', 404)],
    ['too big', 'https://x/l.png', fakeFetch(new Uint8Array(3_000_000), 'image/png')],
  ])('returns null for %s', async (_n, url, fetchImpl) => {
    expect(await loadImageDataUri(url as string | null, { fetchImpl })).toBeNull();
  });
  it('returns null on timeout', async () => {
    const slow = vi.fn(
      (_u: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted')))),
    ) as unknown as typeof fetch;
    expect(await loadImageDataUri('https://x/l.png', { fetchImpl: slow, timeoutMs: 20 })).toBeNull();
  });
});

describe('renderSocialCardPng', () => {
  const inputs = {
    siteName: 'Ana’s Garden',
    siteDescription: 'Notes',
    logo: null,
    showMark: true,
    page: { title: 'Why I moved my notes to a public digital garden', description: 'Last spring…', sha: 'a' },
  };
  const isPng1200x630 = (buf: ArrayBuffer) => {
    const v = new DataView(buf);
    return v.getUint32(0) === 0x89504e47 && v.getUint32(16) === 1200 && v.getUint32(20) === 630;
  };

  it('renders a 1200x630 png for a page', async () => {
    expect(isPng1200x630(await renderSocialCardPng(inputs, 'notes-ana.flowershow.me/x'))).toBe(true);
  }, 20_000);

  it('renders the site-only card and pathological titles without throwing', async () => {
    expect(isPng1200x630(await renderSocialCardPng({ ...inputs, page: null }, 'notes-ana.flowershow.me'))).toBe(true);
    for (const title of ['h'.repeat(400), '数字花园的笔记与想法'.repeat(10), '🌸🌼🌻'.repeat(30)]) {
      expect(isPng1200x630(await renderSocialCardPng({ ...inputs, page: { ...inputs.page, title } }, 'x'))).toBe(true);
    }
  }, 60_000);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd apps/flowershow && pnpm test:unit -- lib/social-card-render`
Expected: FAIL, because the modules aren't found.

- [ ] **Step 4: Implement the component**

```tsx
// apps/flowershow/components/og/social-card.tsx
/* Satori (next/og) layout: inline styles only, every multi-child div is flex. */

export const ACCENT = '#EA580C';

export interface SocialCardProps {
  siteName: string;
  logoSrc: string | null; // data URI, or null → monogram
  title: string;
  description: string | null;
  displayUrl: string;
  showMark: boolean;
  markSrc: string; // data URI
}

export function clampText(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

export function titleFontSize(title: string): 76 | 64 | 54 {
  const n = Array.from(title).length;
  return n > 70 ? 54 : n > 40 ? 64 : 76;
}

function Monogram({ siteName }: { siteName: string }) {
  const glyph = Array.from(siteName.trim())[0]?.toUpperCase() ?? '•';
  return (
    <div style={{ display: 'flex', width: 52, height: 52, borderRadius: 10, background: ACCENT, color: '#fff', fontSize: 28, fontWeight: 600, alignItems: 'center', justifyContent: 'center' }}>
      {glyph}
    </div>
  );
}

export function SocialCard(p: SocialCardProps) {
  const title = clampText(p.title, 110);
  return (
    <div style={{ display: 'flex', width: 1200, height: 630, background: '#FAFAF7', fontFamily: 'Inter' }}>
      <div style={{ display: 'flex', width: 14, height: 630, background: ACCENT }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, fontWeight: 600, color: '#374151' }}>
          {p.logoSrc ? <img src={p.logoSrc} width={52} height={52} style={{ borderRadius: 8, objectFit: 'contain' }} /> : <Monogram siteName={p.siteName} />}
          <div style={{ display: 'flex' }}>{clampText(p.siteName, 50)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', fontFamily: 'Source Serif 4', fontWeight: 600, fontSize: titleFontSize(title), lineHeight: 1.1, color: '#111827' }}>
            {title}
          </div>
          {p.description ? (
            <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.4, color: '#4B5563' }}>{clampText(p.description, 150)}</div>
          ) : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22, color: '#9CA3AF' }}>
          <div style={{ display: 'flex' }}>{p.displayUrl}</div>
          {p.showMark ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280' }}>
              <img src={p.markSrc} width={30} height={30} />
              <div style={{ display: 'flex' }}>Flowershow</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement the renderer**

```tsx
// apps/flowershow/lib/social-card-render.tsx
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SocialCard } from '@/components/og/social-card';
import type { CardInputs } from '@/lib/social-preview';

const OG_DIR = join(process.cwd(), 'components/og');
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);

let assets: Promise<{ fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']; markSrc: string }> | null = null;

function loadAssets() {
  assets ??= (async () => {
    const [serif, inter400, inter600, mark] = await Promise.all([
      readFile(join(OG_DIR, 'fonts/SourceSerif4-SemiBold.woff')),
      readFile(join(OG_DIR, 'fonts/Inter-Regular.woff')),
      readFile(join(OG_DIR, 'fonts/Inter-SemiBold.woff')),
      readFile(join(OG_DIR, 'flowershow-mark.png')),
    ]);
    return {
      fonts: [
        { name: 'Source Serif 4', data: serif, weight: 600 as const, style: 'normal' as const },
        { name: 'Inter', data: inter400, weight: 400 as const, style: 'normal' as const },
        { name: 'Inter', data: inter600, weight: 600 as const, style: 'normal' as const },
      ],
      markSrc: `data:image/png;base64,${mark.toString('base64')}`,
    };
  })();
  return assets;
}

/** Fetches a logo for the card. Never throws; anything unusable → null (monogram). */
export async function loadImageDataUri(
  url: string | null,
  opts: { timeoutMs?: number; maxBytes?: number; fetchImpl?: typeof fetch } = {},
): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null; // emoji, unresolved relative path
  const { timeoutMs = 1500, maxBytes = 2_000_000, fetchImpl = fetch } = opts;
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim();
    if (!ALLOWED.has(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Renders the card fully (so render errors surface here, not mid-stream). */
export async function renderSocialCardPng(
  inputs: CardInputs,
  displayUrl: string,
): Promise<ArrayBuffer> {
  const [{ fonts, markSrc }, logoSrc] = await Promise.all([loadAssets(), loadImageDataUri(inputs.logo)]);
  const res = new ImageResponse(
    (
      <SocialCard
        siteName={inputs.siteName}
        logoSrc={logoSrc}
        title={inputs.page?.title ?? inputs.siteName}
        description={inputs.page ? inputs.page.description : inputs.siteDescription}
        displayUrl={displayUrl}
        showMark={inputs.showMark}
        markSrc={markSrc}
      />
    ),
    { width: 1200, height: 630, fonts, emoji: 'twemoji' },
  );
  return res.arrayBuffer();
}
```

A note on the emoji-logo case: `loadImageDataUri` returns null for an emoji logo, so the monogram shows the first letter of the site name. Rendering the emoji itself in the monogram is a phase 2 nicety. Don't add it now.

In `next.config.mjs`, add at the top level of the config object:

```js
  outputFileTracingIncludes: {
    '/api/og/[user]/[project]/[[...slug]]': ['./components/og/fonts/*', './components/og/flowershow-mark.png'],
  },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd apps/flowershow && pnpm test:unit -- lib/social-card-render`
Expected: PASS.
- If `next/og` fails to load under Vitest (WASM resolution), add `server: { deps: { inline: ['next'] } }` to the unit project in `vitest.config.ts`. If it still fails, move only the two `renderSocialCardPng` tests to Task 9's E2E.
- Record which option you chose in the PR description.

- [ ] **Step 7: Add a story so the layout can be reviewed visually**

```tsx
// apps/flowershow/components/og/social-card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { SocialCard } from './social-card';

const meta: Meta<typeof SocialCard> = {
  title: 'OG/SocialCard',
  component: SocialCard,
  args: {
    siteName: 'Ana’s Garden',
    logoSrc: null,
    title: 'Why I moved my notes from Obsidian to a public digital garden',
    description: 'Last spring I made a slightly scary decision: I published my entire notes vault.',
    displayUrl: 'notes-ana.flowershow.me/garden',
    showMark: true,
    markSrc: 'https://r2-assets.flowershow.app/logo.png',
  },
};
export default meta;
type Story = StoryObj<typeof SocialCard>;

export const FreeNoLogo: Story = {};
export const Premium: Story = { args: { showMark: false, logoSrc: 'https://r2-assets.flowershow.app/logo.png', siteName: 'Flowershow' } };
export const LongTitle: Story = { args: { title: 'h'.repeat(200) } };
export const NoDescription: Story = { args: { description: null } };
export const SiteOnly: Story = { args: { title: 'Team Handbook', description: 'Private site', displayUrl: 'handbook.example.org' } };
```

Check the import path used by other stories (`grep -rl "@storybook/react" components | head -1`) and match it. Then run `pnpm test:storybook -- social-card`. Expected: PASS (the stories render).

- [ ] **Step 8: Commit**

```bash
git add apps/flowershow/components/og apps/flowershow/lib/social-card-render.tsx apps/flowershow/lib/social-card-render.test.tsx apps/flowershow/next.config.mjs
git commit -m "feat: Editorial social card component and PNG renderer (flowershow-1o5)"
```

---

### Task 7: `/_og` route, middleware rewrite and response policy

**Files:**
- Create: `apps/flowershow/lib/social-card-response.ts`
- Create: `apps/flowershow/lib/social-card-response.test.ts`
- Create: `apps/flowershow/app/api/og/[user]/[project]/[[...slug]]/route.tsx`
- Modify: `apps/flowershow/middleware.ts`. Add an exported `rewriteSocialCardIfNeeded`, and call it before `ensureSiteAccess` in the subdomain branch (after `rawImage`, around line 227) and in the custom-domain branch (after `rawImage`, around line 283).
- Modify: `apps/flowershow/middleware.test.ts`

**Interfaces:**
- Consumes: `toCardInputs`, `socialCardVersion`, `displayUrl`, `isSocialCardsEnabled` (Task 5); `renderSocialCardPng` (Task 6).
- Produces:
  - `socialCardResponse(a: { expectedVersion: string; requestedVersion: string | null; renderPage: (() => Promise<ArrayBuffer>) | null; renderSite: () => Promise<ArrayBuffer>; fallbackUrl: string }): Promise<Response>`
  - `rewriteSocialCardIfNeeded(inputPath: string, apiBase: string, req: NextRequest, ph: PHBootstrap | null): NextResponse | null`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/flowershow/lib/social-card-response.test.ts
import { describe, expect, it, vi } from 'vitest';
import { socialCardResponse } from './social-card-response';

const png = new Uint8Array([1, 2, 3]).buffer;
const ok = () => vi.fn(async () => png);
const boom = () => vi.fn(async () => { throw new Error('render failed'); });
const LONG = 'public, max-age=31536000, immutable';
const SHORT = 'public, max-age=300';

describe('socialCardResponse (Review Focus 5)', () => {
  it('serves the page card with a long cache when v matches', async () => {
    const res = await socialCardResponse({ expectedVersion: 'v1', requestedVersion: 'v1', renderPage: ok(), renderSite: ok(), fallbackUrl: 'F' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe(LONG);
  });
  it.each([['stale', 'old'], ['missing', null], ['forged', 'zzzzzzzzzz']])('short cache when v is %s', async (_n, v) => {
    const res = await socialCardResponse({ expectedVersion: 'v1', requestedVersion: v, renderPage: ok(), renderSite: ok(), fallbackUrl: 'F' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(SHORT);
  });
  it('renders the site card when there is no page', async () => {
    const renderSite = ok();
    const res = await socialCardResponse({ expectedVersion: 'v1', requestedVersion: 'v1', renderPage: null, renderSite, fallbackUrl: 'F' });
    expect(renderSite).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
  it('falls back to the site card with a short cache when the page render fails', async () => {
    const renderSite = ok();
    const res = await socialCardResponse({ expectedVersion: 'v1', requestedVersion: 'v1', renderPage: boom(), renderSite, fallbackUrl: 'F' });
    expect(renderSite).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(SHORT);
  });
  it('redirects to the static thumbnail when both renders fail', async () => {
    const res = await socialCardResponse({ expectedVersion: 'v1', requestedVersion: 'v1', renderPage: boom(), renderSite: boom(), fallbackUrl: 'https://r2/thumbnail.png' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://r2/thumbnail.png');
  });
});
```

Append to `middleware.test.ts`, adding `rewriteSocialCardIfNeeded` to the import:

```ts
describe('rewriteSocialCardIfNeeded (flowershow-1o5)', () => {
  const base = '/api/og/ana/notes';
  const go = (p: string) => rewriteSocialCardIfNeeded(p, base, makeReq(p), null);

  it('rewrites the home card', () => {
    const t = rewriteTarget(go('/_og?v=abc'));
    expect(t.pathname).toBe('/api/og/ana/notes');
    expect(t.searchParams.get('v')).toBe('abc');
  });
  it('rewrites a nested page card', () => {
    expect(rewriteTarget(go('/_og/blog/post?v=abc')).pathname).toBe('/api/og/ana/notes/blog/post');
  });
  it('ignores other paths, including look-alikes', () => {
    expect(go('/blog/_og')).toBeNull();
    expect(go('/_ogre')).toBeNull();
    expect(go('/about')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/flowershow && pnpm test:unit -- lib/social-card-response middleware`
Expected: FAIL. The module isn't found, and `rewriteSocialCardIfNeeded` isn't exported.

- [ ] **Step 3: Implement the response policy**

```ts
// apps/flowershow/lib/social-card-response.ts
const LONG = 'public, max-age=31536000, immutable';
const SHORT = 'public, max-age=300';

const png = (body: ArrayBuffer, cacheControl: string) =>
  new Response(body, { status: 200, headers: { 'content-type': 'image/png', 'cache-control': cacheControl } });

/**
 * Cache policy + fallbacks for /_og. Long cache only for a correct `v` and a
 * clean render; anything else gets a short cache so it self-heals. A missing
 * page is the site card (200), so the route never confirms a page exists.
 */
export async function socialCardResponse(a: {
  expectedVersion: string;
  requestedVersion: string | null;
  renderPage: (() => Promise<ArrayBuffer>) | null;
  renderSite: () => Promise<ArrayBuffer>;
  fallbackUrl: string;
}): Promise<Response> {
  const cache = a.requestedVersion === a.expectedVersion ? LONG : SHORT;
  try {
    return png(await (a.renderPage ?? a.renderSite)(), cache);
  } catch (err) {
    console.error('[og] card render failed', err);
  }
  try {
    return png(await a.renderSite(), SHORT);
  } catch (err) {
    console.error('[og] site card render failed', err);
  }
  return Response.redirect(a.fallbackUrl, 302);
}
```

When `renderPage` is null and `renderSite` throws, the second `try` runs `renderSite` again. That's acceptable: it's one retry, and the test only asserts the end result.

- [ ] **Step 4: Implement the middleware helper and wire it in**

In `middleware.ts`, next to `rewriteRawIfNeeded`:

```ts
/**
 * Social card images (/_og, /_og/<slug>) for link previews. Served before the
 * password gate because crawlers have no cookies; the handler itself never
 * reveals page content for protected sites (flowershow-1o5).
 */
export function rewriteSocialCardIfNeeded(
  inputPath: string,
  apiBase: string,
  req: NextRequest,
  ph: PHBootstrap | null,
) {
  const q = inputPath.indexOf('?');
  const pathPart = q === -1 ? inputPath : inputPath.slice(0, q);
  const search = q === -1 ? '' : inputPath.slice(q);
  if (pathPart !== '/_og' && !pathPart.startsWith('/_og/')) return null;
  return rewrite(`${apiBase}${pathPart.slice('/_og'.length)}${search}`, req, ph ?? undefined);
}
```

In the subdomain branch, directly after `if (rawImage) return rawImage;`:

```ts
    const socialCard = rewriteSocialCardIfNeeded(path, `/api/og/${username}/${projectname}`, req, phBootstrap);
    if (socialCard) return socialCard;
```

In the custom-domain branch, directly after its `if (rawImage) return rawImage;`:

```ts
  const socialCard = rewriteSocialCardIfNeeded(path, `/api/og/_domain/${hostname}`, req, phBootstrap);
  if (socialCard) return socialCard;
```

Check that `rewrite`'s third parameter type accepts `PHBootstrap | undefined` (`middleware.ts:317`). If `phBootstrap` is typed differently there, pass it the same way the `rawImage` call does.

- [ ] **Step 5: Implement the route.** Its site lookup mirrors `app/api/sitemap/[user]/[project]/route.ts`.

```tsx
// apps/flowershow/app/api/og/[user]/[project]/[[...slug]]/route.tsx
import type { NextRequest } from 'next/server';
import type { SiteConfig } from '@/components/types';
import { getConfig } from '@/lib/app-config';
import { isSocialCardsEnabled } from '@/lib/feature-flags';
import { getSiteUrl } from '@/lib/get-site-url';
import { renderSocialCardPng } from '@/lib/social-card-render';
import { socialCardResponse } from '@/lib/social-card-response';
import { displayUrl, socialCardVersion, toCardInputs } from '@/lib/social-preview';
import prisma from '@/server/db';
import { api } from '@/trpc/server';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ user: string; project: string; slug?: string[] }> },
) {
  if (!isSocialCardsEnabled()) return new Response('Not found', { status: 404 });

  const params = await props.params;
  const user = decodeURIComponent(params.user);
  const project = decodeURIComponent(params.project);
  const slug = params.slug ? `/${params.slug.join('/')}` : '/';
  const decodedSlug = slug.replace(/%20/g, '+');

  const site = await prisma.site.findFirst({
    where: user === '_domain'
      ? { customDomain: project }
      : { user: { username: user }, projectName: project },
    include: { user: true },
  });
  if (!site) return new Response('Not found', { status: 404 });

  const isProtected = site.privacyMode === 'PASSWORD';
  const dbConfig = (site.configJson ?? null) as SiteConfig | null;
  // Protected: DB settings only (no file config, no page) — tRPC would refuse
  // anyway without the visitor cookie, and the card must not show page content.
  const siteConfig = isProtected
    ? dbConfig
    : await api.site.getConfig.query({ siteId: site.id }).catch(() => dbConfig);
  const blob = isProtected
    ? null
    : await api.site.getBlob.query({ siteId: site.id, slug: decodedSlug }).catch(() => null);

  const inputs = toCardInputs({ site, siteConfig, blob });
  const siteInputs = { ...inputs, page: null };
  const siteUrl = getSiteUrl(site);

  return socialCardResponse({
    expectedVersion: socialCardVersion(inputs),
    requestedVersion: req.nextUrl.searchParams.get('v'),
    renderPage: inputs.page ? () => renderSocialCardPng(inputs, displayUrl(siteUrl, decodedSlug)) : null,
    renderSite: () => renderSocialCardPng(siteInputs, displayUrl(siteUrl, '/')),
    fallbackUrl: getConfig().thumbnail,
  });
}
```

**[verify]**
- `api.site.getBlob` returns `{ sha, metadata, … }`: the Prisma `Blob` row (`server/api/routers/site.ts:1475`). If it returns a narrowed shape without `sha`, use `blob.id + blob.updatedAt` in `toCardInputs` instead, and update the Task 5 test fixture.
- Anonymous sites are served on subdomains with the owner's real username (`middleware.ts:202`), so the lookup above covers them.

- [ ] **Step 6: Run the tests to verify they pass, then type-check**

Run: `cd apps/flowershow && pnpm test:unit -- lib/social-card-response middleware && pnpm exec tsc --noEmit -p .`
Expected: PASS, and no type errors.

- [ ] **Step 7: Smoke-test locally**

Run the dev server with `SOCIAL_CARDS_ENABLED=true`, then `curl -sI "http://<subdomain>.localhost:3000/_og/basic-syntax"` (use the local site host from `e2e/README.md`).
Expected: `200`, `content-type: image/png`, `cache-control: public, max-age=300` (no `v`). Open the URL in a browser and check that the card shows "Basic Syntax", the computed description and the Flowershow mark.

- [ ] **Step 8: Commit**

```bash
git add apps/flowershow/lib/social-card-response.ts apps/flowershow/lib/social-card-response.test.ts "apps/flowershow/app/api/og" apps/flowershow/middleware.ts apps/flowershow/middleware.test.ts
git commit -m "feat: /_og social card route with versioned caching and fallbacks (flowershow-1o5)"
```

---

### Task 8: Point page metadata at the cards

**Files:**
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx:123-171` (`generateMetadata`)
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/layout.tsx:31-60` (replace static `metadata` with `generateMetadata`)
- Modify: `apps/flowershow/app/(public)/site-access/[user]/[project]/page.tsx:31-33` (login page, which is what crawlers of protected sites see)

**Interfaces:**
- Consumes: everything from Task 5, and `isSocialCardsEnabled`.

- [ ] **Step 1: Page metadata.** In `page.tsx` `generateMetadata`, replace lines 126–171 (the `imageUrl`/`faviconUrl` block and the `openGraph`/`twitter` objects) with the code below. Keep the favicon logic exactly as it is, and keep `alternates` and `...anonRobots(site)` where they are.

```ts
  let faviconUrl: string = config.favicon;
  if (isFeatureEnabled(Feature.NoBranding, site) && siteConfig?.favicon) {
    faviconUrl = isEmoji(siteConfig.favicon)
      ? `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${siteConfig.favicon}</text></svg>`
      : siteConfig.favicon;
  }

  const cardInputs = toCardInputs({ site, siteConfig, blob });
  const siteCardInputs = { ...cardInputs, page: null };
  const image = resolveSocialImage({
    cardsEnabled: isSocialCardsEnabled(),
    isPremium: isFeatureEnabled(Feature.NoBranding, site),
    isProtected: site.privacyMode === 'PASSWORD',
    pageImage: metadata?.image || null,
    siteImage: siteConfig?.image || null,
    cardUrl: socialCardUrl(siteUrl, slug, socialCardVersion(cardInputs)),
    siteCardUrl: socialCardUrl(siteUrl, '/', socialCardVersion(siteCardInputs)),
    legacyThumbnail: config.thumbnail,
  });

  return {
    title,
    description,
    icons: faviconUrl ? [{ url: faviconUrl }] : undefined,
    ...buildSocialMetadata({ title, description, url, image }),
    alternates: { /* unchanged */ },
    ...anonRobots(site),
  };
```

Import `isSocialCardsEnabled` from `@/lib/feature-flags`, and `buildSocialMetadata`, `resolveSocialImage`, `socialCardUrl`, `socialCardVersion` and `toCardInputs` from `@/lib/social-preview`.

Use `slug` (the raw joined param) for `socialCardUrl`, not `decodedSlug`. The route applies the same `%20 → +` decoding the page does.

The card's `v` must equal what the route computes for the same request:
- Both call `toCardInputs` with the same `siteConfig` (`api.site.getConfig`) and the same `blob` (`api.site.getBlob` with `decodedSlug`).
- For the home page with no blob (`/` on a site without `index.md` or `README.md`), `blob` is null on both sides, so both get the site card.

**[verify]** `site.privacyMode` and `site.plan` exist on `SiteLookupResult`. The login page reads `site.privacyMode`, and `isFeatureEnabled(…, site)` reads `plan`.

- [ ] **Step 2: Login page metadata (protected sites).** In `site-access/[user]/[project]/page.tsx`, replace `export const metadata` with:

```ts
export async function generateMetadata(props: { params: Promise<RouteParams> }): Promise<Metadata> {
  const params = await props.params;
  const site = await getSite(decodeURIComponent(params.user), decodeURIComponent(params.project));
  const { configJson } = (await prisma.site.findUnique({ where: { id: site.id }, select: { configJson: true } })) ?? {};
  const inputs = toCardInputs({ site, siteConfig: (configJson ?? null) as SiteConfig | null, blob: null });
  const siteUrl = getSiteUrl(site);
  const image = isSocialCardsEnabled()
    ? { url: socialCardUrl(siteUrl, '/', socialCardVersion(inputs)), width: 1200, height: 630 }
    : null;
  return {
    title: 'Site authentication',
    ...buildSocialMetadata({ title: inputs.siteName, description: inputs.siteDescription ?? undefined, url: `${siteUrl}/`, image }),
  };
}
```

Imports: `prisma` from `@/server/db`, `type SiteConfig` from `@/components/types`, `getSiteUrl`, `isSocialCardsEnabled`, and `buildSocialMetadata`, `socialCardUrl`, `socialCardVersion`, `toCardInputs` from `@/lib/social-preview`. This exactly mirrors the route's protected path: DB config and no blob, so the `v` matches.

- [ ] **Step 3: Layout fallback.** In `layout.tsx`, replace the static `export const metadata` (lines 31–60) with a `generateMetadata` that keeps `title`, `description` and `icons` from the app config, and uses the site card for `openGraph` and `twitter` when cards are enabled. When they're disabled, it keeps the legacy thumbnail without `creator`.

```ts
export async function generateMetadata(props: { params: Promise<RouteParams> }): Promise<Metadata> {
  const params = await props.params;
  const site = await getSite(decodeURIComponent(params.user), decodeURIComponent(params.project));
  const siteUrl = getSiteUrl(site);
  const siteConfig = await api.site.getConfig.query({ siteId: site.id }).catch(() => null);
  const inputs = toCardInputs({ site, siteConfig, blob: null });
  const image = isSocialCardsEnabled() && site.privacyMode !== 'PASSWORD'
    ? { url: socialCardUrl(siteUrl, '/', socialCardVersion(inputs)), width: 1200, height: 630 }
    : { url: thumbnail, width: 1200, height: 630 };
  return {
    title,
    description,
    icons: [favicon],
    ...buildSocialMetadata({ title, description, url: `${siteUrl}/`, image }),
  };
}
```

Add the needed imports (`getSite` from `@/lib/get-site`, `getSiteUrl`, the social-preview functions, `isSocialCardsEnabled`). `getSite` may `redirect()` for custom domains, but the layout body already calls the same lookup, so the behaviour doesn't change. **[verify]** by reading `layout.tsx:66-110`. If the body uses a different lookup, call that one instead.

- [ ] **Step 4: Type-check and run the unit suite**

Run: `cd apps/flowershow && pnpm exec tsc --noEmit -p . && pnpm test:unit`
Expected: no type errors, and the whole unit suite passes.

- [ ] **Step 5: Check the rendered HTML on the local site**

With `SOCIAL_CARDS_ENABLED=true`:

```bash
curl -s "http://<local-site-host>/basic-syntax" | grep -oE '<meta (property|name)="(og|twitter):[^"]+" content="[^"]*"'
```

Expected:
- `og:image` = `…/_og/basic-syntax?v=<10 hex>`, with `og:image:width` 1200 and `og:image:height` 630, and `og:image:alt` = the title;
- `twitter:card` = `summary_large_image`;
- no `twitter:creator`;
- fetching the `og:image` URL returns `cache-control: public, max-age=31536000, immutable`.

Then, with `SOCIAL_CARDS_ENABLED` unset, the free site's `og:image` is the legacy thumbnail.

- [ ] **Step 6: Commit**

```bash
git add "apps/flowershow/app/(public)"
git commit -m "feat: page, layout and login metadata use generated social cards (flowershow-1o5)"
```

---

### Task 9: E2E, docs, changelog, manual unfurl checks

**Files:**
- Create: `apps/flowershow/e2e/specs/social-preview.spec.ts`
- Modify: `content/flowershow-app/docs/reference/seo-social-metadata.md`
- Modify: `content/flowershow-app/docs/reference/page-headers.md`
- Create: `content/flowershow-app/changelog/2026-10-XX-social-preview-cards.md` (use the ship date)
- Create: `content/flowershow-app/assets/changelog-social-preview-cards.webp`

- [ ] **Step 1: Write the E2E spec**

```ts
// apps/flowershow/e2e/specs/social-preview.spec.ts
import { expect, test } from '../helpers/fixtures';

test('page gets a generated social card and a computed description', async ({ page, basePath, request }) => {
  await page.goto(`${basePath}/basic-syntax`);

  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(ogImage).toMatch(/\/_og\/basic-syntax\?v=[0-9a-f]{10}$/);
  await expect(page.locator('meta[name="twitter:creator"]')).toHaveCount(0);

  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toBe('This is a paragraph with bold text, italic text, and strikethrough text.');
  await expect(page.locator('.page-header-description')).toHaveCount(0);

  const res = await request.get(ogImage!);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
  expect(res.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

test('unknown pages get the site card, not a 404', async ({ page, basePath, request }) => {
  await page.goto(`${basePath}/`);
  const home = await page.locator('meta[property="og:image"]').getAttribute('content');
  const missing = home!.replace(/\/_og(\?|$)/, '/_og/definitely-not-a-page$1');
  const res = await request.get(missing);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
});
```

The E2E target app must run with `SOCIAL_CARDS_ENABLED=true` and the backfill (or a fresh publish of the fixture site) applied. Add the variable wherever `e2e/README.md` says the app's env is set for E2E runs **[verify]**. Run it with `cd apps/flowershow && pnpm test:e2e -- social-preview`. Expected: PASS.

- [ ] **Step 2: Docs.** Make these exact changes, without hard-wrapping.

`reference/seo-social-metadata.md`:
- Replace the "Default social image" premium note with:
  - **Free sites:** every page gets a generated preview card with its title, description and site name, plus a small Flowershow mark.
  - **Premium sites:** the same cards without the mark. If you set an `image` (page or site), that image is used instead.
- Under "Description", add: "If a page has no `description`, Flowershow uses the first paragraph of the page (up to 160 characters) for search results and previews. It isn't shown in the page header, since the paragraph is right there."
- Add a short "Social preview cards" section with the Editorial card screenshot.

`reference/page-headers.md`: under Description, add the same one-sentence note about computed descriptions.

- [ ] **Step 3: Changelog entry.** Follow the changelog style rule: one entry with a hero screenshot. Frontmatter as in `2026-10-03-publish-from-claude-and-chatgpt.md`:
  - title "Every page gets its own social preview";
  - `image: "[[assets/changelog-social-preview-cards.webp]]"`, a ~1440px webp of three real cards side by side, made with headless Chrome from a page showing `/_og` URLs;
  - one paragraph on what changed;
  - a "Fixes" list: the missing-image preview on premium sites and the stray `@flowershowapp` creator tag.

- [ ] **Step 4: Manual unfurl checks on staging** (record the results on the bead)

With `SOCIAL_CARDS_ENABLED=true` on staging, paste one free and one premium page URL into each tool below. Each should show the card with the right title. Premium with `image` should show that image. A protected site should show the site card only.
- opengraph.xyz
- LinkedIn Post Inspector
- a Slack DM to yourself
- an X post composer (don't post)
- iMessage

- [ ] **Step 5: Commit**

```bash
git add apps/flowershow/e2e/specs/social-preview.spec.ts content/flowershow-app
git commit -m "docs: social preview cards, computed descriptions; e2e coverage (flowershow-1o5)"
```

**PR 2 ends here.**

Rollout after merge:
1. Staging with the flag on.
2. Our own sites (flowershow.app first).
3. Everyone: set `SOCIAL_CARDS_ENABLED=true` in Vercel production.
4. Comment on #943 with what shipped and what phase 2 (`flowershow-jfk`) adds. Close `flowershow-1o5`.
