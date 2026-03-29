# Collection Listing Templating Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal, HTML-first way to render folder-based collections of Markdown pages as custom listing cards on Flowershow pages.

**Architecture:** Reuse Flowershow's existing metastore-backed page metadata and MDX/Markdown rendering pipeline. Implement a new remark plugin that resolves a page-local `collection` block into rendered HTML using a shared server-side collection query utility, then expose the feature through fixtures, e2e coverage, and tutorial-first docs.

**Tech Stack:** Next.js App Router, `next-mdx-remote-client`, unified/remark, React 19, tRPC, Prisma, Vitest, Playwright

---

## Working Assumptions

- Phase 1 is folder-based only: "all Markdown pages under `/projects`" or `/blog`.
- Phase 1 is page-local only: no reusable partials or shared template registry.
- Phase 1 is HTML-first and minimal: repeat one item template for each result and interpolate scalar values like `title`, `description`, `date`, `image`, `url`, and `path`.
- Phase 1 does not support arbitrary API/JSON data, reactive behavior, or a full query language.
- Phase 1 should work in both Markdown and MDX rendering paths so the author experience is not blocked on JSX.
- The existing `<List />` component remains supported. This work adds a new lower-level authoring path rather than replacing `List`.

## Target User Experience

The tutorial we should be able to publish after implementation:

1. Create a folder such as `/projects`.
2. Add Markdown files with frontmatter like `title`, `description`, `date`, `image`, and `status`.
3. Create a listing page with a `collection` block:

````markdown
---
title: Projects
showToc: false
---

```collection
from: /projects
sort:
  by: date
  direction: desc
template: |
  <article class="project-card not-prose">
    <a class="project-card__link" href="{{url}}">
      <img class="project-card__image" src="{{image}}" alt="{{title}}" />
      <p class="project-card__eyebrow">{{date}}</p>
      <h3 class="project-card__title">{{title}}</h3>
      <p class="project-card__summary">{{description}}</p>
      <p class="project-card__status">{{status}}</p>
    </a>
  </article>
```
````

4. Publish the site and see one rendered card per matching page.

That tutorial is the acceptance test for the implementation.

## Proposed Syntax For Phase 1

Use a fenced code block with language `collection`:

```yaml
from: /projects
sort:
  by: date
  direction: desc
template: |
  <article>
    <a href="{{url}}">
      <h3>{{title}}</h3>
      <p>{{description}}</p>
    </a>
  </article>
```

Phase 1 supported keys:

- `from`: folder path relative to site root
- `sort.by`: metadata field name or `title`/`date`
- `sort.direction`: `asc` or `desc`
- `template`: HTML snippet rendered once per item

Phase 1 template variables:

- `title`
- `description`
- `date`
- `image`
- `authors`
- `url`
- `path`
- Any frontmatter scalar already available in `PageMetadata`

Phase 1 rendering rules:

- Unknown or missing fields render as empty strings.
- Values are HTML-escaped before interpolation.
- Arrays render as comma-joined strings.
- The plugin wraps repeated items in a predictable container such as `<div class="collection-template">...</div>`.

## Key Codebase Constraints To Respect

- Public page rendering currently branches between pure Markdown and MDX in [apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx).
- The MDX component registry lives in [apps/flowershow/components/public/mdx/mdx-components-factory.tsx](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/components/public/mdx/mdx-components-factory.tsx).
- The current listing path is client-side and tied to tRPC in [apps/flowershow/components/public/mdx/list.tsx](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/components/public/mdx/list.tsx) and [apps/flowershow/server/api/routers/site.ts](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/server/api/routers/site.ts).
- Obsidian Bases already proves the "query in markdown, turn into MDX JSX node" pattern in [apps/flowershow/lib/remark-obsidian-bases.ts](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/lib/remark-obsidian-bases.ts).
- Existing list docs and blog-setup docs already teach `<List />` in [content/flowershow-app/docs/list-component.md](/Users/rgrp/src/flowershow/flowershow/content/flowershow-app/docs/list-component.md) and [content/flowershow-app/blog/how-to-publish-blog.md](/Users/rgrp/src/flowershow/flowershow/content/flowershow-app/blog/how-to-publish-blog.md).

### Task 1: Lock the feature contract in docs and fixtures first

