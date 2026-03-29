# Collection Listing Templating Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let a page declare a folder-backed collection in frontmatter and render custom cards for it using a small loop block around normal HTML.

**Architecture:** Reuse the existing folder-query logic behind `List`, move it into a shared server-side collection loader, resolve named collections from page frontmatter before rendering, and add a minimal loop/interpolation layer in the page body. Implement the selected syntax in the existing Flowershow pipeline; do not broaden scope into general Markdoc adoption. No pagination in v1.

**Tech Stack:** Next.js App Router, `next-mdx-remote-client`, unified/remark, React 19, Prisma, tRPC, Vitest, Playwright

---

## Target Authoring Model

```md
---
title: Projects
collections:
  items:
    from: /projects
    sortBy: date
    sortDirection: desc
---

{% for item in items %}
<article class="project-card">
  <a href="{{ item.url }}">
    <h3>{{ item.title }}</h3>
    <p>{{ item.description }}</p>
  </a>
</article>
{% /for %}
```

## Scope

- v1 supports frontmatter-defined named collections
- v1 supports folder-based collections only
- v1 supports `sortBy: date | title`
- v1 supports `sortDirection: asc | desc`
- v1 supports loop + interpolation only
- v1 does not support pagination
- v1 does not replace `List`

### Task 1: Align docs and fixtures to the selected model

**Files:**
- Modify: `content/flowershow-app/docs/custom-collection-cards.md`
- Modify: `docs/plans/2026-03-29-collection-listing-templating-design.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/README.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/alpha.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/beta.md`
- Create: `apps/flowershow/e2e/fixtures/test-site/projects/gamma.md`

**Step 1: Add the fixture content**

Create a realistic `/projects` folder with frontmatter fields used by the tutorial:

- `title`
- `description`
- `date`
- `image`
- `status`

**Step 2: Add the example page**

Create `projects/README.md` using:

```md
---
title: Projects
collections:
  items:
    from: /projects
    sortBy: date
    sortDirection: desc
---

{% for item in items %}
<article class="project-card">
  <a href="{{ item.url }}">
    <h3>{{ item.title }}</h3>
    <p>{{ item.description }}</p>
  </a>
</article>
{% /for %}
```

**Step 3: Commit**

```bash
git add content/flowershow-app/docs/custom-collection-cards.md docs/plans/2026-03-29-collection-listing-templating-design.md apps/flowershow/e2e/fixtures/test-site/projects
git commit -m "docs: align collection cards examples with frontmatter model"
```

### Task 2: Extract the current List query into a shared collection loader

**Files:**
- Create: `apps/flowershow/lib/collections.ts`
- Create: `apps/flowershow/lib/collections.test.ts`
- Modify: `apps/flowershow/server/api/routers/site.ts`

**Step 1: Write the failing unit tests**

Cover:

- folder inclusion
- `README.md` / `index.md` exclusion
- `date DESC` ordering
- `title ASC` fallback
- permalink-vs-appPath URL selection
- image/wiki-link resolution

**Step 2: Run the test and confirm failure**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collections.test.ts
```

**Step 3: Implement the loader**

Create a shared function with a shape like:

```ts
getCollectionItems({
  db,
  site,
  siteId,
  dir,
  sortBy, // v1: date | title
  sortDirection, // v1: asc | desc
  mediaField,
})
```

Return:

```ts
{
  items: Array<{
    url: string;
    path: string;
    metadata: PageMetadata | null;
  }>
}
```

**Step 4: Reuse it from `getListComponentItems`**

Replace the router-local logic in `site.ts`.

**Step 5: Re-run tests**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collections.test.ts components/public/mdx/list.test.tsx
```

**Step 6: Commit**

```bash
git add apps/flowershow/lib/collections.ts apps/flowershow/lib/collections.test.ts apps/flowershow/server/api/routers/site.ts
git commit -m "refactor: extract shared collection loader"
```

