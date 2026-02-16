# Image Optimization: Thread DB Geometry to FsImage

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Use image width/height stored in the DB `Blob` table as default dimensions for `next/image`, falling back to author-provided dimensions only when DB geometry is unavailable.

**Architecture:** Add a TRPC query that fetches `{path, width, height}` for all image blobs of a site. Pass the resulting lookup map through both rendering pipelines (MD and MDX) so `FsImage` receives DB-sourced dimensions. In the MD pipeline, a new rehype plugin injects dimensions onto `<img>` HAST nodes. In the MDX pipeline, the `mdxComponentsFactory` wrapper injects dimensions as props.

**Tech Stack:** Next.js, TRPC, Prisma, unified/rehype, React, Vitest

**Image dimension priority (highest to lowest):**
1. Author-explicit dimensions (e.g., Obsidian `![250x100](image.jpg)` syntax — already parsed by `remarkObsidianImageSize`)
2. DB-stored geometry from `Blob.width` / `Blob.height`
3. Responsive fallback (`width=0, height=0, sizes="..."`)

---

## Task 1: Add `getImageDimensions` TRPC query

**Files:**
- Modify: `apps/flowershow/server/api/routers/site.ts` (add new procedure near `getAllBlobPaths`)
- Test: `apps/flowershow/server/api/routers/__tests__/site-image-dimensions.test.ts`

### Step 1: Write the failing test

```ts
// apps/flowershow/server/api/routers/__tests__/site-image-dimensions.test.ts
import { describe, expect, it, vi } from 'vitest';

// We test the query logic in isolation by extracting the core function.
// For now, test the shape of what getImageDimensions should return.
import { buildImageDimensionsMap } from '../../lib/image-dimensions';

describe('buildImageDimensionsMap', () => {
  it('builds a lookup map from blob records keyed by resolved URL path', () => {
    const blobs = [
      { path: 'assets/photo.png', width: 800, height: 600 },
      { path: 'images/banner.jpg', width: 1200, height: 400 },
      { path: 'docs/readme.md', width: null, height: null },
    ];

    const result = buildImageDimensionsMap(blobs, '/@user/project');

    expect(result).toEqual({
      '/@user/project/assets/photo.png': { width: 800, height: 600 },
      '/@user/project/images/banner.jpg': { width: 1200, height: 400 },
    });
  });

  it('returns empty map when no blobs have dimensions', () => {
    const blobs = [
      { path: 'docs/readme.md', width: null, height: null },
    ];

    const result = buildImageDimensionsMap(blobs, '/@user/project');

    expect(result).toEqual({});
  });

  it('returns empty map for empty input', () => {
    expect(buildImageDimensionsMap([], '/@user/project')).toEqual({});
  });
});
```

### Step 2: Run test to verify it fails

Run: `SKIP_ENV_VALIDATION=true pnpm --filter @flowershow/app test:unit apps/flowershow/server/api/routers/__tests__/site-image-dimensions.test.ts`
Expected: FAIL — module `../../lib/image-dimensions` does not exist.

### Step 3: Write minimal implementation

Create `apps/flowershow/lib/image-dimensions.ts`:

```ts
export type ImageDimensionsMap = Record<string, { width: number; height: number }>;

type BlobWithDimensions = {
  path: string;
  width: number | null;
  height: number | null;
};

/**
 * Builds a lookup map from blob records, keyed by the URL path the image
 * will be resolved to in the rendering pipeline (sitePrefix + "/" + blob.path).
 * Only includes blobs that have both width and height set.
 */
export function buildImageDimensionsMap(
  blobs: BlobWithDimensions[],
  sitePrefix: string,
): ImageDimensionsMap {
  const map: ImageDimensionsMap = {};

  for (const blob of blobs) {
    if (blob.width != null && blob.height != null) {
      const key = `${sitePrefix}/${blob.path}`;
      map[key] = { width: blob.width, height: blob.height };
    }
  }

  return map;
}
```

### Step 4: Run test to verify it passes

Run: `SKIP_ENV_VALIDATION=true pnpm --filter @flowershow/app test:unit apps/flowershow/server/api/routers/__tests__/site-image-dimensions.test.ts`
Expected: PASS

### Step 5: Add the TRPC procedure

Add to `apps/flowershow/server/api/routers/site.ts`, near `getAllBlobPaths`:

```ts
getImageDimensions: publicProcedure
  .input(
    z.object({
      siteId: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    return await unstable_cache(
      async (input) => {
        const blobs = await ctx.db.blob.findMany({
          where: {
            siteId: input.siteId,
            width: { not: null },
            height: { not: null },
          },
          select: {
            path: true,
            width: true,
            height: true,
          },
        });

        return blobs as Array<{ path: string; width: number; height: number }>;
      },
      undefined,
      {
        revalidate: 60,
        tags: [`${input.siteId}`, `${input.siteId}-image-dimensions`],
      },
    )(input);
  }),
```