**Files:**
- Create: `content/flowershow-app/docs/collection-templates.md`
- Modify: `content/flowershow-app/blog/how-to-publish-blog.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/index.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/project-alpha.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/project-beta.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/project-gamma.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/cards.md`

**Step 1: Write the tutorial-first acceptance content**

Draft the new docs page around the exact phase-1 syntax:

````md
# Collection Templates

```collection
from: /projects
sort:
  by: date
  direction: desc
template: |
  <article class="project-card">
    <a href="{{url}}">
      <h3>{{title}}</h3>
      <p>{{description}}</p>
    </a>
  </article>
```
````

**Step 2: Add a realistic fixture folder**

Create three project pages with complete frontmatter so the minimal syntax works without conditionals.

**Step 3: Add a fixture page that uses the final syntax**

`projects/cards.md` should be the canonical example used by e2e and docs writing.

**Step 4: Commit**

```bash
git add content/flowershow-app/docs/collection-templates.md content/flowershow-app/blog/how-to-publish-blog.md apps/flowershow/e2e/fixtures/test-site/projects
git commit -m "docs: draft collection template tutorial and fixtures"
```

### Task 2: Extract shared server-side collection query logic from the current List path

**Files:**
- Create: `apps/flowershow/lib/collections.ts`
- Create: `apps/flowershow/lib/collections.test.ts`
- Modify: `apps/flowershow/server/api/routers/site.ts`

**Step 1: Write the failing unit tests**

Cover a pure function that normalizes and sorts collection items:

```ts
it('sorts dated items descending by default', () => {
  const items = normalizeCollectionItems(fixtures, { sortBy: 'date', direction: 'desc' });
  expect(items.map((item) => item.metadata.title)).toEqual(['Gamma', 'Beta', 'Alpha']);
});
```

Also cover:

- `README.md` and `index.md` exclusion
- recursive folder inclusion
- permalink fallback over `app_path`
- media/wiki-link resolution

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @flowershow/app test:unit -- lib/collections.test.ts`

Expected: FAIL because `lib/collections.ts` does not exist yet.

**Step 3: Write minimal implementation**

Implement a shared utility with roughly this shape:

```ts
export type CollectionQuery = {
  siteId: string;
  dir: string;
  sitePrefix: string;
  customDomain?: string | null;
  sortBy?: string;
  direction?: 'asc' | 'desc';
  mediaField?: string;
};

export async function getCollectionItems(ctx: QueryContext, query: CollectionQuery) {
  // fetch blobs
  // exclude directory index files
  // normalize url + metadata
  // sort
  return { items };
}
```

**Step 4: Replace router-local listing logic**

Update `getListComponentItems` in [site.ts](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/server/api/routers/site.ts) to call the shared utility instead of duplicating the query.

**Step 5: Run tests to verify they pass**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collections.test.ts components/public/mdx/list.test.tsx
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/flowershow/lib/collections.ts apps/flowershow/lib/collections.test.ts apps/flowershow/server/api/routers/site.ts
git commit -m "refactor: extract shared collection query utility"
```

### Task 3: Build a pure template renderer before integrating it into markdown

**Files:**
- Create: `apps/flowershow/lib/collection-template.ts`
- Create: `apps/flowershow/lib/collection-template.test.ts`

**Step 1: Write the failing unit tests**

Cover:

- `{{title}}` interpolation
- empty string for missing fields
- HTML escaping for `<`, `>`, `&`, `"`
- arrays joined with `, `
- wrapper generation for multiple items

Example:

```ts
it('escapes HTML-sensitive values', () => {
  const html = renderCollectionTemplate({
    template: '<h3>{{title}}</h3>',
    items: [{ title: '<Unsafe>' }],
  });
  expect(html).toContain('&lt;Unsafe&gt;');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @flowershow/app test:unit -- lib/collection-template.test.ts`

Expected: FAIL because the renderer does not exist yet.

**Step 3: Write minimal implementation**

Implement:

```ts
export function renderCollectionTemplate(opts: {
  template: string;
  items: Array<Record<string, unknown>>;
  wrapperClass?: string;
}): string
```

Keep the implementation deliberately small:

- regex-based `{{field}}` lookup
- scalar normalization
- HTML escaping helper
- default wrapper class `collection-template`

**Step 4: Run tests to verify they pass**

Run: `pnpm --filter @flowershow/app test:unit -- lib/collection-template.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/flowershow/lib/collection-template.ts apps/flowershow/lib/collection-template.test.ts
git commit -m "feat: add collection template renderer"
```