### Task 3: Add typed frontmatter support for named collections

**Files:**
- Modify: `apps/flowershow/server/api/types.ts`
- Create: `apps/flowershow/lib/collections-config.ts`
- Create: `apps/flowershow/lib/collections-config.test.ts`

**Step 1: Write the failing unit tests**

Cover:

- valid `collections.items.from`
- optional `sortBy`
- optional `sortDirection`
- invalid empty `from`
- invalid unknown direction

**Step 2: Run the test and confirm failure**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collections-config.test.ts
```

**Step 3: Implement minimal config typing**

Define:

```ts
type PageCollectionConfig = {
  from: string;
  sortBy?: 'date' | 'title';
  sortDirection?: 'asc' | 'desc';
};
```

And add:

```ts
collections?: Record<string, PageCollectionConfig>;
```

to `PageMetadata`.

**Step 4: Re-run tests**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collections-config.test.ts
```

**Step 5: Commit**

```bash
git add apps/flowershow/server/api/types.ts apps/flowershow/lib/collections-config.ts apps/flowershow/lib/collections-config.test.ts
git commit -m "feat: add frontmatter collection config"
```

### Task 4: Resolve frontmatter collections before page rendering

**Files:**
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`
- Modify: `apps/flowershow/lib/markdown.ts`
- Create: `apps/flowershow/lib/resolve-page-collections.ts`
- Create: `apps/flowershow/lib/resolve-page-collections.test.ts`

**Step 1: Write the failing unit tests**

Cover:

- a page with `collections.items`
- multiple named collections
- empty collections
- missing `from`

**Step 2: Run the test and confirm failure**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/resolve-page-collections.test.ts
```

**Step 3: Implement collection resolution**

In the page route:

- read `metadata.collections`
- resolve each named collection through the shared loader
- build a render-time context such as:

```ts
{
  items: [...]
}
```

Pass that context into the markdown/MDX pipeline.

Do not add pagination support here.

**Step 4: Re-run tests**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/resolve-page-collections.test.ts
```

**Step 5: Commit**

```bash
git add apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx apps/flowershow/lib/markdown.ts apps/flowershow/lib/resolve-page-collections.ts apps/flowershow/lib/resolve-page-collections.test.ts
git commit -m "feat: resolve frontmatter collections before render"
```

### Task 5: Add the minimal loop/interpolation syntax in the existing pipeline

**Files:**
- Create: `apps/flowershow/lib/remark-collection-loop.ts`
- Create: `apps/flowershow/lib/remark-collection-loop.test.ts`
- Create: `apps/flowershow/lib/collection-renderer.ts`
- Create: `apps/flowershow/lib/collection-renderer.test.ts`
- Modify: `apps/flowershow/lib/markdown.ts`

**Step 1: Write the failing tests**

Cover:

- `{% for item in items %}` loop expansion
- `{{ item.title }}` interpolation
- empty values render as empty strings
- arrays join with `, `
- HTML escaping
- unknown collection name

**Step 2: Run the tests and confirm failure**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collection-renderer.test.ts lib/remark-collection-loop.test.ts
```

**Step 3: Implement the narrow feature**

Support only:

- `{% for item in items %} ... {% /for %}`
- `{{ item.field }}`

Do not add:

- conditionals
- nested loops
- expressions
- pagination
- arbitrary loop variable names
- arbitrary collection names in docs examples beyond `items`

**Step 4: Register it in both render paths**

Update `processMarkdown(...)` and `getMdxOptions(...)` in `markdown.ts`.

Run this loop/interpolation pass before downstream HTML/rehype transforms that would otherwise consume or mangle the markers.

**Step 5: Re-run tests**

Run:

```bash
pnpm --filter @flowershow/app test:unit -- lib/collection-renderer.test.ts lib/remark-collection-loop.test.ts
```

**Step 6: Commit**