### Step 6: Commit

```bash
git add apps/flowershow/lib/image-dimensions.ts \
        apps/flowershow/server/api/routers/site.ts \
        apps/flowershow/server/api/routers/__tests__/site-image-dimensions.test.ts
git commit -m "feat: add getImageDimensions TRPC query and buildImageDimensionsMap helper"
```

---

## Task 2: Create `rehype-inject-image-dimensions` plugin (MD pipeline)

This rehype plugin visits `<img>` HAST nodes and sets `width`/`height` properties from the dimensions map, **only if they are not already set** (preserving author-explicit values).

**Files:**
- Create: `apps/flowershow/lib/rehype-inject-image-dimensions.ts`
- Test: `apps/flowershow/lib/__tests__/rehype-inject-image-dimensions.test.ts`

### Step 1: Write the failing test

```ts
// apps/flowershow/lib/__tests__/rehype-inject-image-dimensions.test.ts
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeInjectImageDimensions from '../rehype-inject-image-dimensions';
import type { ImageDimensionsMap } from '../image-dimensions';

async function process(markdown: string, dimensions: ImageDimensionsMap) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeInjectImageDimensions, { dimensions })
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

describe('rehypeInjectImageDimensions', () => {
  it('injects width and height from dimensions map onto img elements', async () => {
    const dimensions: ImageDimensionsMap = {
      '/photo.png': { width: 800, height: 600 },
    };

    const html = await process('![alt](/photo.png)', dimensions);

    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
  });

  it('does not overwrite existing (author-explicit) dimensions', async () => {
    const dimensions: ImageDimensionsMap = {
      '/photo.png': { width: 800, height: 600 },
    };

    // Simulate an img that already has width/height set (by remarkObsidianImageSize)
    // We use raw HTML since remark doesn't natively produce width/height on images
    const html = await unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeInjectImageDimensions, { dimensions })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process('<img src="/photo.png" width="250" height="100" alt="alt">');

    expect(html).toContain('width="250"');
    expect(html).toContain('height="100"');
  });

  it('leaves images alone when no dimensions found in map', async () => {
    const dimensions: ImageDimensionsMap = {};

    const html = await process('![alt](/unknown.png)', dimensions);

    expect(html).not.toContain('width=');
    expect(html).not.toContain('height=');
  });
});
```

### Step 2: Run test to verify it fails

Run: `SKIP_ENV_VALIDATION=true pnpm --filter @flowershow/app test:unit apps/flowershow/lib/__tests__/rehype-inject-image-dimensions.test.ts`
Expected: FAIL — module `../rehype-inject-image-dimensions` does not exist.

### Step 3: Write minimal implementation

```ts
// apps/flowershow/lib/rehype-inject-image-dimensions.ts
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { ImageDimensionsMap } from './image-dimensions';

interface Options {
  dimensions: ImageDimensionsMap;
}

/**
 * Rehype plugin that injects width/height from a pre-built dimensions map
 * onto <img> elements. Existing (author-explicit) dimensions are preserved.
 */
const rehypeInjectImageDimensions: Plugin<[Options]> = (options) => {
  const { dimensions } = options;

  return (tree) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'img') return;

      const src = node.properties?.src;
      if (!src || typeof src !== 'string') return;

      // Skip if dimensions already set (author-explicit takes priority)
      if (node.properties.width && node.properties.height) return;

      const dims = dimensions[src];
      if (!dims) return;

      node.properties.width = String(dims.width);
      node.properties.height = String(dims.height);
    });
  };
};

export default rehypeInjectImageDimensions;
```

### Step 4: Run test to verify it passes

Run: `SKIP_ENV_VALIDATION=true pnpm --filter @flowershow/app test:unit apps/flowershow/lib/__tests__/rehype-inject-image-dimensions.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add apps/flowershow/lib/rehype-inject-image-dimensions.ts \
        apps/flowershow/lib/__tests__/rehype-inject-image-dimensions.test.ts
git commit -m "feat: add rehype-inject-image-dimensions plugin for MD pipeline"
```

---

## Task 3: Wire dimensions through `page.tsx` into both pipelines

**Files:**
- Modify: `apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`
- Modify: `apps/flowershow/lib/markdown.ts` — add `imageDimensions` to `MarkdownOptions`, wire rehype plugin
- Modify: `apps/flowershow/components/public/mdx/mdx-components-factory.tsx` — accept and use `imageDimensions`
- Modify: `apps/flowershow/components/public/mdx-client-renderer.tsx` — pass `imageDimensions` through
- Modify: `apps/flowershow/components/public/mdx-client.tsx` — accept `imageDimensions` prop