### Task 4: Add a remark plugin that resolves `collection` blocks at render time

**Files:**
- Create: `apps/flowershow/lib/remark-collection-template.ts`
- Create: `apps/flowershow/lib/remark-collection-template.test.ts`
- Modify: `apps/flowershow/lib/markdown.ts`

**Step 1: Write the failing unit tests**

Test a markdown sample containing:

````md
```collection
from: /projects
sort:
  by: date
  direction: desc
template: |
  <article><h3>{{title}}</h3></article>
```
````

Assertions:

- the plugin replaces the code block
- the rendered result contains one repeated card per item
- missing `from` or `template` produces a visible error block

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @flowershow/app test:unit -- lib/remark-collection-template.test.ts`

Expected: FAIL because the plugin is not registered.

**Step 3: Write minimal implementation**

Follow the same traversal pattern as [remark-obsidian-bases.ts](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/lib/remark-obsidian-bases.ts):

- visit `code` nodes with `lang === 'collection'`
- parse YAML via `yaml.parse`
- call `getCollectionItems(...)`
- call `renderCollectionTemplate(...)`
- replace the code block with either:
  - an HTML node in the pure Markdown path, or
  - an `mdxJsxFlowElement` like `<CustomHtml html="..."/>` in the MDX path

Prefer a dedicated component over overloaded semantics if the HTML path becomes awkward:

- Create `CollectionTemplateHtml` only if `CustomHtml` proves too permissive.

**Step 4: Register the plugin in both pipelines**

In [markdown.ts](/Users/rgrp/src/flowershow/flowershow/apps/flowershow/lib/markdown.ts):

- add the plugin to `processMarkdown(...)`
- add the plugin to `getMdxOptions(...)`

The plugin must receive `siteId`, `sitePrefix`, `customDomain`, and `rootDir`.

**Step 5: Run tests to verify they pass**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/remark-collection-template.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/flowershow/lib/remark-collection-template.ts apps/flowershow/lib/remark-collection-template.test.ts apps/flowershow/lib/markdown.ts
git commit -m "feat: resolve collection template blocks in markdown"
```

### Task 5: Add the minimum presentation layer and author-safe defaults

**Files:**
- Create: `apps/flowershow/components/public/mdx/collection-template-html.tsx` (only if needed)
- Modify: `apps/flowershow/components/public/mdx/mdx-components-factory.tsx`
- Modify: `apps/flowershow/components/public/mdx/mdx-client-components.tsx`
- Modify: `apps/flowershow/components/public/mdx/custom-html.tsx` (only if reusing it safely)
- Modify: `apps/flowershow/styles/default-theme.css`

**Step 1: Write the failing component tests**

If a new component is introduced, test:

- wrapper renders injected HTML
- no script execution path is required for collection templates
- output gets `not-prose` or equivalent wrapper when needed

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @flowershow/app test:unit -- components/public/mdx/*.test.tsx`

Expected: FAIL for the new component or wrapper class.

**Step 3: Implement the smallest rendering surface**

Preferred order:

1. Reuse `CustomHtml` if it is sufficient and acceptable.
2. Otherwise create a narrower `CollectionTemplateHtml` that only renders trusted HTML and does not re-execute scripts.

Add baseline CSS only for the wrapper:

```css
.collection-template {
  display: grid;
  gap: 1.5rem;
}
```

Do not add an opinionated card system in phase 1. Let authors own card styling in their page HTML/CSS.

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- components/public/mdx/*.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/flowershow/components/public/mdx apps/flowershow/styles/default-theme.css
git commit -m "feat: add collection template html renderer"
```

### Task 6: Prove the end-to-end flow with the test fixture site

**Files:**
- Modify: `apps/flowershow/e2e/specs/blog.spec.ts`
- Create: `apps/flowershow/e2e/specs/collection-template.spec.ts`
- Modify: `apps/flowershow/e2e/fixtures/test-site/config.json` (only if the new page path needs inclusion)
- Modify: fixture files created in Task 1

**Step 1: Write the failing e2e tests**

Test cases:

- `/projects/cards` renders three cards
- cards are sorted by date desc
- card links point to the correct project pages
- interpolated fields appear in the custom markup
- the same page works when saved as `.md` instead of `.mdx`

Example:

```ts
await page.goto(`${basePath}/projects/cards`);
await expect(page.locator('.project-card')).toHaveCount(3);
await expect(page.locator('.project-card__title').nth(0)).toHaveText('Project Gamma');
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @flowershow/app test:e2e -- collection-template.spec.ts
```

Expected: FAIL because the page still renders the raw code block or an error state.

**Step 3: Implement any missing fixture or route details**

Only fix what the test exposes. Do not expand scope into filters, conditions, or reusable partials.

**Step 4: Run the focused e2e tests**

Run:

```bash
pnpm --filter @flowershow/app test:e2e -- collection-template.spec.ts blog.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/flowershow/e2e/specs apps/flowershow/e2e/fixtures/test-site
git commit -m "test: cover collection template e2e flow"
```

### Task 7: Update user docs from the tutorial-first perspective

**Files:**
- Modify: `content/flowershow-app/docs/list-component.md`
- Modify: `content/flowershow-app/docs/blog-setup.md`
- Modify: `content/flowershow-app/blog/how-to-publish-blog.md`
- Modify: `content/flowershow-app/docs/syntax-mode.md`
- Create: `content/flowershow-app/changelog/2026-03-29-collection-templates-alpha.md`

**Step 1: Write the docs changes**

Required messaging:

- `List` is still the easiest option for standard blog indexes.
- `collection` blocks are the flexible option when the author wants custom card markup.
- `collection` blocks work in Markdown and MDX because they are parsed as fenced blocks, not JSX.
- Phase 1 is folder-based and page-local.

**Step 2: Verify docs examples match the fixture**

Ensure the docs examples are copied from the same project fixture used by e2e so docs and tests do not drift.

**Step 3: Run lightweight verification**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/remark-collection-template.test.ts
```

Expected: PASS.

**Step 4: Commit**

```bash
git add content/flowershow-app/docs/list-component.md content/flowershow-app/docs/blog-setup.md content/flowershow-app/blog/how-to-publish-blog.md content/flowershow-app/docs/syntax-mode.md content/flowershow-app/changelog/2026-03-29-collection-templates-alpha.md
git commit -m "docs: add collection template guide"
```

### Task 8: Full verification and release hygiene

**Files:**
- Modify: only files touched above

**Step 1: Run the focused unit suite**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collections.test.ts lib/collection-template.test.ts lib/remark-collection-template.test.ts components/public/mdx/list.test.tsx
```

Expected: PASS.

**Step 2: Run the focused e2e suite**

Run:

```bash
pnpm --filter @flowershow/app test:e2e -- blog.spec.ts collection-template.spec.ts
```

Expected: PASS.

**Step 3: Run lint for the touched app package**

Run:

```bash
pnpm --filter @flowershow/app lint
```

Expected: PASS.

**Step 4: Update issue and docs references**

- Add implementation notes or checklist comments to [#1222](https://github.com/flowershow/flowershow/issues/1222)
- Link the changelog entry and docs page from the issue if they exist

**Step 5: Final commit**

```bash
git add apps/flowershow content/flowershow-app docs/plans/2026-03-29-collection-listing-templating-implementation.md
git commit -m "feat: add html-first collection templates"
```

**Step 6: Push**

```bash
git pull --rebase origin main
git push origin main
git status
```

Expected: `git status` shows the branch is up to date with `origin/main`.

## Risks To Watch During Implementation

- The MD and MDX pipelines differ. The plugin must be registered in both or the feature will behave inconsistently.
- Reusing `CustomHtml` may accidentally allow script execution where we do not want it. Prefer a narrower renderer if the behavior is ambiguous.
- Query logic currently lives partly inside the tRPC router. Extract it once and reuse it rather than duplicating SQL/normalization paths.
- The temptation to add conditions, loops, nested templates, reusable partials, or API-backed data will appear quickly. Do not add them in phase 1.
- If the feature only works in `.mdx`, it misses the main author experience goal.

## Explicit Non-Goals For Phase 1

- No `if` blocks or conditionals in templates
- No nested loops
- No reusable shared templates
- No API-backed collections
- No WYSIWYG editor support
- No replacement of Obsidian Bases
- No attempt to standardize card aesthetics beyond a light wrapper class

## Recommended Implementation Order

1. Tutorial and fixture
2. Shared collection query utility
3. Pure template renderer
4. Remark plugin
5. Presentation wrapper
6. E2E proof
7. Docs and changelog
8. Verification and push