```bash
git add apps/flowershow/lib/remark-collection-loop.ts apps/flowershow/lib/remark-collection-loop.test.ts apps/flowershow/lib/collection-renderer.ts apps/flowershow/lib/collection-renderer.test.ts apps/flowershow/lib/markdown.ts
git commit -m "feat: add collection loop rendering"
```

### Task 6: Prove the feature end-to-end

**Files:**
- Create: `apps/flowershow/e2e/specs/custom-collection-cards.spec.ts`
- Modify: `apps/flowershow/e2e/specs/blog.spec.ts` (only if needed)

**Step 1: Write the failing e2e test**

Cover:

- `/projects` page renders cards from frontmatter-defined `items`
- cards are ordered by date descending
- title/description/url render correctly
- no pagination UI appears

**Step 2: Run the focused e2e test and confirm failure**

Run:

```bash
pnpm --filter @flowershow/app test:e2e -- custom-collection-cards.spec.ts
```

**Step 3: Fix any missing integration details**

Only fix what the test exposes.

**Step 4: Re-run the e2e test**

Run:

```bash
pnpm --filter @flowershow/app test:e2e -- custom-collection-cards.spec.ts
```

**Step 5: Commit**

```bash
git add apps/flowershow/e2e/specs/custom-collection-cards.spec.ts apps/flowershow/e2e/fixtures/test-site/projects
git commit -m "test: cover custom collection cards e2e"
```

### Task 7: Final docs pass

**Files:**
- Modify: `content/flowershow-app/docs/custom-collection-cards.md`
- Modify: `content/flowershow-app/docs/list-component.md`
- Modify: `content/flowershow-app/docs/syntax-mode.md`
- Create: `content/flowershow-app/changelog/2026-03-29-custom-collection-cards-alpha.md`

**Step 1: Update docs to match reality**

Required points:

- collections are defined in frontmatter
- rendering uses the loop block in the page body
- no pagination in v1
- use `List` when you want pagination

**Step 2: Commit**

```bash
git add content/flowershow-app/docs/custom-collection-cards.md content/flowershow-app/docs/list-component.md content/flowershow-app/docs/syntax-mode.md content/flowershow-app/changelog/2026-03-29-custom-collection-cards-alpha.md
git commit -m "docs: document custom collection cards"
```

### Task 8: Verification

**Step 1: Run unit tests**

```bash
pnpm --filter @flowershow/app test:unit -- lib/collections.test.ts lib/collections-config.test.ts lib/resolve-page-collections.test.ts lib/collection-renderer.test.ts lib/remark-collection-loop.test.ts components/public/mdx/list.test.tsx
```

**Step 2: Run e2e**

```bash
pnpm --filter @flowershow/app test:e2e -- custom-collection-cards.spec.ts
```

**Step 3: Run lint**

```bash
pnpm --filter @flowershow/app lint
```

**Step 4: Final commit**

```bash
git add apps/flowershow content/flowershow-app docs/plans/2026-03-29-collection-listing-templating-implementation.md
git commit -m "feat: add custom collection cards"
```

## Appendix A: Short Justifications

- Frontmatter for collection binding:
  keeps data acquisition separate from rendering and fits Flowershow's current page metadata model.
- Reuse `List` query logic:
  avoids duplicate folder-query behavior and keeps ordering/path rules consistent.
- No pagination in v1:
  pagination adds routing and UI complexity; `List` already covers that use case.
- Small loop syntax in the existing pipeline:
  keeps custom HTML in the page body and minimizes templating surface area without broadening scope into a new page-rendering system.

## Appendix B: Reference Files

- `apps/flowershow/components/public/mdx/list.tsx`
- `apps/flowershow/server/api/routers/site.ts`
- `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`
- `apps/flowershow/lib/markdown.ts`
- `docs/plans/2026-03-29-collection-listing-templating-design.md`
- `content/flowershow-app/docs/custom-collection-cards.md`