### Step 1: Update `MarkdownOptions` interface in `markdown.ts`

Add `imageDimensions` to the `MarkdownOptions` interface:

```ts
import type { ImageDimensionsMap } from './image-dimensions';

interface MarkdownOptions {
  filePath: string;
  files: string[];
  sitePrefix: string;
  parseFrontmatter?: boolean;
  customDomain?: string;
  siteId?: string;
  rootDir?: string;
  permalinks?: Record<string, string>;
  imageDimensions?: ImageDimensionsMap;  // <-- NEW
}
```

Wire the rehype plugin in `processMarkdown` (after `rehypeResolveHtmlUrls`, before `rehypeToReact`):

```ts
import rehypeInjectImageDimensions from './rehype-inject-image-dimensions';

// In processMarkdown, before .use(rehypeToReact, ...):
.use(rehypeInjectImageDimensions, { dimensions: options.imageDimensions ?? {} })
```

### Step 2: Update `mdxComponentsFactory` to accept `imageDimensions`

In `mdx-components-factory.tsx`, change the factory signature:

```ts
import type { ImageDimensionsMap } from '@/lib/image-dimensions';

export const mdxComponentsFactory = ({
  blob,
  site,
  imageDimensions,
}: {
  blob: Blob;
  site: PublicSite;
  imageDimensions?: ImageDimensionsMap;
}) => {
  const components: MDXComponents = {
    img: (props: any) => {
      // If no explicit dimensions but we have DB dimensions, inject them
      const src = props.src ?? '';
      const dbDims = imageDimensions?.[src];
      const injectedProps =
        !props.width && !props.height && dbDims
          ? { ...props, width: dbDims.width, height: dbDims.height }
          : props;
      return <FsImage {...injectedProps} />;
    },
    // ... rest unchanged
  };
  return components;
};
```

### Step 3: Thread `imageDimensions` through `MDXClient` → `MDXClientRenderer`

In `mdx-client.tsx` — this is a dynamic import wrapper, so we need to pass the prop through.

Actually, `MDXClient` is loaded via `dynamic()` from `mdx-client-renderer.tsx`. The props type in `mdx-client-renderer.tsx` needs updating:

```ts
// mdx-client-renderer.tsx
import type { ImageDimensionsMap } from '@/lib/image-dimensions';

type Props = {
  mdxSource: SerializeResult<PageMetadata>;
  blob: Blob;
  site: PublicSite;
  imageDimensions?: ImageDimensionsMap;  // <-- NEW
};

function MDXClientRenderer({ mdxSource, blob, site, imageDimensions }: Props) {
  // ...
  const components = mdxComponentsFactory({
    blob,
    site,
    imageDimensions,  // <-- NEW
  });
  // ...
}
```

### Step 4: Fetch dimensions in `page.tsx` and pass to both pipelines

In `page.tsx`, after the `siteFilePaths` query, add:

```ts
import { buildImageDimensionsMap, type ImageDimensionsMap } from '@/lib/image-dimensions';

// After siteFilePaths query:
const imageBlobs = await api.site.getImageDimensions
  .query({ siteId: site.id })
  .catch(() => [] as Array<{ path: string; width: number; height: number }>);

const imageDimensions = buildImageDimensionsMap(imageBlobs, sitePrefix);
```

Pass to MD pipeline:

```ts
const result = await processMarkdown(preprocessedContent ?? '', {
  files: siteFilePaths,
  filePath: blob.path,
  sitePrefix,
  customDomain: site.customDomain ?? undefined,
  siteId: site.id,
  rootDir: site.rootDir ?? undefined,
  permalinks: permalinksMapping,
  imageDimensions,  // <-- NEW
});
```

Pass to MDX pipeline:

```tsx
<MDXClient mdxSource={mdxSource} blob={blob} site={site} imageDimensions={imageDimensions} />
```

### Step 5: Commit

```bash
git add apps/flowershow/app/\(public\)/site/\[user\]/\[project\]/\[\[...slug\]\]/page.tsx \
        apps/flowershow/lib/markdown.ts \
        apps/flowershow/components/public/mdx/mdx-components-factory.tsx \
        apps/flowershow/components/public/mdx-client-renderer.tsx
git commit -m "feat: wire image dimensions from DB through both MD and MDX rendering pipelines"
```

---

## Task 4: Update tests for updated components

**Files:**
- Modify: `apps/flowershow/components/public/mdx/mdx-components-factory.test.tsx`
- Modify: `apps/flowershow/components/public/mdx/fs-image.test.tsx`

### Step 1: Add MDX factory test for DB dimensions injection

```ts
// Add to mdx-components-factory.test.tsx
it('injects DB dimensions when no explicit dimensions are set', () => {
  const imageDimensions = {
    '/media/photo.png': { width: 1024, height: 768 },
  };

  const components = mdxComponentsFactory({
    blob: { path: 'notes/page.mdx' } as any,
    site: { id: 'site-1', customDomain: null } as any,
    imageDimensions,
  });

  const ImageComponent = components.img as React.ComponentType<any>;
  render(<ImageComponent src="/media/photo.png" alt="Photo" />);

  const image = screen.getByTestId('fs-image');
  const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

  expect(props.width).toBe(1024);
  expect(props.height).toBe(768);
});

it('preserves author-explicit dimensions over DB dimensions', () => {
  const imageDimensions = {
    '/media/photo.png': { width: 1024, height: 768 },
  };

  const components = mdxComponentsFactory({
    blob: { path: 'notes/page.mdx' } as any,
    site: { id: 'site-1', customDomain: null } as any,
    imageDimensions,
  });

  const ImageComponent = components.img as React.ComponentType<any>;
  render(<ImageComponent src="/media/photo.png" alt="Photo" width="250" height="100" />);

  const image = screen.getByTestId('fs-image');
  const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

  expect(props.width).toBe('250');
  expect(props.height).toBe('100');
});
```

### Step 2: Add FsImage test for DB-provided dimensions

```ts
// Add to fs-image.test.tsx
it('uses DB dimensions (numeric) the same as explicit dimensions', () => {
  render(<FsImage src="/demo.png" alt="Demo" width={1024} height={768} />);

  const image = screen.getByTestId('next-image');
  const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

  expect(props.width).toBe(1024);
  expect(props.height).toBe(768);
});

it('falls back to responsive mode when no dimensions provided', () => {
  render(<FsImage src="/demo.png" alt="Demo" />);

  const image = screen.getByTestId('next-image');
  const props = JSON.parse(image.getAttribute('data-props') ?? '{}');

  expect(props.width).toBe(0);
  expect(props.height).toBe(0);
  expect(props.sizes).toBeDefined();
});
```

### Step 3: Run all tests

Run: `SKIP_ENV_VALIDATION=true pnpm --filter @flowershow/app test:unit apps/flowershow/components/public/mdx/fs-image.test.tsx apps/flowershow/components/public/mdx/mdx-components-factory.test.tsx apps/flowershow/lib/__tests__/rehype-inject-image-dimensions.test.ts apps/flowershow/server/api/routers/__tests__/site-image-dimensions.test.ts`
Expected: ALL PASS

### Step 4: Commit

```bash
git add apps/flowershow/components/public/mdx/fs-image.test.tsx \
        apps/flowershow/components/public/mdx/mdx-components-factory.test.tsx
git commit -m "test: add tests for DB dimension injection in MDX factory and FsImage"
```

---

## Task 5: Final integration commit with all staged changes

Ensure all previously modified files (from earlier sessions) are committed:

```bash
git add apps/flowershow/components/public/mdx/fs-image.tsx \
        apps/flowershow/components/public/mdx/mdx-components-factory.tsx \
        apps/flowershow/lib/markdown.ts
git status
```

If there are remaining unstaged changes from earlier work, stage and commit them:

```bash
git commit -m "feat: use next/image in FsImage with DB-sourced dimensions

Route all markdown/MDX images through Next.js <Image> component.
Use width/height from DB Blob records by default, falling back to
author-explicit dimensions, then responsive mode."
```

### Push and close issue

```bash
git push -u origin feature/flowershow-kpm-2
bd close flowershow-kpm.2
bd sync
```

---

## Key Design Decisions

1. **Separate `buildImageDimensionsMap` helper** — keeps the map-building logic testable without needing TRPC/Prisma context.

2. **Rehype plugin for MD pipeline** — the MD pipeline uses unified's HAST tree, so a rehype plugin is the natural place to inject dimensions onto `<img>` nodes before they reach `FsImage` via `rehypeToReact`.

3. **Factory wrapper for MDX pipeline** — the MDX pipeline doesn't go through our rehype-to-react compiler (it uses next-mdx-remote's own JSX runtime), so we inject dimensions in the component mapping layer instead.

4. **Map keyed by resolved URL path** — images arrive at `FsImage` with their `src` already resolved to the URL path (by `rehypeResolveHtmlUrls`). The dimensions map uses the same resolved key format (`sitePrefix + "/" + blob.path`) so lookups match.

5. **Author-explicit dimensions always win** — both the rehype plugin and MDX factory check for existing width/height before injecting DB values, preserving the Obsidian `![250x100](image.jpg)` syntax.
